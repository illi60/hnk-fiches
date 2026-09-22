import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminInventoryRemoveSchema } from "@/lib/validators";
import { adminInventoryUpdateSchema } from "@/lib/admin-inventory";
import { updateAdminInventory } from "@/lib/admin-inventory-server";
import { lockEconomyUsers } from "@/lib/economy-server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    await requireAdmin();
    const { id, itemId } = await params;
    const parsed = adminInventoryUpdateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    return NextResponse.json({ ok: true, ...await updateAdminInventory(id, itemId, parsed.data) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId, itemId } = await params;
    const body = await req.json().catch(() => null);
    const parsed = adminInventoryRemoveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    }
    const quantity = parsed.data.quantity;

    const result = await prisma.$transaction(async (tx) => {
      await lockEconomyUsers(tx, [userId]);
      const item = await tx.inventoryItem.findFirst({
        where: { id: itemId, userId },
        select: {
          id: true,
          itemName: true,
          quantity: true,
          reservedQuantity: true,
        },
      });
      if (!item) throw new Error("NOT_FOUND");

      const available = item.quantity - item.reservedQuantity;
      if (available < quantity) throw new Error("INVENTORY_RESERVED");

      const nextQuantity = item.quantity - quantity;
      if (nextQuantity <= 0) {
        const deleted = await tx.inventoryItem.deleteMany({
          where: {
            id: item.id,
            quantity: item.quantity,
            reservedQuantity: 0,
          },
        });
        if (deleted.count === 0) throw new Error("CONFLICT");
        return { removed: quantity, deleted: true, itemName: item.itemName };
      }

      const updated = await tx.inventoryItem.updateMany({
        where: {
          id: item.id,
          quantity: { gte: item.reservedQuantity + quantity },
          reservedQuantity: item.reservedQuantity,
        },
        data: { quantity: { decrement: quantity } },
      });
      if (updated.count === 0) throw new Error("CONFLICT");
      return { removed: quantity, deleted: false, itemName: item.itemName };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return jsonError(e);
  }
}

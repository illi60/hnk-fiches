import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { SHOP_RELIC_ITEM_KEYS } from "@/lib/shop";

function isTrackedGlobalItemKey(itemKey: string): boolean {
  return (SHOP_RELIC_ITEM_KEYS as readonly string[]).includes(itemKey) || itemKey.startsWith("conte-");
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      select: {
        id: true,
        itemKey: true,
        userId: true,
      },
    });
    if (!item) throw new Error("NOT_FOUND");
    if (!isTrackedGlobalItemKey(item.itemKey)) {
      return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    }

    await prisma.inventoryItem.delete({ where: { id: item.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

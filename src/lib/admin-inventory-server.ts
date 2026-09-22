import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { lockEconomyUsers } from "@/lib/economy-server";
import { isGloballyLimitedShopItem, type ShopItem } from "@/lib/shop";
import { MAX_INVENTORY_QUANTITY, type AdminInventoryAddInput, type AdminInventoryUpdateInput } from "@/lib/admin-inventory";

// Inventory corrections share the account lock used by purchases and trades,
// but deliberately do not change the XP ledger or execute shop services.
export async function addAdminInventory(userId: string, input: AdminInventoryAddInput) {
  return prisma.$transaction(async (tx) => {
    await lockEconomyUsers(tx, [userId]);
    if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new Error("NOT_FOUND");
    if (input.source === "custom") {
      return tx.inventoryItem.create({ data: {
        userId, itemKey: `admin-custom-${randomUUID()}`, itemName: input.itemName,
        costXp: 0, quantity: input.quantity,
      } });
    }
    const item = await tx.shopCatalogItem.findUnique({ where: { itemKey: input.itemKey } });
    if (!item?.isActive) throw new Error("NOT_FOUND");
    if (item.stock === "UNIQUE" && input.quantity !== 1) throw new Error("DUPLICATE");
    if (isGloballyLimitedShopItem(item as Pick<ShopItem, "category" | "stock">)) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('hnk_shop_global_unique'))`;
      if (await tx.inventoryItem.findFirst({ where: { itemKey: item.itemKey, quantity: { gt: 0 } } })) throw new Error("DUPLICATE");
    }
    const current = await tx.inventoryItem.findUnique({ where: { userId_itemKey: { userId, itemKey: item.itemKey } } });
    if (item.stock === "UNIQUE" && current && current.quantity > 0) throw new Error("DUPLICATE");
    if ((current?.quantity ?? 0) + input.quantity > MAX_INVENTORY_QUANTITY) throw new Error("INVALID_STATE");
    return tx.inventoryItem.upsert({
      where: { userId_itemKey: { userId, itemKey: item.itemKey } },
      create: { userId, itemKey: item.itemKey, itemName: item.name, costXp: item.costXp, quantity: input.quantity },
      update: { quantity: { increment: input.quantity } },
    });
  });
}

export async function updateAdminInventory(userId: string, itemId: string, input: AdminInventoryUpdateInput) {
  return prisma.$transaction(async (tx) => {
    await lockEconomyUsers(tx, [userId]);
    const item = await tx.inventoryItem.findFirst({ where: { id: itemId, userId } });
    if (!item) throw new Error("NOT_FOUND");
    if (item.quantity !== input.expectedQuantity) throw new Error("CONFLICT");
    if (input.quantity < item.reservedQuantity) throw new Error("INVENTORY_RESERVED");
    if (input.quantity > item.quantity) {
      const catalog = await tx.shopCatalogItem.findUnique({ where: { itemKey: item.itemKey } });
      if (catalog?.stock === "UNIQUE" && input.quantity > 1) throw new Error("DUPLICATE");
    }
    const where = { id: itemId, userId, quantity: item.quantity, reservedQuantity: item.reservedQuantity };
    const result = input.quantity === 0
      ? await tx.inventoryItem.deleteMany({ where })
      : await tx.inventoryItem.updateMany({ where, data: { quantity: input.quantity } });
    if (result.count !== 1) throw new Error("CONFLICT");
    return { quantity: input.quantity, deleted: input.quantity === 0 };
  });
}

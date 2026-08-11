import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadShopItems } from "@/lib/shop-server";
import {
  SHOP_PROMOTION_CHUNIN_ITEM_KEY,
  SHOP_PROMOTION_JONIN_ITEM_KEY,
  filterReconquestItemsForScope,
  filterShopItemsForUser,
  isGloballyLimitedShopItem,
} from "@/lib/shop";
import { loadReconquestProgress } from "@/lib/shop-reconquest-server";
import ShopInventory from "@/components/ShopInventory";

export default async function BoutiquePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      xpAvailable: true,
      rangVillage: true,
      rangClan: true,
      rangHistoire: true,
      grade: true,
      inventoryItems: {
        orderBy: { updatedAt: "desc" },
        select: {
          itemKey: true,
          itemName: true,
          costXp: true,
          quantity: true,
        },
      },
    },
  });
  if (!user) redirect("/login");

  const reconquestProgress = await loadReconquestProgress();
  const hasChuninPromotion = user.inventoryItems.some((item) => item.itemKey === SHOP_PROMOTION_CHUNIN_ITEM_KEY && item.quantity > 0);
  const hasJoninPromotion = user.inventoryItems.some((item) => item.itemKey === SHOP_PROMOTION_JONIN_ITEM_KEY && item.quantity > 0);

  const items = filterReconquestItemsForScope(filterShopItemsForUser(await loadShopItems(), {
    villageRank: user.rangVillage,
    clanRank: user.rangClan,
    histoireRank: user.rangHistoire,
    grade: user.grade,
    hasChuninPromotion,
    hasJoninPromotion,
  }), reconquestProgress);
  const globallyLimitedItemKeys = items.filter(isGloballyLimitedShopItem).map((item) => item.key);
  const globallyOwnedRows = globallyLimitedItemKeys.length > 0
    ? await prisma.inventoryItem.findMany({
        where: { itemKey: { in: globallyLimitedItemKeys } },
        select: { itemKey: true },
      })
    : [];

  return (
    <ShopInventory
      items={items}
      inventory={user.inventoryItems}
      globallyOwnedItemKeys={globallyOwnedRows.map((row) => row.itemKey)}
      xpAvailable={user.xpAvailable}
      villageRank={user.rangVillage}
      grade={user.grade}
    />
  );
}

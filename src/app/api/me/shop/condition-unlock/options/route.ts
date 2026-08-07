import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { loadShopItemByKey } from "@/lib/shop-server";
import { discountedShopCost, isConditionUnlockItemKey, SHOP_DISCOUNT_ITEM_KEY } from "@/lib/shop";
import { shopConditionUnlockOptions } from "@/lib/shop-condition-unlock-server";

export async function GET(req: Request) {
  try {
    const me = await requireUser();
    const itemKey = new URL(req.url).searchParams.get("itemKey") ?? "";
    if (!isConditionUnlockItemKey(itemKey)) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const item = await loadShopItemByKey(itemKey);
    if (!item) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: {
        id: true,
        clan: true,
        forumLastXp: true,
        xpTotalEarned: true,
        xpAvailable: true,
        rangVillage: true,
        rangClan: true,
        rangHistoire: true,
        inventoryItems: {
          where: { itemKey: SHOP_DISCOUNT_ITEM_KEY },
          select: { quantity: true },
        },
      },
    });
    if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const hasDiscount = (user.inventoryItems[0]?.quantity ?? 0) > 0;
    const result = await shopConditionUnlockOptions(itemKey, user);
    return NextResponse.json({
      ok: true,
      item: {
        key: item.key,
        name: item.name,
        baseCostXp: item.costXp,
        costXp: discountedShopCost(item, hasDiscount),
      },
      target: result.target,
      options: result.options,
      xpAvailable: user.xpAvailable,
    });
  } catch (e) {
    return jsonError(e);
  }
}

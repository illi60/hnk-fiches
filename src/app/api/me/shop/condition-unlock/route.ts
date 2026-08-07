import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { loadShopItemByKey } from "@/lib/shop-server";
import { SHOP_DISCOUNT_ITEM_KEY, discountedShopCost, isConditionUnlockItemKey } from "@/lib/shop";
import { shopConditionUnlockOptions } from "@/lib/shop-condition-unlock-server";
import { clanMemberIds, recomputeRanks } from "@/lib/progression-server";
import { condMeta, condTarget, scopeKeyFor } from "@/lib/progression";
import { shopConditionUnlockSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const rl = rateLimit(`shop-condition-unlock:${me.id}`, 8, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = shopConditionUnlockSchema.safeParse(body);
    if (!parsed.success || !isConditionUnlockItemKey(parsed.data.itemKey)) {
      return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    }

    const item = await loadShopItemByKey(parsed.data.itemKey);
    if (!item) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const user = await prisma.user.findUnique({
        where: { id: me.id },
        select: {
          id: true,
          clan: true,
          forumLastXp: true,
          xpTotalEarned: true,
          xpAvailable: true,
          version: true,
          rangVillage: true,
          rangClan: true,
          rangHistoire: true,
          inventoryItems: {
            where: { itemKey: SHOP_DISCOUNT_ITEM_KEY },
            select: { quantity: true },
          },
        },
      });
    if (!user) throw new Error("NOT_FOUND");

    const hasDiscount = (user.inventoryItems[0]?.quantity ?? 0) > 0;
    const cost = discountedShopCost(item, hasDiscount);
    if (user.xpAvailable < cost) throw new Error("INSUFFICIENT_XP");

    const optionState = await shopConditionUnlockOptions(parsed.data.itemKey, user);
    if (!optionState.options.some((option) => option.condId === parsed.data.condId)) {
      throw new Error("INELIGIBLE");
    }
    const meta = condMeta(parsed.data.condId);
    if (!meta || meta.track !== optionState.target.track || meta.rank !== optionState.target.rank) {
      throw new Error("INELIGIBLE");
    }
    const scopeKey =
      meta.tier === "COMMUNITY"
        ? scopeKeyFor(meta.track, meta.tier, user.clan)
        : "self";
    if (!scopeKey) throw new Error("INELIGIBLE");

    const recomputeTarget =
      meta.tier === "COMMUNITY"
        ? meta.track === "VILLAGE"
          ? "all"
          : await clanMemberIds(scopeKey)
        : [user.id];

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: user.id, version: user.version, xpAvailable: { gte: cost } },
        data: {
          xpAvailable: { decrement: cost },
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) throw new Error("CONFLICT");

      const where =
        meta.tier === "COMMUNITY"
          ? { track: meta.track, tier: "COMMUNITY" as const, condId: meta.id, scopeKey, status: "VALIDATED" as const }
          : { userId: user.id, tier: "INDIVIDUAL" as const, condId: meta.id, status: "VALIDATED" as const };
      const current = await tx.progressionSubmission.count({ where });
      const needed = Math.max(1, condTarget(meta.id, meta.count) - current);

      await tx.progressionSubmission.createMany({
        data: Array.from({ length: needed }, () => ({
          userId: user.id,
          track: meta.track,
          tier: meta.tier,
          targetRank: meta.rank,
          condId: meta.id,
          scopeKey,
          status: "VALIDATED",
          reviewedById: me.id,
          reviewedAt: new Date(),
          comment: "Condition débloquée via la boutique.",
        })),
      });

      await tx.inventoryItem.upsert({
        where: { userId_itemKey: { userId: user.id, itemKey: item.key } },
        create: {
          userId: user.id,
          itemKey: item.key,
          itemName: item.name,
          costXp: cost,
          quantity: 1,
        },
        update: {
          itemName: item.name,
          costXp: cost,
          quantity: { increment: 1 },
        },
      });

      await tx.xPTransaction.create({
        data: {
          userId: user.id,
          amount: -cost,
          reason: "SHOP_SPEND",
          metadata: {
            itemKey: item.key,
            itemName: item.name,
            costXp: cost,
            baseCostXp: item.costXp,
            discountRate: hasDiscount ? 0.25 : 0,
            condId: parsed.data.condId,
            unlock: { unlocked: needed, target: optionState.target },
          } as Prisma.InputJsonValue,
        },
      });

      return { total: cost, xpAvailable: user.xpAvailable - cost, unlock: { unlocked: needed, target: optionState.target } };
    });

    try {
      await recomputeRanks(recomputeTarget);
    } catch (err) {
      console.error("Failed to recompute progression after shop condition unlock", err);
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return jsonError(e);
  }
}

import { NextResponse } from "next/server";
import { Prisma, type XPReason } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { loadShopItemByKey } from "@/lib/shop-server";
import {
  SHOP_DISCOUNT_ITEM_KEY,
  SHOP_REROLL_FT_ITEM_KEY,
  rerollFtBaseCostForPurchase,
  shopItemCost,
} from "@/lib/shop";
import { shopRerollFtSchema } from "@/lib/validators";

const REROLL_REFUND_SOURCE = "SHOP_REROLL_FT";
const TECH_REFUND_REASONS: XPReason[] = ["FICHE_VALIDATED", "ARTS_SPEND", "QUINTESSENCE_SPEND"];

function metadataSource(metadata: Prisma.JsonValue | null): unknown {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return (metadata as Record<string, unknown>).source;
}

export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const rl = rateLimit(`shop-reroll-ft:${me.id}`, 4, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = shopRerollFtSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const item = await loadShopItemByKey(SHOP_REROLL_FT_ITEM_KEY);
    if (!item) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: me.id },
        select: {
          id: true,
          username: true,
          xpAvailable: true,
          version: true,
          inventoryItems: {
            where: { itemKey: { in: [SHOP_DISCOUNT_ITEM_KEY, SHOP_REROLL_FT_ITEM_KEY] } },
            select: { itemKey: true, quantity: true },
          },
        },
      });
      if (!user) throw new Error("NOT_FOUND");

      const inventoryByKey = new Map(user.inventoryItems.map((owned) => [owned.itemKey, owned]));
      const hasDiscount = (inventoryByKey.get(SHOP_DISCOUNT_ITEM_KEY)?.quantity ?? 0) > 0;
      const previousPurchases = inventoryByKey.get(SHOP_REROLL_FT_ITEM_KEY)?.quantity ?? 0;
      const incrementalBaseCost = rerollFtBaseCostForPurchase(item, previousPurchases);
      const cost = shopItemCost(item, hasDiscount, previousPurchases);

      const xpHistory = await tx.xPTransaction.findMany({
        where: {
          userId: user.id,
          reason: { in: [...TECH_REFUND_REASONS, "FICHE_REJECTED_REFUND"] },
        },
        select: { amount: true, reason: true, metadata: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      const lastRerollRefund = xpHistory
        .filter((entry) => entry.reason === "FICHE_REJECTED_REFUND" && metadataSource(entry.metadata) === REROLL_REFUND_SOURCE)
        .at(-1);
      const refund = xpHistory
        .filter((entry) => {
          return (
            TECH_REFUND_REASONS.includes(entry.reason) &&
            entry.amount < 0 &&
            (!lastRerollRefund || entry.createdAt > lastRerollRefund.createdAt)
          );
        })
        .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
      if (user.xpAvailable + refund < cost) throw new Error("INSUFFICIENT_XP");

      const net = refund - cost;
      const needsDebit = net < 0;
      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          version: user.version,
          ...(needsDebit ? { xpAvailable: { gte: -net } } : {}),
        },
        data: {
          xpAvailable: needsDebit ? { decrement: -net } : { increment: net },
          version: { increment: 1 },
          primaryKg: null,
          primaryAffinity: null,
          kekkeiGenkai: null,
          affinites: { set: [] },
          pactAffinities: { set: [] },
          pactSpecies: null,
          artsState: Prisma.JsonNull,
          progressionState: Prisma.JsonNull,
        },
      });
      if (updated.count === 0) throw new Error("CONFLICT");

      const fichesReset = await tx.ficheTechnique.updateMany({
        where: { authorId: user.id, isActive: true },
        data: {
          isActive: false,
          comment: null,
        },
      });
      const invocationsDeleted = await tx.invocation.deleteMany({ where: { ownerId: user.id } });

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

      if (refund > 0) {
        await tx.xPTransaction.create({
          data: {
            userId: user.id,
            amount: refund,
            reason: "FICHE_REJECTED_REFUND",
            metadata: {
              source: REROLL_REFUND_SOURCE,
              itemKey: item.key,
              itemName: item.name,
              refundedReasons: TECH_REFUND_REASONS,
              since: lastRerollRefund?.createdAt.toISOString() ?? null,
            } as Prisma.InputJsonValue,
          },
        });
      }

      await tx.xPTransaction.create({
        data: {
          userId: user.id,
          amount: -cost,
          reason: "SHOP_SPEND",
          metadata: {
            source: REROLL_REFUND_SOURCE,
            itemKey: item.key,
            itemName: item.name,
            costXp: cost,
            baseCostXp: item.costXp,
            incrementalBaseCostXp: incrementalBaseCost,
            previousPurchases,
            discountRate: hasDiscount ? 0.25 : 0,
            refund,
            net,
            reset: {
              fiches: fichesReset.count,
              invocations: invocationsDeleted.count,
              arts: true,
              progressionTechnique: true,
              identityTechnique: true,
            },
          } as Prisma.InputJsonValue,
        },
      });

      return {
        cost,
        refund,
        net,
        xpAvailable: user.xpAvailable + net,
        fichesReset: fichesReset.count,
        invocationsDeleted: invocationsDeleted.count,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return jsonError(e);
  }
}

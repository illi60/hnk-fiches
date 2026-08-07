import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { loadShopItemByKey } from "@/lib/shop-server";
import {
  SHOP_DISCOUNT_ITEM_KEY,
  SHOP_PROMOTION_CHUNIN_ITEM_KEY,
  SHOP_PROMOTION_JONIN_ITEM_KEY,
  discountedShopCost,
  isConditionUnlockItemKey,
  isGradeServiceItemKey,
  isReconquestItemKey,
  isRerollFtItemKey,
  isShopItemPurchasableForUser,
  nextReconquestItemKey,
} from "@/lib/shop";
import { SHOP_RECONQUEST_STATE_KEY } from "@/lib/shop-reconquest-server";
import { shopCheckoutSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const rl = rateLimit(`shop-checkout:${me.id}`, 8, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = shopCheckoutSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const byKey = new Map<string, number>();
    for (const line of parsed.data.items) {
      byKey.set(line.itemKey, (byKey.get(line.itemKey) ?? 0) + line.quantity);
    }

    const lines = await Promise.all(Array.from(byKey.entries()).map(async ([itemKey, quantity]) => {
      const item = await loadShopItemByKey(itemKey);
      if (!item) throw new Error("NOT_FOUND");
      if (isConditionUnlockItemKey(item.key) || isRerollFtItemKey(item.key)) throw new Error("INELIGIBLE");
      if (item.stock === "UNIQUE" && quantity > 1) throw new Error("DUPLICATE");
      return { item, quantity, subtotal: item.costXp * quantity };
    }));
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: me.id },
        select: {
          id: true,
          xpAvailable: true,
          version: true,
          rangVillage: true,
          rangClan: true,
          rangHistoire: true,
          grade: true,
          username: true,
          inventoryItems: {
            where: { itemKey: { in: [SHOP_PROMOTION_CHUNIN_ITEM_KEY, SHOP_PROMOTION_JONIN_ITEM_KEY] } },
            select: { itemKey: true, quantity: true },
          },
        },
      });
      if (!user) throw new Error("NOT_FOUND");
      const promotionByKey = new Map(user.inventoryItems.map((item) => [item.itemKey, item]));
      const hasChuninPromotion = (promotionByKey.get(SHOP_PROMOTION_CHUNIN_ITEM_KEY)?.quantity ?? 0) > 0;
      const hasJoninPromotion = (promotionByKey.get(SHOP_PROMOTION_JONIN_ITEM_KEY)?.quantity ?? 0) > 0;
      for (const line of lines) {
        if (
          !isShopItemPurchasableForUser(line.item, {
            villageRank: user.rangVillage,
            clanRank: user.rangClan,
            histoireRank: user.rangHistoire,
            grade: user.grade,
            hasChuninPromotion,
            hasJoninPromotion,
          })
        ) {
          throw new Error("INELIGIBLE");
        }
      }
      const reconquestLines = lines.filter((line) => isReconquestItemKey(line.item.key));
      if (reconquestLines.length > 0) {
        if (reconquestLines.length > 1 || reconquestLines.some((line) => line.quantity !== 1)) {
          throw new Error("INELIGIBLE");
        }
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('hnk_shop_reconquest_global'))`;
        const reconquestState = await tx.shopState.upsert({
          where: { key: SHOP_RECONQUEST_STATE_KEY },
          create: {
            key: SHOP_RECONQUEST_STATE_KEY,
            intValue: 0,
            metadata: { scope: "forum" } as Prisma.InputJsonValue,
          },
          update: {},
          select: { intValue: true },
        });
        if (reconquestLines[0].item.key !== nextReconquestItemKey(reconquestState.intValue)) {
          throw new Error("INELIGIBLE");
        }
      }
      const current = await tx.inventoryItem.findMany({
        where: {
          userId: user.id,
          itemKey: { in: Array.from(new Set([...lines.map((line) => line.item.key), SHOP_DISCOUNT_ITEM_KEY])) },
        },
        select: { id: true, itemKey: true, quantity: true },
      });
      const currentByKey = new Map(current.map((item) => [item.itemKey, item]));
      const hasShopDiscount = (currentByKey.get(SHOP_DISCOUNT_ITEM_KEY)?.quantity ?? 0) > 0;
      const pricedLines = lines.map((line) => {
        const unitCost = discountedShopCost(line.item, hasShopDiscount);
        return { ...line, unitCost, subtotal: unitCost * line.quantity };
      });
      const discountedTotal = pricedLines.reduce((sum, line) => sum + line.subtotal, 0);
      if (user.xpAvailable < discountedTotal) throw new Error("INSUFFICIENT_XP");

      for (const line of pricedLines) {
        const owned = currentByKey.get(line.item.key);
        if (line.item.stock === "UNIQUE" && owned && owned.quantity > 0) {
          throw new Error("DUPLICATE");
        }
      }

      const updated = await tx.user.updateMany({
        where: { id: user.id, version: user.version },
        data: {
          xpAvailable: { decrement: discountedTotal },
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) throw new Error("CONFLICT");

      for (const line of pricedLines) {
        const owned = currentByKey.get(line.item.key);
        if (owned) {
          await tx.inventoryItem.update({
            where: { id: owned.id },
            data: {
              itemName: line.item.name,
              costXp: line.unitCost,
              quantity: { increment: line.quantity },
            },
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              userId: user.id,
              itemKey: line.item.key,
              itemName: line.item.name,
              costXp: line.unitCost,
              quantity: line.quantity,
            },
          });
        }
      }

      await tx.xPTransaction.create({
        data: {
          userId: user.id,
          amount: -discountedTotal,
          reason: "SHOP_SPEND",
          metadata: {
            total: discountedTotal,
            baseTotal: total,
            discountRate: hasShopDiscount ? 0.25 : 0,
            items: pricedLines.map((line) => ({
              itemKey: line.item.key,
              itemName: line.item.name,
              costXp: line.unitCost,
              baseCostXp: line.item.costXp,
              quantity: line.quantity,
              subtotal: line.subtotal,
            })),
          } as Prisma.InputJsonValue,
        },
      });

      const reconquestLine = pricedLines.find((line) => isReconquestItemKey(line.item.key));
      const gradeLines = pricedLines.filter((line) => isGradeServiceItemKey(line.item.key));
      if (reconquestLine) {
        const nextReconquestState = await tx.shopState.update({
          where: { key: SHOP_RECONQUEST_STATE_KEY },
          data: { intValue: { increment: 1 } },
          select: { intValue: true },
        });
        await tx.adminAlert.create({
          data: {
            userId: user.id,
            kind: "SHOP_RECONQUEST",
            title: "Reconquête de Contrée achetée",
            body: `${user.username} a acheté ${reconquestLine.item.name}. Le palier de Reconquête de Contrée suivant est maintenant disponible pour tout le forum.`,
            itemKey: reconquestLine.item.key,
            itemName: reconquestLine.item.name,
            costXp: reconquestLine.unitCost,
            metadata: {
              scope: "forum",
              progress: nextReconquestState.intValue,
              nextItemKey: nextReconquestItemKey(nextReconquestState.intValue),
            } as Prisma.InputJsonValue,
          },
        });
      }
      if (gradeLines.length > 0) {
        await tx.adminAlert.createMany({
          data: gradeLines.map((line) => ({
            userId: user.id,
            kind: "SHOP_GRADE_REQUEST",
            title: "Demande de grade achetée",
            body: `${user.username} a acheté ${line.item.name}. Le joueur doit poster sa demande dans Demandes Diverses sur le forum.`,
            itemKey: line.item.key,
            itemName: line.item.name,
            costXp: line.unitCost,
            metadata: {
              scope: "forum",
              destination: "Demandes Diverses",
              quantity: line.quantity,
            } as Prisma.InputJsonValue,
          })),
        });
      }

      const notices = [
        reconquestLine
          ? "Reconquête achetée. Le staff a été alerté : poste maintenant ta demande dans la section concernée du forum pour récupérer la zone perdue."
          : null,
        gradeLines.length > 0
          ? "Demande de grade achetée. Le staff a été alerté : pense à poster ta demande dans la section Demandes Diverses du forum pour que le changement soit traité."
          : null,
      ].filter((notice): notice is string => !!notice);

      return {
        xpAvailable: user.xpAvailable - discountedTotal,
        total: discountedTotal,
        notice: notices.length > 0 ? notices.join("\n\n") : null,
        noticeTitle: reconquestLine && gradeLines.length > 0 ? "Achats spéciaux validés" : reconquestLine ? "Reconquête achetée" : gradeLines.length > 0 ? "Demande de grade achetée" : null,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return jsonError(e);
  }
}

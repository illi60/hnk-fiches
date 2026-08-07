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
import { shopPurchaseSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const rl = rateLimit(`shop:${me.id}`, 12, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = shopPurchaseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const item = await loadShopItemByKey(parsed.data.itemKey);
    if (!item) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    if (isConditionUnlockItemKey(item.key) || isRerollFtItemKey(item.key)) {
      return NextResponse.json({ ok: false, error: "INELIGIBLE" }, { status: 400 });
    }

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
      if (
        !isShopItemPurchasableForUser(item, {
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
      if (isReconquestItemKey(item.key)) {
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
        if (item.key !== nextReconquestItemKey(reconquestState.intValue)) {
          throw new Error("INELIGIBLE");
        }
      }
      const current = await tx.inventoryItem.findUnique({
        where: { userId_itemKey: { userId: user.id, itemKey: item.key } },
        select: { id: true, quantity: true },
      });
      const discountItem =
        item.key === SHOP_DISCOUNT_ITEM_KEY
          ? current
          : await tx.inventoryItem.findUnique({
              where: { userId_itemKey: { userId: user.id, itemKey: SHOP_DISCOUNT_ITEM_KEY } },
              select: { quantity: true },
            });
      const hasShopDiscount = (discountItem?.quantity ?? 0) > 0;
      const unitCost = discountedShopCost(item, hasShopDiscount);
      if (user.xpAvailable < unitCost) throw new Error("INSUFFICIENT_XP");

      if (item.stock === "UNIQUE" && current && current.quantity > 0) {
        throw new Error("DUPLICATE");
      }

      const updated = await tx.user.updateMany({
        where: { id: user.id, version: user.version },
        data: {
          xpAvailable: { decrement: unitCost },
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) throw new Error("CONFLICT");

      const inventoryItem = current
        ? await tx.inventoryItem.update({
            where: { id: current.id },
            data: {
              itemName: item.name,
              costXp: unitCost,
              quantity: { increment: 1 },
            },
          })
        : await tx.inventoryItem.create({
            data: {
              userId: user.id,
              itemKey: item.key,
              itemName: item.name,
              costXp: unitCost,
              quantity: 1,
            },
          });

      await tx.xPTransaction.create({
        data: {
          userId: user.id,
          amount: -unitCost,
          reason: "SHOP_SPEND",
          metadata: {
            itemKey: item.key,
            itemName: item.name,
            costXp: unitCost,
            baseCostXp: item.costXp,
            discountRate: hasShopDiscount ? 0.25 : 0,
          } as Prisma.InputJsonValue,
        },
      });

      if (isReconquestItemKey(item.key)) {
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
            body: `${user.username} a acheté ${item.name}. Le palier de Reconquête de Contrée suivant est maintenant disponible pour tout le forum.`,
            itemKey: item.key,
            itemName: item.name,
            costXp: unitCost,
            metadata: {
              scope: "forum",
              progress: nextReconquestState.intValue,
              nextItemKey: nextReconquestItemKey(nextReconquestState.intValue),
            } as Prisma.InputJsonValue,
          },
        });
      }
      if (isGradeServiceItemKey(item.key)) {
        await tx.adminAlert.create({
          data: {
            userId: user.id,
            kind: "SHOP_GRADE_REQUEST",
            title: "Demande de grade achetée",
            body: `${user.username} a acheté ${item.name}. Le joueur doit poster sa demande dans Demandes Diverses sur le forum.`,
            itemKey: item.key,
            itemName: item.name,
            costXp: unitCost,
            metadata: {
              scope: "forum",
              destination: "Demandes Diverses",
              quantity: 1,
            } as Prisma.InputJsonValue,
          },
        });
      }

      const nextUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { xpAvailable: true },
      });
      const notices = [
        isReconquestItemKey(item.key)
          ? "Reconquête achetée. Le staff a été alerté : poste maintenant ta demande dans la section concernée du forum pour récupérer la zone perdue."
          : null,
        isGradeServiceItemKey(item.key)
          ? "Demande de grade achetée. Le staff a été alerté : pense à poster ta demande dans la section Demandes Diverses du forum pour que le changement soit traité."
          : null,
      ].filter((notice): notice is string => !!notice);

      return {
        inventoryItem,
        xpAvailable: nextUser?.xpAvailable ?? user.xpAvailable - unitCost,
        notice: notices.length > 0 ? notices.join("\n\n") : null,
        noticeTitle: isReconquestItemKey(item.key) && isGradeServiceItemKey(item.key) ? "Achats spéciaux validés" : isReconquestItemKey(item.key) ? "Reconquête achetée" : isGradeServiceItemKey(item.key) ? "Demande de grade achetée" : null,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return jsonError(e);
  }
}

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { SHOP_RECONQUEST_STATE_KEY } from "@/lib/shop-reconquest-server";

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (action !== "decrement" && action !== "reset") {
      return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    }

    const state = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('hnk_shop_reconquest_global'))`;
      const current = await tx.shopState.upsert({
        where: { key: SHOP_RECONQUEST_STATE_KEY },
        create: {
          key: SHOP_RECONQUEST_STATE_KEY,
          intValue: 0,
          metadata: { scope: "forum" } as Prisma.InputJsonValue,
        },
        update: {},
        select: { intValue: true },
      });

      const nextValue = action === "reset" ? 0 : Math.max(0, current.intValue - 1);
      const updated = await tx.shopState.update({
        where: { key: SHOP_RECONQUEST_STATE_KEY },
        data: {
          intValue: nextValue,
          metadata: {
            scope: "forum",
            lastAdminAction: action,
            lastAdminId: admin.id,
          } as Prisma.InputJsonValue,
        },
        select: { intValue: true },
      });

      await tx.adminAlert.create({
        data: {
          userId: admin.id,
          kind: "SHOP_RECONQUEST_ADMIN",
          title: action === "reset" ? "Reconquêtes de Contrée remises à zéro" : "Reconquêtes de Contrée baissées d'un palier",
          body:
            action === "reset"
              ? `${admin.username} a remis à zéro le palier global des Reconquêtes de Contrée.`
              : `${admin.username} a baissé d'un palier le compteur global des Reconquêtes de Contrée.`,
          metadata: {
            scope: "forum",
            previousValue: current.intValue,
            nextValue: updated.intValue,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });

    return NextResponse.json({ ok: true, progress: state.intValue });
  } catch (e) {
    return jsonError(e);
  }
}

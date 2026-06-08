import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { progressionActionSchema } from "@/lib/validators";
import {
  quoteQuintessence,
  applyQuintessence,
  type ProgressionState,
  type QuintessenceKind,
} from "@/lib/quintessence";

export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const rl = rateLimit(`prog:${me.id}`, 20, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = progressionActionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    const action = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: {
        id: true,
        xpAvailable: true,
        version: true,
        rangVillage: true,
        rangClan: true,
        rangHistoire: true,
        progressionState: true,
      },
    });
    if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const state = ((user.progressionState ?? {}) as unknown) as ProgressionState;

    // Emprunter une voie : désormais réservé au staff (débloqué à la main via le
    // panel admin). Le joueur ne peut plus engager un mode lui-même.
    if (action.type === "engageMode") {
      return NextResponse.json({ ok: false, error: "RESERVE_STAFF" }, { status: 403 });
    }

    // Achat de Quintessence (XP).
    const quintAction = { kind: action.kind as QuintessenceKind, target: action.target };
    const quote = quoteQuintessence(quintAction, state, {
      xpAvailable: user.xpAvailable,
      rangVillage: user.rangVillage,
      rangClan: user.rangClan,
      rangHistoire: user.rangHistoire,
    });
    if (!quote.ok) {
      return NextResponse.json({ ok: false, error: quote.error, cost: quote.cost }, { status: 400 });
    }
    const next = applyQuintessence(quintAction, state);

    await prisma.$transaction(async (tx) => {
      const upd = await tx.user.updateMany({
        where: { id: user.id, version: user.version },
        data: {
          xpAvailable: { decrement: quote.cost },
          version: { increment: 1 },
          progressionState: next as unknown as Prisma.InputJsonValue,
        },
      });
      if (upd.count === 0) throw new Error("CONFLICT");
      await tx.xPTransaction.create({
        data: {
          userId: user.id,
          amount: -quote.cost,
          reason: "QUINTESSENCE_SPEND",
          metadata: quintAction as unknown as Prisma.InputJsonValue,
        },
      });
    });

    return NextResponse.json({ ok: true, cost: quote.cost });
  } catch (e) {
    if (e instanceof Error && e.message === "CONFLICT") {
      return NextResponse.json({ ok: false, error: "CONFLICT" }, { status: 409 });
    }
    return jsonError(e);
  }
}

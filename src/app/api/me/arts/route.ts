import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { artActionSchema } from "@/lib/validators";
import { quoteAction, applyAction, getArtState, type ArtsState, type ArtAction } from "@/lib/arts";

// POST /api/me/arts — dépense XP du joueur sur ses Arts Shinobi.
// Le client n'envoie qu'une INTENTION ({type, art, spec}). Le serveur
// recalcule le coût (lib/arts), vérifie l'XP, applique en transaction
// avec verrou optimiste (version) et journalise une XPTransaction.
export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const rl = rateLimit(`arts:${me.id}`, 20, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = artActionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    const action = parsed.data as ArtAction;

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: {
        id: true,
        xpAvailable: true,
        version: true,
        rang: true,
        rangHistoire: true,
        artsState: true,
      },
    });
    if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const state = ((user.artsState ?? {}) as unknown) as ArtsState;

    // Choix de la spé principale : gratuit + IRRÉVERSIBLE.
    if (action.type === "choosePrimary") {
      if (getArtState(state, action.art).primarySpec !== undefined)
        return NextResponse.json({ ok: false, error: "DEJA_CHOISIE" }, { status: 409 });
      const newState = applyAction(action, state, user.rang);
      await prisma.user.update({
        where: { id: user.id },
        data: { artsState: newState as unknown as Prisma.InputJsonValue },
      });
      return NextResponse.json({ ok: true });
    }

    // Débloquer / libérer un Art : gratuit (pas d'XP), validé puis appliqué.
    if (action.type === "selectArt" || action.type === "deselectArt") {
      const q = quoteAction(action, state, {
        villageRank: user.rang,
        histoireRank: user.rangHistoire,
        xpAvailable: user.xpAvailable,
      });
      if (!q.ok) return NextResponse.json({ ok: false, error: q.error }, { status: 400 });
      const newState = applyAction(action, state, user.rang);
      await prisma.user.update({
        where: { id: user.id },
        data: { artsState: newState as unknown as Prisma.InputJsonValue },
      });
      return NextResponse.json({ ok: true });
    }

    const quote = quoteAction(action, state, {
      villageRank: user.rang,
      histoireRank: user.rangHistoire,
      xpAvailable: user.xpAvailable,
    });
    if (!quote.ok) {
      return NextResponse.json({ ok: false, error: quote.error, cost: quote.cost }, { status: 400 });
    }

    const newState = applyAction(action, state, user.rang);

    await prisma.$transaction(async (tx) => {
      const upd = await tx.user.updateMany({
        where: { id: user.id, version: user.version },
        data: {
          xpAvailable: { decrement: quote.cost },
          version: { increment: 1 },
          artsState: newState as unknown as Prisma.InputJsonValue,
        },
      });
      if (upd.count === 0) throw new Error("CONFLICT");

      await tx.xPTransaction.create({
        data: {
          userId: user.id,
          amount: -quote.cost,
          reason: "ARTS_SPEND",
          metadata: action as unknown as Prisma.InputJsonValue,
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

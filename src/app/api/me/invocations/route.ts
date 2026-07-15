import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { invocationSchema } from "@/lib/validators";
import { getArtState, invocationMaxRank, rankIndex, type ArtsState } from "@/lib/arts";
import { getProgression, ownedKgsFull, type ProgressionState } from "@/lib/quintessence";
import { hasInvocationRankColumn } from "@/lib/invocation-schema";

const MAX_INVOCATIONS = 12;

export async function GET() {
  try {
    const me = await requireUser();
    const hasInvRank = await hasInvocationRankColumn();
    const invocations = await prisma.invocation.findMany({
      where: { ownerId: me.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nom: true,
        espece: true,
        artShinobi: true,
        kekkeiGenkai: true,
        image: true,
        description: true,
        techniques: true,
        ...(hasInvRank ? { invocationRank: true } : {}),
      },
    });
    return NextResponse.json({ invocations });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const rl = rateLimit(`invoc-create:${me.id}`, 15, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: {
        artsState: true,
        progressionState: true,
        primaryKg: true,
        kekkeiGenkai: true,
        pactSpecies: true,
        rang: true,
      },
    });
    const state = ((user?.artsState ?? {}) as unknown) as ArtsState;
    if (!getArtState(state, "kuchiyose").unlocked) {
      return NextResponse.json({ ok: false, error: "KUCHIYOSE_LOCKED" }, { status: 403 });
    }

    const count = await prisma.invocation.count({ where: { ownerId: me.id } });
    if (count >= MAX_INVOCATIONS) {
      return NextResponse.json({ ok: false, error: "MAX" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = invocationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    const d = parsed.data;
    const hasInvRank = await hasInvocationRankColumn();

    // KG d'invocation : seulement au Mode Ermite PARFAIT (stade 3), et uniquement
    // parmi les KG du joueur lui-même.
    const prog = getProgression((user?.progressionState ?? {}) as unknown as ProgressionState);
    const ermitePerfect = prog.mode?.path === "ERMITE" && (prog.mode?.stage ?? 0) >= 3;
    const maxRank = invocationMaxRank(user?.rang ?? null, prog.mode?.path === "ERMITE");
    const ownedKg = ownedKgsFull(user?.primaryKg, prog, user?.kekkeiGenkai).map((k) => k.toLowerCase());
    const kgEff =
      ermitePerfect && d.kekkeiGenkai && ownedKg.includes(d.kekkeiGenkai.toLowerCase())
        ? d.kekkeiGenkai
        : null;
    const rank = d.invocationRank ?? maxRank;
    if (rankIndex(rank) > rankIndex(maxRank)) {
      return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    }

    const invocation = await prisma.invocation.create({
      data: {
        ownerId: me.id,
        nom: d.nom,
        ...(hasInvRank ? { invocationRank: rank } : {}),
        // Espèce héritée du pacte (verrouillée) si définie.
        espece: user?.pactSpecies ?? (d.espece || null),
        artShinobi: d.artShinobi || null,
        kekkeiGenkai: kgEff,
        image: d.image || null,
        description: d.description || null,
        techniques: (d.techniques ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ ok: true, invocation });
  } catch (e) {
    return jsonError(e);
  }
}

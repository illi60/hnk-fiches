import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { progressionLevelupSchema } from "@/lib/validators";
import { RANKS, rankIndex, palierAt, type ProgTrack, type Rank } from "@/lib/progression";
import { effectiveCommRankForUserTrack } from "@/lib/progression-server";

// POST /api/me/progression/levelup
// « Dépenser X XP pour monter en Rang » : raccourci individuel. Prélève l'XP du
// palier suivant et fait monter le rang personnel de la voie.
//   - Village/Clan : nécessite que le rang communautaire effectif soit atteint.
//   - Histoire : aucun gate communautaire.
// Débit atomique sous optimistic lock (version), comme les autres dépenses XP.
export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const rl = rateLimit(`prog-levelup:${me.id}`, 10, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = progressionLevelupSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    const track = parsed.data.track as ProgTrack;

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: {
        id: true,
        version: true,
        xpAvailable: true,
        clan: true,
        rangVillage: true,
        rangClan: true,
        rangHistoire: true,
      },
    });
    if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if (track === "CLAN" && !user.clan?.trim()) {
      return NextResponse.json({ error: "CLAN_REQUIS" }, { status: 400 });
    }

    const current = (
      track === "VILLAGE" ? user.rangVillage : track === "CLAN" ? user.rangClan : user.rangHistoire
    ) as Rank | null;
    const curIdx = rankIndex(current ?? "E");
    if (curIdx >= RANKS.length - 1) {
      return NextResponse.json({ error: "RANG_MAX" }, { status: 409 });
    }
    const nextRank = RANKS[curIdx + 1];

    // Gate communautaire (Village/Clan).
    if (track !== "HISTOIRE") {
      const commRank = await effectiveCommRankForUserTrack(track, user.clan);
      if (rankIndex(commRank) < curIdx + 1) {
        return NextResponse.json({ error: "COMMUNAUTE_REQUISE" }, { status: 409 });
      }
    }

    // Coût XP du palier visé.
    const palier = palierAt(track, nextRank);
    const cost = palier?.individual?.xp ?? 0;
    if (cost <= 0) return NextResponse.json({ error: "PALIER_SANS_XP" }, { status: 409 });
    if (user.xpAvailable < cost) {
      return NextResponse.json({ error: "INSUFFICIENT_XP", cost }, { status: 402 });
    }

    const data: Prisma.UserUpdateManyMutationInput = {
      xpAvailable: { decrement: cost },
      version: { increment: 1 },
    };
    if (track === "VILLAGE") data.rangVillage = nextRank;
    else if (track === "CLAN") data.rangClan = nextRank;
    else data.rangHistoire = nextRank;

    await prisma.$transaction(async (tx) => {
      const upd = await tx.user.updateMany({
        // Garde DB anti-sur-dépense : le solde doit toujours couvrir le coût.
        where: { id: user.id, version: user.version, xpAvailable: { gte: cost } },
        data,
      });
      if (upd.count === 0) throw new Error("CONFLICT");
      await tx.xPTransaction.create({
        data: {
          userId: user.id,
          amount: -cost,
          reason: "PROGRESSION_SPEND",
          metadata: { track, rank: nextRank } as unknown as Prisma.InputJsonValue,
        },
      });
    });

    return NextResponse.json({ ok: true, rank: nextRank, cost });
  } catch (e) {
    if (e instanceof Error && e.message === "CONFLICT") {
      return NextResponse.json({ error: "CONFLICT" }, { status: 409 });
    }
    return jsonError(e);
  }
}

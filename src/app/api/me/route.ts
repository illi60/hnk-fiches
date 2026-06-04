import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { levelProgress, rangFromLevel } from "@/lib/xp";
import { getOrSyncUser } from "@/lib/forum-sync";

export async function GET() {
  try {
    const me = await requireUser();

    // Read-through : resync forum si le cache DB a dépassé le TTL (15 min).
    // Best-effort + timeout : on ne bloque jamais le dashboard sur un forum lent,
    // on sert alors les dernières données connues en cache.
    try {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 6000);
      await getOrSyncUser(me.id, { signal: ac.signal });
      clearTimeout(to);
    } catch {
      // forum injoignable/lent → on continue avec le cache
    }

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        xpAvailable: true,
        xpTotalEarned: true,
        clan: true,
        rang: true,
        grade: true,
        uniteSpeciale: true,
        trame: true,
        prime: true,
        age: true,
        genre: true,
        kekkeiGenkai: true,
        affinites: true,
        forumProfileUrl: true,
        forumPseudo: true,
        forumAvatar: true,
        forumLastXp: true,
        forumLastSyncAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // Dérivés serveur — JAMAIS stockés en DB.
    const progress = levelProgress(user.xpTotalEarned);
    const rangDerived = rangFromLevel(progress.level);

    return NextResponse.json({
      user,
      derived: {
        level: progress.level,
        levelRatio: progress.ratio,
        levelCurrent: progress.current,
        levelNext: progress.next,
        rangDerived,
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}

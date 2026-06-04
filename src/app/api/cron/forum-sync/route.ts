// ============================================================
// Cron quotidien — synchronisation des XP/RP depuis le forum.
//
// Sécurité : Authorization: Bearer ${CRON_SECRET}
// Throttle : 1 user à la fois, ~1.5s entre chaque (anti
//            anti-scraper Forumactif — cf. CdC §20.9).
// Quota   : on traite au plus BATCH_SIZE users par run, triés
//           par forumLastSyncAt ASC (les plus anciens d'abord).
//           Le read-through côté dashboard/profil garde les actifs frais ;
//           ce cron rattrape surtout les comptes inactifs.
// ============================================================

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { syncUserFromForum } from "@/lib/forum-sync";

const BATCH_SIZE = 20;
const DELAY_MS = 1500;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const candidates = await prisma.user.findMany({
    where: { forumUserId: { not: null } },
    orderBy: [{ forumLastSyncAt: { sort: "asc", nulls: "first" } }],
    take: BATCH_SIZE,
    select: { id: true },
  });

  const outcomes: Array<{ userId: string; ok: boolean; error?: string; delta?: number }> = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const result = await syncUserFromForum(c.id);
    outcomes.push(result);
    if (i < candidates.length - 1) await sleep(DELAY_MS);
  }

  return NextResponse.json({
    processed: outcomes.length,
    succeeded: outcomes.filter((o) => o.ok).length,
    failed: outcomes.filter((o) => !o.ok).length,
    outcomes,
  });
}

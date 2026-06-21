import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { progressionBatchSchema } from "@/lib/validators";
import { normalizeRpUrl } from "@/lib/progression";
import {
  attemptSubmission,
  loadRpReuseState,
  makeCommRankResolver,
  type SubmitUser,
} from "@/lib/progression-server";

// POST /api/me/progression/submit-batch
// Coche UN même RP sur PLUSIEURS conditions d'un coup. Chaque condition est
// évaluée indépendamment (gating, anti-réutilisation, anti-empilement) ;
// la réponse détaille le résultat par condition.
export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const rl = rateLimit(`prog-submit:${me.id}`, 40, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = progressionBatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    const { condIds, rpTitle, rpUrl, comment } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { clan: true, rangVillage: true, rangClan: true, rangHistoire: true },
    });
    if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const rpKey = normalizeRpUrl(rpUrl);
    const reuse = await loadRpReuseState(me.id, rpKey);
    const effCommRank = makeCommRankResolver(user.clan);

    const uniqueIds = Array.from(new Set(condIds));
    const results: { condId: string; ok: boolean; error?: string }[] = [];
    let created = 0;
    for (const condId of uniqueIds) {
      const res = await attemptSubmission({
        userId: me.id,
        user: user as SubmitUser,
        condId,
        rpKey,
        rpTitle: rpTitle?.trim() || null,
        comment: comment?.trim() || null,
        effCommRank,
        reuse,
      });
      results.push({ condId, ok: res.ok, error: res.error });
      if (res.ok) created += 1;
    }

    return NextResponse.json({ ok: true, created, results });
  } catch (e) {
    return jsonError(e);
  }
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { progressionSubmitSchema } from "@/lib/validators";
import { normalizeRpUrl, type Rank } from "@/lib/progression";
import {
  attemptSubmission,
  loadRpReuseState,
  makeCommRankResolver,
  type SubmitUser,
} from "@/lib/progression-server";

// POST /api/me/progression/submit
// Soumet UN RP pour UNE condition (validation staff). Cœur partagé avec le
// flux multi-conditions (/submit-batch) via attemptSubmission().
export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const rl = rateLimit(`prog-submit:${me.id}`, 40, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = progressionSubmitSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    const { condId, rpTitle, rpUrl, comment, collaborators } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { username: true, clan: true, rangVillage: true, rangClan: true, rangHistoire: true },
    });
    if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const rpKey = normalizeRpUrl(rpUrl);
    const reuse = await loadRpReuseState(me.id, rpKey);

    const res = await attemptSubmission({
      userId: me.id,
      user: user as SubmitUser,
      condId,
      rpKey,
      rpTitle: rpTitle?.trim() || null,
      comment: comment.trim(),
      collaborators,
      effCommRank: makeCommRankResolver(user.clan),
      reuse,
    });

    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

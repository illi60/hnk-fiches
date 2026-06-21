import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { communityRankSchema } from "@/lib/validators";
import { clanScopeKey, VILLAGE_SCOPE_KEY } from "@/lib/progression";
import { recomputeRanks, clanMemberIds } from "@/lib/progression-server";

// POST /api/admin/progression/rank
// Staff (ADMIN) : pose le rang communautaire « de base » du village ou d'un clan.
// Le rang effectif affiché reste max(base, dérivé des conditions remplies).
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = communityRankSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    const { scopeType, baseRank } = parsed.data;

    const scopeKey =
      scopeType === "VILLAGE" ? VILLAGE_SCOPE_KEY : clanScopeKey(parsed.data.scopeKey);
    if (!scopeKey) return NextResponse.json({ error: "SCOPE_INVALIDE" }, { status: 400 });

    await prisma.communityRank.upsert({
      where: { scopeType_scopeKey: { scopeType, scopeKey } },
      create: { scopeType, scopeKey, baseRank },
      update: { baseRank },
    });

    // Le rang communautaire de base a changé → auto-promotion des membres concernés.
    try {
      if (scopeType === "VILLAGE") {
        await recomputeRanks("all");
      } else {
        await recomputeRanks(await clanMemberIds(scopeKey));
      }
    } catch (err) {
      console.error("[progression rank] recompute failed", err);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

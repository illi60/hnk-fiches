import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireFicheModerator, jsonError } from "@/lib/permissions";
import { progressionConditionSchema } from "@/lib/validators";
import { condMeta, clanScopeKey, VILLAGE_SCOPE_KEY } from "@/lib/progression";
import { recomputeRanks, clanMemberIds } from "@/lib/progression-server";

// POST /api/admin/progression/condition
// Staff : valide (ou dévalide) DIRECTEMENT une condition communautaire « gérée
// par le staff » (ex : « Atteindre N réponses RP postées »), sans soumission
// d'un membre. Matérialisé par une soumission VALIDATED (auteur = le staff).
export async function POST(req: Request) {
  try {
    const me = await requireFicheModerator();

    const body = await req.json().catch(() => null);
    const parsed = progressionConditionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    const { scopeType, condId, validated } = parsed.data;

    const meta = condMeta(condId);
    if (!meta || meta.tier !== "COMMUNITY" || !meta.adminManaged) {
      return NextResponse.json({ error: "CONDITION_INVALIDE" }, { status: 400 });
    }
    if (meta.track !== scopeType) {
      return NextResponse.json({ error: "SCOPE_INCOHERENT" }, { status: 400 });
    }

    const scopeKey =
      scopeType === "VILLAGE" ? VILLAGE_SCOPE_KEY : clanScopeKey(parsed.data.scopeKey);
    if (!scopeKey) return NextResponse.json({ error: "SCOPE_INVALIDE" }, { status: 400 });

    if (validated) {
      // S'assure qu'une (et une seule) validation existe pour ce scope.
      const existing = await prisma.progressionSubmission.findFirst({
        where: { track: meta.track, tier: "COMMUNITY", condId, scopeKey, status: "VALIDATED" },
        select: { id: true },
      });
      if (!existing) {
        await prisma.progressionSubmission.create({
          data: {
            userId: me.id,
            track: meta.track,
            tier: "COMMUNITY",
            targetRank: meta.rank,
            condId,
            scopeKey,
            status: "VALIDATED",
            reviewedById: me.id,
            reviewedAt: new Date(),
            comment: "Validée directement par le staff.",
          },
        });
      }
    } else {
      // Retire toute validation (et soumissions résiduelles) de cette condition.
      await prisma.progressionSubmission.deleteMany({
        where: { track: meta.track, tier: "COMMUNITY", condId, scopeKey },
      });
    }

    // Le rang communautaire a pu changer → auto-promotion des membres du scope.
    try {
      if (scopeType === "VILLAGE") await recomputeRanks("all");
      else await recomputeRanks(await clanMemberIds(scopeKey));
    } catch (err) {
      console.error("[progression condition] recompute failed", err);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

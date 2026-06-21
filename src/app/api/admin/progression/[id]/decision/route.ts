import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireFicheModerator, jsonError } from "@/lib/permissions";
import { progressionDecisionSchema } from "@/lib/validators";
import { recomputeRanks, clanMemberIds } from "@/lib/progression-server";

// POST /api/admin/progression/[id]/decision
// Staff (ADMIN ou TECH_MOD) : valide ou refuse une soumission de condition.
// Pas de mouvement d'XP ici : une condition de progression ne coûte pas d'XP
// (le raccourci « Dépenser X XP pour monter » est une voie distincte, gérée
// par le staff via le panneau joueur). La promotion effective du rang
// (rangVillage/rangClan/rangHistoire) reste une action staff côté admin.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireFicheModerator();
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const parsed = progressionDecisionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    const { decision, reason } = parsed.data;

    const sub = await prisma.progressionSubmission.findUnique({
      where: { id },
      select: { id: true, status: true, tier: true, track: true, scopeKey: true, userId: true },
    });
    if (!sub) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (sub.status !== "PENDING") {
      return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
    }

    if (decision === "REJECT" && !reason?.trim()) {
      return NextResponse.json({ error: "MOTIF_REQUIS" }, { status: 400 });
    }

    await prisma.progressionSubmission.update({
      where: { id },
      data: {
        status: decision === "VALIDATE" ? "VALIDATED" : "REJECTED",
        rejectionReason: decision === "REJECT" ? reason!.trim() : null,
        reviewedById: me.id,
        reviewedAt: new Date(),
      },
    });

    // Auto-promotion des rangs personnels après une VALIDATION :
    //  - individuelle → recalcule le seul auteur.
    //  - communautaire → le rang communautaire a pu monter, ce qui débloque des
    //    paliers pour tout le scope (village = tous · clan = ses membres).
    if (decision === "VALIDATE") {
      try {
        if (sub.tier === "INDIVIDUAL") {
          await recomputeRanks([sub.userId]);
        } else if (sub.track === "VILLAGE") {
          await recomputeRanks("all");
        } else {
          await recomputeRanks(await clanMemberIds(sub.scopeKey));
        }
      } catch (err) {
        // L'auto-promotion ne doit jamais faire échouer la validation elle-même.
        console.error("[progression decision] recompute failed", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

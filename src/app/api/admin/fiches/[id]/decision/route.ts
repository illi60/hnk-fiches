import { validateFiche } from "@/lib/fiche-validation-server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireFicheModerator, jsonError } from "@/lib/permissions";
import { adminFicheValidateSchema } from "@/lib/validators";

// POST /api/admin/fiches/[id]/decision
//
// Body : { decision: "VALIDATE" | "REJECT", reason?, costOverride? }
//
// VALIDATE :
//   - recalcule le coût serveur depuis rangMin (ou costOverride)
//   - vérifie xpAvailable >= cost (sinon INSUFFICIENT_XP)
//   - $transaction + optimistic lock : décrémente xpAvailable,
//     incrémente version, crée XPTransaction FICHE_VALIDATED,
//     passe la fiche en VALIDATED
//
// REJECT :
//   - status → REJECTED, motif obligatoire (raison >= 1 car)
//   - PAS de mouvement XP (rien n'avait été débité)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireFicheModerator();
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const parsed = adminFicheValidateSchema.safeParse({ ...body, ficheId: id });
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

    const { decision, reason, costOverride } = parsed.data;

    if (decision === "REJECT") {
      if (!reason || reason.trim().length < 3) {
        return NextResponse.json({ error: "INVALID" }, { status: 400 });
      }
      const updated = await prisma.ficheTechnique.updateMany({
        where: { id, status: "PENDING", isActive: true },
        data: {
          status: "REJECTED",
          rejectionReason: reason.trim(),
          comment: null,
          validatedById: admin.id,
          validatedAt: new Date(),
        },
      });
      if (updated.count === 0) return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
      return NextResponse.json({ ok: true, decision: "REJECTED" });
    }

    const result = await validateFiche(admin.id, id, costOverride);

    if ((result as { autoRejected?: boolean }).autoRejected) {
      return NextResponse.json({ ok: true, decision: "REJECTED", ...result });
    }
    return NextResponse.json({ ok: true, decision: "VALIDATED", ...result });
  } catch (e) {
    return jsonError(e);
  }
}

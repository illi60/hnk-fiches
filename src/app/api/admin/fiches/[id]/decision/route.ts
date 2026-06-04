import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireFicheModerator, jsonError } from "@/lib/permissions";
import { adminFicheValidateSchema } from "@/lib/validators";
import { defaultFicheCost } from "@/lib/xp";
import { ficheTotalCost } from "@/lib/techniques";

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
          validatedById: admin.id,
          validatedAt: new Date(),
        },
      });
      if (updated.count === 0) return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
      return NextResponse.json({ ok: true, decision: "REJECTED" });
    }

    // VALIDATE
    const result = await prisma.$transaction(async (tx) => {
      const fiche = await tx.ficheTechnique.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          rangMin: true,
          actionType: true,
          nature: true,
          authorId: true,
          collaboratorIds: true,
          isActive: true,
        },
      });
      if (!fiche || !fiche.isActive) throw new Error("NOT_FOUND");
      if (fiche.status !== "PENDING") throw new Error("INVALID_STATE");
      const ficheId = fiche.id;

      // Coût final : override admin, sinon coût du type d'action (cohérent avec
      // la création), sinon repli sur l'ancien barème de rang.
      const base =
        ficheTotalCost(fiche.actionType, fiche.nature) || defaultFicheCost(fiche.rangMin ?? null);
      const finalCost = costOverride !== undefined ? costOverride : base;

      // Participants : auteur + partenaires (type d'action COLLECTIVE).
      const partnerIds =
        fiche.actionType === "COLLECTIVE"
          ? Array.from(new Set(fiche.collaboratorIds)).filter((pid) => pid !== fiche.authorId)
          : [];
      const participantIds = [fiche.authorId, ...partnerIds];

      // Débit (avec verrou optimiste) — helper local.
      async function debit(userId: string, amount: number, role: string) {
        if (amount <= 0) return;
        const u = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, version: true, xpAvailable: true },
        });
        if (!u) throw new Error("NOT_FOUND");
        if (u.xpAvailable < amount) throw new Error("INSUFFICIENT_XP");
        const upd = await tx.user.updateMany({
          where: { id: u.id, version: u.version, xpAvailable: { gte: amount } },
          data: { xpAvailable: { decrement: amount }, version: { increment: 1 } },
        });
        if (upd.count === 0) throw new Error("CONFLICT");
        await tx.xPTransaction.create({
          data: {
            userId: u.id,
            actorId: admin.id,
            amount: -amount,
            reason: "FICHE_VALIDATED",
            metadata: { ficheId, role },
          },
        });
      }

      if (finalCost > 0) {
        if (fiche.actionType === "COLLECTIVE" && participantIds.length > 1) {
          // Vérifier que tous les partenaires existent encore (sinon auto-refus).
          const existing = await tx.user.findMany({
            where: { id: { in: participantIds } },
            select: { id: true, xpAvailable: true },
          });
          if (existing.length !== participantIds.length) {
            await tx.ficheTechnique.update({
              where: { id: fiche.id },
              data: {
                status: "REJECTED",
                rejectionReason: "Un participant n'existe plus.",
                validatedById: admin.id,
                validatedAt: new Date(),
              },
            });
            return { ficheId: fiche.id, cost: 0, autoRejected: true };
          }

          const N = participantIds.length; // 2 (duo) ou 3 (trio)
          const baseShare = Math.floor(finalCost / N);
          const remainder = finalCost - baseShare * N;
          // Part de chacun : l'émetteur absorbe le reste de la division.
          const shareOf = (uid: string) => baseShare + (uid === fiche.authorId ? remainder : 0);

          const byId = new Map(existing.map((u) => [u.id, u.xpAvailable]));
          const everyonePays = participantIds.every((uid) => (byId.get(uid) ?? 0) >= shareOf(uid));

          if (everyonePays) {
            for (const uid of participantIds) {
              await debit(uid, shareOf(uid), uid === fiche.authorId ? "EMETTEUR" : "PARTENAIRE");
            }
          } else {
            // Repli : si quelqu'un ne peut pas payer sa part, l'émetteur paie le prix plein.
            await debit(fiche.authorId, finalCost, "EMETTEUR_FULL");
          }
        } else {
          await debit(fiche.authorId, finalCost, "EMETTEUR");
        }
      }

      await tx.ficheTechnique.update({
        where: { id: fiche.id },
        data: {
          status: "VALIDATED",
          coutXp: finalCost,
          validatedById: admin.id,
          validatedAt: new Date(),
          rejectionReason: null,
        },
      });

      return { ficheId: fiche.id, cost: finalCost };
    });

    if ((result as { autoRejected?: boolean }).autoRejected) {
      return NextResponse.json({ ok: true, decision: "REJECTED", ...result });
    }
    return NextResponse.json({ ok: true, decision: "VALIDATED", ...result });
  } catch (e) {
    return jsonError(e);
  }
}

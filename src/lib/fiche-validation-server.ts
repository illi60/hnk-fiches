import { prisma } from '@/lib/prisma';
import { refreshForumEconomy, economyTransaction } from '@/lib/economy-server';
import { defaultFicheCost } from '@/lib/xp';
import { ficheTotalCost } from '@/lib/techniques';
import { isNoClan } from '@/lib/clans';

export async function validateFiche(adminId: string, id: string, costOverride?: number) {
    // VALIDATE
    const participants = await prisma.ficheTechnique.findUnique({ where: { id }, select: { authorId: true, actionType: true, collaboratorIds: true } });
    if (!participants) throw new Error("NOT_FOUND");
    const accountIds = [...new Set([participants.authorId, ...(participants.actionType === "COLLECTIVE" ? participants.collaboratorIds : [])])].sort();
    for (const userId of accountIds) await refreshForumEconomy(userId);
    return economyTransaction(accountIds, async (tx) => {
      await tx.$queryRaw`SELECT id FROM "FicheTechnique" WHERE id = ${id} FOR UPDATE`;
      const fiche = await tx.ficheTechnique.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          rangMin: true,
          actionType: true,
          nature: true,
          authorId: true,
          author: { select: { clan: true } },
          collaboratorIds: true,
          isActive: true,
          retiredParticipantIds: true,
        },
      });
      if (!fiche || !fiche.isActive) throw new Error("NOT_FOUND");
      if (fiche.status !== "PENDING" || fiche.retiredParticipantIds.length > 0) throw new Error("INVALID_STATE");
      const actualIds = [...new Set([fiche.authorId, ...(fiche.actionType === "COLLECTIVE" ? fiche.collaboratorIds : [])])].sort();
      if (JSON.stringify(actualIds) !== JSON.stringify(accountIds)) throw new Error("CONFLICT");
      const ficheId = fiche.id;

      // Coût final : override admin, sinon coût du type d'action (cohérent avec
      // la création), sinon repli sur l'ancien barème de rang.
      const base =
        ficheTotalCost(fiche.actionType, isNoClan(fiche.author.clan) ? null : fiche.nature) ||
        defaultFicheCost(fiche.rangMin ?? null);
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
            actorId: adminId,
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
                validatedById: adminId,
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
          validatedById: adminId,
          validatedAt: new Date(),
          rejectionReason: null,
          comment: null,
        },
      });

      return { ficheId: fiche.id, cost: finalCost };
    });

}

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { economyTransaction, loadEconomy, reconcileEconomy, refreshForumEconomy } from '@/lib/economy-server';
import { metadataObject } from '@/lib/economy';
import { eligibleArtAllocations } from '@/lib/technical-refund';
import type { ArtsState } from '@/lib/arts';
import { SHOP_DISCOUNT_ITEM_KEY, SHOP_REROLL_FT_ITEM_KEY, shopItemCost } from '@/lib/shop';

export async function resetTechniques(userId: string, operationId: string, actorId?: string) {
  const source = actorId ? 'STAFF_TECHNICAL_RESET' : 'SHOP_REROLL_FT';
  const operationWhere = { userId, reason: 'FICHE_REJECTED_REFUND' as const,
    metadata: { path: ['operationId'], equals: operationId } };
  const completed = await prisma.xPTransaction.findFirst({ where: operationWhere });
  if (completed) {
    const metadata = metadataObject(completed.metadata);
    if (metadata.source !== source) throw new Error('RESET_CONFLICT');
    return metadata.result;
  }
  await refreshForumEconomy(userId);
  return economyTransaction([userId], async tx => {
    const existing = await tx.xPTransaction.findFirst({ where: operationWhere });
    if (existing) {
      const metadata = metadataObject(existing.metadata);
      if (metadata.source !== source) throw new Error('RESET_CONFLICT');
      return metadata.result;
    }
    let cost = 0;
    const previousPurchases = await tx.xPTransaction.count({ where: { userId, reason: 'SHOP_SPEND', metadata: { path: ['source'], equals: 'SHOP_REROLL_FT' } } });
    if (!actorId) {
      await tx.$queryRaw`SELECT id FROM "ShopCatalogItem" WHERE "itemKey" = ${SHOP_REROLL_FT_ITEM_KEY} FOR SHARE`;
      const item = await tx.shopCatalogItem.findUnique({ where: { itemKey: SHOP_REROLL_FT_ITEM_KEY } });
      if (!item?.isActive) throw new Error('NOT_FOUND');
      const discount = await tx.inventoryItem.findUnique({ where: { userId_itemKey: { userId, itemKey: SHOP_DISCOUNT_ITEM_KEY } } });
      cost = shopItemCost({ key: item.itemKey, costXp: item.costXp }, (discount?.quantity ?? 0) > 0, previousPurchases);
    }
    const account = await loadEconomy(tx, userId);
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { artsState: true } });
    const candidates = await tx.ficheTechnique.findMany({ where: {
      isActive: true, NOT: { retiredParticipantIds: { has: userId } },
      OR: [{ authorId: userId }, { collaboratorIds: { has: userId } }],
    }, orderBy: { id: 'asc' }, select: { id: true, authorId: true, collaboratorIds: true, retiredParticipantIds: true, status: true } });
    const fiches: typeof candidates = [];
    for (const candidate of candidates) {
      await tx.$queryRaw`SELECT id FROM "FicheTechnique" WHERE id = ${candidate.id} FOR UPDATE`;
      const current = await tx.ficheTechnique.findUniqueOrThrow({ where: { id: candidate.id } });
      if (current.isActive && !current.retiredParticipantIds.includes(userId) &&
          [current.authorId, ...current.collaboratorIds].includes(userId)) fiches.push(current);
    }
    const ficheIds = new Set(fiches.filter(f => f.status === 'VALIDATED').map(f => f.id));
    const allocations = [
      ...account.outstanding.filter(({entry}) => entry.reason === 'FICHE_VALIDATED' && ficheIds.has(String(metadataObject(entry.metadata).ficheId)))
        .map(({entry, amount}) => ({debitId: entry.id, amount})),
      ...eligibleArtAllocations(account.outstanding, (user.artsState ?? null) as ArtsState | null),
    ];
    const refund = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);

    // The owner remains the historical author. Each participant relinquishes only
    // their own right; other participants retain their technique and paid share.
    for (const fiche of fiches) {
      const retired = [...new Set([...fiche.retiredParticipantIds, userId])];
      const participants = [fiche.authorId, ...fiche.collaboratorIds];
      await tx.ficheTechnique.update({ where: { id: fiche.id }, data: {
        retiredParticipantIds: retired, isActive: participants.some(id => !retired.includes(id)), comment: null,
      } });
    }
    const invocations = await tx.invocation.deleteMany({ where: { ownerId: userId } });
    await tx.user.update({ where: { id: userId }, data: {
      primaryKg: null, primaryAffinity: null, kekkeiGenkai: null, affinites: [], pactAffinities: [], pactSpecies: null,
      artsState: Prisma.JsonNull, version: { increment: 1 },
    } });
    // Zero refunds are also durable reset events. Operation IDs are checked under
    // the account row lock, and every refund lists its exact consumed payments.
    const receipt = await tx.xPTransaction.create({ data: { userId, actorId, amount: refund,
      reason: 'FICHE_REJECTED_REFUND', metadata: { source, operationId, allocations } } });
    const afterRefund = await loadEconomy(tx, userId);
    if (afterRefund.available < cost) throw new Error('INSUFFICIENT_XP');
    if (!actorId) {
      await tx.xPTransaction.create({ data: { userId, amount: -cost, reason: 'SHOP_SPEND',
        metadata: { source, operationId, itemKey: SHOP_REROLL_FT_ITEM_KEY, previousPurchases, cost, refund } } });
    }
    const after = await reconcileEconomy(tx, userId);
    const result = { cost, refund, net: after.available - account.available, xpAvailable: after.available,
      deficit: after.deficit, fichesReset: fiches.length, invocationsDeleted: invocations.count };
    await tx.xPTransaction.update({ where: { id: receipt.id }, data: { metadata: { source, operationId, allocations, result } } });
    return result;
  }, { allowDeficit: true });
}

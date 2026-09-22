import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { projectEconomy } from '@/lib/economy';
import { fetchForumProfile } from '@/lib/forum-parser';

export async function lockEconomyUsers(tx: Prisma.TransactionClient, ids: string[]) {
  for (const id of [...new Set(ids)].sort()) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
  }
}

export async function loadEconomy(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { forumLastXp: true, xpAvailable: true, role: true, xpBudgetExempt: true } });
  if (!user) throw new Error('NOT_FOUND');
  const entries = await tx.xPTransaction.findMany({ where: { userId }, select: { id: true, amount: true, reason: true, metadata: true, createdAt: true } });
  const trades = await tx.trade.findMany({ where: { OR: [{ initiatorId: userId }, { recipientId: userId }] },
    select: { status: true, initiatorId: true, recipientId: true, initiatorXpOffered: true, recipientXpOffered: true } });
  const account = projectEconomy(userId, user.forumLastXp, entries, trades);
  return user.role !== 'USER' || user.xpBudgetExempt
    ? { ...account, available: user.xpAvailable, deficit: 0, anomalies: [], exempt: true as const }
    : { ...account, exempt: false as const };
}

/** Call with the account row locked. This records adjustments rather than erasing history. */
export async function reconcileEconomy(tx: Prisma.TransactionClient, userId: string) {
  const account = await loadEconomy(tx, userId);
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { xpAvailable: true, xpTotalEarned: true, characterStatus: true, role: true, xpBudgetExempt: true } });
  if (user.characterStatus === 'DEAD_MISSING' || user.role !== 'USER' || user.xpBudgetExempt) {
    await tx.adminAlert.updateMany({ where: { userId, kind: 'XP_BUDGET', isRead: false },
      data: user.characterStatus === 'DEAD_MISSING'
        ? { isRead: true, title: 'Budget XP gelé', body: 'Personnage mort ou disparu : le contrôle XP est suspendu et le solde reste gelé.' }
        : { isRead: true, title: 'Compte hors contrôle XP', body: 'Compte staff ou test : le contrôle automatique du budget XP est désactivé.' } });
    return account;
  }
  const delta = account.available - user.xpAvailable;
  if (delta !== 0) {
    await tx.user.update({ where: { id: userId }, data: { xpAvailable: account.available, version: { increment: 1 } } });
    await tx.xPTransaction.create({ data: { userId, amount: delta, reason: 'FORUM_SYNC', metadata: {
      source: 'FORUM_BUDGET_RECONCILIATION', forumXp: account.forumXp, incoming: account.incoming,
      outgoing: account.outgoing, reserved: account.reserved, spent: account.spent, deficit: account.deficit,
      legacyAdjustment: account.legacyAdjustment,
      previousEarned: user.xpTotalEarned,
    } } });
  }
  if (account.deficit > 0 || account.anomalies.length) {
    const existing = await tx.adminAlert.findFirst({ where: { userId, kind: 'XP_BUDGET', isRead: false } });
    const data = { title: 'Budget XP à régulariser', body: `Forum : ${account.forumXp} XP. Échanges nets : ${account.incoming - account.outgoing} XP. Dépenses : ${account.spent} XP. Réserves : ${account.reserved} XP. Déficit : ${account.deficit} XP. Les nouvelles dépenses sont bloquées.`,
      metadata: { deficit: account.deficit, anomalies: account.anomalies } };
    if (existing) await tx.adminAlert.update({ where: { id: existing.id }, data });
    else await tx.adminAlert.create({ data: { userId, kind: 'XP_BUDGET', ...data } });
  } else {
    await tx.adminAlert.updateMany({ where: { userId, kind: 'XP_BUDGET', isRead: false },
      data: { isRead: true, title: 'Budget XP régularisé', body: 'Le budget respecte à nouveau la source forum et les échanges finalisés.' } });
  }
  return account;
}

/** Fresh remote observation outside the transaction; version/link guard rejects stale responses. */
export async function refreshForumEconomy(userId: string, signal?: AbortSignal) {
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { version: true, forumUserId: true, forumLastXp: true, clan: true, grade: true, characterStatus: true, role: true, xpBudgetExempt: true } });
  if (!before) throw new Error('NOT_FOUND');
  if (before.role !== 'USER' || before.xpBudgetExempt) return loadEconomy(prisma, userId);
  if (before.characterStatus === 'DEAD_MISSING') throw new Error('CHARACTER_FROZEN');
  if (before.forumUserId === null) throw new Error('FORUM_LINK_REQUIRED');
  const result = await fetchForumProfile(before.forumUserId, signal ?? AbortSignal.timeout(8000));
  const p = result.profile;
  if (!result.ok || !p || p.xp === null || !Number.isSafeInteger(p.xp) || p.xp < 0) throw new Error('FORUM_UNAVAILABLE');
  const gradeText = p.grade?.toLowerCase();
  const initialGrade = gradeText?.startsWith('genin') ? 'GENIN' : gradeText?.startsWith('ch') ? 'CHUNIN' : gradeText?.startsWith('j') ? 'JONIN' : undefined;
  return prisma.$transaction(async tx => {
    await lockEconomyUsers(tx, [userId]);
    const updated = await tx.user.updateMany({ where: { id: userId, version: before.version, forumUserId: before.forumUserId }, data: {
      forumLastXp: p.xp, forumLastSyncAt: new Date(), forumLastSyncError: null,
      xpTotalEarned: { increment: p.xp - (before.forumLastXp ?? 0) },
      forumLastRang: p.rangRaw, forumPseudo: p.forumPseudo ?? undefined, forumAvatar: p.avatarUrl ?? undefined,
      ...(before.clan === null && p.clan ? { clan: p.clan } : {}),
      ...(before.grade === null && initialGrade ? { grade: initialGrade } : {}),
      // Technical identity is never repopulated by a forum sync after a reset.
      version: { increment: 1 },
    } });
    if (!updated.count) throw new Error('CONFLICT');
    return reconcileEconomy(tx, userId);
  }, { timeout: 15000 });
}

/** Every monetary mutation is checked before and after its ledger writes. */
export async function economyTransaction<T>(ids: string[], action: (tx: Prisma.TransactionClient) => Promise<T>, options: { allowDeficit?: boolean; recovery?: boolean } = {}) {
  return prisma.$transaction(async tx => {
    await lockEconomyUsers(tx, ids);
    const before = new Map<string, Awaited<ReturnType<typeof loadEconomy>>>();
    for (const id of [...new Set(ids)]) {
      const user = await tx.user.findUniqueOrThrow({ where: { id }, select: { forumLastSyncAt: true, forumLastSyncError: true, characterStatus: true, role: true, xpBudgetExempt: true } });
      if (user.role !== 'USER' || user.xpBudgetExempt) {
        before.set(id, await reconcileEconomy(tx, id));
        continue;
      }
      if (!options.recovery && user.characterStatus === 'DEAD_MISSING') throw new Error('CHARACTER_FROZEN');
      if (!options.recovery && (!user.forumLastSyncAt || Date.now() - user.forumLastSyncAt.getTime() > 30_000 || user.forumLastSyncError)) throw new Error('FORUM_REFRESH_REQUIRED');
      const account = await reconcileEconomy(tx, id);
      if (!account.linked && !options.recovery) throw new Error('FORUM_LINK_REQUIRED');
      if (account.anomalies.length && !options.recovery) throw new Error('XP_HISTORY_REVIEW_REQUIRED');
      if (account.deficit > 0 && !options.allowDeficit && !options.recovery) throw new Error('XP_BUDGET_EXCEEDED');
      before.set(id, account);
    }
    const result = await action(tx);
    for (const [id, original] of before) {
      const account = await loadEconomy(tx, id);
      if (account.anomalies.length > (options.recovery ? original.anomalies.length : 0) || account.deficit > original.deficit) throw new Error('XP_BUDGET_EXCEEDED');
      await reconcileEconomy(tx, id);
    }
    return result;
  }, { timeout: 20000 });
}

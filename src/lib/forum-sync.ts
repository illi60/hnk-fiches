import { prisma } from '@/lib/prisma';
import { refreshForumEconomy } from '@/lib/economy-server';
import { recomputeRanks } from '@/lib/progression-server';
export interface SyncOutcome { userId: string; ok: boolean; error?: string; delta?: number; newXp?: number }
export interface GetOrSyncResult extends SyncOutcome { skipped?: boolean }
const SYNC_TTL_MS = Number(process.env.FORUM_SYNC_TTL_MS) || 15 * 60 * 1000;
export async function getOrSyncUser(userId: string, opts: { signal?: AbortSignal; force?: boolean } = {}): Promise<GetOrSyncResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { forumUserId: true, forumLastSyncAt: true, forumLastSyncError: true, characterStatus: true, role: true, xpBudgetExempt: true } });
  if (!user) return { userId, ok: false, error: 'NOT_FOUND' };
  if (user.characterStatus === 'DEAD_MISSING') return { userId, ok: true, skipped: true };
  if (user.role !== 'USER' || user.xpBudgetExempt) return { userId, ok: true, skipped: true };
  if (user.forumUserId === null) return { userId, ok: false, error: 'NO_FORUM_LINK', skipped: true };
  if (!opts.force && !user.forumLastSyncError && user.forumLastSyncAt && Date.now() - user.forumLastSyncAt.getTime() < SYNC_TTL_MS) return { userId, ok: true, skipped: true };
  return syncUserFromForum(userId, opts);
}
export async function syncUserFromForum(userId: string, opts: { signal?: AbortSignal } = {}): Promise<SyncOutcome> {
  try {
    const before = await prisma.user.findUnique({ where: { id: userId }, select: { xpAvailable: true } });
    const account = await refreshForumEconomy(userId, opts.signal);
    try { await recomputeRanks([userId]); } catch (error) { console.error('[forum-sync] recompute failed', error); }
    return { userId, ok: true, delta: account.available - (before?.xpAvailable ?? 0), newXp: account.forumXp };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'FORUM_UNAVAILABLE';
    // Failed reads never mark a cached observation as fresh.
    return { userId, ok: false, error: ['CONFLICT', 'NOT_FOUND', 'FORUM_LINK_REQUIRED', 'CHARACTER_FROZEN'].includes(code) ? code : 'FORUM_UNAVAILABLE' };
  }
}

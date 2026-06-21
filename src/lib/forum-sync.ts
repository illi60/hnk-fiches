// ============================================================
// Logique de synchronisation forum → site, partagée entre :
//   - le cron Vercel (/api/cron/forum-sync)
//   - le bouton "sync manuel" admin (/api/admin/users/[id]/sync-forum)
//
// Politique :
//   - XP : seul un delta POSITIF est crédité (FORUM_SYNC).
//          Un delta négatif est ignoré (le forum a pu être reset)
//          mais on met à jour forumLastXp pour repartir d'une
//          base saine.
//   - Champs RP (clan, rang, grade…) : on les pose UNIQUEMENT à
//     la première sync (champ encore null côté DB). Ensuite c'est
//     l'admin qui pilote — sinon le scraping écraserait une
//     correction manuelle.
//   - forumLastXp / forumLastRang / forumPseudo : toujours à jour
//     (miroir brut de la source).
// ============================================================

import { prisma } from "@/lib/prisma";
import { fetchForumProfile } from "@/lib/forum-parser";
import { recomputeRanks } from "@/lib/progression-server";

export interface SyncOutcome {
  userId: string;
  ok: boolean;
  error?: string;
  delta?: number;
  newXp?: number;
}

export interface GetOrSyncResult extends SyncOutcome {
  skipped?: boolean; // true = cache encore frais (aucun appel forum), ou pas de lien forum
}

// TTL configurable (défaut 15 min). Au-delà, une lecture déclenche une resync.
const SYNC_TTL_MS = Number(process.env.FORUM_SYNC_TTL_MS) || 15 * 60 * 1000;

/**
 * Cache read-through : si la dernière sync date de moins de SYNC_TTL_MS, on
 * sert le cache DB sans toucher au forum. Sinon (ou si force=true), on relance
 * syncUserFromForum. Ne throw jamais : en cas d'échec réseau, l'appelant sert
 * quand même les données en cache.
 */
export async function getOrSyncUser(
  userId: string,
  opts: { signal?: AbortSignal; force?: boolean } = {}
): Promise<GetOrSyncResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { forumUserId: true, forumLastSyncAt: true },
  });

  if (!user) return { userId, ok: false, error: "NOT_FOUND" };
  if (user.forumUserId === null) {
    return { userId, ok: false, error: "NO_FORUM_LINK", skipped: true };
  }

  if (!opts.force && user.forumLastSyncAt) {
    const age = Date.now() - user.forumLastSyncAt.getTime();
    if (age < SYNC_TTL_MS) return { userId, ok: true, skipped: true };
  }

  return syncUserFromForum(userId, { signal: opts.signal });
}

export async function syncUserFromForum(
  userId: string,
  opts: { signal?: AbortSignal } = {}
): Promise<SyncOutcome> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      forumUserId: true,
      forumLastXp: true,
      version: true,
      clan: true,
      rang: true,
      grade: true,
      kekkeiGenkai: true,
    },
  });

  if (!user) return { userId, ok: false, error: "NOT_FOUND" };
  if (user.forumUserId === null) {
    return { userId, ok: false, error: "NO_FORUM_LINK" };
  }

  const result = await fetchForumProfile(user.forumUserId, opts.signal);

  if (!result.ok || !result.profile) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        forumLastSyncAt: new Date(),
        forumLastSyncError: result.error ?? "UNKNOWN",
      },
    });
    return { userId, ok: false, error: result.error ?? "UNKNOWN" };
  }

  const p = result.profile;

  // Calcul du delta XP (uniquement positif).
  const prevXp = user.forumLastXp ?? 0;
  const currXp = p.xp ?? prevXp;
  const delta = Math.max(0, currXp - prevXp);

  // Champs RP : pose uniquement si encore null côté DB.
  const rpPatch: Record<string, unknown> = {};
  if (user.clan === null && p.clan) rpPatch.clan = p.clan;
  // Le rang GLOBAL (personnage) est piloté par le site/staff, pas par le forum.
  if (user.kekkeiGenkai === null && p.kekkeiGenkai) rpPatch.kekkeiGenkai = p.kekkeiGenkai;
  // grade peut arriver en texte FA libre ("Genin"/"Chūnin"/"Jōnin") → mappe vers enum
  if (user.grade === null && p.grade) {
    const g = p.grade.toLowerCase();
    if (g.startsWith("genin")) rpPatch.grade = "GENIN";
    else if (g.startsWith("ch")) rpPatch.grade = "CHUNIN";
    else if (g.startsWith("j")) rpPatch.grade = "JONIN";
  }

  await prisma.$transaction(async (tx) => {
    if (delta > 0) {
      const updated = await tx.user.updateMany({
        where: { id: userId, version: user.version },
        data: {
          xpAvailable: { increment: delta },
          xpTotalEarned: { increment: delta },
          version: { increment: 1 },
          forumLastXp: currXp,
          forumLastRang: p.rangRaw,
          forumPseudo: p.forumPseudo ?? undefined,
          forumAvatar: p.avatarUrl ?? undefined,
          forumLastSyncAt: new Date(),
          forumLastSyncError: null,
          ...rpPatch,
        },
      });
      if (updated.count === 0) throw new Error("CONFLICT");

      await tx.xPTransaction.create({
        data: {
          userId,
          amount: delta,
          reason: "FORUM_SYNC",
          metadata: { prevXp, currXp },
        },
      });
    } else {
      // (pas de delta XP — rien de plus à faire pour la progression)
      await tx.user.update({
        where: { id: userId },
        data: {
          forumLastXp: currXp,
          forumLastRang: p.rangRaw,
          forumPseudo: p.forumPseudo ?? undefined,
          forumAvatar: p.avatarUrl ?? undefined,
          forumLastSyncAt: new Date(),
          forumLastSyncError: null,
          ...rpPatch,
        },
      });
    }
  });

  // L'XP a changé (delta > 0) → recalcule les rangs auto basés sur l'XP
  // (conditions « XP générés » + pool XP du scope). Best-effort, jamais bloquant.
  if (delta > 0) {
    try {
      await recomputeRanks([userId]);
    } catch (err) {
      console.error("[forum-sync] recompute failed", err);
    }
  }

  return { userId, ok: true, delta, newXp: currXp };
}

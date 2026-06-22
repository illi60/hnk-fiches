// ============================================================
// Ladder — chargement serveur du classement (joueurs + clans).
//
// Source publique : ne lit que des profils SYNCHRONISÉS au forum
// (forumPseudo + forumAvatar présents) pour un rendu toujours propre.
//
//   - Joueurs : XP (forumLastXp ?? xpTotalEarned), niveau, rang général
//               (max des 4 rangs), contribution = nb de RP de progression
//               VALIDÉS (toutes voies), clan.
//   - Clans   : niveau de clan (= rang communautaire EFFECTIF, canonique,
//               cohérent avec les profils), XP cumulé du clan, contribution
//               cumulée des membres affichés, effectif, top membres.
// ============================================================

import { prisma } from "@/lib/prisma";
import {
  RANKS,
  rankIndex,
  clanScopeKey,
  effectiveCommunityRank,
  type Rank,
  type ScopeProgress,
} from "@/lib/progression";
import {
  loadScopeAggregates,
  loadAllBaseRanks,
  loadAllClanCommunityCounts,
} from "@/lib/progression-server";

// Rang général d'un personnage = le plus haut de ses rangs (cf. « non cumul »).
function generalRankOf(u: {
  rang: string | null;
  rangVillage: string | null;
  rangClan: string | null;
  rangHistoire: string | null;
}): Rank {
  const idx = Math.max(
    rankIndex(u.rang),
    rankIndex(u.rangVillage),
    rankIndex(u.rangClan),
    rankIndex(u.rangHistoire)
  );
  return RANKS[idx];
}

export interface LadderPlayer {
  id: string;
  name: string; // forumPseudo ?? username
  avatar: string | null;
  clan: string | null; // libellé d'affichage
  clanKey: string | null; // clé normalisée (lien vers l'entrée clan)
  rang: Rank; // rang général
  rangVillage: Rank | null;
  rangClan: Rank | null;
  rangHistoire: Rank | null;
  grade: string | null;
  xp: number;
  contribution: number; // RP de progression VALIDÉS (toutes voies)
  forumUrl: string | null;
}

export interface LadderClanMember {
  id: string;
  name: string;
  avatar: string | null;
  rang: Rank;
  xp: number;
}

export interface LadderClan {
  key: string;
  name: string;
  level: Rank; // niveau de clan (rang communautaire effectif)
  xp: number; // XP cumulé du clan
  contribution: number; // somme des contributions des membres affichés
  memberCount: number;
  topMembers: LadderClanMember[];
}

export interface LadderData {
  players: LadderPlayer[];
  clans: LadderClan[];
}

export async function loadLadder(): Promise<LadderData> {
  const [users, contribRows, agg, baseRanks, clanCounts] = await Promise.all([
    prisma.user.findMany({
      where: { forumPseudo: { not: null }, forumAvatar: { not: null } },
      select: {
        id: true,
        username: true,
        forumPseudo: true,
        forumAvatar: true,
        clan: true,
        grade: true,
        rang: true,
        rangVillage: true,
        rangClan: true,
        rangHistoire: true,
        forumLastXp: true,
        xpTotalEarned: true,
        forumProfileUrl: true,
      },
    }),
    prisma.progressionSubmission.groupBy({
      by: ["userId"],
      where: { status: "VALIDATED" },
      _count: { _all: true },
    }),
    loadScopeAggregates(),
    loadAllBaseRanks(),
    loadAllClanCommunityCounts(),
  ]);

  const contribByUser = new Map<string, number>();
  for (const r of contribRows) contribByUser.set(r.userId, r._count._all);

  const players: LadderPlayer[] = users.map((u) => {
    const xp = u.forumLastXp ?? u.xpTotalEarned ?? 0;
    return {
      id: u.id,
      name: (u.forumPseudo ?? u.username) || u.username,
      avatar: u.forumAvatar,
      clan: u.clan?.trim() || null,
      clanKey: clanScopeKey(u.clan),
      rang: generalRankOf(u),
      rangVillage: u.rangVillage as Rank | null,
      rangClan: u.rangClan as Rank | null,
      rangHistoire: u.rangHistoire as Rank | null,
      grade: u.grade,
      xp,
      contribution: contribByUser.get(u.id) ?? 0,
      forumUrl: u.forumProfileUrl,
    };
  });

  // Membres affichés regroupés par clan (pour contribution cumulée + top membres).
  const displayName = new Map<string, string>();
  const membersByClan = new Map<string, LadderPlayer[]>();
  for (const p of players) {
    if (!p.clanKey) continue;
    if (p.clan && !displayName.has(p.clanKey)) displayName.set(p.clanKey, p.clan);
    const arr = membersByClan.get(p.clanKey) ?? [];
    arr.push(p);
    membersByClan.set(p.clanKey, arr);
  }

  // Niveau / XP / effectif viennent des agrégats canoniques (tous les membres),
  // cohérents avec les profils. Contribution + top membres : membres affichés.
  const clans: LadderClan[] = Object.keys(agg.xpClans).map((key) => {
    const membersByRank = agg.membersClans[key] ?? {};
    const memberCount = Object.values(membersByRank).reduce((a, b) => a + (b ?? 0), 0);
    const sp: ScopeProgress = {
      countByCond: clanCounts[key] ?? {},
      xpPool: agg.xpClans[key] ?? 0,
      memberCountByRank: membersByRank,
    };
    const level = effectiveCommunityRank("CLAN", baseRanks[`CLAN:${key}`] ?? "E", sp);
    const shown = (membersByClan.get(key) ?? []).slice().sort((a, b) => b.xp - a.xp);
    return {
      key,
      name: displayName.get(key) ?? key.toUpperCase(),
      level,
      xp: agg.xpClans[key] ?? 0,
      contribution: shown.reduce((a, m) => a + m.contribution, 0),
      memberCount,
      topMembers: shown.slice(0, 5).map((m) => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        rang: m.rang,
        xp: m.xp,
      })),
    };
  });

  // Tris par défaut (XP décroissant) ; le client peut re-trier.
  players.sort((a, b) => b.xp - a.xp);
  clans.sort((a, b) => b.xp - a.xp);

  return { players, clans };
}

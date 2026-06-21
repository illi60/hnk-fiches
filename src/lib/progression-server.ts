// ============================================================
// Progression — chargements serveur (Prisma) partagés page + API.
//   - Pools XP (village / par clan) : somme des XP des membres.
//   - Compteurs de conditions validées (communautaire / individuel).
//   - Rangs communautaires de base (posés par le staff).
//   - Rang communautaire EFFECTIF d'un joueur (pour le gating serveur).
// ============================================================

import type { Rang } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  RANKS,
  VILLAGE_SCOPE_KEY,
  clanScopeKey,
  effectiveCommunityRank,
  highestPersonalRank,
  rankIndex,
  type ProgTrack,
  type Rank,
  type ScopeProgress,
  type UserProgress,
} from "@/lib/progression";

// XP « total » d'un membre — cohérent avec le tableau de bord (forum prioritaire).
function userXp(u: { forumLastXp: number | null; xpTotalEarned: number }): number {
  return u.forumLastXp ?? u.xpTotalEarned ?? 0;
}

// Pools XP : village (tous les membres) + par clan (clé normalisée).
export async function loadAllXpPools(): Promise<{ village: number; clans: Record<string, number> }> {
  const users = await prisma.user.findMany({
    select: { clan: true, forumLastXp: true, xpTotalEarned: true },
  });
  let village = 0;
  const clans: Record<string, number> = {};
  for (const u of users) {
    const xp = userXp(u);
    village += xp;
    const k = clanScopeKey(u.clan);
    if (k) clans[k] = (clans[k] ?? 0) + xp;
  }
  return { village, clans };
}

// Compteurs validés (communautaire) d'un scope : condId → nb de soumissions VALIDATED.
export async function loadCommunityCounts(
  track: ProgTrack,
  scopeKey: string
): Promise<Record<string, number>> {
  const rows = await prisma.progressionSubmission.groupBy({
    by: ["condId"],
    where: { track, tier: "COMMUNITY", scopeKey, status: "VALIDATED" },
    _count: { _all: true },
  });
  const m: Record<string, number> = {};
  for (const r of rows) m[r.condId] = r._count._all;
  return m;
}

// Compteurs validés de TOUS les clans en une requête : scopeKey → (condId → nb).
// Évite un groupBy par clan (N+1) sur la page admin.
export async function loadAllClanCommunityCounts(): Promise<Record<string, Record<string, number>>> {
  const rows = await prisma.progressionSubmission.groupBy({
    by: ["scopeKey", "condId"],
    where: { track: "CLAN", tier: "COMMUNITY", status: "VALIDATED" },
    _count: { _all: true },
  });
  const m: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    (m[r.scopeKey] ??= {})[r.condId] = r._count._all;
  }
  return m;
}

// Compteurs validés (individuel) d'un joueur : condId → nb de soumissions VALIDATED.
export async function loadUserCounts(userId: string): Promise<Record<string, number>> {
  const rows = await prisma.progressionSubmission.groupBy({
    by: ["condId"],
    where: { userId, tier: "INDIVIDUAL", status: "VALIDATED" },
    _count: { _all: true },
  });
  const m: Record<string, number> = {};
  for (const r of rows) m[r.condId] = r._count._all;
  return m;
}

export async function loadBaseRank(scopeType: "VILLAGE" | "CLAN", scopeKey: string): Promise<Rank> {
  const row = await prisma.communityRank.findUnique({
    where: { scopeType_scopeKey: { scopeType, scopeKey } },
  });
  return (row?.baseRank ?? "E") as Rank;
}

export async function loadAllBaseRanks(): Promise<Record<string, Rank>> {
  const rows = await prisma.communityRank.findMany();
  const m: Record<string, Rank> = {};
  for (const r of rows) m[`${r.scopeType}:${r.scopeKey}`] = r.baseRank as Rank;
  return m;
}

// Rang communautaire EFFECTIF (= max base/dérivé) pour un joueur sur une voie.
// Utilisé par l'API pour gater une soumission individuelle/communautaire.
export async function effectiveCommRankForUserTrack(
  track: ProgTrack,
  clan: string | null
): Promise<Rank> {
  if (track === "HISTOIRE") return "E"; // voie perso : pas de gate communautaire
  const scopeKey = track === "VILLAGE" ? VILLAGE_SCOPE_KEY : clanScopeKey(clan);
  if (!scopeKey) return "E";
  const scopeType = track === "VILLAGE" ? "VILLAGE" : "CLAN";
  const [counts, pools, base] = await Promise.all([
    loadCommunityCounts(track, scopeKey),
    loadAllXpPools(),
    loadBaseRank(scopeType, scopeKey),
  ]);
  const xpPool = track === "VILLAGE" ? pools.village : pools.clans[scopeKey] ?? 0;
  const sp: ScopeProgress = { countByCond: counts, xpPool };
  return effectiveCommunityRank(track, base, sp);
}

// ------------------------------------------------------------
// Auto-promotion des rangs personnels (modèle 2 degrés).
// Recalcule rangVillage/rangClan/rangHistoire pour un lot de joueurs et NE
// monte que (jamais de descente auto). Appelée après chaque validation de
// condition et chaque changement de rang communautaire de base.
//   - userIds = "all" → tous les membres (changement communautaire village).
// ------------------------------------------------------------
export async function recomputeRanks(userIds: string[] | "all"): Promise<number> {
  if (userIds !== "all" && userIds.length === 0) return 0;

  // 1) Rangs communautaires effectifs (village + tous les clans), une fois.
  const [pools, baseRanks, villageCounts, clanCounts] = await Promise.all([
    loadAllXpPools(),
    loadAllBaseRanks(),
    loadCommunityCounts("VILLAGE", VILLAGE_SCOPE_KEY),
    loadAllClanCommunityCounts(),
  ]);
  const villageEff = effectiveCommunityRank("VILLAGE", baseRanks[`VILLAGE:${VILLAGE_SCOPE_KEY}`] ?? "E", {
    countByCond: villageCounts,
    xpPool: pools.village,
  });
  const clanEff = (key: string): Rank =>
    effectiveCommunityRank("CLAN", baseRanks[`CLAN:${key}`] ?? "E", {
      countByCond: clanCounts[key] ?? {},
      xpPool: pools.clans[key] ?? 0,
    });

  // 2) Joueurs ciblés + leurs compteurs individuels validés (un seul groupBy).
  const userWhere = userIds === "all" ? undefined : { id: { in: userIds } };
  const users = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      clan: true,
      rangVillage: true,
      rangClan: true,
      rangHistoire: true,
      forumLastXp: true,
      xpTotalEarned: true,
    },
  });
  const countRows = await prisma.progressionSubmission.groupBy({
    by: ["userId", "condId"],
    where: {
      tier: "INDIVIDUAL",
      status: "VALIDATED",
      ...(userIds === "all" ? {} : { userId: { in: userIds } }),
    },
    _count: { _all: true },
  });
  const byUser = new Map<string, Record<string, number>>();
  for (const r of countRows) {
    const m = byUser.get(r.userId) ?? {};
    m[r.condId] = r._count._all;
    byUser.set(r.userId, m);
  }

  // 3) Calcule les nouveaux rangs ; ne prépare que les HAUSSES.
  type Raise = { id: string; field: "rangVillage" | "rangClan" | "rangHistoire"; rank: Rang };
  const raises: Raise[] = [];
  for (const u of users) {
    const clanKey = clanScopeKey(u.clan);
    const up: UserProgress = {
      countByCond: byUser.get(u.id) ?? {},
      xpSelf: u.forumLastXp ?? u.xpTotalEarned ?? 0,
    };
    const curV = (u.rangVillage ?? "E") as Rank;
    const curC = (u.rangClan ?? "E") as Rank;
    const curH = (u.rangHistoire ?? "E") as Rank;
    const newV = highestPersonalRank("VILLAGE", curV, villageEff, up);
    const newC = clanKey ? highestPersonalRank("CLAN", curC, clanEff(clanKey), up) : curC;
    const newH = highestPersonalRank("HISTOIRE", curH, "E", up);
    if (rankIndex(newV) > rankIndex(curV)) raises.push({ id: u.id, field: "rangVillage", rank: newV as Rang });
    if (rankIndex(newC) > rankIndex(curC)) raises.push({ id: u.id, field: "rangClan", rank: newC as Rang });
    if (rankIndex(newH) > rankIndex(curH)) raises.push({ id: u.id, field: "rangHistoire", rank: newH as Rang });
  }

  // 4) Applique chaque hausse de façon MONOTONE : le `where` ne matche que si le
  //    rang stocké est null ou strictement inférieur → jamais de descente, même
  //    si une montée XP concurrente (levelup) a déjà placé un rang supérieur.
  //    Le bump de `version` invalide en plus un débit XP concurrent (optimistic lock).
  const below = (r: Rang): Rang[] => RANKS.slice(0, rankIndex(r)) as Rang[];
  await Promise.all(
    raises.map((r) => {
      const guard = { in: below(r.rank) };
      if (r.field === "rangVillage") {
        return prisma.user.updateMany({
          where: { id: r.id, OR: [{ rangVillage: null }, { rangVillage: guard }] },
          data: { rangVillage: r.rank, version: { increment: 1 } },
        });
      }
      if (r.field === "rangClan") {
        return prisma.user.updateMany({
          where: { id: r.id, OR: [{ rangClan: null }, { rangClan: guard }] },
          data: { rangClan: r.rank, version: { increment: 1 } },
        });
      }
      return prisma.user.updateMany({
        where: { id: r.id, OR: [{ rangHistoire: null }, { rangHistoire: guard }] },
        data: { rangHistoire: r.rank, version: { increment: 1 } },
      });
    })
  );
  return raises.length;
}

// Membres d'un clan (clé normalisée) → ids, pour recompute ciblé.
export async function clanMemberIds(scopeKey: string): Promise<string[]> {
  const users = await prisma.user.findMany({ select: { id: true, clan: true } });
  return users.filter((u) => clanScopeKey(u.clan) === scopeKey).map((u) => u.id);
}

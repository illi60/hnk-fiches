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
  condMeta,
  effectiveCommunityRank,
  highestPersonalRank,
  normalizeRpUrl,
  rankIndex,
  scopeKeyFor,
  submissionGate,
  requiresCollaborators,
  isManualReviewSubmission,
  type ProgTrack,
  type Rank,
  type ScopeProgress,
  type UserProgress,
} from "@/lib/progression";

// XP « total » d'un membre — cohérent avec le tableau de bord (forum prioritaire).
function userXp(u: { forumLastXp: number | null; xpTotalEarned: number }): number {
  return u.forumLastXp ?? u.xpTotalEarned ?? 0;
}

// Rang général d'un personnage = le plus haut de ses rangs (cf. « non cumul »).
function generalRankOf(u: {
  rang: Rang | null;
  rangVillage: Rang | null;
  rangClan: Rang | null;
  rangHistoire: Rang | null;
}): Rank {
  const idx = Math.max(
    rankIndex(u.rang),
    rankIndex(u.rangVillage),
    rankIndex(u.rangClan),
    rankIndex(u.rangHistoire)
  );
  return RANKS[idx];
}

// Agrégats de scope en UN seul scan : pools XP (village + par clan) ET
// répartition des personnages par rang général (pour « Avoir N personnages
// de Rang X »). Village = tous les membres ; clans = par clé normalisée.
export interface ScopeAggregates {
  xpVillage: number;
  xpClans: Record<string, number>;
  membersVillage: Partial<Record<Rank, number>>;
  membersClans: Record<string, Partial<Record<Rank, number>>>;
}
export async function loadScopeAggregates(): Promise<ScopeAggregates> {
  const users = await prisma.user.findMany({
    select: {
      clan: true,
      forumLastXp: true,
      xpTotalEarned: true,
      rang: true,
      rangVillage: true,
      rangClan: true,
      rangHistoire: true,
    },
  });
  let xpVillage = 0;
  const xpClans: Record<string, number> = {};
  const membersVillage: Partial<Record<Rank, number>> = {};
  const membersClans: Record<string, Partial<Record<Rank, number>>> = {};
  for (const u of users) {
    const xp = userXp(u);
    xpVillage += xp;
    const gr = generalRankOf(u);
    membersVillage[gr] = (membersVillage[gr] ?? 0) + 1;
    const k = clanScopeKey(u.clan);
    if (k) {
      xpClans[k] = (xpClans[k] ?? 0) + xp;
      (membersClans[k] ??= {})[gr] = (membersClans[k][gr] ?? 0) + 1;
    }
  }
  return { xpVillage, xpClans, membersVillage, membersClans };
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
  const [counts, agg, base] = await Promise.all([
    loadCommunityCounts(track, scopeKey),
    loadScopeAggregates(),
    loadBaseRank(scopeType, scopeKey),
  ]);
  const xpPool = track === "VILLAGE" ? agg.xpVillage : agg.xpClans[scopeKey] ?? 0;
  const memberCountByRank = track === "VILLAGE" ? agg.membersVillage : agg.membersClans[scopeKey] ?? {};
  const sp: ScopeProgress = { countByCond: counts, xpPool, memberCountByRank };
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
  const [agg, baseRanks, villageCounts, clanCounts] = await Promise.all([
    loadScopeAggregates(),
    loadAllBaseRanks(),
    loadCommunityCounts("VILLAGE", VILLAGE_SCOPE_KEY),
    loadAllClanCommunityCounts(),
  ]);
  const villageEff = effectiveCommunityRank("VILLAGE", baseRanks[`VILLAGE:${VILLAGE_SCOPE_KEY}`] ?? "E", {
    countByCond: villageCounts,
    xpPool: agg.xpVillage,
    memberCountByRank: agg.membersVillage,
  });
  const clanEff = (key: string): Rank =>
    effectiveCommunityRank("CLAN", baseRanks[`CLAN:${key}`] ?? "E", {
      countByCond: clanCounts[key] ?? {},
      xpPool: agg.xpClans[key] ?? 0,
      memberCountByRank: agg.membersClans[key] ?? {},
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

// ------------------------------------------------------------
// Soumission d'UNE condition (cœur partagé par /submit et /submit-batch).
// Applique : condition gérée par staff, clan requis, gating ACTIVE, anti-
// réutilisation de RP (même condition + Village⊕Clan), anti-empilement
// (oneshot unique / count plein), puis crée la soumission PENDING.
// L'état de réutilisation du RP (conditions + voie déjà touchées) est passé
// par référence pour fonctionner aussi en lot (plusieurs conditions, 1 RP).
// ------------------------------------------------------------
export interface SubmitUser {
  username: string;
  clan: string | null;
  rangVillage: Rank | null;
  rangClan: Rank | null;
  rangHistoire: Rank | null;
}
export interface RpReuseState {
  condIds: Set<string>; // conditions déjà liées à ce RP (par le joueur)
  voie: "VILLAGE" | "CLAN" | null; // voie communautaire déjà engagée par ce RP
}

export async function attemptSubmission(opts: {
  userId: string;
  user: SubmitUser;
  condId: string;
  rpKey: string | null;
  rpTitle: string | null;
  comment: string | null;
  collaborators?: string[];
  effCommRank: (track: ProgTrack) => Promise<Rank>;
  reuse: RpReuseState;
}): Promise<{ ok: boolean; error?: string }> {
  const { condId, user, rpKey, reuse } = opts;

  const meta = condMeta(condId);
  if (!meta) return { ok: false, error: "CONDITION_INCONNUE" };
  if (meta.adminManaged) return { ok: false, error: "STAFF_ONLY" };
  if (meta.track === "CLAN" && !user.clan?.trim()) return { ok: false, error: "CLAN_REQUIS" };

  const mode = isManualReviewSubmission(condId)
    ? "MANUAL"
    : requiresCollaborators(condId)
    ? "GROUP"
    : "SOLO";
  const rawCollaborators = Array.from(new Set((opts.collaborators ?? []).map((s) => s.trim()).filter(Boolean)));
  const ownName = user.username.trim();

  if (mode === "GROUP") {
    if (rawCollaborators.length < 1) return { ok: false, error: "COLLABORATEURS_REQUIS" };
    if (rawCollaborators.some((p) => p === ownName)) return { ok: false, error: "SOLO_INTERDIT" };
  } else if (rawCollaborators.length > 0) {
    return { ok: false, error: "COLLABORATEURS_INTERDITS" };
  }

  const communityScope =
    meta.tier === "COMMUNITY" ? scopeKeyFor(meta.track, meta.tier, user.clan) : null;
  if (meta.tier === "COMMUNITY" && !communityScope) return { ok: false, error: "SCOPE_INTROUVABLE" };
  const scopeKey = communityScope ?? "self";

  if (mode !== "MANUAL" && !rpKey) return { ok: false, error: "RP_REQUIS" };
  const comment = (opts.comment ?? "").trim();
  if (mode !== "MANUAL" && !comment) return { ok: false, error: "COMMENT_REQUIS" };

  const personalRank = (
    meta.track === "VILLAGE" ? user.rangVillage : meta.track === "CLAN" ? user.rangClan : user.rangHistoire
  ) as Rank | null;
  const effComm = await opts.effCommRank(meta.track);
  const gate = submissionGate(meta, { personalRank: personalRank ?? "E", effectiveCommRank: effComm });
  if (!gate.ok) return { ok: false, error: gate.reason };

  let collaboratorIds: string[] = [];
  let collaborators: string[] = [];
  if (mode === "GROUP") {
    const found = await prisma.user.findMany({
      where: { username: { in: rawCollaborators } },
      select: { id: true, username: true },
    });
    const foundByName = new Map(found.map((u) => [u.username, u]));
    const missing = rawCollaborators.filter((name) => !foundByName.has(name));
    if (missing.length > 0) return { ok: false, error: "COLLABORATEUR_INCONNU" };

    collaboratorIds = rawCollaborators.map((name) => foundByName.get(name)!.id);
    collaborators = rawCollaborators;
  }

  // Réutilisation du RP : pas 2× la même condition ; Village ⊕ Clan.
  if (rpKey) {
    if (reuse.condIds.has(condId)) return { ok: false, error: "RP_DEJA_CONDITION" };
    if (
      (meta.track === "VILLAGE" && reuse.voie === "CLAN") ||
      (meta.track === "CLAN" && reuse.voie === "VILLAGE")
    ) {
      return { ok: false, error: "RP_AUTRE_VOIE" };
    }
  }

  // Anti-empilement (identique au flux unitaire).
  if (meta.mode === "oneshot") {
    const active = await prisma.progressionSubmission.findFirst({
      where:
        meta.tier === "COMMUNITY"
          ? { track: meta.track, tier: "COMMUNITY", condId, scopeKey, status: { in: ["PENDING", "VALIDATED"] } }
          : { userId: opts.userId, tier: "INDIVIDUAL", condId, status: { in: ["PENDING", "VALIDATED"] } },
      select: { status: true },
    });
    if (active) {
      return { ok: false, error: active.status === "VALIDATED" ? "DEJA_VALIDEE" : "DEJA_SOUMISE" };
    }
  } else if (meta.mode === "count") {
    const validated = await prisma.progressionSubmission.count({
      where:
        meta.tier === "COMMUNITY"
          ? { track: meta.track, tier: "COMMUNITY", condId, scopeKey, status: "VALIDATED" }
          : { userId: opts.userId, tier: "INDIVIDUAL", condId, status: "VALIDATED" },
    });
    if (validated >= meta.target) return { ok: false, error: "DEJA_ATTEINT" };
  }

  await prisma.progressionSubmission.create({
      data: {
        userId: opts.userId,
        track: meta.track,
        tier: meta.tier,
        targetRank: meta.rank,
        condId,
        scopeKey,
        rpTitle: opts.rpTitle,
        rpUrl: rpKey,
        comment: comment || null,
        collaborators,
        collaboratorIds,
      },
    });

  // Met à jour l'état de réutilisation pour les conditions suivantes du lot.
  if (rpKey) {
    reuse.condIds.add(condId);
    if ((meta.track === "VILLAGE" || meta.track === "CLAN") && !reuse.voie) reuse.voie = meta.track;
  }
  return { ok: true };
}

// Charge l'état de réutilisation d'un RP pour un joueur (conditions + voie déjà
// engagées par ce lien), depuis ses soumissions PENDING/VALIDATED.
export async function loadRpReuseState(userId: string, rpKey: string | null): Promise<RpReuseState> {
  const state: RpReuseState = { condIds: new Set(), voie: null };
  if (!rpKey) return state;
  const rows = await prisma.progressionSubmission.findMany({
    where: { userId, status: { in: ["PENDING", "VALIDATED"] }, rpUrl: { not: null } },
    select: { track: true, condId: true, rpUrl: true },
  });
  for (const r of rows) {
    if (normalizeRpUrl(r.rpUrl) !== rpKey) continue;
    state.condIds.add(r.condId);
    if ((r.track === "VILLAGE" || r.track === "CLAN") && !state.voie) state.voie = r.track;
  }
  return state;
}

// Fabrique un résolveur de rang communautaire effectif, mis en cache par voie.
export function makeCommRankResolver(clan: string | null): (track: ProgTrack) => Promise<Rank> {
  const cache: Partial<Record<ProgTrack, Rank>> = {};
  return async (track: ProgTrack) => {
    if (cache[track] === undefined) cache[track] = await effectiveCommRankForUserTrack(track, clan);
    return cache[track]!;
  };
}

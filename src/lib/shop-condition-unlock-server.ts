import {
  communityCondMet,
  communityCurrent,
  condTarget,
  individualCondMet,
  individualCurrent,
  palierAt,
  rankIndex,
  scopeKeyFor,
  type ProgCond,
  type ProgTrack,
  type Rank,
  type ScopeProgress,
  type UserProgress,
} from "@/lib/progression";
import {
  effectiveCommRankForUserTrack,
  loadCommunityCounts,
  loadScopeAggregates,
  loadUserCounts,
} from "@/lib/progression-server";
import { conditionServiceTarget } from "@/lib/shop";

export interface ShopUnlockUser {
  id: string;
  clan: string | null;
  forumLastXp: number | null;
  xpTotalEarned: number;
  rangVillage: Rank | null;
  rangClan: Rank | null;
  rangHistoire: Rank | null;
}

export interface UnlockOption {
  condId: string;
  label: string;
  tier: "COMMUNITY" | "INDIVIDUAL";
  current: number;
  target: number;
}

function personalRankFor(track: ProgTrack, user: ShopUnlockUser): Rank {
  return ((track === "VILLAGE" ? user.rangVillage : track === "CLAN" ? user.rangClan : user.rangHistoire) ?? "E") as Rank;
}

function condsForPalier(track: ProgTrack, rank: Rank, tier: "COMMUNITY" | "INDIVIDUAL"): ProgCond[] {
  const palier = palierAt(track, rank);
  if (!palier) return [];
  if (tier === "COMMUNITY") return palier.community ?? [];
  return [
    ...(palier.individual?.alternatives ?? []),
    ...(palier.individual?.requiredExtras ?? []).flatMap((extra) => extra.choices),
  ];
}

async function scopeProgress(track: ProgTrack, user: ShopUnlockUser): Promise<{ scopeKey: string | null; progress: ScopeProgress }> {
  const scopeKey = scopeKeyFor(track, "COMMUNITY", user.clan);
  const [counts, agg] = await Promise.all([
    scopeKey ? loadCommunityCounts(track, scopeKey) : Promise.resolve({}),
    loadScopeAggregates(),
  ]);
  const xpPool = track === "VILLAGE" ? agg.xpVillage : scopeKey ? agg.xpClans[scopeKey] ?? 0 : 0;
  const memberCountByRank = track === "VILLAGE" ? agg.membersVillage : scopeKey ? agg.membersClans[scopeKey] ?? {} : {};
  return { scopeKey, progress: { countByCond: counts, xpPool, memberCountByRank } };
}

async function userProgress(user: ShopUnlockUser): Promise<UserProgress> {
  return {
    countByCond: await loadUserCounts(user.id),
    xpSelf: user.forumLastXp ?? user.xpTotalEarned ?? 0,
  };
}

export async function shopConditionUnlockOptions(itemKey: string, user: ShopUnlockUser): Promise<{
  target: NonNullable<ReturnType<typeof conditionServiceTarget>>;
  options: UnlockOption[];
}> {
  const target = conditionServiceTarget(itemKey);
  if (!target) throw new Error("NOT_FOUND");

  const currentRank = personalRankFor(target.track, user);
  if (rankIndex(target.rank) !== rankIndex(currentRank) + 1) throw new Error("INELIGIBLE");

  const effCommRank = await effectiveCommRankForUserTrack(target.track, user.clan);
  const mustClearCommunity = target.track !== "HISTOIRE" && rankIndex(effCommRank) < rankIndex(target.rank);
  const tier = mustClearCommunity ? "COMMUNITY" : "INDIVIDUAL";
  const conds = condsForPalier(target.track, target.rank, tier);

  if (tier === "COMMUNITY") {
    const sp = await scopeProgress(target.track, user);
    return {
      target,
      options: conds
        .filter((cond) => !communityCondMet(cond, sp.progress))
        .map((cond) => ({
          condId: cond.id,
          label: cond.label,
          tier,
          current: communityCurrent(cond, sp.progress),
          target: condTarget(cond.id, cond.count),
        })),
    };
  }

  const up = await userProgress(user);
  return {
    target,
    options: conds
      .filter((cond) => !individualCondMet(cond, up))
      .map((cond) => ({
        condId: cond.id,
        label: cond.label,
        tier,
        current: individualCurrent(cond, up),
        target: condTarget(cond.id, cond.count),
      })),
  };
}

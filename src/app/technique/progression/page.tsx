import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  PROGRESSION_LIST,
  PROGRESSION_PRINCIPLES,
  VILLAGE_SCOPE_KEY,
  clanScopeKey,
  effectiveCommunityRank,
  communityCondMet,
  communityCurrent,
  individualCondMet,
  individualCurrent,
  individualConditionsMet,
  communityPalierStatus,
  individualPalierStatus,
  condMode,
  condTarget,
  isAutoMode,
  isAdminManaged,
  submissionMode,
  type ProgCond,
  type ScopeProgress,
  type UserProgress,
  type Rank,
  type PalierStatus,
} from "@/lib/progression";
import { loadScopeAggregates, loadAllBaseRanks, loadCommunityCounts, loadUserCounts } from "@/lib/progression-server";
import ProgressionBoard, {
  type TrackView,
  type CondView,
  type PalierView,
  type SubView,
} from "@/components/ProgressionBoard";

export default async function ProgressionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      clan: true,
      rangVillage: true,
      rangClan: true,
      rangHistoire: true,
      xpAvailable: true,
      forumLastXp: true,
      xpTotalEarned: true,
    },
  });
  if (!user) redirect("/login");

  const clanKey = clanScopeKey(user.clan);
  const xpSelf = user.forumLastXp ?? user.xpTotalEarned ?? 0;

  const subSelect = {
    id: true,
    condId: true,
    status: true,
    rpTitle: true,
    rpUrl: true,
    comment: true,
    collaborators: true,
    rejectionReason: true,
    createdAt: true,
    userId: true,
    user: { select: { username: true } },
  } as const;

  const [agg, baseRanks, villageCounts, clanCounts, userCounts, communitySubs, mySubs] =
    await Promise.all([
      loadScopeAggregates(),
      loadAllBaseRanks(),
      loadCommunityCounts("VILLAGE", VILLAGE_SCOPE_KEY),
      clanKey ? loadCommunityCounts("CLAN", clanKey) : Promise.resolve({} as Record<string, number>),
      loadUserCounts(user.id),
      prisma.progressionSubmission.findMany({
        where: {
          tier: "COMMUNITY",
          AND: [
            {
              OR: [
                { track: "VILLAGE", scopeKey: VILLAGE_SCOPE_KEY },
                ...(clanKey ? [{ track: "CLAN" as const, scopeKey: clanKey }] : []),
              ],
            },
            // Visibilité : RP validés visibles par tous + tes propres soumissions
            // (en attente / refusées). On n'expose pas les refus des autres membres.
            { OR: [{ status: "VALIDATED" as const }, { userId: user.id }] },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: subSelect,
      }),
      prisma.progressionSubmission.findMany({
        where: { userId: user.id, tier: "INDIVIDUAL" },
        orderBy: { createdAt: "desc" },
        select: subSelect,
      }),
    ]);

  // --- Progression contextuelle ---
  const villageProg: ScopeProgress = {
    countByCond: villageCounts,
    xpPool: agg.xpVillage,
    memberCountByRank: agg.membersVillage,
  };
  const clanProg: ScopeProgress = {
    countByCond: clanCounts,
    xpPool: clanKey ? agg.xpClans[clanKey] ?? 0 : 0,
    memberCountByRank: clanKey ? agg.membersClans[clanKey] ?? {} : {},
  };
  const userProg: UserProgress = { countByCond: userCounts, xpSelf };

  const villageRankEff = effectiveCommunityRank(
    "VILLAGE",
    baseRanks[`VILLAGE:${VILLAGE_SCOPE_KEY}`] ?? "E",
    villageProg
  );
  const clanRankEff = clanKey
    ? effectiveCommunityRank("CLAN", baseRanks[`CLAN:${clanKey}`] ?? "E", clanProg)
    : ("E" as Rank);

  // --- Soumissions indexées par condition (listes déroulantes) ---
  type Row = (typeof mySubs)[number];
  const toSub = (s: Row): SubView => ({
    id: s.id,
    title: s.rpTitle ?? undefined,
    url: s.rpUrl ?? undefined,
    comment: s.comment ?? undefined,
    collaborators: s.collaborators ?? [],
    status: s.status,
    author: s.user?.username ?? undefined,
    mine: s.userId === user.id,
    rejectionReason: s.rejectionReason ?? undefined,
    created: new Date(s.createdAt).toLocaleDateString("fr-FR"),
  });
  const groupBy = (rows: Row[]) => {
    const m = new Map<string, SubView[]>();
    for (const s of rows) {
      const arr = m.get(s.condId) ?? [];
      arr.push(toSub(s));
      m.set(s.condId, arr);
    }
    return m;
  };
  const communityByCond = groupBy(communitySubs);
  const myByCond = groupBy(mySubs);

  const myPendingCommunity = (condId: string) =>
    (communityByCond.get(condId) ?? []).filter((s) => s.mine && s.status === "PENDING").length;
  const myPendingIndividual = (condId: string) =>
    (myByCond.get(condId) ?? []).filter((s) => s.status === "PENDING").length;

  const currentRankOf: Record<string, Rank> = {
    VILLAGE: (user.rangVillage ?? "E") as Rank,
    CLAN: (user.rangClan ?? "E") as Rank,
    HISTOIRE: (user.rangHistoire ?? "E") as Rank,
  };

  function condCommunity(c: ProgCond, sp: ScopeProgress, palierStatus: "DONE" | "ACTIVE" | "LOCKED"): CondView {
    const mode = condMode(c.id);
    const auto = isAutoMode(mode);
    const adminManaged = isAdminManaged(c.id);
    const subMode = submissionMode(c.id);
    const met = communityCondMet(c, sp);
    const myPending = myPendingCommunity(c.id);
    const submittable =
      palierStatus === "ACTIVE" && !auto && !adminManaged && !met && (mode !== "oneshot" || myPending === 0);
    return {
      id: c.id,
      label: c.label,
      mode,
      submissionMode: subMode,
      target: condTarget(c.id, c.count),
      current: communityCurrent(c, sp),
      met,
      auto,
      adminManaged,
      myPending,
      submittable,
      lockReason: palierStatus === "LOCKED" ? "LOCKED" : undefined,
      submissions: communityByCond.get(c.id) ?? [],
    };
  }

  function condIndividual(c: ProgCond, palierStatus: PalierStatus): CondView {
    const mode = condMode(c.id);
    const auto = isAutoMode(mode);
    const adminManaged = isAdminManaged(c.id);
    const subMode = submissionMode(c.id);
    const met = individualCondMet(c, userProg);
    const myPending = myPendingIndividual(c.id);
    const submittable =
      palierStatus === "ACTIVE" && !auto && !adminManaged && !met && (mode !== "oneshot" || myPending === 0);
    return {
      id: c.id,
      label: c.label,
      mode,
      submissionMode: subMode,
      target: condTarget(c.id, c.count),
      current: individualCurrent(c, userProg),
      met,
      auto,
      adminManaged,
      myPending,
      submittable,
      lockReason:
        palierStatus === "LOCKED"
          ? "LOCKED"
          : palierStatus === "LOCKED_COMMUNITY"
          ? "LOCKED_COMMUNITY"
          : undefined,
      submissions: myByCond.get(c.id) ?? [],
    };
  }

  const tracks: TrackView[] = PROGRESSION_LIST.map((def) => {
    const available = def.key === "CLAN" ? !!clanKey : true;
    const effComm = def.key === "VILLAGE" ? villageRankEff : def.key === "CLAN" ? clanRankEff : ("E" as Rank);
    const personalRank = currentRankOf[def.key];
    const sp = def.key === "VILLAGE" ? villageProg : clanProg;

    const base: TrackView = {
      key: def.key,
      label: def.label,
      kanji: def.kanji,
      scope: def.scope,
      intro: def.intro,
      xpAvailable: user.xpAvailable,
      currentRank: personalRank,
      communityRank: def.key === "HISTOIRE" ? undefined : effComm,
      scopeLabel: def.key === "VILLAGE" ? "Konoha" : def.key === "CLAN" ? user.clan ?? undefined : undefined,
      available,
      unavailableReason: available
        ? undefined
        : "Tu n'appartiens à aucun clan. La voie clanique se débloque dès qu'un clan t'est attribué par le staff.",
      paliers: [],
    };
    if (!available) return base;

    base.paliers = def.paliers.map<PalierView>((p) => {
      const communityStatus =
        def.scope === "PERSO" ? undefined : communityPalierStatus(p.rank, effComm);
      const individualStatus = p.individual
        ? individualPalierStatus(def.scope, p.rank, personalRank, effComm)
        : undefined;
      return {
        rank: p.rank,
        flavorCommunity: p.flavorCommunity,
        flavorIndividual: p.flavorIndividual,
        communityStatus,
        individualStatus,
        community: p.community?.map((c) => condCommunity(c, sp, communityStatus ?? "LOCKED")),
        communityComplete: p.community ? p.community.every((c) => communityCondMet(c, sp)) : undefined,
        individual: p.individual
          ? {
              xp: p.individual.xp,
              alternatives: p.individual.alternatives.map((c) =>
                condIndividual(c, individualStatus ?? "LOCKED")
              ),
              extras: (p.individual.extras ?? []).map((ex) => ({
                id: ex.id,
                label: ex.label,
                required: !!ex.required,
                choices: ex.choices.map((c) => condIndividual(c, individualStatus ?? "LOCKED")),
              })),
              met: individualConditionsMet(def.key, p.rank, userProg),
            }
          : undefined,
        rewards: p.rewards,
      };
    });
    return base;
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="hnk-eyebrow">Progression · 火ノ国</p>
        <h1 className="hnk-serif text-4xl mt-2">Les trois voies</h1>
        <p className="text-bone/70 mt-3 max-w-2xl leading-relaxed text-sm">
          Ton personnage progresse simultanément dans trois voies : le{" "}
          <span className="text-bone">Village</span> (commun à tous), le{" "}
          <span className="text-bone">Clan</span> (avec les membres de ta lignée) et son{" "}
          <span className="text-bone">Histoire</span> (personnelle). Soumets tes RP au staff : les
          compteurs s&apos;actualisent à chaque validation.
        </p>
      </div>

      <details className="hnk-panel" data-kanji="則">
        <summary className="cursor-pointer hnk-eyebrow select-none">Préceptes de progression</summary>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {PROGRESSION_PRINCIPLES.map((pr) => (
            <div key={pr.title}>
              <p className="text-sm font-bold text-bone">{pr.title}</p>
              <p className="text-xs text-smoke mt-1 leading-relaxed">{pr.body}</p>
            </div>
          ))}
        </div>
      </details>

      <ProgressionBoard tracks={tracks} />

      <div className="pt-2">
        <Link href="/technique" className="hnk-btn-ghost">
          <span aria-hidden>←</span> Retour à la fiche technique
        </Link>
      </div>
    </div>
  );
}

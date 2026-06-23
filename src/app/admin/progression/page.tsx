import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireFicheModerator } from "@/lib/permissions";
import {
  condMeta,
  TRACK_LABEL,
  VILLAGE_SCOPE_KEY,
  clanScopeKey,
  deriveCommunityRank,
  effectiveCommunityRank,
  isAdminManaged,
  submissionMode,
  PROGRESSION,
  type Rank,
} from "@/lib/progression";
import {
  loadScopeAggregates,
  loadAllBaseRanks,
  loadCommunityCounts,
  loadAllClanCommunityCounts,
} from "@/lib/progression-server";
import AdminProgressionDecision from "@/components/AdminProgressionDecision";
import AdminCommunityRanks, { type ScopeRow } from "@/components/AdminCommunityRanks";
import AdminManagedConditions, { type ManagedCond } from "@/components/AdminManagedConditions";
import AdminProgressionUser, { type ProgUser } from "@/components/AdminProgressionUser";

// File de validation des conditions de progression (staff : ADMIN ou TECH_MOD).
// Gestion des rangs communautaires de base : ADMIN uniquement.
export default async function AdminProgressionPage() {
  const me = await requireFicheModerator();
  const isAdmin = me.role === "ADMIN";

  const pending = await prisma.progressionSubmission.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      track: true,
      tier: true,
      targetRank: true,
      condId: true,
      scopeKey: true,
      rpTitle: true,
      rpUrl: true,
      comment: true,
      collaborators: true,
      createdAt: true,
      user: { select: { id: true, username: true, clan: true } },
    },
  });

  // --- Rangs communautaires (ADMIN) : base / dérivé / effectif ---
  const scopes: ScopeRow[] = [];
  const managedVillage: ManagedCond[] = [];
  let progUsers: ProgUser[] = [];
  if (isAdmin) {
    const [agg, baseRanks, villageCounts, clanCountsByScope, clanRows, allUsers] = await Promise.all([
      loadScopeAggregates(),
      loadAllBaseRanks(),
      loadCommunityCounts("VILLAGE", VILLAGE_SCOPE_KEY),
      loadAllClanCommunityCounts(),
      prisma.user.findMany({
        where: { clan: { not: null } },
        select: { clan: true },
        distinct: ["clan"],
        orderBy: { clan: "asc" },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          clan: true,
          rangVillage: true,
          rangClan: true,
          rangHistoire: true,
        },
        orderBy: { username: "asc" },
      }),
    ]);
    progUsers = allUsers;

    const villageBase = baseRanks[`VILLAGE:${VILLAGE_SCOPE_KEY}`] ?? "E";
    const villageSp = {
      countByCond: villageCounts,
      xpPool: agg.xpVillage,
      memberCountByRank: agg.membersVillage,
    };
    scopes.push({
      type: "VILLAGE",
      key: VILLAGE_SCOPE_KEY,
      label: "Konoha (village)",
      base: villageBase,
      derived: deriveCommunityRank("VILLAGE", villageSp),
      effective: effectiveCommunityRank("VILLAGE", villageBase as Rank, villageSp),
    });

    // Union des clés de clan : membres + clans avec un rang de base posé + clans
    // ayant des soumissions validées (pas de N+1, tout est déjà chargé).
    const baseClanKeys = Object.keys(baseRanks)
      .filter((k) => k.startsWith("CLAN:"))
      .map((k) => k.slice("CLAN:".length));
    const clanKeys = Array.from(
      new Set([
        ...clanRows.map((c) => clanScopeKey(c.clan)).filter((k): k is string => !!k),
        ...Object.keys(clanCountsByScope),
        ...baseClanKeys,
      ])
    ).sort();
    for (const key of clanKeys) {
      const counts = clanCountsByScope[key] ?? {};
      const base = baseRanks[`CLAN:${key}`] ?? "E";
      const sp = {
        countByCond: counts,
        xpPool: agg.xpClans[key] ?? 0,
        memberCountByRank: agg.membersClans[key] ?? {},
      };
      // Libellé : retrouve un nom de clan original pour la clé normalisée.
      const original = clanRows.find((c) => clanScopeKey(c.clan) === key)?.clan ?? key;
      scopes.push({
        type: "CLAN",
        key,
        label: `${original} (clan)`,
        base,
        derived: deriveCommunityRank("CLAN", sp),
        effective: effectiveCommunityRank("CLAN", base as Rank, sp),
      });
    }

    // Conditions du village « gérées par le staff » (cumuls forum à cocher).
    for (const p of PROGRESSION.VILLAGE.paliers) {
      for (const c of p.community ?? []) {
        if (!isAdminManaged(c.id)) continue;
        managedVillage.push({
          condId: c.id,
          label: c.label,
          rank: p.rank,
          validated: (villageCounts[c.id] ?? 0) >= 1,
        });
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">Modération</p>
          <h1 className="font-serif text-3xl text-white2 mt-1">Conditions de progression</h1>
        </div>
        <span className="hnk-chip">{pending.length} en attente</span>
      </div>

      {isAdmin && scopes.length > 0 && <AdminCommunityRanks scopes={scopes} />}

      {isAdmin && progUsers.length > 0 && <AdminProgressionUser users={progUsers} />}

      {isAdmin && managedVillage.length > 0 && (
        <AdminManagedConditions
          scopeType="VILLAGE"
          scopeKey={VILLAGE_SCOPE_KEY}
          scopeLabel="Konoha (village)"
          conditions={managedVillage}
        />
      )}

      <section>
        <h2 className="font-serif text-xl text-white2 mb-3">File de validation</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-smoke border border-white/5 bg-ink-700 px-4 py-8 text-center">
            Aucune condition en attente de validation.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((s) => {
              const meta = condMeta(s.condId);
              const mode = submissionMode(s.condId);
              return (
                <li key={s.id} className="border border-white/5 bg-ink-700 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="hnk-chip">{TRACK_LABEL[s.track]}</span>
                    <span className="hnk-chip">
                      {s.tier === "COMMUNITY" ? "Communautaire" : "Individuelle"}
                    </span>
                    <span className="hnk-chip">
                      {mode === "MANUAL" ? "Validation manuelle" : mode === "GROUP" ? "RP à plusieurs" : "Solo"}
                    </span>
                    <span className="hnk-chip">Vise Rang {s.targetRank}</span>
                    {s.tier === "COMMUNITY" && s.scopeKey && (
                      <span className="text-[10px] text-smoke uppercase tracking-wider">
                        · scope : {s.scopeKey}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-bone leading-relaxed">
                    {meta?.label ?? (
                      <span className="text-ember-hot">Condition inconnue ({s.condId})</span>
                    )}
                  </p>

                  <p className="text-xs text-smoke mt-1">
                    Soumis par{" "}
                    <Link href={`/admin/users/${s.user.id}`} className="text-bone hover:text-ember">
                      {s.user.username}
                    </Link>
                    {s.user.clan ? ` · ${s.user.clan}` : ""} ·{" "}
                    {new Date(s.createdAt).toLocaleString("fr-FR")}
                  </p>

                  {/* Détail du RP soumis */}
                  <div className="mt-2 text-xs bg-ink-900 border border-white/5 px-3 py-2 space-y-1">
                    {s.rpTitle && <p className="text-bone font-bold">{s.rpTitle}</p>}
                    {s.rpUrl ? (
                      <a
                        href={s.rpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ember hover:underline break-words block"
                      >
                        {s.rpUrl}
                      </a>
                    ) : (
                      <p className="text-smoke italic">Aucun lien fourni.</p>
                    )}
                    {s.comment && (
                      <p className="text-bone/80 whitespace-pre-wrap break-words pt-1">
                        {s.comment}
                      </p>
                    )}
                    {s.collaborators && s.collaborators.length > 0 && (
                      <p className="text-bone/75 whitespace-pre-wrap break-words pt-1">
                        Avec : {s.collaborators.join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="mt-3">
                    <AdminProgressionDecision submissionId={s.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import AdminUserPanel from "@/components/AdminUserPanel";
import { AdminDeleteFicheButton, AdminDeleteInvocationButton } from "@/components/AdminDeleteButtons";
import { levelProgress } from "@/lib/xp";
import { loadKgNames } from "@/lib/kekkei-server";
import { hasInvocationRankColumn } from "@/lib/invocation-schema";
import { XP_AUDIT_REASONS, xpAudit, type XpAudit, type XpReasonSums } from "@/lib/xp-audit";

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireAdmin();
  const { id } = await params;
  const kgNames = await loadKgNames();
  const hasInvRank = await hasInvocationRankColumn();

  const [user, history, fiches, invocations, auditRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        canManageAdmins: true,
        xpAvailable: true,
        xpTotalEarned: true,
        primaryKg: true,
        primaryAffinity: true,
        clan: true,
        rang: true,
        rangVillage: true,
        rangHistoire: true,
        rangClan: true,
        artsState: true,
        progressionState: true,
        grade: true,
        uniteSpeciale: true,
        trame: true,
        prime: true,
        age: true,
        genre: true,
        kekkeiGenkai: true,
        affinites: true,
        pactAffinities: true,
        forumProfileUrl: true,
        forumPseudo: true,
        forumAvatar: true,
        forumLastXp: true,
        forumLastSyncAt: true,
        forumLastSyncError: true,
      },
    }),
    prisma.xPTransaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        amount: true,
        reason: true,
        createdAt: true,
        actor: { select: { username: true } },
        metadata: true,
      },
    }),
    prisma.ficheTechnique.findMany({
      where: { authorId: id, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        nom: true,
        status: true,
        coutXp: true,
        createdAt: true,
        invocationId: true,
        invocation: { select: { espece: true, ...(hasInvRank ? { invocationRank: true } : {}) } },
      },
    }),
    prisma.invocation.findMany({
      where: { ownerId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nom: true,
        espece: true,
        artShinobi: true,
        ...(hasInvRank ? { invocationRank: true } : {}),
      },
    }),
    prisma.xPTransaction.groupBy({
      by: ["reason"],
      where: { userId: id, reason: { in: XP_AUDIT_REASONS } },
      _sum: { amount: true },
    }),
  ]);

  if (!user) notFound();
  const reasonSums: XpReasonSums = {};
  for (const row of auditRows) reasonSums[row.reason] = row._sum.amount ?? 0;
  const audit = xpAudit({
    xpAvailable: user.xpAvailable,
    xpTotalEarned: user.xpTotalEarned,
    forumLastXp: user.forumLastXp,
    reasonSums,
  });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/users" className="text-xs text-smoke hover:text-ember">
          ← Joueurs
        </Link>
        <h1 className="font-serif text-3xl text-white2 mt-2">{user.username}</h1>
        <p className="text-xs text-smoke mt-2 tabular-nums">
          {user.xpAvailable} XP disponibles · {user.xpTotalEarned} XP cumulés · {audit.xpSpentTotal} XP dépensés
        </p>
      </div>

      {audit.hasAlert && (
        <section className="border border-red-400/50 bg-red-500/10 p-4">
          <p className="text-[10px] tracking-[0.28em] uppercase text-red-300 font-bold">
            Alerte XP
          </p>
          <p className="text-sm text-bone mt-2">
            Total contrôlé supérieur à la source : +{audit.extraXp} XP. Réserve attendue après
            dépenses et ajustements staff : {audit.expectedAvailable} XP.
          </p>
        </section>
      )}

        <LiveMemberView user={user} audit={audit} />

        <AdminUserPanel
          user={user}
          currentUserId={me.id}
          canManageAdmins={me.canManageAdmins}
          kgNames={kgNames}
        />

      <section>
        <h2 className="font-serif text-xl text-white2 mb-3 pb-2 border-b border-ember/20">
          Fiches techniques ({fiches.length})
        </h2>
        <ul className="divide-y divide-white/5 border border-white/5 bg-ink-700">
          {fiches.map((f) => (
          <li key={f.id} className="px-4 py-2 flex items-center justify-between text-sm gap-2">
              <div className="min-w-0 flex-1">
                <Link href={`/technique/fiches/${f.id}`} className="text-bone hover:text-ember flex-1 min-w-0 truncate">
                  {f.nom}
                </Link>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em]">
                  {f.invocationId && (
                    <span className="hnk-chip">
                      Kuchiyose
                      {hasInvRank && (f as any).invocation?.invocationRank ? ` · Rang ${(f as any).invocation.invocationRank}` : ""}
                    </span>
                  )}
                  {f.invocationId && (f as any).invocation?.espece && (
                    <span className="hnk-chip">Espèce · {(f as any).invocation.espece}</span>
                  )}
                  <span className="text-smoke shrink-0">
                    {f.status} · {f.coutXp} XP
                  </span>
                </div>
              </div>
              <AdminDeleteFicheButton ficheId={f.id} ficheName={f.nom} />
          </li>
          ))}
          {fiches.length === 0 && (
            <li className="px-4 py-4 text-sm text-smoke italic">Aucune fiche.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-white2 mb-3 pb-2 border-b border-ember/20">
          Invocations ({invocations.length})
        </h2>
        <ul className="divide-y divide-white/5 border border-white/5 bg-ink-700">
          {invocations.map((inv) => (
            <li key={inv.id} className="px-4 py-2 flex items-center justify-between text-sm gap-2">
              <span className="text-bone flex-1 min-w-0 truncate">{inv.nom}</span>
              <span className="text-xs text-smoke shrink-0">
                {inv.espece ?? "—"}{inv.artShinobi ? ` · ${inv.artShinobi}` : ""}{hasInvRank && (inv as any).invocationRank ? ` · Rang ${(inv as any).invocationRank}` : ""}
              </span>
              <AdminDeleteInvocationButton invocationId={inv.id} invocationName={inv.nom} />
            </li>
          ))}
          {invocations.length === 0 && (
            <li className="px-4 py-4 text-sm text-smoke italic">Aucune invocation.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-white2 mb-3 pb-2 border-b border-ember/20">
          Historique XP (100 derniers)
        </h2>
        <ul className="divide-y divide-white/5 border border-white/5 bg-ink-700">
          {history.map((t) => (
            <li
              key={t.id}
              className="px-4 py-2 flex items-start justify-between gap-4 text-sm"
            >
              <div className="text-xs text-smoke min-w-0">
                <p>
                  {xpReasonLabel(t.reason)}
                  {t.actor && ` · par ${t.actor.username}`}
                </p>
                {t.metadata != null && (
                  <p className="mt-1 text-[10px] text-smoke/80 break-words font-mono">
                    {formatMetadata(t.metadata)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span
                  className={`tabular-nums ${
                    t.amount > 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount}
                </span>
                <span className="text-xs text-smoke">
                  {new Date(t.createdAt).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </li>
          ))}
          {history.length === 0 && (
            <li className="px-4 py-4 text-sm text-smoke italic">Aucun mouvement.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function LiveMemberView({
  user,
  audit,
}: {
  user: {
    username: string;
    role: "USER" | "ADMIN" | "TECH_MOD";
    canManageAdmins: boolean;
    xpAvailable: number;
    xpTotalEarned: number;
    forumAvatar: string | null;
    forumProfileUrl: string | null;
    forumPseudo: string | null;
    forumLastXp: number | null;
    forumLastSyncAt: Date | null;
    clan: string | null;
    grade: string | null;
    rang: string | null;
    rangVillage: string | null;
    rangHistoire: string | null;
    rangClan: string | null;
    primaryKg: string | null;
    primaryAffinity: string | null;
    kekkeiGenkai: string | null;
    affinites: string[];
  };
  audit: XpAudit;
}) {
  const totalXp = user.forumLastXp ?? user.xpTotalEarned;
  const xpPct =
    totalXp > 0 ? Math.min(100, Math.round((user.xpAvailable / totalXp) * 100)) : 0;
  const level = levelProgress(user.xpTotalEarned);

  return (
    <section className="border border-ember/20 bg-ink-700 p-5">
      <div className="flex flex-wrap items-center gap-5">
        {user.forumAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.forumAvatar}
            alt={user.username}
            className="hnk-avatar w-20 h-20 flex-none"
          />
        ) : (
          <div className="hnk-avatar w-20 h-20 flex-none bg-ink-900" />
        )}
        <div className="flex-1 min-w-[220px]">
          <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">
            Live view membre
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <h2 className="font-serif text-3xl text-white2">{user.username}</h2>
            {user.role === "ADMIN" && (
              <span className="hnk-chip">
                Admin{user.canManageAdmins ? " maître" : ""}
              </span>
            )}
            {user.rang && <span className={`hnk-chip ${rangClass(user.rang)}`}>Rang {user.rang}</span>}
          </div>
          <div className="mt-3 max-w-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] tracking-[0.22em] uppercase text-smoke">
                XP disponible
              </span>
              <span className="text-sm font-bold tabular-nums">
                <span className="text-ember">{user.xpAvailable}</span>
                <span className="text-smoke"> / {totalXp} XP</span>
              </span>
            </div>
            <div className="hnk-xpbar">
              <span style={{ width: `${xpPct}%` }} />
            </div>
            <p className="text-[10px] text-smoke mt-2 tabular-nums">
              Niveau {level.level} · palier {level.current} / {level.next}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`mt-5 border p-4 ${
          audit.hasAlert ? "border-red-400/50 bg-red-500/10" : "border-white/5 bg-ink-900/60"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] tracking-[0.28em] uppercase text-smoke">Audit XP staff</p>
          {audit.hasAlert ? (
            <span className="text-[10px] tracking-[0.22em] uppercase text-red-300 font-bold">
              Alerte +{audit.extraXp} XP
            </span>
          ) : (
            <span className="text-[10px] tracking-[0.22em] uppercase text-emerald-400">
              Cohérent
            </span>
          )}
        </div>
        <div className="grid sm:grid-cols-5 gap-3 mt-3">
          <AuditStat label={audit.sourceLabel === "forum" ? "Source forum" : "Source corrigée"} value={audit.sourceXp} />
          <AuditStat label="Réserve" value={user.xpAvailable} />
          <AuditStat label="Dépenses méca" value={audit.xpSpentTotal} />
          <AuditStat label="Ajust. staff" value={audit.staffNet} signed />
          <AuditStat label="Contrôle" value={audit.controlledTotal} />
        </div>
        <p className="text-[10px] text-smoke mt-3 leading-relaxed">
          Contrôle = réserve + dépenses mécaniques - ajustements staff. Les crédits, rendus et
          retraits staff ne comptent pas comme XP générée.
          {audit.missingXp > 0 && ` Écart négatif observé : ${audit.missingXp} XP.`}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-x-8 gap-y-1 mt-5">
        <Field k="Clan" v={user.clan} />
        <Field k="Grade" v={user.grade} />
        <Field k="KG principal" v={user.primaryKg} />
        <Field k="Affinité principale" v={user.primaryAffinity} />
        <Field k="Kekkei Genkai" v={user.kekkeiGenkai} />
        <Field k="Affinités" v={user.affinites.length ? user.affinites.join(", ") : null} />
        <Field k="Rang village" v={user.rangVillage} />
        <Field k="Rang histoire" v={user.rangHistoire} />
        <Field k="Rang clan" v={user.rangClan} />
      </div>

      <div className="mt-4 text-xs text-smoke">
        Sync forum :{" "}
        <span className="text-bone">
          {user.forumLastSyncAt
            ? new Date(user.forumLastSyncAt).toLocaleString("fr-FR")
            : "jamais"}
        </span>
        {user.forumPseudo && ` · ${user.forumPseudo}`}
        {user.forumProfileUrl && (
          <>
            {" · "}
            <a href={user.forumProfileUrl} target="_blank" rel="noopener noreferrer">
              ouvrir le profil forum
            </a>
          </>
        )}
      </div>
    </section>
  );
}

function rangClass(rang: string | null | undefined): string {
  const g = (rang ?? "").trim().toLowerCase();
  return /^[edcbas]$/.test(g) ? `rk-${g}` : "";
}

function AuditStat({ label, value, signed = false }: { label: string; value: number; signed?: boolean }) {
  return (
    <div className="border border-white/5 bg-ink-900 px-3 py-2">
      <p className="text-[9px] uppercase tracking-[0.2em] text-smoke">{label}</p>
      <p className="text-sm text-bone tabular-nums mt-1">
        {signed && value > 0 ? "+" : ""}
        {value} XP
      </p>
    </div>
  );
}

function xpReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    ADMIN_GRANT: "Crédit staff",
    ADMIN_REMOVE: "Retrait staff",
    REGISTRATION_BONUS: "Bonus inscription",
    FORUM_SYNC: "Sync forum",
    FICHE_VALIDATED: "Validation fiche",
    FICHE_REJECTED_REFUND: "Rendu XP",
    ARTS_SPEND: "Dépense arts",
    QUINTESSENCE_SPEND: "Dépense quintessence",
    PROGRESSION_SPEND: "Dépense progression",
  };
  return labels[reason] ?? reason.replace(/_/g, " ").toLowerCase();
}

function formatMetadata(metadata: unknown): string {
  if (metadata == null) return "";
  if (typeof metadata === "string") return metadata;
  try {
    return JSON.stringify(metadata);
  } catch {
    return String(metadata);
  }
}

function Field({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="hnk-field">
      <p className="k">{k}</p>
      <p className="v">{v && v.trim() ? v : <span className="text-smoke">—</span>}</p>
    </div>
  );
}

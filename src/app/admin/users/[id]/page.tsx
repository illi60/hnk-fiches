import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import AdminUserPanel from "@/components/AdminUserPanel";
import { AdminDeleteFicheButton, AdminDeleteInvocationButton } from "@/components/AdminDeleteButtons";
import { levelProgress } from "@/lib/xp";
import { loadKgNames } from "@/lib/kekkei-server";

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireAdmin();
  const { id } = await params;
  const kgNames = await loadKgNames();

  const [user, history, fiches, invocations] = await Promise.all([
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
      take: 20,
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
      select: { id: true, nom: true, status: true, coutXp: true, createdAt: true },
    }),
    prisma.invocation.findMany({
      where: { ownerId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, nom: true, espece: true, artShinobi: true },
    }),
  ]);

  if (!user) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/users" className="text-xs text-smoke hover:text-ember">
          ← Joueurs
        </Link>
        <h1 className="font-serif text-3xl text-white2 mt-2">{user.username}</h1>
        <p className="text-xs text-smoke mt-2 tabular-nums">
          {user.xpAvailable} XP disponibles · {user.xpTotalEarned} XP cumulés
        </p>
      </div>

        <LiveMemberView user={user} />

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
              <Link href={`/technique/fiches/${f.id}`} className="text-bone hover:text-ember flex-1 min-w-0 truncate">
                {f.nom}
              </Link>
              <span className="text-xs text-smoke shrink-0">
                {f.status} · {f.coutXp} XP
              </span>
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
                {inv.espece ?? "—"}{inv.artShinobi ? ` · ${inv.artShinobi}` : ""}
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
          Historique XP (20 derniers)
        </h2>
        <ul className="divide-y divide-white/5 border border-white/5 bg-ink-700">
          {history.map((t) => (
            <li
              key={t.id}
              className="px-4 py-2 flex items-center justify-between text-sm"
            >
              <div className="text-xs text-smoke">
                {t.reason.replace(/_/g, " ").toLowerCase()}
                {t.actor && ` · par ${t.actor.username}`}
              </div>
              <div className="flex items-center gap-4">
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

function Field({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="hnk-field">
      <p className="k">{k}</p>
      <p className="v">{v && v.trim() ? v : <span className="text-smoke">—</span>}</p>
    </div>
  );
}

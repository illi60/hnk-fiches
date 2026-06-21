import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrSyncUser } from "@/lib/forum-sync";
import { ARTS_ALL, artRank, isArtOwned, type ArtsState } from "@/lib/arts";
import { effectiveCommRankForUserTrack } from "@/lib/progression-server";
import ArtsRadar from "@/components/ArtsRadar";
import ArtsManager from "@/components/ArtsManager";
import ProgressionManager from "@/components/ProgressionManager";
import IdentityChooser from "@/components/IdentityChooser";
import ChangePassword from "@/components/ChangePassword";
import { type ProgressionState } from "@/lib/quintessence";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Read-through : rafraîchit depuis le forum si le cache a dépassé le TTL
  // (best-effort, jamais bloquant — sert le cache si le forum est lent).
  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 6000);
    await getOrSyncUser(session.user.id, { signal: ac.signal });
    clearTimeout(to);
  } catch {
    // forum injoignable → on continue avec le cache
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      xpAvailable: true,
      xpTotalEarned: true,
      forumAvatar: true,
      primaryKg: true,
      primaryAffinity: true,
      rang: true,
      clan: true,
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
      forumProfileUrl: true,
      forumPseudo: true,
      forumLastXp: true,
      forumLastSyncAt: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/login");

  const totalXp = user.forumLastXp ?? user.xpTotalEarned;
  const xpPct =
    totalXp > 0 ? Math.min(100, Math.round((user.xpAvailable / totalXp) * 100)) : 0;

  // Rangs communautaires effectifs (collectifs) — partagés par tous les membres.
  const [villageCommRank, clanCommRank] = await Promise.all([
    effectiveCommRankForUserTrack("VILLAGE", user.clan),
    user.clan ? effectiveCommRankForUserTrack("CLAN", user.clan) : Promise.resolve(null),
  ]);
  const artsState = ((user.artsState ?? {}) as unknown) as ArtsState;
  const progression = ((user.progressionState ?? {}) as unknown) as ProgressionState;

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-5">
        {user.forumAvatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.forumAvatar}
            alt={user.username}
            className="hnk-avatar w-20 h-20 flex-none"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="hnk-eyebrow">Profil shinobi · 火ノ国</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <h1 className="hnk-serif text-4xl">{user.username}</h1>
            {user.rang && (
              <span className={`hnk-chip ${rangClass(user.rang)}`}>Rang {user.rang}</span>
            )}
          </div>
          <div className="mt-3 max-w-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="hnk-eyebrow">Réserve d&apos;XP</span>
              <span className="text-sm font-bold tabular-nums">
                <span className="text-ember">{user.xpAvailable}</span>
                <span className="text-smoke"> / {totalXp} XP</span>
              </span>
            </div>
            <div className="hnk-xpbar">
              <span style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <IdentityChooser
        primaryKg={user.primaryKg}
        primaryAffinity={user.primaryAffinity}
        rang={user.rang}
        secondAffinity={(user.affinites ?? []).find((a) => a && a !== user.primaryAffinity) ?? null}
      />

      {/* Fiche du personnage — remontée */}
      <section>
        <h2 className="hnk-section-title">Fiche du personnage</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
          <Field k="Clan" v={user.clan} />
          <Field k="Grade" v={user.grade} />
          <Field k="Unité spéciale" v={user.uniteSpeciale} />
          <Field k="Trame" v={user.trame} />
        </div>
      </section>

      {/* Les 3 rangs — perso (ton rang) + collectif (village/clan, partagé) */}
      <div className="grid sm:grid-cols-3 gap-5">
        <RankCard label="Rang du village" value={user.rangVillage} kanji="里" community={villageCommRank} />
        <RankCard label="Rang histoire" value={user.rangHistoire} kanji="史" />
        <RankCard label="Rang clan" value={user.rangClan} kanji="氏" community={clanCommRank} />
      </div>

      {/* Arts Shinobi */}
      <section>
        <h2 className="hnk-section-title">Arts Shinobi</h2>
        <div className="grid lg:grid-cols-[minmax(0,360px),1fr] gap-6 items-start">
          <div className="hnk-panel flex items-center justify-center" data-kanji="技">
            <ArtsRadar
              axes={ARTS_ALL.map((a) => ({
                kanji: a.kanji,
                label: a.name,
                rank: isArtOwned(artsState, a.key, user.rang)
                  ? artRank(a.key, artsState, user.rang)
                  : "E",
              }))}
            />
          </div>
          <ArtsManager
            artsState={artsState}
            villageRank={user.rang}
            histoireRank={user.rangHistoire}
            xpAvailable={user.xpAvailable}
          />
        </div>
        <p className="text-[10px] text-smoke mt-3 tracking-wide">
          Arts débloqués selon le rang global (E:1 · D:2 · C:3 · B+:tous). Montée automatique
          E → B (suit le rang). Au-delà (B → A → S) : expertise (3 arts max parmi les 6) — coût en
          XP. Kuchiyose : Rang C Histoire + 20 XP.
        </p>
      </section>

      <ProgressionManager
        progression={progression}
        xpAvailable={user.xpAvailable}
        villageRank={user.rangVillage}
        clanRank={user.rangClan}
        histoireRank={user.rangHistoire}
      />

      {user.forumProfileUrl && (
        <section>
          <h2 className="hnk-section-title">Lien forum</h2>
          <div className="hnk-panel" data-kanji="絆">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="hnk-chip">Synchronisé</span>
              <a href={user.forumProfileUrl} target="_blank" rel="noopener noreferrer">
                {user.forumProfileUrl}
              </a>
            </div>
            <p className="text-sm text-smoke">
              Dernière sync :{" "}
              <span className="text-bone">
                {user.forumLastSyncAt
                  ? new Date(user.forumLastSyncAt).toLocaleString("fr-FR")
                  : "jamais"}
              </span>
              {user.forumLastXp !== null && (
                <>
                  {" · "}XP forum :{" "}
                  <span className="text-bone tabular-nums">{user.forumLastXp}</span>
                </>
              )}
            </p>
          </div>
        </section>
      )}

      <div className="pt-2 flex flex-wrap gap-3">
        <Link href="/technique/progression" className="hnk-btn">
          Progression · les trois voies <span aria-hidden>→</span>
        </Link>
        <Link href="/technique/fiches" className="hnk-btn-ghost">
          Mes techniques <span aria-hidden>→</span>
        </Link>
        {user.clan && (
          <Link href="/technique/clan" className="hnk-btn-ghost">
            Bibliothèque de clan · {user.clan} <span aria-hidden>→</span>
          </Link>
        )}
      </div>

      <ChangePassword />
    </div>
  );
}

function rangClass(rang: string | null | undefined): string {
  const g = (rang ?? "").trim().toUpperCase();
  return /^[EDCBAS]$/.test(g) ? `rk-${g.toLowerCase()}` : "";
}

function RankCard({
  label,
  value,
  kanji,
  community,
}: {
  label: string;
  value: string | null | undefined;
  kanji: string;
  community?: string | null;
}) {
  return (
    <div className="hnk-panel text-center" data-kanji={kanji}>
      <p className="hnk-eyebrow">{label}</p>
      {value ? (
        <p
          className={`${rangClass(value)} mt-3`}
          style={{ fontFamily: "var(--display)", fontSize: 72, lineHeight: 1 }}
        >
          {value}
        </p>
      ) : (
        <p className="text-smoke mt-3" style={{ fontSize: 72, lineHeight: 1 }}>
          —
        </p>
      )}
      {community !== undefined && (
        <p className="hnk-eyebrow mt-2">
          Collectif ·{" "}
          <span className={`font-bold ${rangClass(community)}`}>{community ?? "E"}</span>
        </p>
      )}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="hnk-field">
      <p className="k">{k}</p>
      <p className="v">{v && v.trim() ? v : <span className="text-smoke">—</span>}</p>
    </div>
  );
}

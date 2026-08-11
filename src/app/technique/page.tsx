import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrSyncUser } from "@/lib/forum-sync";
import { effectiveCommRankForUserTrack } from "@/lib/progression-server";
import ProgressionManager from "@/components/ProgressionManager";
import IdentityChooser from "@/components/IdentityChooser";
import ChangePassword from "@/components/ChangePassword";
import ProfileDetailTabs from "@/components/ProfileDetailTabs";
import { type ProgressionState } from "@/lib/quintessence";
import { type ArtsState } from "@/lib/arts";
import { loadKgCatalog } from "@/lib/kekkei-server";
import { isNoClan } from "@/lib/clans";
import { loadShopItems, loadShopItemsByKeys } from "@/lib/shop-server";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const kgCatalog = await loadKgCatalog();
  const kgNames = kgCatalog.map((kg) => kg.name);
  const kgColors = Object.fromEntries(kgCatalog.map((kg) => [kg.name, kg.color]));

  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 6000);
    await getOrSyncUser(session.user.id, { signal: ac.signal });
    clearTimeout(to);
  } catch {
    // Forum injoignable: on continue avec le cache.
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
      inventoryItems: {
        orderBy: { updatedAt: "desc" },
        select: {
          itemKey: true,
          itemName: true,
          costXp: true,
          quantity: true,
        },
      },
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
  const hasClan = !!user.clan && !isNoClan(user.clan);

  const totalXp = user.forumLastXp ?? user.xpTotalEarned;
  const xpPct =
    totalXp > 0 ? Math.min(100, Math.round((user.xpAvailable / totalXp) * 100)) : 0;

  const [villageCommRank, clanCommRank, shopItems, inventoryCatalogItems] = await Promise.all([
    effectiveCommRankForUserTrack("VILLAGE", user.clan),
    hasClan ? effectiveCommRankForUserTrack("CLAN", user.clan) : Promise.resolve(null),
    loadShopItems(),
    loadShopItemsByKeys(user.inventoryItems.map((item) => item.itemKey)),
  ]);
  const catalogByKey = new Map(shopItems.map((item) => [item.key, item]));
  for (const item of inventoryCatalogItems) {
    catalogByKey.set(item.key, item);
  }
  const profileCatalog = Array.from(catalogByKey.values());
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
              <span className="hnk-eyebrow">Reserve d&apos;XP</span>
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
        kgNames={kgNames}
        kgColors={kgColors}
      />

      <section>
        <h2 className="hnk-section-title">Fiche du personnage</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
          <Field k="Clan" v={hasClan ? user.clan : null} />
          <Field k="Grade" v={user.grade} />
          <Field k="Unite speciale" v={user.uniteSpeciale} />
          <Field k="Trame" v={user.trame} />
        </div>
      </section>

      <div className="grid sm:grid-cols-3 gap-5">
        <RankCard label="Rang du village" value={user.rangVillage} kanji="里" community={villageCommRank} />
        <RankCard label="Rang histoire" value={user.rangHistoire} kanji="史" />
        <RankCard label="Rang clan" value={hasClan ? user.rangClan : null} kanji="氏" community={hasClan ? clanCommRank : undefined} />
      </div>

      <ProfileDetailTabs
        artsState={artsState}
        artsRank={user.rang}
        histoireRank={user.rangHistoire}
        xpAvailable={user.xpAvailable}
        inventory={user.inventoryItems}
        catalog={profileCatalog}
      />

      <ProgressionManager
        progression={progression}
        xpAvailable={user.xpAvailable}
        villageRank={user.rangVillage}
        clanRank={hasClan ? user.rangClan : null}
        histoireRank={user.rangHistoire}
        kgNames={kgNames}
        kgColors={kgColors}
      />

      {user.forumProfileUrl && (
        <section>
          <h2 className="hnk-section-title">Lien forum</h2>
          <div className="hnk-panel" data-kanji="絆">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="hnk-chip">Synchronise</span>
              <a href={user.forumProfileUrl} target="_blank" rel="noopener noreferrer">
                {user.forumProfileUrl}
              </a>
            </div>
            <p className="text-sm text-smoke">
              Derniere sync:{" "}
              <span className="text-bone">
                {user.forumLastSyncAt
                  ? new Date(user.forumLastSyncAt).toLocaleString("fr-FR")
                  : "jamais"}
              </span>
              {user.forumLastXp !== null && (
                <>
                  {" · "}XP forum:{" "}
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
        {hasClan && (
          <Link href="/technique/clan" className="hnk-btn-ghost">
            Bibliotheque de clan · {user.clan} <span aria-hidden>→</span>
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

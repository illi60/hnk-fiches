import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ownedAffinities, ownedKgsFull, type ProgressionState } from "@/lib/quintessence";
import ClanLibraryView from "@/components/ClanLibraryView";
import { loadKgCatalog } from "@/lib/kekkei-server";
import { ARTS_ALL, type ArtsState } from "@/lib/arts";
import { resolveTechniqueSpecRanks } from "@/lib/technique-display";

export const metadata = { title: "Bibliothèque de clan · Hi no Kuni" };

export default async function ClanLibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      clan: true,
      primaryKg: true,
      kekkeiGenkai: true,
      progressionState: true,
      primaryAffinity: true,
      affinites: true,
      artsState: true,
      rang: true,
    },
  });
  if (!user?.clan) redirect("/technique");

  const owned = ownedKgsFull(
    user.primaryKg,
    (user.progressionState ?? {}) as unknown as ProgressionState,
    user.kekkeiGenkai
  ).map((k) => k.toLowerCase());
  const affinities = ownedAffinities(user.primaryAffinity, user.affinites).map((a) => a.toLowerCase());
  const kgCatalog = await loadKgCatalog();
  const kgColors = Object.fromEntries(kgCatalog.map((kg) => [kg.name, kg.color]));
  const viewerArts = (user.artsState ?? {}) as ArtsState;

  const rows = await prisma.ficheTechnique.findMany({
    where: {
      clan: { equals: user.clan, mode: "insensitive" },
      nature: "COLLECTIVE",
      status: "VALIDATED",
      isActive: true,
    },
    orderBy: { nom: "asc" },
    select: {
      id: true,
      nom: true,
      description: true,
      art: true,
      spec: true,
      secondaryArt: true,
      secondarySpec: true,
      actionType: true,
      element: true,
      kekkeiGenkai: true,
      secondaryElement: true,
      secondaryKekkeiGenkai: true,
      coutXp: true,
      nature: true,
      author: { select: { username: true } },
    },
  });
  const techniques = rows.map((t) => ({
    ...t,
    ...(() => {
      const artKey = t.art
        ? t.art.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        : null;
      const artDef = artKey ? ARTS_ALL.find((a) => a.key === artKey) : null;
      const resolvedSpec = t.spec ?? (artDef?.specs[0] ?? null);
      const specIdx = artDef && resolvedSpec ? (artDef.specs as string[]).indexOf(resolvedSpec) : -1;
      const secondaryArtKey = t.secondaryArt
        ? t.secondaryArt.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        : null;
      const secondaryArtDef = secondaryArtKey ? ARTS_ALL.find((a) => a.key === secondaryArtKey) : null;
      const resolvedSecondarySpec = t.secondarySpec ?? (secondaryArtDef?.specs[0] ?? null);
      const secondarySpecIdx =
        secondaryArtDef && resolvedSecondarySpec ? (secondaryArtDef.specs as string[]).indexOf(resolvedSecondarySpec) : -1;
      const { specRank, secondarySpecRank } = resolveTechniqueSpecRanks({
        artKey,
        specIdx,
        secondaryArtKey,
        secondarySpecIdx,
        nature: t.nature,
        invocationId: null,
        invocationRank: null,
        viewerArtsState: viewerArts,
        viewerRank: user.rang ?? null,
        authorArtsState: viewerArts,
        authorRank: user.rang ?? null,
      });
      return {
        spec: resolvedSpec,
        specRank,
        secondarySpec: resolvedSecondarySpec,
        secondarySpecRank,
      };
    })(),
    usable:
      (!!t.kekkeiGenkai && owned.includes(t.kekkeiGenkai.toLowerCase())) ||
      (!!t.element && affinities.includes(t.element.toLowerCase())),
  }));

  return (
    <div className="space-y-8">
      <section className="hnk-kuchy-hero">
        <div className="hnk-kuchy-title">
          <div>
            <p className="label">Bibliothèque commune · 蔵</p>
            <h1 className="value">
              Clan <small>{user.clan}</small>
            </h1>
          </div>
        </div>
        <p className="text-sm text-bone/80 mt-4 max-w-3xl leading-relaxed relative z-[1]">
          Cette page montre les techniques collectives de ton clan, visibles par tous les membres
          du groupe. Les cartes indiquent ce qui est partagé, ce qui est utilisable selon ton
          Kekkei Genkai et ce qui peut être repris dans une fiche.
        </p>
        <div className="mt-4 flex justify-end">
          <Link href="/technique" className="hnk-btn-ghost !py-2 !px-4">
            Retour au profil
          </Link>
        </div>
      </section>

      <ClanLibraryView techniques={techniques} clan={user.clan} kgColors={kgColors} variant="kuchy" />
    </div>
  );
}

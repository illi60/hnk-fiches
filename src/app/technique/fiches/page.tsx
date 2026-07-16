import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TechniquesView, { type MyTech } from "@/components/TechniquesView";
import { ARTS_ALL, type ArtsState } from "@/lib/arts";
import { resolveTechniqueSpecRanks } from "@/lib/technique-display";
import { loadKgCatalogRows } from "@/lib/kekkei-server";
import { hasInvocationRankColumn } from "@/lib/invocation-schema";

export default async function MyFichesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const meId = session.user.id;

  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: { artsState: true, rang: true },
  });
  const meArts = (me?.artsState ?? null) as ArtsState | null;
  const meVillageRank = me?.rang ?? null;
  const kgCatalog = await loadKgCatalogRows();
  const kgColors = Object.fromEntries(kgCatalog.map((kg) => [kg.name, kg.color]));
  const hasInvRank = await hasInvocationRankColumn();

  // Mes fiches + celles où je suis participant (type d'action COLLECTIVE).
  const fiches = await prisma.ficheTechnique.findMany({
    where: { isActive: true, OR: [{ authorId: meId }, { collaboratorIds: { has: meId } }] },
    orderBy: { createdAt: "desc" },
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
      nature: true,
      kinjutsuScope: true,
      clan: true,
      coutXp: true,
      status: true,
      authorId: true,
      ...(hasInvRank
        ? {
            invocation: {
              select: {
                nom: true,
                espece: true,
                invocationRank: true,
              },
            },
          }
        : {}),
    },
  });

  const techniques: MyTech[] = fiches.map((f) => {
    const artKey = f.art
      ? f.art.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      : null;
    const artDef = artKey ? ARTS_ALL.find((a) => a.key === artKey) : null;
    const resolvedSpec = f.spec ?? (f.nature === "COLLECTIVE" ? artDef?.specs[0] ?? null : null);
    const specIdx = artDef && resolvedSpec ? (artDef.specs as string[]).indexOf(resolvedSpec) : -1;
    const secArtKey = f.secondaryArt
      ? f.secondaryArt.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      : null;
    const secArtDef = secArtKey ? ARTS_ALL.find((a) => a.key === secArtKey) : null;
    const resolvedSecondarySpec =
      f.secondarySpec ?? (f.nature === "COLLECTIVE" ? secArtDef?.specs[0] ?? null : null);
    const secSpecIdx = secArtDef && resolvedSecondarySpec ? (secArtDef.specs as string[]).indexOf(resolvedSecondarySpec) : -1;
    const { specRank: ficheSpecRank, secondarySpecRank: ficheSecondarySpecRank } =
      resolveTechniqueSpecRanks({
        artKey,
        specIdx,
        secondaryArtKey: secArtKey,
        secondarySpecIdx: secSpecIdx,
        nature: f.nature,
        invocationId: f.invocation ? "present" : null,
        invocationRank: hasInvRank ? (f.invocation as any)?.invocationRank ?? null : null,
        viewerArtsState: meArts,
        viewerRank: meVillageRank,
        authorArtsState: meArts,
        authorRank: meVillageRank,
      });
    return {
    id: f.id,
    nom: f.nom,
    description: f.description,
    art: f.art,
    spec: resolvedSpec,
    specRank: ficheSpecRank,
    secondaryArt: f.secondaryArt,
    secondarySpec: resolvedSecondarySpec,
    secondarySpecRank: ficheSecondarySpecRank,
    actionType: f.actionType,
    element: f.element,
    kekkeiGenkai: f.kekkeiGenkai,
    secondaryElement: f.secondaryElement,
    secondaryKekkeiGenkai: f.secondaryKekkeiGenkai,
    nature: f.nature,
    kinjutsuScope: f.kinjutsuScope,
    clan: f.clan,
    coutXp: f.coutXp,
    status: f.status,
    mine: f.authorId === meId,
    invocationNom: f.invocation?.nom ?? null,
    invocationEspece: f.invocation?.espece ?? null,
    invocationRank: hasInvRank ? (f.invocation as any)?.invocationRank ?? null : null,
    };
  });

  return (
    <div className="space-y-6">
      <section className="hnk-kuchy-hero">
        <div className="hnk-kuchy-title">
          <div>
            <p className="label">Registre · 口寄せ</p>
            <h1 className="value">
              Mes <small>techniques</small>
            </h1>
          </div>
        </div>
        <p className="text-sm text-bone/80 mt-4 max-w-3xl leading-relaxed relative z-[1]">
          Cette page réunit toutes tes fiches techniques, qu&apos;elles soient en brouillon, en
          attente ou déjà validées. Tu y retrouves l&apos;état de chaque technique, son coût XP et
          son accès direct à la fiche ou à l&apos;export forum.
        </p>
        <div className="mt-4 flex justify-end">
          <Link href="/technique/fiches/new" className="hnk-btn">
            Nouvelle technique
          </Link>
        </div>
      </section>

      <TechniquesView techniques={techniques} kgColors={kgColors} variant="kuchy" />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TechniquesView, { type MyTech } from "@/components/TechniquesView";
import { ARTS_ALL, type ArtsState } from "@/lib/arts";
import { resolveTechniqueSpecRanks } from "@/lib/technique-display";
import { loadKgCatalogRows } from "@/lib/kekkei-server";

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
      invocation: { select: { nom: true, espece: true } },
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
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="hnk-eyebrow">Registre</p>
          <h1 className="hnk-serif text-3xl mt-1">Mes techniques</h1>
        </div>
        <Link href="/technique/fiches/new" className="hnk-btn">
          Nouvelle technique
        </Link>
      </div>

      <TechniquesView techniques={techniques} kgColors={kgColors} />
    </div>
  );
}

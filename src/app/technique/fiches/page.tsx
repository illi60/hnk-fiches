import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TechniquesView, { type MyTech } from "@/components/TechniquesView";
import { ARTS_ALL, specRank, invocationSpecRank, type ArtsState } from "@/lib/arts";

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
    const specIdx = artDef && f.spec ? (artDef.specs as string[]).indexOf(f.spec) : -1;
    // Kuchy : la spé suit le rang global du joueur (auto, plafond B), pas l'artsState.
    const isKuchy = f.invocation != null;
    const ficheSpecRank =
      artDef && specIdx >= 0 && meVillageRank != null
        ? isKuchy
          ? invocationSpecRank(meVillageRank)
          : meArts != null
          ? specRank(artDef.key, specIdx, meArts, meVillageRank)
          : null
        : null;
    const secArtKey = f.secondaryArt
      ? f.secondaryArt.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      : null;
    const secArtDef = secArtKey ? ARTS_ALL.find((a) => a.key === secArtKey) : null;
    const secSpecIdx = secArtDef && f.secondarySpec ? (secArtDef.specs as string[]).indexOf(f.secondarySpec) : -1;
    const ficheSecondarySpecRank =
      secArtDef && secSpecIdx >= 0 && meVillageRank != null
        ? isKuchy
          ? invocationSpecRank(meVillageRank)
          : meArts != null
          ? specRank(secArtDef.key, secSpecIdx, meArts, meVillageRank)
          : null
        : null;
    return {
    id: f.id,
    nom: f.nom,
    description: f.description,
    art: f.art,
    spec: f.spec,
    specRank: ficheSpecRank,
    secondaryArt: f.secondaryArt,
    secondarySpec: f.secondarySpec,
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

      <TechniquesView techniques={techniques} />
    </div>
  );
}

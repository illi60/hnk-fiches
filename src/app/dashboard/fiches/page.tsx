import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TechniquesView, { type MyTech } from "@/components/TechniquesView";

export default async function MyFichesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const meId = session.user.id;

  // Mes fiches + celles où je suis participant (type d'action COLLECTIVE).
  const fiches = await prisma.ficheTechnique.findMany({
    where: { isActive: true, OR: [{ authorId: meId }, { collaboratorIds: { has: meId } }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nom: true,
      description: true,
      art: true,
      secondaryArt: true,
      actionType: true,
      element: true,
      kekkeiGenkai: true,
      nature: true,
      kinjutsuScope: true,
      clan: true,
      coutXp: true,
      status: true,
      authorId: true,
      invocation: { select: { nom: true, espece: true } },
    },
  });

  const techniques: MyTech[] = fiches.map((f) => ({
    id: f.id,
    nom: f.nom,
    description: f.description,
    art: f.art,
    secondaryArt: f.secondaryArt,
    actionType: f.actionType,
    element: f.element,
    kekkeiGenkai: f.kekkeiGenkai,
    nature: f.nature,
    kinjutsuScope: f.kinjutsuScope,
    clan: f.clan,
    coutXp: f.coutXp,
    status: f.status,
    mine: f.authorId === meId,
    invocationNom: f.invocation?.nom ?? null,
    invocationEspece: f.invocation?.espece ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="hnk-eyebrow">Registre</p>
          <h1 className="hnk-serif text-3xl mt-1">Mes techniques</h1>
        </div>
        <Link href="/dashboard/fiches/new" className="hnk-btn">
          Nouvelle technique
        </Link>
      </div>

      <TechniquesView techniques={techniques} />
    </div>
  );
}

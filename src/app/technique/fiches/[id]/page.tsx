import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import FicheForm from "@/components/FicheForm";
import FicheActions from "@/components/FicheActions";
import TechniqueExport from "@/components/TechniqueExport";
import { actionLabel, natureLabel, ART_KANJI } from "@/lib/techniques";
import { kgColor, kgCardStyle } from "@/lib/kekkei";
import { ownedKgsFull, ownedAffinities, type ProgressionState } from "@/lib/quintessence";
import { ARTS_ALL, specRank, type ArtsState } from "@/lib/arts";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente de validation",
  VALIDATED: "Validée",
  REJECTED: "Refusée",
};

export default async function FicheDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const fiche = await prisma.ficheTechnique.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      nom: true,
      description: true,
      art: true,
      spec: true,
      secondaryArt: true,
      actionType: true,
      element: true,
      kekkeiGenkai: true,
      secondaryElement: true,
      secondaryKekkeiGenkai: true,
      nature: true,
      kinjutsuScope: true,
      clan: true,
      collaborators: true,
      coutXp: true,
      status: true,
      rejectionReason: true,
      authorId: true,
      isActive: true,
      invocation: { select: { nom: true, espece: true } },
    },
  });

  if (!fiche || !fiche.isActive) notFound();
  if (fiche.authorId !== session.user.id && session.user.role !== "ADMIN") notFound();

  // Éditable tant que c'est un brouillon ou une technique refusée (à corriger).
  const readOnly = fiche.status === "PENDING" || fiche.status === "VALIDATED";

  // KG / affinités possédés par l'AUTEUR (pour restreindre les choix à l'édition).
  const author = await prisma.user.findUnique({
    where: { id: fiche.authorId },
    select: {
      primaryKg: true,
      primaryAffinity: true,
      affinites: true,
      progressionState: true,
      clan: true,
      rangClan: true,
      kekkeiGenkai: true,
      artsState: true,
      rangVillage: true,
    },
  });
  const authorState = ((author?.progressionState ?? {}) as unknown) as ProgressionState;
  const allowedKg = ownedKgsFull(author?.primaryKg, authorState, author?.kekkeiGenkai);
  const allowedElements = ownedAffinities(author?.primaryAffinity, author?.affinites);

  // Rang de la spécialisation (calculé depuis l'état Arts de l'auteur).
  const authorArts = (author?.artsState ?? {}) as ArtsState;
  const artKey = fiche.art
    ? fiche.art.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    : null;
  const artDef = artKey ? ARTS_ALL.find((a) => a.key === artKey) : null;
  const specIdx = artDef && fiche.spec
    ? (artDef.specs as string[]).indexOf(fiche.spec)
    : -1;
  const ficheSpecRank =
    artDef && specIdx >= 0 && author?.artsState != null && author?.rangVillage != null
      ? specRank(artDef.key, specIdx, authorArts, author.rangVillage)
      : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/technique/fiches" className="text-xs text-smoke hover:text-ember">
            ← Mes techniques
          </Link>
          <h1 className="font-serif text-3xl text-white2 mt-2">{fiche.nom}</h1>
          <p className="text-[10px] tracking-[0.24em] uppercase text-ember mt-1">
            {STATUS_LABEL[fiche.status]} · {fiche.coutXp} XP
          </p>
        </div>
        <FicheActions ficheId={fiche.id} status={fiche.status} />
      </div>

      {fiche.status === "REJECTED" && fiche.rejectionReason && (
        <div className="border border-red-500/40 border-l-2 bg-red-500/5 px-4 py-3">
          <p className="text-[10px] tracking-[0.24em] uppercase text-red-400 mb-1">
            Motif du refus
          </p>
          <p className="text-bone text-sm">{fiche.rejectionReason}</p>
        </div>
      )}

      {readOnly ? (
        <>
          {/* Affichage fige (lecture seule) : telle que soumise puis validee. */}
          <article className="hnk-tech" style={kgCardStyle(fiche.kekkeiGenkai)}>
            <div className="hnk-tech-meta">
              Technique{fiche.coutXp ? ` · ${fiche.coutXp} XP` : ""}
            </div>
            <div className="hnk-tech-name">{fiche.nom}</div>
            <div className="hnk-tech-chips">
              {fiche.art && (
                <span className="hnk-tech-chip">
                  {`${ART_KANJI[fiche.art] ?? ""} ${fiche.art}`}
                  {fiche.spec ? ` · ${fiche.spec}` : ""}
                  {ficheSpecRank ? ` · ${ficheSpecRank}` : ""}
                </span>
              )}
              {fiche.secondaryArt && (
                <span className="hnk-tech-chip">{`${ART_KANJI[fiche.secondaryArt] ?? ""} ${fiche.secondaryArt}`}</span>
              )}
              {fiche.invocation?.espece && (
                <span className="hnk-tech-chip">口 {fiche.invocation.espece}</span>
              )}
              {fiche.actionType && (
                <span className="hnk-tech-chip">{actionLabel(fiche.actionType)}</span>
              )}
              {fiche.element && <span className="hnk-tech-chip">{fiche.element}</span>}
              {fiche.secondaryElement && (
                <span className="hnk-tech-chip">{fiche.secondaryElement}</span>
              )}
              {fiche.kekkeiGenkai && (
                <span
                  className="hnk-tech-chip"
                  style={{ color: kgColor(fiche.kekkeiGenkai), borderColor: kgColor(fiche.kekkeiGenkai) }}
                >
                  KG · {fiche.kekkeiGenkai}
                </span>
              )}
              {fiche.secondaryKekkeiGenkai && (
                <span
                  className="hnk-tech-chip"
                  style={{
                    color: kgColor(fiche.secondaryKekkeiGenkai),
                    borderColor: kgColor(fiche.secondaryKekkeiGenkai),
                  }}
                >
                  KG · {fiche.secondaryKekkeiGenkai}
                </span>
              )}
              {fiche.nature && (
                <span className="hnk-tech-chip">
                  {natureLabel(fiche.nature, fiche.kinjutsuScope, fiche.clan)}
                </span>
              )}
            </div>
            <div className="hnk-tech-desc" style={{ whiteSpace: "pre-line", textAlign: "justify" }}>
              {fiche.description}
            </div>
          </article>

          {fiche.status === "PENDING" && (
            <p className="text-xs text-smoke italic">
              En attente de validation par le staff — non modifiable.
            </p>
          )}

          {fiche.status === "VALIDATED" && (
            <TechniqueExport
              data={{
                nom: fiche.nom,
                art: fiche.art,
                spec: fiche.spec ?? null,
                specRank: ficheSpecRank ?? null,
                secondaryArt: fiche.secondaryArt,
                actionType: fiche.actionType,
                element: fiche.element,
                kekkeiGenkai: fiche.kekkeiGenkai,
                secondaryElement: fiche.secondaryElement,
                secondaryKekkeiGenkai: fiche.secondaryKekkeiGenkai,
                nature: fiche.nature,
                kinjutsuScope: fiche.kinjutsuScope,
                clan: fiche.clan,
                espece: fiche.invocation?.espece ?? null,
                description: fiche.description,
                coutXp: fiche.coutXp,
              }}
            />
          )}
        </>
      ) : (
        <FicheForm
          ficheId={fiche.id}
          allowedKg={allowedKg}
          allowedElements={allowedElements}
          userClan={author?.clan ?? null}
          rangClan={author?.rangClan ?? null}
          artsState={(author?.artsState ?? null) as import("@/lib/arts").ArtsState | null}
          villageRank={author?.rangVillage ?? null}
          initial={{
            nom: fiche.nom,
            description: fiche.description,
            art: fiche.art ?? "",
            spec: fiche.spec ?? "",
            secondaryArt: fiche.secondaryArt ?? "",
            actionType: fiche.actionType ?? "",
            element: fiche.element ?? "",
            kekkeiGenkai: fiche.kekkeiGenkai ?? "",
            secondaryElement: fiche.secondaryElement ?? "",
            secondaryKekkeiGenkai: fiche.secondaryKekkeiGenkai ?? "",
            nature: fiche.nature ?? "",
            kinjutsuScope: fiche.kinjutsuScope ?? "",
            collaborators: fiche.collaborators ?? [],
          }}
        />
      )}
    </div>
  );
}

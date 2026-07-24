import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import FicheForm from "@/components/FicheForm";
import FicheActions from "@/components/FicheActions";
import TechniqueExport from "@/components/TechniqueExport";
import { actionLabel, natureLabel, techniqueArtChipLabel } from "@/lib/techniques";
import { ficheStatusLabel, isFicheEditable } from "@/lib/fiche-status";
import { resolveTechniqueSpecRanks } from "@/lib/technique-display";
import { kgColor } from "@/lib/kekkei";
import { ownedKgsFull, ownedAffinities, type ProgressionState } from "@/lib/quintessence";
import { ARTS_ALL, type ArtsState } from "@/lib/arts";
import { loadClanLibraryAccess, loadKgCatalogRows } from "@/lib/kekkei-server";
import { hasInvocationRankColumn } from "@/lib/invocation-schema";

export default async function FicheDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const hasInvRank = await hasInvocationRankColumn();

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
      secondarySpec: true,
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

  if (!fiche || !fiche.isActive) notFound();
  if (fiche.authorId !== session.user.id && session.user.role !== "ADMIN") notFound();

  // Profil du lecteur courant : les techniques collectives affichent leurs spés
  // selon celui qui les copie, pas selon l'auteur.
  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { artsState: true, rang: true },
  });

  // Seule la version validée est figée. Une fiche en attente peut encore être corrigée.
  const readOnly = !isFicheEditable(fiche.status);

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
      rang: true,
    },
  });
  const authorState = ((author?.progressionState ?? {}) as unknown) as ProgressionState;
  const allowedKg = ownedKgsFull(author?.primaryKg, authorState, author?.kekkeiGenkai);
  const allowedElements = ownedAffinities(author?.primaryAffinity, author?.affinites);
  const kgCatalog = await loadKgCatalogRows();
  const kgNames = kgCatalog.map((kg) => kg.name);
  const kgColors = Object.fromEntries(kgCatalog.map((kg) => [kg.name, kg.color]));
  const clanLibraryAccess = await loadClanLibraryAccess(author?.clan ?? null);

  // Rang de la spécialisation : pour une technique collective, on l'évalue avec
  // le lecteur courant ; sinon on garde le profil de l'auteur.
  const authorArts = (author?.artsState ?? {}) as ArtsState;
  const viewerArts = (viewer?.artsState ?? {}) as ArtsState;
  const artKey = fiche.art
    ? fiche.art.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    : null;
  const artDef = artKey ? ARTS_ALL.find((a) => a.key === artKey) : null;
  const resolvedSpec = fiche.spec ?? (fiche.nature === "COLLECTIVE" ? artDef?.specs[0] ?? null : null);
  const specIdx = artDef && resolvedSpec ? (artDef.specs as string[]).indexOf(resolvedSpec) : -1;
  const isKuchy = fiche.invocation != null;

  const secondaryArtKey = fiche.secondaryArt
    ? fiche.secondaryArt.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    : null;
  const secondaryArtDef = secondaryArtKey ? ARTS_ALL.find((a) => a.key === secondaryArtKey) : null;
  const resolvedSecondarySpec =
    fiche.secondarySpec ??
    (fiche.nature === "COLLECTIVE" ? secondaryArtDef?.specs[0] ?? null : null);
  const secondarySpecIdx = secondaryArtDef && resolvedSecondarySpec
    ? (secondaryArtDef.specs as string[]).indexOf(resolvedSecondarySpec)
    : -1;
  const { specRank: ficheSpecRank, secondarySpecRank: ficheSecondarySpecRank } =
    resolveTechniqueSpecRanks({
      artKey,
      specIdx,
      secondaryArtKey,
      secondarySpecIdx,
      nature: fiche.nature,
      invocationId: fiche.invocation ? "present" : null,
      invocationRank: hasInvRank ? (fiche.invocation as any)?.invocationRank ?? null : null,
      viewerArtsState: viewerArts,
      viewerRank: viewer?.rang ?? null,
      authorArtsState: authorArts,
      authorRank: author?.rang ?? null,
    });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/technique/fiches" className="text-xs text-smoke hover:text-ember">
            ← Mes techniques
          </Link>
          <h1 className="font-serif text-3xl text-white2 mt-2">{fiche.nom}</h1>
          <p className="text-[10px] tracking-[0.24em] uppercase text-ember mt-1">
            {ficheStatusLabel(fiche.status)} · {fiche.coutXp} XP
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
          <article
            className={`hnk-tech${isKuchy ? " hnk-tech--kuchy" : ""}`}
            style={isKuchy ? undefined : buildCardStyle(fiche.kekkeiGenkai, kgColors)}
          >
            <div className="hnk-tech-meta">
              Technique{fiche.coutXp ? ` · ${fiche.coutXp} XP` : ""}
            </div>
            <div className="hnk-tech-name">{fiche.nom}</div>
            <div className="hnk-tech-chips">
              {isKuchy && <span className="hnk-tech-chip">Kuchiyose</span>}
              {techniqueArtChipLabel({
                art: fiche.art,
                spec: resolvedSpec,
                specRank: ficheSpecRank,
                nature: fiche.nature,
              }) && (
                <span className="hnk-tech-chip">
                  {techniqueArtChipLabel({
                    art: fiche.art,
                    spec: resolvedSpec,
                    specRank: ficheSpecRank,
                    nature: fiche.nature,
                  })}
                </span>
              )}
              {techniqueArtChipLabel({
                art: fiche.secondaryArt,
                spec: resolvedSecondarySpec,
                specRank: ficheSecondarySpecRank,
                nature: fiche.nature,
              }) && (
                <span className="hnk-tech-chip">
                  {techniqueArtChipLabel({
                    art: fiche.secondaryArt,
                    spec: resolvedSecondarySpec,
                    specRank: ficheSecondarySpecRank,
                    nature: fiche.nature,
                  })}
                </span>
              )}
              {fiche.invocation?.espece && (
                <span className="hnk-tech-chip">Espèce · {fiche.invocation.espece}</span>
              )}
              {hasInvRank && (fiche.invocation as any)?.invocationRank && (
                <span className="hnk-tech-chip">Rang invoc. {(fiche.invocation as any).invocationRank}</span>
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
                  style={{
                    color: resolveKgColor(fiche.kekkeiGenkai, kgColors),
                    borderColor: resolveKgColor(fiche.kekkeiGenkai, kgColors),
                  }}
                >
                  KG · {fiche.kekkeiGenkai}
                </span>
              )}
              {fiche.secondaryKekkeiGenkai && (
                <span
                  className="hnk-tech-chip"
                  style={{
                    color: resolveKgColor(fiche.secondaryKekkeiGenkai, kgColors),
                    borderColor: resolveKgColor(fiche.secondaryKekkeiGenkai, kgColors),
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
              Version en attente : tu peux encore corriger le brouillon envoyé ou le retirer de la file.
            </p>
          )}

          {fiche.status === "VALIDATED" && (
            <TechniqueExport
              data={{
                nom: fiche.nom,
                art: fiche.art,
                spec: resolvedSpec,
                specRank: ficheSpecRank ?? null,
                secondaryArt: fiche.secondaryArt,
                secondarySpec: resolvedSecondarySpec,
                secondarySpecRank: ficheSecondarySpecRank ?? null,
                actionType: fiche.actionType,
                element: fiche.element,
                kekkeiGenkai: fiche.kekkeiGenkai,
                kgColorHex: fiche.kekkeiGenkai ? resolveKgColor(fiche.kekkeiGenkai, kgColors) : null,
                secondaryElement: fiche.secondaryElement,
                secondaryKekkeiGenkai: fiche.secondaryKekkeiGenkai,
                secondaryKgColorHex: fiche.secondaryKekkeiGenkai
                  ? resolveKgColor(fiche.secondaryKekkeiGenkai, kgColors)
                  : null,
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
          status={fiche.status}
          allowedKg={allowedKg}
          allowedElements={allowedElements}
          userClan={author?.clan ?? null}
          rangClan={author?.rangClan ?? null}
          artsState={(author?.artsState ?? null) as import("@/lib/arts").ArtsState | null}
          artsRank={author?.rang ?? null}
          kgNames={kgNames}
          kgColors={kgColors}
          clanLibraryAccess={clanLibraryAccess}
          initial={{
            nom: fiche.nom,
            description: fiche.description,
            art: fiche.art ?? "",
            spec: fiche.spec ?? "",
            secondaryArt: fiche.secondaryArt ?? "",
            secondarySpec: fiche.secondarySpec ?? "",
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

function resolveKgColor(name: string, kgColors?: Record<string, string>) {
  return kgColors?.[name] ?? kgColor(name);
}

function buildCardStyle(name: string | null, kgColors?: Record<string, string>) {
  if (!name) return {};
  const c = resolveKgColor(name, kgColors);
  return {
    backgroundImage: `linear-gradient(135deg, ${c}2e 0%, ${c}14 38%, rgba(0,0,0,0) 72%)`,
    borderColor: `${c}66`,
    boxShadow: `inset 4px 0 0 ${c}, 0 0 22px ${c}1f`,
  };
}

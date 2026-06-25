import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getArtState, type ArtsState } from "@/lib/arts";
import {
  getProgression,
  ownedKgs,
  ownedKgsFull,
  ownedAffinities,
  type ProgressionState,
} from "@/lib/quintessence";
import InvocationsManager, { type Invocation } from "@/components/InvocationsManager";
import { loadClanLibraryAccess, loadKgCatalogRows } from "@/lib/kekkei-server";

export default async function InvocationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      artsState: true,
      progressionState: true,
      pactAffinities: true,
      clan: true,
      rangClan: true,
      rang: true,
      primaryKg: true,
      primaryAffinity: true,
      affinites: true,
      kekkeiGenkai: true,
      pactSpecies: true,
    },
  });
  const state = ((dbUser?.artsState ?? {}) as unknown) as ArtsState;
  // Onglet réservé aux joueurs ayant débloqué le Kuchiyose.
  if (!getArtState(state, "kuchiyose").unlocked) redirect("/technique");

  const prog = getProgression((dbUser?.progressionState ?? {}) as unknown as ProgressionState);
  const ermiteStage = prog.mode?.path === "ERMITE" ? prog.mode?.stage ?? 0 : 0;
  const kgCatalog = await loadKgCatalogRows();
  const kgNames = kgCatalog.map((kg) => kg.name);
  const kgColors = Object.fromEntries(kgCatalog.map((kg) => [kg.name, kg.color]));
  const clanLibraryAccess = await loadClanLibraryAccess(dbUser?.clan ?? null);

  const rows = await prisma.invocation.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  // Techniques (FicheTechnique) rattachées aux invocations, par invocation.
  const fiches = await prisma.ficheTechnique.findMany({
    where: { authorId: session.user.id, invocationId: { not: null }, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, nom: true, status: true, coutXp: true, invocationId: true },
  });
  const fichesByInv = new Map<string, { id: string; nom: string; status: string; coutXp: number }[]>();
  for (const f of fiches) {
    if (!f.invocationId) continue;
    const list = fichesByInv.get(f.invocationId) ?? [];
    list.push({ id: f.id, nom: f.nom, status: f.status, coutXp: f.coutXp });
    fichesByInv.set(f.invocationId, list);
  }

  const invocations: Invocation[] = rows.map((r) => ({
    id: r.id,
    nom: r.nom,
    espece: r.espece,
    artShinobi: r.artShinobi,
    kekkeiGenkai: r.kekkeiGenkai,
    image: r.image,
    description: r.description,
    techniques: Array.isArray(r.techniques)
      ? (r.techniques as unknown[]).map((t) => {
          const o = (t ?? {}) as { nom?: unknown; description?: unknown };
          return { nom: String(o.nom ?? ""), description: String(o.description ?? "") };
        })
      : [],
    fiches: fichesByInv.get(r.id) ?? [],
  }));

  return (
    <div className="space-y-8">
      <div>
        <p className="hnk-eyebrow">Kuchiyose · 口寄せ</p>
        <h1 className="hnk-serif text-4xl mt-2">Invocations</h1>
        <p className="text-sm text-smoke mt-2">
          Tes pactes animaux : affinité de pacte, Art Shinobi propre à chaque animal et fiches
          techniques soumises à validation.
        </p>
      </div>
      <InvocationsManager
        initial={invocations}
        pactAffinities={(dbUser?.pactAffinities ?? []).filter(Boolean)}
        pactMaxSlots={ermiteStage >= 1 ? 2 : 1}
        pactSpecies={dbUser?.pactSpecies ?? null}
        ermitePerfect={ermiteStage >= 3}
        ownedKgs={ownedKgsFull(dbUser?.primaryKg, prog, dbUser?.kekkeiGenkai)}
        kgNames={kgNames}
        kgColors={kgColors}
        ficheCtx={{
          allowedKg: ownedKgs(dbUser?.primaryKg, prog),
          allowedElements: ownedAffinities(dbUser?.primaryAffinity, dbUser?.affinites),
          userClan: dbUser?.clan ?? null,
          rangClan: dbUser?.rangClan ?? null,
          artsState: (dbUser?.artsState ?? null) as import("@/lib/arts").ArtsState | null,
          villageRank: dbUser?.rang ?? null,
          clanLibraryAccess,
        }}
      />
    </div>
  );
}

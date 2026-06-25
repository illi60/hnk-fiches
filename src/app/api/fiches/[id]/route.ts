import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { ficheUpdateSchema } from "@/lib/validators";
import { ficheTotalCost } from "@/lib/techniques";
import { canUseCollectiveManifestation, loadClanLibraryAccess } from "@/lib/kekkei-server";
import { ownedAffinities, ownedKgsFull, type ProgressionState } from "@/lib/quintessence";

// PATCH /api/fiches/[id] — éditer SON propre DRAFT.
// Une fois PENDING/VALIDATED/REJECTED, plus d'édition côté joueur
// (sauf admin via route admin).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const parsed = ficheUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

    const fiche = await prisma.ficheTechnique.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
        actionType: true,
        nature: true,
        element: true,
        kekkeiGenkai: true,
        isActive: true,
      },
    });
    if (!fiche || !fiche.isActive) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (fiche.authorId !== me.id) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (fiche.status !== "DRAFT" && fiche.status !== "REJECTED")
      return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });

    // Le coût dérive du type d'action (+ surcharge personnelle) — recalculé serveur.
    const newActionType =
      parsed.data.actionType !== undefined ? parsed.data.actionType : fiche.actionType;
    const newNature = parsed.data.nature !== undefined ? parsed.data.nature : fiche.nature;
    const coutXp = ficheTotalCost(newActionType ?? null, newNature ?? null);

    // Nature COLLECTIVE -> être du clan + utiliser une option autorisée et possédée.
    let clanUpdate: { clan?: string | null } = {};
    const collectiveFieldsChanged =
      parsed.data.nature !== undefined ||
      parsed.data.element !== undefined ||
      parsed.data.kekkeiGenkai !== undefined;
    if (collectiveFieldsChanged) {
      if (newNature === "COLLECTIVE") {
        const u = await prisma.user.findUnique({
          where: { id: me.id },
          select: {
            clan: true,
            primaryKg: true,
            kekkeiGenkai: true,
            progressionState: true,
            primaryAffinity: true,
            affinites: true,
          },
        });
        if (!u?.clan) return NextResponse.json({ error: "CLAN_REQUIS" }, { status: 400 });
        if (u.clan.toLowerCase().trim() === "konoha")
          return NextResponse.json({ error: "CLAN_SANS_KG" }, { status: 400 });
        const prog = (u.progressionState ?? {}) as unknown as ProgressionState;
        const access = await loadClanLibraryAccess(u.clan);
        const owned = {
          kg: ownedKgsFull(u.primaryKg, prog, u.kekkeiGenkai),
          affinities: ownedAffinities(u.primaryAffinity, u.affinites),
        };
        if (
          !canUseCollectiveManifestation(access, owned, {
            kg: parsed.data.kekkeiGenkai !== undefined ? parsed.data.kekkeiGenkai : fiche.kekkeiGenkai,
            affinity: parsed.data.element !== undefined ? parsed.data.element : fiche.element,
          })
        ) {
          return NextResponse.json({ error: "CLAN_LIBRARY_REQUIS" }, { status: 403 });
        }
        clanUpdate = { clan: u.clan };
      } else {
        clanUpdate = { clan: null };
      }
    }

    // Type d'action COMBINEE → 2e Art ; sinon on l'efface.
    let secondaryArtUpdate: { secondaryArt?: string | null; secondarySpec?: string | null } = {};
    if (parsed.data.secondaryArt !== undefined || parsed.data.secondarySpec !== undefined || parsed.data.actionType !== undefined) {
      secondaryArtUpdate = {
        secondaryArt:
          newActionType === "COMBINEE" ? parsed.data.secondaryArt ?? null : null,
        secondarySpec:
          newActionType === "COMBINEE" ? parsed.data.secondarySpec ?? null : null,
      };
    }

    // Type d'action COMBINEE → 2e manifestation (affinité / KG) ; sinon on l'efface.
    let secondaryManifUpdate: { secondaryElement?: string | null; secondaryKekkeiGenkai?: string | null } = {};
    if (
      parsed.data.secondaryElement !== undefined ||
      parsed.data.secondaryKekkeiGenkai !== undefined ||
      parsed.data.actionType !== undefined
    ) {
      const combinee = newActionType === "COMBINEE";
      secondaryManifUpdate = {
        secondaryElement: combinee ? parsed.data.secondaryElement ?? null : null,
        secondaryKekkeiGenkai: combinee ? parsed.data.secondaryKekkeiGenkai ?? null : null,
      };
    }

    // Type d'action COLLECTIVE → pseudos des partenaires (re-résolus à la soumission).
    let collaboratorsUpdate: { collaborators?: string[]; collaboratorIds?: string[] } = {};
    if (parsed.data.collaborators !== undefined || parsed.data.actionType !== undefined) {
      if (newActionType === "COLLECTIVE") {
        collaboratorsUpdate = {
          collaborators: (parsed.data.collaborators ?? []).map((s) => s.trim()).filter(Boolean),
          collaboratorIds: [],
        };
      } else {
        collaboratorsUpdate = { collaborators: [], collaboratorIds: [] };
      }
    }

    const updated = await prisma.ficheTechnique.update({
      where: { id },
      data: {
        ...(parsed.data.slug !== undefined && { slug: parsed.data.slug }),
        ...(parsed.data.nom !== undefined && { nom: parsed.data.nom }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.art !== undefined && { art: parsed.data.art ?? null }),
        ...(parsed.data.spec !== undefined && { spec: parsed.data.spec ?? null }),
        ...secondaryArtUpdate,
        ...secondaryManifUpdate,
        ...(parsed.data.actionType !== undefined && { actionType: parsed.data.actionType ?? null }),
        ...(parsed.data.element !== undefined && { element: parsed.data.element ?? null }),
        ...(parsed.data.kekkeiGenkai !== undefined && { kekkeiGenkai: parsed.data.kekkeiGenkai ?? null }),
        ...(parsed.data.nature !== undefined && { nature: parsed.data.nature ?? null }),
        ...(parsed.data.kinjutsuScope !== undefined && { kinjutsuScope: parsed.data.kinjutsuScope ?? null }),
        ...clanUpdate,
        ...collaboratorsUpdate,
        ...(parsed.data.comment !== undefined && { comment: parsed.data.comment ?? null }),
        ...(parsed.data.type !== undefined && { type: parsed.data.type ?? null }),
        ...(parsed.data.rangMin !== undefined && { rangMin: parsed.data.rangMin ?? null }),
        coutXp,
      },
      select: { id: true, slug: true, nom: true, coutXp: true, status: true },
    });

    return NextResponse.json({ fiche: updated });
  } catch (e) {
    return jsonError(e);
  }
}

// DELETE /api/fiches/[id] — soft-delete d'un DRAFT du joueur.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;

    const fiche = await prisma.ficheTechnique.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, isActive: true },
    });
    if (!fiche || !fiche.isActive) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (fiche.authorId !== me.id) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (fiche.status !== "DRAFT" && fiche.status !== "REJECTED")
      return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });

    await prisma.ficheTechnique.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

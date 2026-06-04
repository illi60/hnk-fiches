import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminFicheCreateSchema } from "@/lib/validators";

// POST /api/admin/users/[id]/fiches
//
// Ajout MANUEL par un admin d'une technique directement dans la fiche d'un joueur
// (ou dans la bibliothèque commune d'un clan via nature=COLLECTIVE + clan).
// Créée directement en VALIDATED, SANS débit XP (coutXp au choix, défaut 0).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id: targetId } = await params;

    const body = await req.json().catch(() => null);
    const parsed = adminFicheCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    const d = parsed.data;

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    // L'invocation (si fournie) doit appartenir au joueur cible.
    let invocationId: string | null = null;
    if (d.invocationId) {
      const inv = await prisma.invocation.findFirst({
        where: { id: d.invocationId, ownerId: targetId },
        select: { id: true },
      });
      if (!inv) return NextResponse.json({ ok: false, error: "INVOCATION_INVALIDE" }, { status: 400 });
      invocationId = inv.id;
    }

    // Slug unique auto-généré.
    const base =
      d.nom
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70) || "technique";
    let slugVal = base;
    for (let i = 2; ; i++) {
      const clash = await prisma.ficheTechnique.findUnique({
        where: { slug: slugVal },
        select: { id: true },
      });
      if (!clash) break;
      slugVal = `${base}-${i}`;
    }

    const fiche = await prisma.ficheTechnique.create({
      data: {
        slug: slugVal,
        nom: d.nom,
        description: d.description,
        art: d.art ?? null,
        secondaryArt: d.actionType === "COMBINEE" ? d.secondaryArt ?? null : null,
        actionType: d.actionType ?? null,
        element: d.element ?? null,
        kekkeiGenkai: d.kekkeiGenkai ?? null,
        nature: d.nature ?? null,
        clan: d.nature === "COLLECTIVE" ? d.clan ?? null : null,
        invocationId,
        coutXp: d.coutXp ?? 0,
        status: "VALIDATED",
        authorId: targetId,
        validatedById: admin.id,
        validatedAt: new Date(),
      },
      select: { id: true, slug: true, nom: true, status: true },
    });

    return NextResponse.json({ ok: true, fiche });
  } catch (e) {
    return jsonError(e);
  }
}

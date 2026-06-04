import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminClanLibrarySchema } from "@/lib/validators";

// POST /api/admin/clan-library
//
// Ajoute une technique dans la bibliothèque commune d'un clan : créée directement
// en VALIDATED, nature COLLECTIVE, sans débit XP. Auteur = admin (trace).
// Visible par tous les membres du clan ; utilisable par ceux qui ont le KG.
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = adminClanLibrarySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    const d = parsed.data;

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
        actionType: d.actionType ?? null,
        element: d.element ?? null,
        kekkeiGenkai: d.kekkeiGenkai,
        nature: "COLLECTIVE",
        clan: d.clan.trim(),
        coutXp: d.coutXp ?? 0,
        status: "VALIDATED",
        authorId: admin.id,
        validatedById: admin.id,
        validatedAt: new Date(),
      },
      select: { id: true, slug: true, nom: true, clan: true },
    });

    return NextResponse.json({ ok: true, fiche });
  } catch (e) {
    return jsonError(e);
  }
}

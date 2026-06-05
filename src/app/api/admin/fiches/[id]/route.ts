import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";

// DELETE /api/admin/fiches/[id]
// Suppression (soft-delete) d'une technique par un admin.
// Fonctionne quel que soit le statut.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const fiche = await prisma.ficheTechnique.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!fiche || !fiche.isActive)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await prisma.ficheTechnique.update({ where: { id }, data: { isActive: false } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

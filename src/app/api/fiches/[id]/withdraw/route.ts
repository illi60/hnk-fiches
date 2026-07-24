import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { isFrozenCharacter } from "@/lib/character-status";

// POST /api/fiches/[id]/withdraw — retire une fiche PENDING de la modération
// sans la supprimer, pour revenir à un état éditable.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const meState = await prisma.user.findUnique({
      where: { id: me.id },
      select: { characterStatus: true },
    });
    if (!meState || isFrozenCharacter(meState.characterStatus)) {
      return NextResponse.json({ error: "CHARACTER_FROZEN" }, { status: 403 });
    }

    const fiche = await prisma.ficheTechnique.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, isActive: true },
    });
    if (!fiche || !fiche.isActive) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (fiche.authorId !== me.id) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (fiche.status !== "PENDING") return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });

    await prisma.ficheTechnique.update({
      where: { id },
      data: {
        status: "DRAFT",
        rejectionReason: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

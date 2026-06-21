import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";

// DELETE /api/me/progression/submit/[id]
// Annule une soumission EN ATTENTE appartenant au joueur (avant décision staff).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;

    // Suppression atomique : ne touche QUE la soumission EN ATTENTE du joueur.
    const del = await prisma.progressionSubmission.deleteMany({
      where: { id, userId: me.id, status: "PENDING" },
    });
    if (del.count === 0) {
      // Soit elle n'existe pas / pas à lui, soit elle a déjà été décidée.
      const exists = await prisma.progressionSubmission.findFirst({
        where: { id, userId: me.id },
        select: { id: true },
      });
      return NextResponse.json(
        { error: exists ? "INVALID_STATE" : "NOT_FOUND" },
        { status: exists ? 409 : 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

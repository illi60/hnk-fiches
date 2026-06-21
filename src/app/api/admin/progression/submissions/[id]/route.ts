import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";

// DELETE /api/admin/progression/submissions/[id]
// ADMIN : supprime UNE soumission (un RP justificatif d'une condition). Permet
// un nettoyage fin (vs. le « tout effacer » du scope / de la voie). Comme le
// reset en masse, ne lance PAS de recompute (l'auto-promotion ne descend jamais ;
// le rang stocké s'ajuste à part). `deleteMany` → idempotent si l'id n'existe plus.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const res = await prisma.progressionSubmission.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true, deleted: res.count });
  } catch (e) {
    return jsonError(e);
  }
}

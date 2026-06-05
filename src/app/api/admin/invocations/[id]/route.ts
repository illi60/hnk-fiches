import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";

// DELETE /api/admin/invocations/[id]
// Suppression définitive d'une invocation par un admin.
// Les FicheTechnique liées auront leur invocationId mis à NULL (onDelete: SetNull).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const inv = await prisma.invocation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!inv) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await prisma.invocation.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

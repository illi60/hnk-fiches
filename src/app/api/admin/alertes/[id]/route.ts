import { NextResponse } from "next/server";

import { jsonError, requireFicheModerator } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFicheModerator();
    const { id } = await params;

    const deleted = await prisma.adminAlert.deleteMany({
      where: { id },
    });
    if (deleted.count === 0) throw new Error("NOT_FOUND");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminKekkeiCatalogSchema } from "@/lib/validators";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = adminKekkeiCatalogSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const existing = await prisma.kekkeiGenkaiCatalog.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const d = parsed.data;
    const duplicate = await prisma.kekkeiGenkaiCatalog.findFirst({
      where: {
        name: { equals: d.name.trim(), mode: "insensitive" },
        NOT: { id },
      },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ ok: false, error: "NAME_TAKEN" }, { status: 409 });

    const kg = await prisma.kekkeiGenkaiCatalog.update({
      where: { id },
      data: {
        name: d.name.trim(),
        color: d.color,
      },
    });

    return NextResponse.json({ ok: true, kg });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.kekkeiGenkaiCatalog.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

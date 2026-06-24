import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminKekkeiCatalogSchema } from "@/lib/validators";

// POST /api/admin/kekkei
// Crée ou met à jour un KG dans le catalogue administrable.
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = adminKekkeiCatalogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    }

    const d = parsed.data;
    const name = d.name.trim();
    const existing = await prisma.kekkeiGenkaiCatalog.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });

    const kg = existing
      ? await prisma.kekkeiGenkaiCatalog.update({
          where: { id: existing.id },
          data: {
            name,
            subtitle: d.subtitle?.trim() || null,
            clan: d.clan?.trim() || null,
            color: d.color,
            category: d.category,
            quintessence: d.quintessence?.trim() || null,
            kinjutsu: d.kinjutsu?.trim() || null,
            finale: d.finale?.trim() || null,
          },
        })
      : await prisma.kekkeiGenkaiCatalog.create({
          data: {
            name,
            subtitle: d.subtitle?.trim() || null,
            clan: d.clan?.trim() || null,
            color: d.color,
            category: d.category,
            quintessence: d.quintessence?.trim() || null,
            kinjutsu: d.kinjutsu?.trim() || null,
            finale: d.finale?.trim() || null,
          },
        });

    return NextResponse.json({ ok: true, kg });
  } catch (e) {
    return jsonError(e);
  }
}

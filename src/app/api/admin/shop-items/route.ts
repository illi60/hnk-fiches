import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminShopItemSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = adminShopItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const d = parsed.data;
    const item = await prisma.shopCatalogItem.create({
      data: {
        itemKey: d.itemKey,
        name: d.name.trim(),
        category: d.category,
        costXp: d.costXp,
        stock: d.stock,
        kanji: d.kanji.trim(),
        resource: d.resource?.trim() || null,
        rankHint: d.rankHint?.trim() || null,
        description: d.description.trim(),
        effect: d.effect.trim(),
        isActive: d.isActive ?? true,
        sortOrder: d.sortOrder ?? 0,
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "P2002") {
      return NextResponse.json({ ok: false, error: "KEY_TAKEN" }, { status: 409 });
    }
    return jsonError(e);
  }
}

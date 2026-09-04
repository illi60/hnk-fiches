import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminKinjutsuSchema } from "@/lib/validators";
import { isNoClan } from "@/lib/clans";
import { unitKinjutsuScope } from "@/lib/kinjutsu";

function resolveScope(d: { scopeType: "CLAN" | "UNIT"; clan?: string | null; unit?: string | null }) {
  if (d.scopeType === "CLAN") {
    const clan = d.clan?.trim() ?? "";
    if (!clan || isNoClan(clan)) return null;
    return { kinjutsuScope: "CLAN", clan };
  }
  const kinjutsuScope = unitKinjutsuScope(d.unit);
  if (!kinjutsuScope) return null;
  return { kinjutsuScope, clan: null };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = adminKinjutsuSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const current = await prisma.ficheTechnique.findUnique({
      where: { id },
      select: { id: true, nature: true, isActive: true },
    });
    if (!current || !current.isActive || current.nature !== "KINJUTSU") {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const scope = resolveScope(parsed.data);
    if (!scope) return NextResponse.json({ ok: false, error: "SCOPE_REQUIRED" }, { status: 400 });

    const fiche = await prisma.ficheTechnique.update({
      where: { id },
      data: {
        nom: parsed.data.nom.trim(),
        description: parsed.data.description.trim(),
        art: null,
        spec: null,
        secondaryArt: null,
        secondarySpec: null,
        actionType: parsed.data.actionType ?? "CHARGEE",
        element: null,
        secondaryElement: null,
        kekkeiGenkai: null,
        secondaryKekkeiGenkai: null,
        nature: "KINJUTSU",
        kinjutsuScope: scope.kinjutsuScope,
        clan: scope.clan,
        type: null,
        rangMin: null,
        coutXp: parsed.data.coutXp ?? 0,
        status: "VALIDATED",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, fiche });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const current = await prisma.ficheTechnique.findUnique({
      where: { id },
      select: { id: true, nature: true, isActive: true },
    });
    if (!current || !current.isActive || current.nature !== "KINJUTSU") {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }
    await prisma.ficheTechnique.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

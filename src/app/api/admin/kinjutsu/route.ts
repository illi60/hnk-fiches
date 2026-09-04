import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminKinjutsuSchema } from "@/lib/validators";
import { isNoClan } from "@/lib/clans";
import { unitKinjutsuScope } from "@/lib/kinjutsu";

function slugBase(nom: string): string {
  return (
    nom
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "kinjutsu"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await prisma.ficheTechnique.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${i}`;
  }
}

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

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = adminKinjutsuSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const scope = resolveScope(parsed.data);
    if (!scope) return NextResponse.json({ ok: false, error: "SCOPE_REQUIRED" }, { status: 400 });

    const slug = await uniqueSlug(slugBase(parsed.data.nom));
    const fiche = await prisma.ficheTechnique.create({
      data: {
        slug,
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
        authorId: admin.id,
        validatedById: admin.id,
        validatedAt: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, fiche });
  } catch (e) {
    return jsonError(e);
  }
}

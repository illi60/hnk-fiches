import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminPactAffinitySchema } from "@/lib/validators";
import { ELEMENTS } from "@/lib/techniques";

// PATCH /api/admin/users/[id]/pact-affinity
// God-mode : fixe l'intégralité des affinités du pacte Kuchiyose d'un joueur
// (= affinité héritée par toutes ses invocations). Pas de verrou côté admin.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const parsed = adminPactAffinitySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    // Garde les affinités valides (parmi les 5 éléments), sans doublon (casse insensible).
    const seen = new Set<string>();
    const affinities: string[] = [];
    for (const a of parsed.data.affinities) {
      const t = a.trim();
      if (!(ELEMENTS as readonly string[]).includes(t)) continue;
      if (seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase());
      affinities.push(t);
    }

    await prisma.user.update({ where: { id }, data: { pactAffinities: affinities } });
    return NextResponse.json({ ok: true, pactAffinities: affinities });
  } catch (e) {
    return jsonError(e);
  }
}

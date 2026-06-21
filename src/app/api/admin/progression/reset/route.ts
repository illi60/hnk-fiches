import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { progressionResetSchema } from "@/lib/validators";
import { clanScopeKey, VILLAGE_SCOPE_KEY } from "@/lib/progression";

// POST /api/admin/progression/reset
// ADMIN : efface les conditions validées/en attente d'une progression.
//   - USER      : soumissions INDIVIDUELLES d'un joueur sur une voie (les
//                 compteurs/coches redeviennent vides côté membre).
//   - COMMUNITY : soumissions COMMUNAUTAIRES d'un scope (village ou un clan).
//
// Action volontairement DESTRUCTIVE et SÉPARÉE de la baisse de rang : le rang
// stocké (rangVillage/rangClan/rangHistoire ou rang communautaire de base) n'est
// PAS touché ici — l'auto-promotion ne descend jamais, le staff ajuste le rang à
// part via le profil / le rang de base. On ne lance donc pas de recompute.
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = progressionResetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

    if (parsed.data.kind === "USER") {
      const { userId, track } = parsed.data;
      const res = await prisma.progressionSubmission.deleteMany({
        where: { userId, tier: "INDIVIDUAL", track },
      });
      return NextResponse.json({ ok: true, deleted: res.count });
    }

    const { scopeType } = parsed.data;
    const scopeKey =
      scopeType === "VILLAGE" ? VILLAGE_SCOPE_KEY : clanScopeKey(parsed.data.scopeKey);
    if (!scopeKey) return NextResponse.json({ error: "SCOPE_INVALIDE" }, { status: 400 });

    const res = await prisma.progressionSubmission.deleteMany({
      where: { track: scopeType, tier: "COMMUNITY", scopeKey },
    });
    return NextResponse.json({ ok: true, deleted: res.count });
  } catch (e) {
    return jsonError(e);
  }
}

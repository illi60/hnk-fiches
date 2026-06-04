import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { ownedKgsFull, type ProgressionState } from "@/lib/quintessence";

// GET /api/clan/library — bibliothèque commune du clan du joueur.
//
// Techniques COLLECTIVE (nature) validées du clan : visibles par TOUS les membres
// du clan. Le flag `usable` indique si le joueur possède le KG associé (1er KG,
// 2nd KG, ou KG admin) — seul cas où il peut réellement utiliser la technique.
export async function GET() {
  try {
    const me = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { clan: true, primaryKg: true, kekkeiGenkai: true, progressionState: true },
    });
    if (!user?.clan) return NextResponse.json({ ok: false, error: "NO_CLAN" }, { status: 403 });

    const owned = ownedKgsFull(
      user.primaryKg,
      (user.progressionState ?? {}) as unknown as ProgressionState,
      user.kekkeiGenkai
    ).map((k) => k.toLowerCase());

    const rows = await prisma.ficheTechnique.findMany({
      where: {
        clan: { equals: user.clan, mode: "insensitive" },
        nature: "COLLECTIVE",
        status: "VALIDATED",
        isActive: true,
      },
      orderBy: { nom: "asc" },
      select: {
        id: true,
        slug: true,
        nom: true,
        description: true,
        art: true,
        actionType: true,
        element: true,
        kekkeiGenkai: true,
        coutXp: true,
        author: { select: { username: true } },
      },
    });

    const techniques = rows.map((t) => ({
      ...t,
      usable: !!t.kekkeiGenkai && owned.includes(t.kekkeiGenkai.toLowerCase()),
    }));

    return NextResponse.json({ ok: true, clan: user.clan, techniques });
  } catch (e) {
    return jsonError(e);
  }
}

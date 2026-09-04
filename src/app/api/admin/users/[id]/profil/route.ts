import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminProfilSchema } from "@/lib/validators";
import { highestRank } from "@/lib/progression";
import { normalizeSpecialUnit } from "@/lib/kinjutsu";

// PATCH /api/admin/users/[id]/profil — édite les champs RP d'un user.
// Aucun champ XP / role n'est touché ici (séparation de pouvoirs).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const parsed = adminProfilSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

    const current = await prisma.user.findUnique({
      where: { id },
      select: { rangVillage: true, rangHistoire: true, rangClan: true },
    });
    if (!current) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const rankTrackTouched =
      parsed.data.rangVillage !== undefined ||
      parsed.data.rangHistoire !== undefined ||
      parsed.data.rangClan !== undefined;
    const rangVillage = parsed.data.rangVillage !== undefined ? parsed.data.rangVillage : current.rangVillage;
    const rangHistoire = parsed.data.rangHistoire !== undefined ? parsed.data.rangHistoire : current.rangHistoire;
    const rangClan = parsed.data.rangClan !== undefined ? parsed.data.rangClan : current.rangClan;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.characterStatus !== undefined && { characterStatus: parsed.data.characterStatus }),
        ...(parsed.data.primaryKg !== undefined && { primaryKg: parsed.data.primaryKg }),
        ...(parsed.data.primaryAffinity !== undefined && { primaryAffinity: parsed.data.primaryAffinity }),
        ...(parsed.data.clan !== undefined && { clan: parsed.data.clan }),
        ...(rankTrackTouched
          ? { rang: highestRank(rangVillage, rangHistoire, rangClan) }
          : parsed.data.rang !== undefined
          ? { rang: parsed.data.rang }
          : {}),
        ...(parsed.data.rangVillage !== undefined && { rangVillage: parsed.data.rangVillage }),
        ...(parsed.data.rangHistoire !== undefined && { rangHistoire: parsed.data.rangHistoire }),
        ...(parsed.data.rangClan !== undefined && { rangClan: parsed.data.rangClan }),
        ...(parsed.data.grade !== undefined && { grade: parsed.data.grade }),
        ...(parsed.data.uniteSpeciale !== undefined && {
          uniteSpeciale: normalizeSpecialUnit(parsed.data.uniteSpeciale),
        }),
        ...(parsed.data.trame !== undefined && { trame: parsed.data.trame }),
        ...(parsed.data.prime !== undefined && { prime: parsed.data.prime }),
        ...(parsed.data.age !== undefined && { age: parsed.data.age }),
        ...(parsed.data.genre !== undefined && { genre: parsed.data.genre }),
        ...(parsed.data.kekkeiGenkai !== undefined && { kekkeiGenkai: parsed.data.kekkeiGenkai }),
        ...(parsed.data.affinites !== undefined && { affinites: parsed.data.affinites }),
      },
      select: { id: true },
    });

    return NextResponse.json({ user });
  } catch (e) {
    return jsonError(e);
  }
}

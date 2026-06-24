import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { identitySchema } from "@/lib/validators";
import { isKnownKg } from "@/lib/kekkei-server";
import { ELEMENTS } from "@/lib/techniques";
import { RANKS, rankIndex } from "@/lib/arts";

// POST /api/me/identity — fixe le 1er KG / la 1ère affinité, ou ajoute la 2e affinité.
// IRRÉVERSIBLE : on n'autorise l'écriture que si le champ est encore vide.
export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const body = await req.json().catch(() => null);
    const parsed = identitySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { primaryKg: true, primaryAffinity: true, rang: true, affinites: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    // 2e affinité élémentaire : débloquée au rang global B, définitive.
    if (parsed.data.secondAffinity) {
      const el = parsed.data.secondAffinity;
      if (!(ELEMENTS as readonly string[]).includes(el))
        return NextResponse.json({ ok: false, error: "AFFINITE_INVALIDE" }, { status: 400 });
      if (rankIndex(user.rang) < RANKS.indexOf("B"))
        return NextResponse.json({ ok: false, error: "RANG_B_REQUIS" }, { status: 400 });
      if (!user.primaryAffinity)
        return NextResponse.json({ ok: false, error: "AFFINITE_PRIMAIRE_REQUISE" }, { status: 400 });
      const current = [user.primaryAffinity, ...(user.affinites ?? [])].filter(Boolean);
      if (current.length >= 2)
        return NextResponse.json({ ok: false, error: "DEUXIEME_DEJA_CHOISIE" }, { status: 409 });
      if (current.some((a) => a!.toLowerCase() === el.toLowerCase()))
        return NextResponse.json({ ok: false, error: "AFFINITE_DOUBLON" }, { status: 400 });
      await prisma.user.update({ where: { id: me.id }, data: { affinites: { push: el } } });
      return NextResponse.json({ ok: true });
    }

    const data: Record<string, string> = {};
    if (parsed.data.kg) {
      if (user.primaryKg) return NextResponse.json({ ok: false, error: "KG_DEJA_CHOISI" }, { status: 409 });
      if (!(await isKnownKg(parsed.data.kg)))
        return NextResponse.json({ ok: false, error: "KG_INVALIDE" }, { status: 400 });
      data.primaryKg = parsed.data.kg;
    }
    if (parsed.data.affinity) {
      if (user.primaryAffinity)
        return NextResponse.json({ ok: false, error: "AFFINITE_DEJA_CHOISIE" }, { status: 409 });
      if (!(ELEMENTS as readonly string[]).includes(parsed.data.affinity))
        return NextResponse.json({ ok: false, error: "AFFINITE_INVALIDE" }, { status: 400 });
      data.primaryAffinity = parsed.data.affinity;
    }
    if (Object.keys(data).length === 0)
      return NextResponse.json({ ok: false, error: "RIEN_A_FAIRE" }, { status: 400 });

    await prisma.user.update({ where: { id: me.id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

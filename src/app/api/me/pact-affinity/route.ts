import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { pactAffinitySchema } from "@/lib/validators";
import { ELEMENTS } from "@/lib/techniques";
import { getProgression, type ProgressionState } from "@/lib/quintessence";

// POST /api/me/pact-affinity — fixe l'affinité du pacte Kuchiyose.
// IRRÉVERSIBLE : 1ère affinité libre ; 2e affinité seulement si le pré-stade
// du Mode Ermite est atteint (le pacte gagne alors une 2e affinité).
export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const body = await req.json().catch(() => null);
    const parsed = pactAffinitySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const el = parsed.data.affinity.trim();
    if (!(ELEMENTS as readonly string[]).includes(el))
      return NextResponse.json({ ok: false, error: "AFFINITE_INVALIDE" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { pactAffinities: true, progressionState: true, pactSpecies: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const current = (user.pactAffinities ?? []).filter(Boolean);
    if (current.some((a) => a.toLowerCase() === el.toLowerCase()))
      return NextResponse.json({ ok: false, error: "AFFINITE_DOUBLON" }, { status: 400 });

    const prog = getProgression((user.progressionState ?? {}) as unknown as ProgressionState);
    const ermitePrestage = prog.mode?.path === "ERMITE" && (prog.mode?.stage ?? 0) >= 1;

    // Capacité : 1 par défaut, 2 si pré-stade Ermite atteint.
    const maxSlots = ermitePrestage ? 2 : 1;
    if (current.length >= maxSlots) {
      return NextResponse.json(
        { ok: false, error: ermitePrestage ? "DEUXIEME_DEJA_CHOISIE" : "ERMITE_REQUIS" },
        { status: 409 }
      );
    }

    // Espèce du pacte : verrouillée au 1er choix (si pas encore définie).
    const speciesToSet =
      !user.pactSpecies && parsed.data.species && parsed.data.species.trim()
        ? parsed.data.species.trim()
        : undefined;

    await prisma.user.update({
      where: { id: me.id },
      data: {
        pactAffinities: { push: el },
        ...(speciesToSet ? { pactSpecies: speciesToSet } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

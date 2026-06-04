import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { invocationSchema } from "@/lib/validators";
import { getProgression, ownedKgsFull, type ProgressionState } from "@/lib/quintessence";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;

    const owned = await prisma.invocation.findFirst({
      where: { id, ownerId: me.id },
      select: { id: true, espece: true },
    });
    if (!owned) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = invocationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    const d = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { progressionState: true, primaryKg: true, kekkeiGenkai: true, pactSpecies: true },
    });
    const prog = getProgression((user?.progressionState ?? {}) as unknown as ProgressionState);
    const ermitePerfect = prog.mode?.path === "ERMITE" && (prog.mode?.stage ?? 0) >= 3;
    const ownedKg = ownedKgsFull(user?.primaryKg, prog, user?.kekkeiGenkai).map((k) => k.toLowerCase());
    const kgEff =
      ermitePerfect && d.kekkeiGenkai && ownedKg.includes(d.kekkeiGenkai.toLowerCase())
        ? d.kekkeiGenkai
        : null;

    const invocation = await prisma.invocation.update({
      where: { id },
      data: {
        nom: d.nom,
        // Espèce : pacte (prioritaire) sinon valeur existante (verrouillée).
        espece: user?.pactSpecies ?? owned.espece ?? (d.espece || null),
        artShinobi: d.artShinobi || null,
        kekkeiGenkai: kgEff,
        image: d.image || null,
        description: d.description || null,
        techniques: (d.techniques ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ ok: true, invocation });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const res = await prisma.invocation.deleteMany({ where: { id, ownerId: me.id } });
    if (res.count === 0) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

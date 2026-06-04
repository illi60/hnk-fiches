import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";

const schema = z.object({ current: z.string().min(1), next: z.string().min(8).max(120) });

// POST /api/me/password — le joueur change son propre mot de passe.
export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { passwordHash: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const ok = await compare(parsed.data.current, user.passwordHash);
    if (!ok) return NextResponse.json({ ok: false, error: "BAD_CURRENT" }, { status: 400 });

    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: await hash(parsed.data.next, 12) },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

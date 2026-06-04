import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminQuintSchema } from "@/lib/validators";
import { type ProgressionState } from "@/lib/quintessence";

// POST /api/admin/users/[id]/quintessences — le staff réécrit la liste des
// quintessences acquises (conserve le mode spécial éventuel).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = adminQuintSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id }, select: { progressionState: true } });
    if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const state = ((user.progressionState ?? {}) as unknown) as ProgressionState;
    state.quintessences = parsed.data.quintessences;

    await prisma.user.update({
      where: { id },
      data: { progressionState: state as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

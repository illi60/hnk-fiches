import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { type ProgressionState, type ModePath } from "@/lib/quintessence";

const PATHS = ["ERMITE", "JINCHURIKI", "OTSUTSUKI"];

// POST /api/admin/users/[id]/mode — staff fixe la voie + le stade (0 = reset).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const path = typeof body?.path === "string" ? body.path : "";
    const stage = Number(body?.stage);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { progressionState: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const state = ((user.progressionState ?? {}) as unknown) as ProgressionState;
    if (!PATHS.includes(path) || !Number.isFinite(stage) || stage <= 0) {
      delete state.mode; // reset (voie abandonnée)
    } else {
      state.mode = { path: path as ModePath, stage: Math.min(3, Math.max(1, Math.round(stage))) };
    }

    await prisma.user.update({
      where: { id },
      data: { progressionState: state as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

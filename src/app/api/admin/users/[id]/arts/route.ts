import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminArtsSchema } from "@/lib/validators";

// POST /api/admin/users/[id]/arts — le staff réécrit l'état des arts (god mode, sans XP).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = adminArtsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    await prisma.user.update({
      where: { id },
      data: { artsState: parsed.data.artsState as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

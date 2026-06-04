import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminPasswordResetSchema } from "@/lib/validators";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = adminPasswordResetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, canManageAdmins: true },
    });
    if (!target) throw new Error("NOT_FOUND");
    if (target.canManageAdmins && !me.canManageAdmins) throw new Error("FORBIDDEN");

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hash(parsed.data.password, 12) },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

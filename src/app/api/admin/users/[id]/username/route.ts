import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminUsernameSchema } from "@/lib/validators";

function syntheticEmail(username: string): string {
  const slug = username.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");
  return `${slug || "joueur"}@hnk.local`;
}

// PATCH /api/admin/users/[id]/username
// Renomme un compte et garde l'email synthétique en cohérence avec le pseudo.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireAdmin();

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = adminUsernameSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const username = parsed.data.username.trim();
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, canManageAdmins: true },
    });
    if (!target) throw new Error("NOT_FOUND");
    if (target.canManageAdmins && !me.canManageAdmins) throw new Error("FORBIDDEN");

    const email = syntheticEmail(username);
    const duplicate = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
        ],
        NOT: { id },
      },
      select: { id: true },
    });
    if (duplicate) throw new Error("USERNAME_TAKEN");

    await prisma.user.update({
      where: { id },
      data: { username, email },
    });

    return NextResponse.json({ ok: true, user: { id, username } });
  } catch (e) {
    return jsonError(e);
  }
}

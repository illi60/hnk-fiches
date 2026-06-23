import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";

// DELETE /api/admin/users/[id]
// Supprime définitivement un compte utilisateur.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireAdmin();

    const { id } = await params;
    if (id === me.id) throw new Error("SELF_DELETE");

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, canManageAdmins: true },
    });
    if (!target) throw new Error("NOT_FOUND");

    if (target.canManageAdmins && !me.canManageAdmins) throw new Error("FORBIDDEN");

    if (target.role === "ADMIN" && target.canManageAdmins) {
      const managers = await prisma.user.count({
        where: { role: "ADMIN", canManageAdmins: true },
      });
      if (managers <= 1) throw new Error("LAST_ADMIN_MANAGER");
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

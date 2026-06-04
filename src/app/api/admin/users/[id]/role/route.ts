import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminRoleSchema } from "@/lib/validators";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireAdmin();
    if (!me.canManageAdmins) throw new Error("FORBIDDEN");

    const { id } = await params;
    if (id === me.id) throw new Error("SELF_ROLE_CHANGE");

    const body = await req.json().catch(() => null);
    const parsed = adminRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, canManageAdmins: true },
    });
    if (!target) throw new Error("NOT_FOUND");

    // Retirer le rôle d'un admin maître (vers USER ou TECH_MOD) : interdit si
    // c'est le dernier, sinon plus personne ne peut gérer les admins.
    if (parsed.data.role !== "ADMIN" && target.canManageAdmins) {
      const managers = await prisma.user.count({
        where: { role: "ADMIN", canManageAdmins: true },
      });
      if (managers <= 1) throw new Error("LAST_ADMIN_MANAGER");
    }

    const user = await prisma.user.update({
      where: { id },
      data:
        parsed.data.role === "ADMIN"
          ? { role: "ADMIN", canManageAdmins: target.canManageAdmins }
          : parsed.data.role === "TECH_MOD"
          ? { role: "TECH_MOD", canManageAdmins: false }
          : { role: "USER", canManageAdmins: false },
      select: { id: true, role: true, canManageAdmins: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return jsonError(e);
  }
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminForumLinkSchema } from "@/lib/validators";

// PATCH /api/admin/users/[id]/forum-link
// Associe (ou délie) l'URL de profil Forumactif à un utilisateur.
// Body : { forumProfileUrl: "https://hinokuni.forumactif.com/u<ID>" }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const parsed = adminForumLinkSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

    const m = parsed.data.forumProfileUrl.match(/\/u(\d+)/);
    const forumUserId = m ? parseInt(m[1], 10) : null;
    if (forumUserId === null) return NextResponse.json({ error: "INVALID" }, { status: 400 });

    // Unicité du lien forumUserId -> 1 user max.
    const conflict = await prisma.user.findFirst({
      where: { forumUserId, NOT: { id } },
      select: { id: true },
    });
    if (conflict) return NextResponse.json({ error: "DUPLICATE" }, { status: 409 });

    const user = await prisma.user.update({
      where: { id },
      data: {
        forumProfileUrl: parsed.data.forumProfileUrl,
        forumUserId,
      },
      select: { id: true, forumProfileUrl: true, forumUserId: true },
    });

    return NextResponse.json({ user });
  } catch (e) {
    return jsonError(e);
  }
}

// DELETE — délie le compte
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.user.update({
      where: { id },
      data: {
        forumProfileUrl: null,
        forumUserId: null,
        forumLastSyncAt: null,
        forumLastSyncError: null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

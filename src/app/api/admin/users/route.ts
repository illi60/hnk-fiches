import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { registerSchema } from "@/lib/validators";

// GET /api/admin/users?q=<search>
//   - q sur username / email (case-insensitive)
//   - retourne le minimum nécessaire pour l'écran admin
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const where = q
      ? { username: { contains: q, mode: "insensitive" as const } }
      : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        username: true,
        role: true,
        canManageAdmins: true,
        xpAvailable: true,
        xpTotalEarned: true,
        clan: true,
        rang: true,
        grade: true,
        forumProfileUrl: true,
        forumPseudo: true,
        forumLastSyncAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (e) {
    return jsonError(e);
  }
}

// POST /api/admin/users — le staff crée un compte (le joueur changera son mot de passe).
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const { username, password } = parsed.data;
    // Email synthétique interne (jamais utilisé pour le login, qui se fait par
    // username) : satisfait la contrainte unique non-null sans le demander.
    const slug = username.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");
    const email = `${slug || "joueur"}@hnk.local`;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ ok: false, error: "DUPLICATE" }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: await hash(password, 12),
        role: "USER",
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: user.id });
  } catch (e) {
    return jsonError(e);
  }
}

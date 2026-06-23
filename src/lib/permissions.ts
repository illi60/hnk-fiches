// ============================================================
// Triple garde admin (cf. PLAYBOOK §2.5) :
//   1. middleware.ts (routing)         ← bloque /admin si pas connecté
//   2. requireAdmin() en layout RSC    ← bloque rendu serveur des pages admin
//   3. requireAdmin() dans chaque API  ← garantie ultime côté mutation
// Si une couche saute, les autres tiennent.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  canManageAdmins: boolean;
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED", 401);
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, username: true, role: true, canManageAdmins: true },
  });
  if (!user) {
    throw new AuthError("UNAUTHORIZED", 401);
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new AuthError("FORBIDDEN", 403);
  }
  return user;
}

// Modération des fiches techniques : ADMIN (pouvoir complet) ou TECH_MOD
// (modérateur technique : peut UNIQUEMENT valider/refuser des fiches).
// Utilisé par les routes/pages de modération, jamais par la gestion des
// joueurs / XP / clans (qui restent réservées à requireAdmin).
export async function requireFicheModerator(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "TECH_MOD") {
    throw new AuthError("FORBIDDEN", 403);
  }
  return user;
}

// Mapper standard d'erreurs vers Response JSON.
// N'expose JAMAIS le message brut d'une erreur DB / Prisma.
export function jsonError(e: unknown): NextResponse {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (e instanceof Error) {
    const known = new Set([
      "INSUFFICIENT_XP",
      "CONFLICT",
      "NOT_FOUND",
      "INVALID_STATE",
      "RATE_LIMITED",
      "DUPLICATE",
      "FORBIDDEN",
      "LAST_ADMIN_MANAGER",
      "SELF_ROLE_CHANGE",
      "SELF_DELETE",
      "USERNAME_TAKEN",
      "COMMENT_REQUIS",
    ]);
    if (known.has(e.message)) {
      const statusMap: Record<string, number> = {
        INSUFFICIENT_XP: 402,
        CONFLICT: 409,
        NOT_FOUND: 404,
        INVALID_STATE: 409,
        RATE_LIMITED: 429,
        DUPLICATE: 409,
        FORBIDDEN: 403,
        LAST_ADMIN_MANAGER: 409,
        SELF_ROLE_CHANGE: 409,
        SELF_DELETE: 409,
        USERNAME_TAKEN: 409,
        COMMENT_REQUIS: 400,
      };
      return NextResponse.json({ error: e.message }, { status: statusMap[e.message] ?? 400 });
    }
  }
  console.error("[jsonError]", e);
  return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
}

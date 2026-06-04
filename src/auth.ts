// ============================================================
// Auth.js v5 (beta) — Credentials + JWT session.
//
// Pourquoi JWT et pas DB session :
//   - Stateless (pas de table à requêter à chaque appel)
//   - Role injecté dans le token → middleware ultra rapide
// Pourquoi bcryptjs en 12 rounds :
//   - Recommandation OWASP 2026
//   - JS pur (compatible Edge si on en a besoin un jour ;
//     pour l'instant Auth.js v5 force le runtime Node pour le
//     callback authorize, ce qui est très bien)
//
// IMPORTANT : on fait TOUJOURS un bcrypt.compare, même si
// l'utilisateur n'existe pas (dummy hash), pour éviter de
// révéler l'existence d'un compte via le timing.
// ============================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

// Hash fictif pour timing attack (compare contre lui si user introuvable).
// = bcrypt("dummy-password-do-not-use", 12)
const DUMMY_HASH = "$2a$12$IK1L6Es4XL3Wn37N1.JxFOZbnufKjg8mmS.WT0DFmRJYZyrQwS9mC";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Nom d'utilisateur", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findFirst({
          where: { username: { equals: parsed.data.username, mode: "insensitive" } },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            canManageAdmins: true,
            passwordHash: true,
          },
        });

        // Dummy compare si user inexistant : on prend le même temps.
        const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
        const ok = await compare(parsed.data.password, hashToCheck);
        if (!ok || !user) return null;

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          canManageAdmins: user.canManageAdmins,
        };
      },
    }),
  ],
});

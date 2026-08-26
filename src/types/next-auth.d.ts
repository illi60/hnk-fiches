// Augmentation des types Auth.js pour injecter id / username / role
// dans Session.user et JWT.
import type { DefaultSession } from "next-auth";

type HnkRole = "USER" | "ADMIN" | "TECH_MOD" | "FORUM_MOD";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: HnkRole;
      canManageAdmins: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    role: HnkRole;
    canManageAdmins?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: HnkRole;
    canManageAdmins?: boolean;
  }
}

export {};

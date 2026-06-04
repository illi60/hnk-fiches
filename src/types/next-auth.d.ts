// Augmentation des types Auth.js pour injecter id / username / role
// dans Session.user et JWT.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "USER" | "ADMIN" | "TECH_MOD";
      canManageAdmins: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    role: "USER" | "ADMIN" | "TECH_MOD";
    canManageAdmins?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: "USER" | "ADMIN" | "TECH_MOD";
    canManageAdmins?: boolean;
  }
}

export {};

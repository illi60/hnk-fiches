import type { NextAuthConfig } from "next-auth";

const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.username = (user as { username: string }).username;
        token.role = (user as { role: "USER" | "ADMIN" }).role;
        token.canManageAdmins = (user as { canManageAdmins?: boolean }).canManageAdmins ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as "USER" | "ADMIN";
        session.user.canManageAdmins = Boolean(token.canManageAdmins);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;

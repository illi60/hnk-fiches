"use client";

import { SessionProvider } from "next-auth/react";

// Wrapper minimal pour rendre useSession()/signIn()/signOut() utilisables
// depuis les composants client (LogoutButton, LoginForm, etc.).
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

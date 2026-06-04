"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={
        className ??
        "text-xs tracking-[0.24em] uppercase text-smoke hover:text-ember transition"
      }
    >
      Déconnexion
    </button>
  );
}

"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

// Lien session-dépendant isolé côté client : utilise la session déjà chargée
// par SessionProvider (useSession), ce qui évite d'appeler auth() côté serveur
// dans GeneratorNav — les pages Hub / présentation / carnet restent statiques.
export default function NavAuthLink() {
  const { status } = useSession();
  return status === "authenticated" ? (
    <Link href="/technique">Mon espace</Link>
  ) : (
    <Link href="/login">Connexion</Link>
  );
}

// Barre de navigation commune aux outils publics (Hub, générateurs).
// Server component : connaît la session pour afficher « Mon espace » vs
// « Connexion ». `current` met en surbrillance l'onglet actif.
import Link from "next/link";
import { auth } from "@/auth";

const LINKS = [
  { key: "hub", href: "/", label: "Hub" },
  { key: "editeur", href: "/editeur", label: "Présentation" },
  { key: "carnet", href: "/carnet", label: "Carnet" },
] as const;

export default async function GeneratorNav({ current }: { current?: string }) {
  const session = await auth();
  return (
    <header className="hnk-header">
      <Link href="/" className="brand">
        <span className="kanji">火</span>
        <span className="name">Hi no Kuni</span>
      </Link>
      <nav className="hnk-nav">
        {LINKS.map((l) => (
          <Link key={l.key} href={l.href} className={current === l.key ? "active" : undefined}>
            {l.label}
          </Link>
        ))}
        {session?.user ? (
          <Link href="/technique">Mon espace</Link>
        ) : (
          <Link href="/login">Connexion</Link>
        )}
      </nav>
    </header>
  );
}

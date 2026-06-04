// Barre de navigation commune aux outils publics (Hub, générateurs).
// Composant synchrone et STATIQUE : il n'appelle PAS auth() (sinon il forcerait
// le rendu dynamique de toutes les pages qui l'utilisent). L'état de session
// est géré par <NavAuthLink> côté client (useSession). `current` met en
// surbrillance l'onglet actif.
import Link from "next/link";
import NavAuthLink from "./NavAuthLink";

const LINKS = [
  { key: "hub", href: "/", label: "Hub" },
  { key: "editeur", href: "/editeur", label: "Présentation" },
  { key: "carnet", href: "/carnet", label: "Carnet" },
] as const;

export default function GeneratorNav({ current }: { current?: string }) {
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
        <NavAuthLink />
      </nav>
    </header>
  );
}

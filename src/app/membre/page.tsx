import Link from "next/link";
import GeneratorNav from "@/components/GeneratorNav";

interface MemberTool {
  key: string;
  title: string;
  kanji: string;
  accent: string;
  desc: string;
  href: string;
  image: string;
}

const MEMBER_TOOLS: MemberTool[] = [
  {
    key: "fiche",
    title: "Profil & fiche",
    kanji: "技",
    accent: "#ff5722",
    desc: "Ton profil shinobi : identité de jeu, arts, inventaire et accès à tes fiches techniques.",
    href: "/technique",
    image: "https://i.imgur.com/GTIfOkA.png",
  },
  {
    key: "progression",
    title: "Progression",
    kanji: "道",
    accent: "#2E8B7A",
    desc: "Tes voies Village, Clan et Histoire, avec les conditions de rang à soumettre au staff.",
    href: "/technique/progression",
    image: "https://i.imgur.com/9mEqHHs.jpeg",
  },
  {
    key: "boutique",
    title: "Boutique",
    kanji: "買",
    accent: "#FFC23C",
    desc: "Objets, reliques, services et achats en XP, avec panier et inventaire synchronisé.",
    href: "/technique/boutique",
    image: "/hub/espace-membre.png",
  },
];

export default function MemberPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <GeneratorNav current="membre" />

      <div className="relative flex-1 overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none select-none absolute -z-0 font-jp font-black leading-none"
          style={{
            fontSize: "42vw",
            color: "rgba(255,87,34,0.045)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
          }}
        >
          忍
        </span>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
          <p className="hnk-eyebrow mb-4">Hi no Kuni · 火ノ国 · Espace membre</p>
          <h1 className="hnk-display text-4xl md:text-6xl mb-5">Espace Membre</h1>
          <p className="text-bone/75 mb-12 leading-relaxed max-w-2xl">
            Les outils connectés de ton personnage sont réunis ici : fiche technique, progression
            et boutique.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MEMBER_TOOLS.map((tool) => (
              <Link
                key={tool.key}
                href={tool.href}
                className="group relative overflow-hidden flex flex-col justify-end min-h-[300px] p-6 border transition hover:-translate-y-0.5"
                style={{
                  borderColor: "rgba(219,222,226,0.12)",
                  backgroundColor: "#0b0d11",
                  backgroundImage: `linear-gradient(to top, rgba(7,8,10,0.97) 6%, rgba(7,8,10,0.78) 38%, rgba(7,8,10,0.30) 72%, rgba(7,8,10,0.10) 100%), url("${tool.image}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: tool.accent }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    boxShadow: `inset 0 0 80px color-mix(in srgb, ${tool.accent} 30%, transparent)`,
                  }}
                />

                <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
                  <span
                    className="grid place-items-center w-11 h-11 border font-jp text-xl backdrop-blur-sm"
                    style={{
                      color: tool.accent,
                      borderColor: `color-mix(in srgb, ${tool.accent} 55%, transparent)`,
                      background: "rgba(7,8,10,0.55)",
                      textShadow: `0 0 14px color-mix(in srgb, ${tool.accent} 55%, transparent)`,
                    }}
                  >
                    {tool.kanji}
                  </span>
                  <span className="hnk-chip text-[9px]">Connexion requise</span>
                </div>

                <div className="relative z-10">
                  <h2 className="hnk-serif text-xl mb-2 text-white">{tool.title}</h2>
                  <p className="text-sm text-bone/80 leading-relaxed">{tool.desc}</p>
                  <span
                    className="mt-4 inline-block text-[11px] uppercase tracking-[0.22em] font-bold"
                    style={{ color: tool.accent }}
                  >
                    Ouvrir <span aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10">
            <Link href="/" className="hnk-btn-ghost">
              <span aria-hidden>←</span> Retour au hub
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

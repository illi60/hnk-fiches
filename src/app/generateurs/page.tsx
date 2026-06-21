import Link from "next/link";
import GeneratorNav from "@/components/GeneratorNav";

// Atelier unique regroupant les 3 générateurs de codages forum.
// Chaque générateur reste accessible directement par sa propre route.
interface Generator {
  key: string;
  title: string;
  kanji: string;
  accent: string;
  desc: string;
  href: string;
  image: string;
}

const GENERATORS: Generator[] = [
  {
    key: "editeur",
    title: "Présentation",
    kanji: "火",
    accent: "#C0392B",
    desc: "Compose ta fiche de présentation et récupère le code prêt à coller sur le forum.",
    href: "/editeur",
    image: "https://i.imgur.com/69hQrC9.png",
  },
  {
    key: "carnet",
    title: "Carnet de bord",
    kanji: "帳",
    accent: "#5E83A8",
    desc: "Personnage, liens, chronologie et accomplissements — 4 blocs à coller dans ton sujet.",
    href: "/carnet",
    image: "https://i.imgur.com/Hwg8Gw4.png",
  },
  {
    key: "rp",
    title: "Post RP in-game",
    kanji: "文",
    accent: "#ff5722",
    desc: "Bannière, titre, citation et texte : mets en forme ton post de RP et colle le code dans ton message.",
    href: "/rp",
    image: "https://i.imgur.com/YmTenS8.png",
  },
];

export default function GeneratorsPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <GeneratorNav current="generateurs" />

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
          筆
        </span>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
          <p className="hnk-eyebrow mb-4">Hi no Kuni · 火ノ国 · Générateurs</p>
          <h1 className="hnk-display text-4xl md:text-6xl mb-5">L&apos;atelier de codage</h1>
          <p className="text-bone/75 mb-12 leading-relaxed max-w-2xl">
            Tes trois générateurs de codages forum, réunis. Choisis un atelier ci-dessous : compose
            ta présentation, ton carnet de bord ou ton post de RP, puis récupère le code prêt à
            coller. Tu peux aussi passer de l&apos;un à l&apos;autre depuis la barre du haut.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GENERATORS.map((g) => (
              <Link
                key={g.key}
                href={g.href}
                className="group relative overflow-hidden flex flex-col justify-end min-h-[300px] p-6 border transition hover:-translate-y-0.5"
                style={{
                  borderColor: "rgba(219,222,226,0.12)",
                  backgroundColor: "#0b0d11",
                  backgroundImage: `linear-gradient(to top, rgba(7,8,10,0.97) 6%, rgba(7,8,10,0.78) 38%, rgba(7,8,10,0.30) 72%, rgba(7,8,10,0.10) 100%), url("${g.image}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: g.accent }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ boxShadow: `inset 0 0 80px color-mix(in srgb, ${g.accent} 30%, transparent)` }}
                />

                <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
                  <span
                    className="grid place-items-center w-11 h-11 border font-jp text-xl backdrop-blur-sm"
                    style={{
                      color: g.accent,
                      borderColor: `color-mix(in srgb, ${g.accent} 55%, transparent)`,
                      background: "rgba(7,8,10,0.55)",
                      textShadow: `0 0 14px color-mix(in srgb, ${g.accent} 55%, transparent)`,
                    }}
                  >
                    {g.kanji}
                  </span>
                </div>

                <div className="relative z-10">
                  <h2 className="hnk-serif text-xl mb-2 text-white">{g.title}</h2>
                  <p className="text-sm text-bone/80 leading-relaxed">{g.desc}</p>
                  <span
                    className="mt-4 inline-block text-[11px] uppercase tracking-[0.22em] font-bold"
                    style={{ color: g.accent }}
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

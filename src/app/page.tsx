import Link from "next/link";
import GeneratorNav from "@/components/GeneratorNav";

// Outils du Hub. Pour en ajouter un plus tard : pousse une entrée ici.
// `auth: true` = carte verrouillée derrière la connexion.
// `external: true` = lien hors-site (ouvre dans un nouvel onglet).
interface Tool {
  key: string;
  title: string;
  kanji: string;
  accent: string;
  desc: string;
  href: string;
  image: string;
  auth?: boolean;
  external?: boolean;
}

const TOOLS: Tool[] = [
  {
    key: "fiche",
    title: "Fiche technique",
    kanji: "技",
    accent: "#ff5722",
    desc: "Ton profil shinobi : techniques, arts, progression et XP synchronisés depuis le forum.",
    href: "/technique",
    image: "https://i.imgur.com/GTIfOkA.png",
    auth: true,
  },
  {
    key: "editeur",
    title: "Générateur de présentation",
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
    key: "wiki",
    title: "Wiki & Règles",
    kanji: "巻",
    accent: "#2E8B7A",
    desc: "Le contexte, les règles et le lore du forum. Tout ce qu'il faut savoir avant de jouer.",
    href: "https://hinokuni.forumactif.com/h4-regles-1",
    image: "https://i.imgur.com/fgxvUJm.png",
    external: true,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <GeneratorNav current="hub" />

      <div className="relative flex-1 overflow-hidden">
        {/* Kanji géant en filigrane */}
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
          火
        </span>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
          <p className="hnk-eyebrow mb-4">Hi no Kuni · 火ノ国 · Hub</p>
          <h1 className="hnk-display text-4xl md:text-6xl mb-5">Tes outils de jeu</h1>
          <p className="text-bone/75 mb-12 leading-relaxed max-w-2xl">
            Le portail des outils du forum Hi no Kuni. Choisis un atelier : génère tes codages forum
            sans compte, ou connecte-toi pour gérer ta fiche technique. D&apos;autres générateurs
            viendront s&apos;ajouter ici.
          </p>

          {/* Carte principale : le Forum. Le coeur du site, mis en avant. */}
          <a
            href="https://hinokuni.forumactif.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden mb-5 border text-center transition hover:-translate-y-0.5"
            style={{
              borderColor: "color-mix(in srgb, #C0392B 45%, transparent)",
              backgroundColor: "#0b0d11",
              backgroundImage: `linear-gradient(to top, rgba(7,8,10,0.92) 0%, rgba(7,8,10,0.55) 45%, rgba(7,8,10,0.45) 100%), url("https://i.imgur.com/YmTenS8.png")`,
              backgroundSize: "cover",
              backgroundPosition: "center 30%",
              minHeight: "260px",
            }}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: "#C0392B" }}
            />
            <span
              aria-hidden
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ boxShadow: "inset 0 0 120px color-mix(in srgb, #C0392B 35%, transparent)" }}
            />

            <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-12 min-h-[260px]">
              <span
                className="grid place-items-center w-14 h-14 border font-jp text-2xl backdrop-blur-sm mb-5"
                style={{
                  color: "#C0392B",
                  borderColor: "color-mix(in srgb, #C0392B 55%, transparent)",
                  background: "rgba(7,8,10,0.55)",
                  textShadow: "0 0 16px color-mix(in srgb, #C0392B 60%, transparent)",
                }}
              >
                火
              </span>
              <h2 className="hnk-display text-3xl md:text-4xl text-white mb-3">
                Le Forum Hi no Kuni
              </h2>
              <p className="text-sm text-bone/80 leading-relaxed max-w-xl mb-6">
                Le coeur du jeu : intrigues, RP, événements et toute la communauté. C&apos;est ici
                que tout se passe.
              </p>
              <span
                className="inline-flex items-center gap-2 px-6 py-2.5 border text-[11px] uppercase tracking-[0.22em] font-bold transition group-hover:bg-[color-mix(in_srgb,#C0392B_18%,transparent)]"
                style={{ color: "#C0392B", borderColor: "color-mix(in srgb, #C0392B 55%, transparent)" }}
              >
                Entrer sur le forum <span aria-hidden>→</span>
              </span>
            </div>
          </a>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t) => {
              const cardClass =
                "group relative overflow-hidden flex flex-col justify-end min-h-[300px] p-6 border transition hover:-translate-y-0.5";
              const cardStyle = {
                borderColor: "rgba(219,222,226,0.12)",
                backgroundColor: "#0b0d11",
                backgroundImage: `linear-gradient(to top, rgba(7,8,10,0.97) 6%, rgba(7,8,10,0.78) 38%, rgba(7,8,10,0.30) 72%, rgba(7,8,10,0.10) 100%), url("${t.image}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              };
              const CardInner = (
                <>
                  {/* Liseré d'accent en haut + halo au survol */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ background: t.accent }}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ boxShadow: `inset 0 0 80px color-mix(in srgb, ${t.accent} 30%, transparent)` }}
                  />

                  {/* Haut : kanji + chip, posés sur l'image */}
                  <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
                    <span
                      className="grid place-items-center w-11 h-11 border font-jp text-xl backdrop-blur-sm"
                      style={{
                        color: t.accent,
                        borderColor: `color-mix(in srgb, ${t.accent} 55%, transparent)`,
                        background: "rgba(7,8,10,0.55)",
                        textShadow: `0 0 14px color-mix(in srgb, ${t.accent} 55%, transparent)`,
                      }}
                    >
                      {t.kanji}
                    </span>
                    {t.auth && (
                      <span className="hnk-chip text-[9px]">Connexion requise</span>
                    )}
                  </div>

                  {/* Bas : texte sur le dégradé sombre */}
                  <div className="relative z-10">
                    <h2 className="hnk-serif text-xl mb-2 text-white">{t.title}</h2>
                    <p className="text-sm text-bone/80 leading-relaxed">{t.desc}</p>
                    <span
                      className="mt-4 inline-block text-[11px] uppercase tracking-[0.22em] font-bold"
                      style={{ color: t.accent }}
                    >
                      {t.external ? "Y aller" : "Ouvrir"} <span aria-hidden>→</span>
                    </span>
                  </div>
                </>
              );

              return t.external ? (
                <a
                  key={t.key}
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClass}
                  style={cardStyle}
                >
                  {CardInner}
                </a>
              ) : (
                <Link key={t.key} href={t.href} className={cardClass} style={cardStyle}>
                  {CardInner}
                </Link>
              );
            })}

            {/* Emplacement extensible : futurs générateurs */}
            <div
              className="flex flex-col items-center justify-center text-center min-h-[300px] p-6 border border-dashed opacity-50"
              style={{ borderColor: "rgba(219,222,226,0.18)", backgroundColor: "#0b0d11" }}
            >
              <span className="font-jp text-2xl text-smoke mb-3">未</span>
              <p className="hnk-eyebrow">Bientôt</p>
              <p className="text-xs text-smoke mt-2">D&apos;autres outils à venir.</p>
            </div>
          </div>

          <p className="text-[11px] text-smoke mt-10">
            Les comptes sont créés par le staff. Rapproche-toi d&apos;un membre du staff pour
            obtenir tes accès à la fiche technique.
          </p>
        </div>
      </div>
    </main>
  );
}

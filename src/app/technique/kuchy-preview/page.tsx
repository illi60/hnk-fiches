import Link from "next/link";

import { techniqueForumHtml } from "@/lib/techniques";

const mockData = {
  nom: "Ame no Bakeneko",
  art: "Kuchiyose",
  spec: "Lignage",
  specRank: "C",
  secondaryArt: null,
  secondarySpec: null,
  secondarySpecRank: null,
  actionType: "EVOLUTIVE",
  element: null,
  kekkeiGenkai: null,
  kgColorHex: null,
  nature: null,
  kinjutsuScope: null,
  clan: null,
  espece: "Felins du brouillard",
  secondaryElement: null,
  secondaryKekkeiGenkai: null,
  secondaryKgColorHex: null,
  description:
    "Une invocation furtive qui surgit dans un panache de fumee, reduit la distance et desoriente sa cible avant de disparaitre a nouveau.",
  coutXp: 10,
};

export const metadata = {
  title: "Preview Kuchiyose · Hi no Kuni",
};

export default function KuchyPreviewPage() {
  const html = techniqueForumHtml(mockData);

  return (
    <div className="space-y-8 max-w-5xl">
      <section className="hnk-kuchy-hero">
        <div className="hnk-kuchy-title">
          <div>
            <p className="label">Preview locale</p>
            <h1 className="value">
              Kuchiyose
              <small> · test visuel</small>
            </h1>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2 text-right">
            <span className="hnk-chip">Carte demonstration</span>
            <span className="hnk-chip">Export forum</span>
          </div>
        </div>
        <p className="text-sm text-bone/80 mt-4 max-w-3xl leading-relaxed relative z-[1]">
          Cette page sert a tester le skin des invocations dans une version statique, sans dependre
          de la base de donnees. Elle reprend les memes motifs que le reste du site pour eviter la
          rupture visuelle.
        </p>
        <div className="hnk-kuchy-badges">
          <span className="hnk-chip">Sceau vivant</span>
          <span className="hnk-chip">Rang auto</span>
          <span className="hnk-chip">Meme DA</span>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <h2 className="hnk-section-title !text-base">Carte actuelle</h2>
          <article
            className="hnk-kuchy-panel hnk-kuchy-panel--frame hnk-kuchy-panel--kuchy"
            data-kanji="技"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="hnk-kuchy-badge">Kuchiyose</span>
              <span className="hnk-kuchy-badge hnk-kuchy-badge--alt">Invocation</span>
            </div>
            <div className="flex items-start justify-between gap-3 mt-4">
              <div>
                <p className="hnk-eyebrow">Techniques liees a l&apos;invocation</p>
                <h3 className="font-display uppercase tracking-wider text-2xl text-white mt-2">
                  Ame no Bakeneko
                </h3>
              </div>
              <span className="hnk-chip">Rang C</span>
            </div>

            <div className="hnk-kuchy-rank mt-4">
              <span className="rank">Felins du brouillard</span>
              <span className="meta">Art cache · invocation propre</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-4">
              <span className="hnk-tech-chip">口 Felins du brouillard · Ame no Bakeneko · Rang C</span>
              <span className="hnk-tech-chip">Evolutive</span>
            </div>

            <p className="mt-4 text-sm text-bone/80 whitespace-pre-line text-justify">
              {mockData.description}
            </p>
          </article>
        </section>

        <section className="space-y-3">
          <h2 className="hnk-section-title !text-base">Export forum</h2>
          <textarea
            readOnly
            value={html}
            className="hnk-input font-mono text-xs min-h-[320px]"
            onFocus={(e) => e.currentTarget.select()}
          />
        </section>
      </div>

      <div className="hnk-kuchy-panel hnk-kuchy-panel--frame hnk-kuchy-panel--kuchy" data-kanji="口">
        <div className="flex flex-wrap items-center gap-2">
          <span className="hnk-kuchy-badge">Kuchiyose</span>
          <span className="hnk-kuchy-badge hnk-kuchy-badge--alt">Invocation</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-4">
          <div>
            <p className="hnk-eyebrow">Reference</p>
            <h2 className="hnk-serif text-2xl mt-2">Ce que la suite visuelle testera</h2>
          </div>
          <Link href="/technique/invocations" className="hnk-btn-ghost !py-2 !px-4">
            Retour aux invocations
          </Link>
        </div>
        <ul className="mt-4 text-sm text-bone/80 space-y-2">
          <li>- Rang de l&apos;invocation visible en clair.</li>
          <li>- Spec calculee sur le rang de l&apos;invocation, pas celui du joueur.</li>
          <li>- Carte distincte des techniques joueur/KG.</li>
        </ul>
      </div>
    </div>
  );
}

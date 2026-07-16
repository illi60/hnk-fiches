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
        </div>
        <p className="text-sm text-bone/80 mt-4 max-w-3xl leading-relaxed relative z-[1]">
          Cette page sert à prévisualiser une technique de Kuchiyose et son export forum dans une
          version statique. Elle montre le rendu de la carte, les informations d&apos;invocation et
          le code copiable avant publication.
        </p>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <h2 className="hnk-section-title !text-base">Carte actuelle</h2>
          <article className="hnk-tech hnk-tech--kuchy">
            <div className="hnk-tech-meta">Technique · 10 XP</div>
            <div className="hnk-tech-name">Ame no Bakeneko</div>
            <div className="hnk-tech-chips">
              <span className="hnk-tech-chip">口 Kuchiyose · Lignage (C)</span>
              <span className="hnk-tech-chip">Évolutive</span>
            </div>
            <div className="hnk-tech-desc" style={{ whiteSpace: "pre-line", textAlign: "justify" }}>
              {mockData.description}
            </div>
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

      <div className="hnk-kuchy-panel hnk-kuchy-panel--frame" data-kanji="口">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="hnk-eyebrow">Référence</p>
            <h2 className="hnk-serif text-2xl mt-2">Ce que la suite visuelle testera</h2>
          </div>
          <Link href="/technique/invocations" className="hnk-btn-ghost !py-2 !px-4">
            Retour aux invocations
          </Link>
        </div>
        <ul className="mt-4 text-sm text-bone/80 space-y-2">
          <li>- Rang de l&apos;invocation visible en clair.</li>
          <li>- Spécialisation calculée sur le rang de l&apos;invocation, pas celui du joueur.</li>
          <li>- Carte distincte des techniques joueur/KG.</li>
        </ul>
      </div>
    </div>
  );
}

import Link from "next/link";

import { techniqueForumHtml } from "@/lib/techniques";

const mockData = {
  nom: "Ame no Bakeneko",
  art: "Kuchiyose",
  spec: "Lignée",
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
  espece: "Félins du brouillard",
  secondaryElement: null,
  secondaryKekkeiGenkai: null,
  secondaryKgColorHex: null,
  description:
    "Une invocation furtive qui surgit dans un panache de fumée, réduit la distance et désoriente sa cible avant de disparaître à nouveau.",
  coutXp: 10,
};

export const metadata = {
  title: "Preview Kuchiyose · Hi no Kuni",
};

export default function KuchyPreviewPage() {
  const html = techniqueForumHtml(mockData);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <p className="hnk-eyebrow">Preview locale</p>
        <h1 className="hnk-serif text-4xl mt-2">Kuchiyose · test visuel</h1>
        <p className="text-sm text-smoke mt-2 max-w-3xl">
          Cette page ne dépend d&apos;aucune donnée base de données. Elle sert à valider le rendu
          du Kuchiyose avant de toucher au skin final.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <h2 className="hnk-section-title !text-base">Carte actuelle</h2>
          <article className="hnk-panel" data-kanji="技">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="hnk-eyebrow">Techniques liées à l&apos;invocation</p>
                <h3 className="font-display uppercase tracking-wider text-xl text-white mt-2">
                  Ame no Bakeneko
                </h3>
              </div>
              <span className="hnk-chip">Rang invoc. C</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-4">
              <span className="hnk-tech-chip">口 Félins du brouillard · Ame no Bakeneko · Rang C</span>
              <span className="hnk-tech-chip">Évolutive</span>
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

      <div className="hnk-panel" data-kanji="口">
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
          <li>• Rang de l&apos;invocation visible en clair.</li>
          <li>• Spé calculée sur le rang de l&apos;invocation, pas celui du joueur.</li>
          <li>• Carte distincte des techniques joueur/KG.</li>
        </ul>
      </div>
    </div>
  );
}

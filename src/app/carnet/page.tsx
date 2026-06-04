import type { Metadata } from "next";
import CarnetGenerator from "@/components/CarnetGenerator";
import GeneratorNav from "@/components/GeneratorNav";

export const metadata: Metadata = {
  title: "Hi no Kuni — Générateur de carnet de bord",
  description:
    "Compose ton carnet de bord Hi no Kuni (personnage, liens, chronologie, accomplissements) et récupère le code prêt à coller sur le forum.",
};

export default function CarnetPage() {
  return (
    <main className="min-h-screen">
      <GeneratorNav current="carnet" />

      <div className="max-w-[1760px] mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="hnk-display text-2xl leading-none">Atelier de carnet de bord</div>
          <div className="hnk-eyebrow mt-1">Hi no Kuni · générateur de codage forum</div>
        </div>
        <p className="text-bone/80 text-sm max-w-3xl mb-8">
          Le carnet de bord est un sujet vivant, consulté régulièrement par toi et les autres membres&nbsp;: il doit{" "}
          <strong className="text-white">passer par ce générateur</strong> pour ressortir de façon fiable et identique à
          chaque édition. Il se découpe en <strong className="text-white">quatre blocs</strong> indépendants
          (Personnage · Liens · Chronologie · Accomplissements). Bascule entre les onglets, remplis-les, puis colle
          chaque code dans son propre message du sujet.
        </p>
        <p className="text-smoke text-xs max-w-3xl mb-8">
          Pas besoin de compte&nbsp;: ton carnet est <strong className="text-bone">sauvegardé automatiquement dans ce
          navigateur</strong> (les 4 blocs d'un coup) et réapparaît à ta prochaine visite. Le rendu sur le forum sera
          identique à l'aperçu — il réutilise la même feuille de style que la fiche de présentation, donc aucun CSS
          supplémentaire à importer.
        </p>
        <CarnetGenerator />
      </div>
    </main>
  );
}

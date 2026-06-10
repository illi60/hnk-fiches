import type { Metadata } from "next";
import RpGenerator from "@/components/RpGenerator";
import GeneratorNav from "@/components/GeneratorNav";

export const metadata: Metadata = {
  title: "Hi no Kuni — Générateur de post RP",
  description:
    "Compose ton post RP in-game Hi no Kuni (bannière, titre, citation, texte) et récupère le code prêt à coller sur le forum.",
};

export default function RpPage() {
  return (
    <main className="min-h-screen">
      <GeneratorNav current="rp" />

      <div className="max-w-[1760px] mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="hnk-display text-2xl leading-none">Atelier de post RP</div>
          <div className="hnk-eyebrow mt-1">Hi no Kuni · générateur de codage forum</div>
        </div>
        <p className="text-bone/80 text-sm max-w-3xl mb-8">
          Remplis les champs : l'aperçu se met à jour en direct. Choisis l'ambiance pour teinter le post, ajoute
          ta bannière, ton titre et ton texte, puis clique sur{" "}
          <strong className="text-white">« Copier le code forum »</strong> et colle le résultat dans ton message
          de RP. Le rendu sur le forum sera identique à l'aperçu.
        </p>
        <p className="text-smoke text-xs max-w-3xl mb-8">
          Pas besoin de compte : ton post est <strong className="text-bone">sauvegardé automatiquement dans ce
          navigateur</strong> et réapparaît à ta prochaine visite. Il réutilise la même feuille de style que la
          fiche de présentation, donc aucun CSS supplémentaire à importer. Utilise « Réinitialiser » pour repartir
          de zéro.
        </p>
        <RpGenerator />
      </div>
    </main>
  );
}

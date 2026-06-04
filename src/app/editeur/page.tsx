import type { Metadata } from "next";
import PresentationGenerator from "@/components/PresentationGenerator";
import GeneratorNav from "@/components/GeneratorNav";

export const metadata: Metadata = {
  title: "Hi no Kuni — Générateur de présentation",
  description:
    "Compose ta fiche de présentation Hi no Kuni et récupère le code prêt à coller sur le forum.",
};

export default function EditeurPage() {
  return (
    <main className="min-h-screen">
      <GeneratorNav current="editeur" />

      <div className="max-w-[1760px] mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="hnk-display text-2xl leading-none">Atelier de présentation</div>
          <div className="hnk-eyebrow mt-1">Hi no Kuni · générateur de codage forum</div>
        </div>
        <p className="text-bone/80 text-sm max-w-3xl mb-8">
          Remplis les champs : l'aperçu se met à jour en direct. Choisis ton clan fondateur pour
          teinter la fiche, puis clique sur <strong className="text-white">« Copier le code forum »</strong> et
          colle le résultat dans ton message de présentation. Le rendu sur le forum sera identique à l'aperçu.
        </p>
        <p className="text-smoke text-xs max-w-3xl mb-8">
          Pas besoin de compte : ta fiche est <strong className="text-bone">sauvegardée automatiquement dans ce navigateur</strong> et
          réapparaît à ta prochaine visite. Utilise « Réinitialiser » pour repartir de zéro.
        </p>
        <PresentationGenerator />
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import PresentationGenerator from "@/components/PresentationGenerator";

export const metadata: Metadata = {
  title: "Hi no Kuni — Générateur de présentation",
  description:
    "Compose ta fiche de présentation Hi no Kuni et récupère le code prêt à coller sur le forum.",
};

export default function EditeurPage() {
  return (
    <main className="min-h-screen">
      {/* En-tête autonome (pas de dashboard, pas de login) */}
      <header className="border-b border-white/10">
        <div className="max-w-[1760px] mx-auto px-6 py-6 flex items-center gap-4">
          <div className="grid place-items-center w-10 h-10 border border-ember/40 bg-ink-700">
            <span className="font-jp text-ember text-xl" style={{ textShadow: "0 0 12px rgba(255,87,34,.7)" }}>
              火
            </span>
          </div>
          <div>
            <div className="hnk-display text-xl leading-none">Atelier de présentation</div>
            <div className="hnk-eyebrow mt-1">Hi no Kuni · générateur de codage forum</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1760px] mx-auto px-6 py-10">
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

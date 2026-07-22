import type { Metadata } from "next";
import GeneratorNav from "@/components/GeneratorNav";
import MissionGenerator from "@/components/MissionGenerator";

export const metadata: Metadata = {
  title: "Hi no Kuni - Générateur de mission",
  description:
    "Compose une annonce de mission Hi no Kuni et récupère le code prêt à coller sur le forum.",
};

export default function MissionsPage() {
  return (
    <main className="min-h-screen">
      <GeneratorNav current="missions" />

      <div className="max-w-[1760px] mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="hnk-display text-2xl leading-none">Atelier de mission</div>
          <div className="hnk-eyebrow mt-1">Hi no Kuni · générateur de codage forum</div>
        </div>
        <p className="text-bone/80 text-sm max-w-3xl mb-8">
          Choisis une mission de rang D, C ou B, puis remplis les informations et les conditions : l&apos;aperçu se met à
          jour en direct. Le statut reste ouvert, avec récompense et effectif calculés automatiquement.
        </p>
        <p className="text-smoke text-xs max-w-3xl mb-8">
          Pas besoin de compte : ta mission est sauvegardée automatiquement dans ce navigateur. Utilise
          &laquo; Réinitialiser &raquo; pour repartir de zéro.
        </p>
        <MissionGenerator />
      </div>
    </main>
  );
}

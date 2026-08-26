import type { Metadata } from "next";
import WarEffortGenerator from "@/components/WarEffortGenerator";
import { requireForumGeneratorModerator } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Hi no Kuni - Effort de guerre",
  description: "Générateur staff pour créer une jauge d'effort de guerre à poster sur le forum.",
};

export default async function AdminWarEffortPage() {
  await requireForumGeneratorModerator();

  return (
    <div className="relative left-1/2 w-[calc(100vw-3rem)] max-w-[1760px] -translate-x-1/2 space-y-8">
      <div>
        <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">Générateur staff</p>
        <h1 className="font-serif text-3xl text-white2 mt-1">Jauge d'effort de guerre</h1>
      </div>

      <p className="text-bone/80 text-sm max-w-3xl">
        Compose un bulletin de mobilisation avec jauge, objectif stratégique et rapports RP validés. La page est
        réservée aux administrateurs : copie le code généré puis remplace le message forum à chaque mise à jour du front.
      </p>

      <WarEffortGenerator />
    </div>
  );
}

import type { Metadata } from "next";
import MissionGenerator from "@/components/MissionGenerator";
import { requireForumGeneratorModerator } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Hi no Kuni - Générateur admin de contrat",
  description: "Atelier staff pour créer des annonces de contrat de rang B, A ou S.",
};

export default async function AdminMissionsPage() {
  await requireForumGeneratorModerator();

  return (
    <div className="relative left-1/2 w-[calc(100vw-3rem)] max-w-[1760px] -translate-x-1/2 space-y-8">
      <div>
        <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">Générateur staff</p>
        <h1 className="font-serif text-3xl text-white2 mt-1">Création de contrats</h1>
      </div>

      <p className="text-bone/80 text-sm max-w-3xl">
        Version administration : seuls les rangs B, A et S sont disponibles, avec récompense et effectif ajustables. Le statut
        généré reste toujours <strong className="text-white">Ouverte</strong>.
      </p>

      <MissionGenerator mode="admin" />
    </div>
  );
}

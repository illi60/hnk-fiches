import type { Metadata } from "next";
import StaffMessageGenerator from "@/components/StaffMessageGenerator";
import { requireForumGeneratorModerator } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Hi no Kuni - Messages d'administration",
  description: "Générateur staff pour créer des décrets, avis et alertes administratives.",
};

export default async function AdminMessagesPage() {
  await requireForumGeneratorModerator();

  return (
    <div className="relative left-1/2 w-[calc(100vw-3rem)] max-w-[1760px] -translate-x-1/2 space-y-8">
      <div>
        <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">Générateur staff</p>
        <h1 className="font-serif text-3xl text-white2 mt-1">Messages d'administration</h1>
      </div>

      <p className="text-bone/80 text-sm max-w-3xl">
        Compose un décret, une note du Conseil ou une alerte prête à poster. Les champs méta décochés sont masqués
        dans le code généré.
      </p>

      <StaffMessageGenerator />
    </div>
  );
}

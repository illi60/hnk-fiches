import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import FicheForm from "@/components/FicheForm";
import { ownedKgsFull, ownedAffinities, type ProgressionState } from "@/lib/quintessence";

export const metadata = { title: "Nouvelle technique · Hi no Kuni" };

export default async function NewFichePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      primaryKg: true,
      primaryAffinity: true,
      affinites: true,
      progressionState: true,
      clan: true,
      rangClan: true,
      kekkeiGenkai: true,
    },
  });
  const state = ((user?.progressionState ?? {}) as unknown) as ProgressionState;
  const allowedKg = ownedKgsFull(user?.primaryKg, state, user?.kekkeiGenkai);
  const allowedElements = ownedAffinities(user?.primaryAffinity, user?.affinites);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="hnk-eyebrow">Registre</p>
        <h1 className="hnk-serif text-3xl mt-1">Nouvelle technique</h1>
        <p className="text-sm text-smoke mt-2">
          Crée un brouillon, complète-le à ton rythme, puis soumets-le au staff.
        </p>
      </div>

      <FicheForm
        allowedKg={allowedKg}
        allowedElements={allowedElements}
        userClan={user?.clan ?? null}
        rangClan={user?.rangClan ?? null}
      />
    </div>
  );
}

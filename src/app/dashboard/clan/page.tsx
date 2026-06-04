import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ownedKgsFull, type ProgressionState } from "@/lib/quintessence";
import ClanLibraryView from "@/components/ClanLibraryView";

export const metadata = { title: "Bibliothèque de clan · Hi no Kuni" };

export default async function ClanLibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { clan: true, primaryKg: true, kekkeiGenkai: true, progressionState: true },
  });
  if (!user?.clan) redirect("/dashboard");

  const owned = ownedKgsFull(
    user.primaryKg,
    (user.progressionState ?? {}) as unknown as ProgressionState,
    user.kekkeiGenkai
  ).map((k) => k.toLowerCase());

  const rows = await prisma.ficheTechnique.findMany({
    where: {
      clan: { equals: user.clan, mode: "insensitive" },
      nature: "COLLECTIVE",
      status: "VALIDATED",
      isActive: true,
    },
    orderBy: { nom: "asc" },
    select: {
      id: true,
      nom: true,
      description: true,
      art: true,
      secondaryArt: true,
      actionType: true,
      element: true,
      kekkeiGenkai: true,
      secondaryElement: true,
      secondaryKekkeiGenkai: true,
      coutXp: true,
      author: { select: { username: true } },
    },
  });
  const techniques = rows.map((t) => ({
    ...t,
    usable: !!t.kekkeiGenkai && owned.includes(t.kekkeiGenkai.toLowerCase()),
  }));

  return (
    <div className="space-y-8">
      <div>
        <p className="hnk-eyebrow">Bibliothèque commune · 蔵</p>
        <h1 className="hnk-serif text-4xl mt-2">Clan {user.clan}</h1>
        <p className="text-sm text-smoke mt-2 max-w-2xl">
          Techniques collectives du clan, partagées par tous les membres. Le marqueur{" "}
          <span className="text-ember">●</span> indique que tu possèdes le Kekkei Genkai associé et
          peux donc l&apos;utiliser. Les autres restent visibles mais verrouillées.
        </p>
        <Link href="/dashboard" className="text-xs text-smoke hover:text-ember">
          ← Retour au profil
        </Link>
      </div>

      <ClanLibraryView techniques={techniques} clan={user.clan} />
    </div>
  );
}

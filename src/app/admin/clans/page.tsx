import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import AddClanTechniqueForm from "@/components/AddClanTechniqueForm";
import ClanLibraryView from "@/components/ClanLibraryView";

const KNOWN_CLANS = ["SENJU", "UCHIHA", "UZUMAKI", "SARUTOBI", "HYUGA"];

export default async function AdminClansPage() {
  await requireAdmin();

  // Clans connus + clans réellement présents sur les profils.
  const usersWithClan = await prisma.user.findMany({
    where: { clan: { not: null } },
    select: { clan: true },
  });
  const clanSet = new Map<string, string>(); // clé lower → libellé affiché
  for (const c of KNOWN_CLANS) clanSet.set(c.toLowerCase(), c);
  for (const u of usersWithClan) {
    if (u.clan && !clanSet.has(u.clan.toLowerCase())) clanSet.set(u.clan.toLowerCase(), u.clan);
  }
  const clans = Array.from(clanSet.values()).sort();

  // Toutes les techniques collectives validées, groupées par clan (insensible casse).
  const techniques = await prisma.ficheTechnique.findMany({
    where: { nature: "COLLECTIVE", status: "VALIDATED", isActive: true, clan: { not: null } },
    orderBy: { nom: "asc" },
    select: {
      id: true,
      nom: true,
      clan: true,
      art: true,
      secondaryArt: true,
      actionType: true,
      element: true,
      kekkeiGenkai: true,
      secondaryElement: true,
      secondaryKekkeiGenkai: true,
      description: true,
      coutXp: true,
      author: { select: { username: true } },
    },
  });
  const byClan = new Map<string, typeof techniques>();
  for (const t of techniques) {
    const key = (t.clan ?? "").toLowerCase();
    const list = byClan.get(key) ?? [];
    list.push(t);
    byClan.set(key, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">Clans</p>
        <h1 className="font-serif text-3xl text-white2 mt-1">Bibliothèques de clan</h1>
        <p className="text-sm text-smoke mt-2 max-w-2xl">
          Techniques collectives par clan. Visibles par tous les membres du clan ; utilisables
          uniquement par ceux qui possèdent le Kekkei Genkai associé.
        </p>
      </div>

      <AddClanTechniqueForm clans={clans} />

      <div className="space-y-6">
        {clans.map((clan) => {
          const list = byClan.get(clan.toLowerCase()) ?? [];
          return (
            <section key={clan} className="border border-white/5 bg-ink-700 p-4">
              <h2 className="font-display uppercase tracking-[0.2em] text-ember mb-3">
                {clan} <span className="text-smoke text-xs">· {list.length}</span>
              </h2>
              <ClanLibraryView
                clan={clan}
                showUsable={false}
                techniques={list.map((t) => ({
                  id: t.id,
                  nom: t.nom,
                  description: t.description,
                  art: t.art,
                  secondaryArt: t.secondaryArt,
                  actionType: t.actionType,
                  element: t.element,
                  kekkeiGenkai: t.kekkeiGenkai,
                  secondaryElement: t.secondaryElement,
                  secondaryKekkeiGenkai: t.secondaryKekkeiGenkai,
                  coutXp: t.coutXp,
                  author: t.author,
                }))}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}

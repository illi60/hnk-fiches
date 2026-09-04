import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import AdminClansWorkspace, { type AdminClanGroup } from "@/components/AdminClansWorkspace";
import { loadKgCatalog, loadKgCatalogRows } from "@/lib/kekkei-server";
import {
  FOUNDER_CLAN_NAMES,
  clanStatusLabel,
  isFounderClan,
  isNoClan,
  playableClanKey,
} from "@/lib/clans";

const KNOWN_CLANS = [...FOUNDER_CLAN_NAMES];

export default async function AdminClansPage() {
  await requireAdmin();
  const kgCatalog = await loadKgCatalog();
  const kgCatalogRows = await loadKgCatalogRows();
  const kgNames = kgCatalog.map((kg) => kg.name);
  const kgColors = Object.fromEntries(kgCatalog.map((kg) => [kg.name, kg.color]));
  const permissions = await prisma.clanLibraryPermission.findMany({
    orderBy: [{ clan: "asc" }, { kind: "asc" }, { value: "asc" }],
    select: { id: true, clan: true, clanKey: true, kind: true, value: true },
  });

  // Clans connus + clans réellement présents dans les profils, rangs, permissions et fiches.
  const usersWithClan = await prisma.user.findMany({
    where: { clan: { not: null } },
    select: { clan: true },
  });
  const communityClanRows = await prisma.communityRank.findMany({
    where: { scopeType: "CLAN" },
    select: { scopeKey: true },
  });
  const ficheClanRows = await prisma.ficheTechnique.findMany({
    where: { clan: { not: null }, isActive: true },
    select: { clan: true },
  });
  const clanSet = new Map<string, string>(); // clé lower → libellé affiché
  for (const c of KNOWN_CLANS) clanSet.set(c.toLowerCase(), c);
  for (const u of usersWithClan) {
    const key = playableClanKey(u.clan);
    if (key && !clanSet.has(key)) clanSet.set(key, u.clan ?? key);
  }
  for (const p of permissions) {
    if (p.clanKey && !clanSet.has(p.clanKey)) clanSet.set(p.clanKey, p.clan);
  }
  for (const c of communityClanRows) {
    if (c.scopeKey && !clanSet.has(c.scopeKey)) clanSet.set(c.scopeKey, c.scopeKey);
  }
  for (const f of ficheClanRows) {
    const key = playableClanKey(f.clan);
    if (key && !clanSet.has(key)) clanSet.set(key, f.clan ?? key);
  }
  const clans = Array.from(clanSet.values()).sort();
  const clanKeys = new Map(clans.map((clan) => [clan, playableClanKey(clan) ?? clan.toLowerCase()]));

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
      author: { select: { username: true, characterStatus: true } },
    },
  });
  const byClan = new Map<string, typeof techniques>();
  for (const t of techniques) {
    const key = (t.clan ?? "").toLowerCase();
    const list = byClan.get(key) ?? [];
    list.push(t);
    byClan.set(key, list);
  }
  const clanGroups: AdminClanGroup[] = clans.map((clan) => {
    const list = byClan.get(clan.toLowerCase()) ?? [];
    const activeList = list.filter((t) => t.author.characterStatus !== "DEAD_MISSING");
    const forgottenList = list.filter((t) => t.author.characterStatus === "DEAD_MISSING");
    return {
      clan,
      active: activeList.map((t) => ({
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
      })),
      forgotten: forgottenList.map((t) => ({
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
        forgotten: true,
      })),
    };
  });

  const kinjutsu = await prisma.ficheTechnique.findMany({
    where: {
      nature: "KINJUTSU",
      isActive: true,
      OR: [{ kinjutsuScope: "CLAN" }, { kinjutsuScope: { startsWith: "UNIT:" } }],
    },
    orderBy: [{ kinjutsuScope: "asc" }, { clan: "asc" }, { nom: "asc" }],
    select: {
      id: true,
      nom: true,
      description: true,
      actionType: true,
      kinjutsuScope: true,
      clan: true,
      coutXp: true,
    },
  });
  const registryRows = clans.map((clan) => {
    const key = clanKeys.get(clan) ?? clan.toLowerCase();
    const memberCount = usersWithClan.filter((u) => playableClanKey(u.clan) === key).length;
    const techniqueCount = techniques.filter((t) => playableClanKey(t.clan) === key).length;
    const kinjutsuCount = kinjutsu.filter(
      (t) => t.kinjutsuScope === "CLAN" && playableClanKey(t.clan) === key
    ).length;
    const permissionCount = permissions.filter((p) => p.clanKey === key).length;
    const hasCommunityRank = communityClanRows.some((row) => row.scopeKey === key);
    return {
      key,
      name: clan,
      status: clanStatusLabel(clan) ?? "Clan",
      memberCount,
      techniqueCount,
      kinjutsuCount,
      permissionCount,
      hasCommunityRank,
      canDelete: !isFounderClan(clan),
    };
  });

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

      <AdminClansWorkspace
        clans={clans}
        clanGroups={clanGroups}
        kgCatalogRows={kgCatalogRows}
        kgNames={kgNames}
        kgColors={kgColors}
        permissions={permissions}
        kinjutsu={kinjutsu}
        registryRows={registryRows}
      />
    </div>
  );
}

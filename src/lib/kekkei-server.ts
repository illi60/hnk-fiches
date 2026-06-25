import { prisma } from "@/lib/prisma";
import {
  DEFAULT_KEKKEI_GENKAI,
  type KGDef,
  kgColor,
  clanKg,
} from "@/lib/kekkei";

type CatalogRow = {
  id: string;
  name: string;
  color: string;
};

function normalizeKgName(name: string) {
  return name.trim().toLowerCase();
}

function mergeKgCatalog(rows: CatalogRow[]): KGDef[] {
  const map = new Map<string, KGDef>();
  for (const def of DEFAULT_KEKKEI_GENKAI) {
    map.set(normalizeKgName(def.name), { ...def });
  }

  for (const row of rows) {
    const key = normalizeKgName(row.name);
    const base = map.get(key);
    map.set(key, {
      name: row.name,
      subtitle: base?.subtitle ?? "",
      clan: base?.clan,
      color: row.color || base?.color || kgColor(row.name),
      category: base?.category ?? "SPECIAL",
      evolutions: base?.evolutions,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadKgCatalog(): Promise<KGDef[]> {
  const rows = await prisma.kekkeiGenkaiCatalog.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  return mergeKgCatalog(rows);
}

export async function loadKgCatalogRows(): Promise<CatalogRow[]> {
  return prisma.kekkeiGenkaiCatalog.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });
}

export async function loadKgNames(): Promise<string[]> {
  return (await loadKgCatalog()).map((kg) => kg.name);
}

export async function loadKgColorMap(): Promise<Record<string, string>> {
  const catalog = await loadKgCatalog();
  return Object.fromEntries(catalog.map((kg) => [kg.name, kg.color]));
}

export async function isKnownKg(name: string): Promise<boolean> {
  const normalized = normalizeKgName(name);
  const catalog = await loadKgCatalog();
  return catalog.some((kg) => normalizeKgName(kg.name) === normalized);
}

export function clanScopeKey(clan?: string | null): string {
  return (clan ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export type ClanLibraryAccess = {
  kg: string[];
  affinities: string[];
};

export async function loadClanLibraryAccess(clan?: string | null): Promise<ClanLibraryAccess> {
  const key = clanScopeKey(clan);
  if (!key) return { kg: [], affinities: [] };

  const rows = await prisma.clanLibraryPermission.findMany({
    where: { clanKey: key },
    orderBy: [{ kind: "asc" }, { value: "asc" }],
    select: { kind: true, value: true },
  });

  const kg = new Set<string>();
  const baseKg = clanKg(clan);
  if (baseKg) kg.add(baseKg);

  const affinities = new Set<string>();
  for (const row of rows) {
    if (row.kind === "KG") kg.add(row.value);
    if (row.kind === "AFFINITY") affinities.add(row.value);
  }

  return { kg: Array.from(kg), affinities: Array.from(affinities) };
}

export function canUseCollectiveManifestation(
  access: ClanLibraryAccess,
  owned: { kg: string[]; affinities: string[] },
  selected: { kg?: string | null; affinity?: string | null }
) {
  const selectedKg = selected.kg?.trim();
  if (selectedKg) {
    const allowed = access.kg.some((k) => k.toLowerCase() === selectedKg.toLowerCase());
    const hasIt = owned.kg.some((k) => k.toLowerCase() === selectedKg.toLowerCase());
    return allowed && hasIt;
  }

  const selectedAffinity = selected.affinity?.trim();
  if (selectedAffinity) {
    const allowed = access.affinities.some((a) => a.toLowerCase() === selectedAffinity.toLowerCase());
    const hasIt = owned.affinities.some((a) => a.toLowerCase() === selectedAffinity.toLowerCase());
    return allowed && hasIt;
  }

  return false;
}

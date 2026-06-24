import { prisma } from "@/lib/prisma";
import {
  DEFAULT_KEKKEI_GENKAI,
  type KGDef,
  kgColor,
} from "@/lib/kekkei";

type CatalogRow = {
  id: string;
  name: string;
  subtitle: string | null;
  clan: string | null;
  color: string;
  category: string;
  quintessence: string | null;
  kinjutsu: string | null;
  finale: string | null;
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
      subtitle: row.subtitle ?? base?.subtitle ?? "",
      clan: row.clan ?? base?.clan,
      color: row.color || base?.color || kgColor(row.name),
      category: (row.category as KGDef["category"]) ?? base?.category ?? "SPECIAL",
      evolutions: {
        quintessence: row.quintessence ?? base?.evolutions?.quintessence,
        kinjutsu: row.kinjutsu ?? base?.evolutions?.kinjutsu,
        finale: row.finale ?? base?.evolutions?.finale,
      },
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
      subtitle: true,
      clan: true,
      color: true,
      category: true,
      quintessence: true,
      kinjutsu: true,
      finale: true,
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
      subtitle: true,
      clan: true,
      color: true,
      category: true,
      quintessence: true,
      kinjutsu: true,
      finale: true,
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

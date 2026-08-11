import { prisma } from "@/lib/prisma";
import { SHOP_ITEMS, type ShopItem } from "@/lib/shop";

function rowToShopItem(row: {
  itemKey: string;
  name: string;
  category: string;
  costXp: number;
  stock: string;
  kanji: string;
  resource: string | null;
  rankHint: string | null;
  description: string;
  effect: string;
}): ShopItem {
  return {
    key: row.itemKey,
    name: row.name,
    category: row.category as ShopItem["category"],
    costXp: row.costXp,
    stock: row.stock === "UNIQUE" ? "UNIQUE" : "UNLIMITED",
    kanji: row.kanji,
    resource: row.resource ?? undefined,
    rankHint: row.rankHint ?? undefined,
    description: row.description,
    effect: row.effect,
  };
}

function isMissingShopCatalogTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  );
}

export async function loadShopItems(): Promise<ShopItem[]> {
  try {
    const rows = await prisma.shopCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        itemKey: true,
        name: true,
        category: true,
        costXp: true,
        stock: true,
        kanji: true,
        resource: true,
        rankHint: true,
        description: true,
        effect: true,
      },
    });

    return rows.length > 0 ? rows.map(rowToShopItem) : SHOP_ITEMS;
  } catch (error) {
    if (isMissingShopCatalogTable(error)) return SHOP_ITEMS;
    throw error;
  }
}

export async function loadShopItemsByKeys(itemKeys: string[]): Promise<ShopItem[]> {
  const keys = Array.from(new Set(itemKeys));
  if (keys.length === 0) return [];

  try {
    const rows = await prisma.shopCatalogItem.findMany({
      where: { itemKey: { in: keys } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        itemKey: true,
        name: true,
        category: true,
        costXp: true,
        stock: true,
        kanji: true,
        resource: true,
        rankHint: true,
        description: true,
        effect: true,
      },
    });

    const byKey = new Map(rows.map((row) => [row.itemKey, rowToShopItem(row)]));
    for (const fallback of SHOP_ITEMS) {
      if (keys.includes(fallback.key) && !byKey.has(fallback.key)) {
        byKey.set(fallback.key, fallback);
      }
    }
    return keys.map((key) => byKey.get(key)).filter((item): item is ShopItem => !!item);
  } catch (error) {
    if (isMissingShopCatalogTable(error)) {
      return SHOP_ITEMS.filter((item) => keys.includes(item.key));
    }
    throw error;
  }
}

export async function loadShopItemByKey(itemKey: string): Promise<ShopItem | undefined> {
  try {
    const row = await prisma.shopCatalogItem.findUnique({
      where: { itemKey },
      select: {
        itemKey: true,
        name: true,
        category: true,
        costXp: true,
        stock: true,
        kanji: true,
        resource: true,
        rankHint: true,
        description: true,
        effect: true,
        isActive: true,
      },
    });

    if (row?.isActive) return rowToShopItem(row);
    return SHOP_ITEMS.find((item) => item.key === itemKey);
  } catch (error) {
    if (isMissingShopCatalogTable(error)) {
      return SHOP_ITEMS.find((item) => item.key === itemKey);
    }
    throw error;
  }
}

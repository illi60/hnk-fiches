import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import AdminShopItems, { type AdminShopItemView } from "@/components/AdminShopItems";
import AdminReconquestProgress from "@/components/AdminReconquestProgress";
import AdminRelicOwners, { type AdminRelicView } from "@/components/AdminRelicOwners";
import { SHOP_RELIC_ITEM_KEYS } from "@/lib/shop";
import { loadReconquestProgress } from "@/lib/shop-reconquest-server";

export default async function AdminBoutiquePage() {
  await requireAdmin();

  let missingTable = false;
  const rows = await prisma.shopCatalogItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
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
      sortOrder: true,
    },
  }).catch((error) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2021"
    ) {
      missingTable = true;
      return [];
    }
    throw error;
  });

  const reconquestProgress = missingTable ? 0 : await loadReconquestProgress();
  const relicOwnerRows = missingTable
    ? []
    : await prisma.inventoryItem.findMany({
        where: { itemKey: { in: [...SHOP_RELIC_ITEM_KEYS] } },
        orderBy: [{ itemKey: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          itemKey: true,
          itemName: true,
          costXp: true,
          quantity: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              forumPseudo: true,
              clan: true,
            },
          },
        },
      });
  const items: AdminShopItemView[] = rows.map((row) => ({
    id: row.id,
    key: row.itemKey,
    name: row.name,
    category: row.category as AdminShopItemView["category"],
    costXp: row.costXp,
    stock: row.stock === "UNIQUE" ? "UNIQUE" : "UNLIMITED",
    kanji: row.kanji,
    resource: row.resource ?? undefined,
    rankHint: row.rankHint ?? undefined,
    description: row.description,
    effect: row.effect,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  }));
  const relics: AdminRelicView[] = SHOP_RELIC_ITEM_KEYS.map((key) => {
    const item = items.find((catalogItem) => catalogItem.key === key);
    return {
      key,
      name: item?.name ?? key,
      kanji: item?.kanji ?? "碑",
      owners: relicOwnerRows
        .filter((owner) => owner.itemKey === key)
        .map((owner) => ({
          id: owner.id,
          itemKey: owner.itemKey,
          itemName: owner.itemName,
          costXp: owner.costXp,
          quantity: owner.quantity,
          createdAt: owner.createdAt.toISOString(),
          user: owner.user,
        })),
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">Boutique</p>
        <h1 className="font-serif text-3xl text-white2 mt-1">Catalogue des objets</h1>
        <p className="text-sm text-smoke mt-2 max-w-2xl">
          Ajoute, masque ou modifie les objets achetables par les joueurs connectes.
        </p>
      </div>

      {missingTable ? (
        <div className="hnk-panel" data-kanji="警">
          <p className="hnk-eyebrow">Migration requise</p>
          <p className="text-sm text-bone/75 mt-3 leading-relaxed">
            La table ShopCatalogItem n'existe pas encore dans la base. Applique les migrations Prisma
            pour activer l'edition admin du catalogue boutique.
          </p>
        </div>
      ) : (
        <>
          <AdminReconquestProgress progress={reconquestProgress} />
          <AdminRelicOwners relics={relics} />
          <AdminShopItems items={items} />
        </>
      )}
    </div>
  );
}

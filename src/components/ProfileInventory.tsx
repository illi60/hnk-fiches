import Link from "next/link";

import { categoryLabel, type ShopItem } from "@/lib/shop";
import InventoryForumCopyButton from "@/components/InventoryForumCopyButton";

export interface ProfileInventoryItem {
  itemKey: string;
  itemName: string;
  costXp: number;
  quantity: number;
}

export default function ProfileInventory({
  inventory,
  catalog,
  showHeader = true,
}: {
  inventory: ProfileInventoryItem[];
  catalog: ShopItem[];
  showHeader?: boolean;
}) {
  const catalogByKey = new Map(catalog.map((item) => [item.key, item]));

  return (
    <section>
      {showHeader && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="hnk-section-title flex-1">Inventaire</h2>
          <Link href="/technique/boutique" className="hnk-btn-ghost !py-2 !px-4 !text-[10px]">
            Boutique
          </Link>
          <Link href="/technique/echanges" className="hnk-btn-ghost !py-2 !px-4 !text-[10px]">
            Échanges
          </Link>
        </div>
      )}

      {inventory.length === 0 ? (
        <div className="hnk-panel" data-kanji="袋">
          <p className="text-sm text-smoke">
            Aucun objet dans ton inventaire pour le moment.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map((owned) => {
            const item = catalogByKey.get(owned.itemKey);
            const unique = item?.stock === "UNIQUE";
            const displayName = item?.name ?? owned.itemName;
            return (
              <article
                key={owned.itemKey}
                className={`hnk-inventory-card ${unique ? "hnk-inventory-card--unique" : ""}`}
                data-category={item?.category ?? "OBJET"}
              >
                <div className="hnk-inventory-kanji" aria-hidden>
                  {item?.kanji ?? "具"}
                </div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="hnk-eyebrow">
                        {item ? categoryLabel(item.category) : "Objet"}
                      </p>
                      <h3 className="font-display uppercase tracking-wider text-xl text-white mt-2">
                        {displayName}
                      </h3>
                    </div>
                    <span className="hnk-chip">x{owned.quantity}</span>
                  </div>

                  <p className="text-xs text-smoke mt-3 leading-relaxed">
                    {item?.effect ?? "Objet conserve dans l'inventaire."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="hnk-chip">{unique ? "Permanent" : "Unique"}</span>
                    <span className="hnk-chip tabular-nums">{owned.costXp} XP</span>
                    <InventoryForumCopyButton
                      data={{
                        itemName: displayName,
                        quantity: owned.quantity,
                        costXp: owned.costXp,
                        item,
                      }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

import { categoryLabel, type ShopItem } from "@/lib/shop";

export interface InventoryForumData {
  itemName: string;
  quantity: number;
  costXp: number;
  item?: ShopItem | undefined;
}

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inventoryForumHtml(data: InventoryForumData): string {
  const item = data.item;
  const category = item ? categoryLabel(item.category) : "Objet";
  const stock = item?.stock === "UNIQUE" ? "Permanent" : "Unique";
  const description = item?.description ? `<div class="hnk-tech-desc">${escapeHtml(item.description)}</div>` : "";
  const effect = item?.effect ?? "Objet conservé dans l'inventaire.";

  return (
    `<div class="hnk-tech hnk-tech--item" style="--kg:#ff6a32">` +
    `<div class="hnk-tech-meta">Inventaire &middot; ${escapeHtml(category)} &middot; ${data.costXp} XP</div>` +
    `<div class="hnk-tech-name">${escapeHtml(data.itemName)}</div>` +
    `<div class="hnk-tech-chips">` +
    `<span class="hnk-tech-chip">x${data.quantity}</span>` +
    `<span class="hnk-tech-chip">${stock}</span>` +
    `</div>` +
    description +
    `<div class="hnk-tech-desc"><strong>Effet:</strong> ${escapeHtml(effect)}</div>` +
    `</div>`
  );
}

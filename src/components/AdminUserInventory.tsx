"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { categoryLabel, SHOP_CATEGORIES, type ShopItem } from "@/lib/shop";
import { MAX_INVENTORY_QUANTITY } from "@/lib/admin-inventory";

export interface AdminInventoryItemView {
  id: string;
  itemKey: string;
  itemName: string;
  costXp: number;
  quantity: number;
  reservedQuantity: number;
  createdAt: string;
}

const fieldClass = "w-full border border-white/10 bg-ink-900 px-3 py-2 text-sm text-bone";
const errors: Record<string, string> = {
  INVALID: "Vérifie le nom de l’objet et sa quantité (un nombre entier est attendu).",
  INVENTORY_RESERVED: "Ces exemplaires sont réservés dans un échange. Termine ou annule l’échange avant de les retirer.",
  DUPLICATE: "Cet objet est unique : il est déjà possédé ou la quantité demandée dépasse sa limite.",
  CONFLICT: "L’inventaire a changé entre-temps. Les données ont été actualisées : vérifie-les avant de réessayer.",
  NOT_FOUND: "Le joueur ou l’objet n’est plus disponible. Les données ont été actualisées.",
  INVALID_STATE: "La quantité maximale autorisée serait dépassée.",
  FORBIDDEN: "Cette action est réservée aux administrateurs.",
  UNAUTHORIZED: "Ta session a expiré. Reconnecte-toi pour continuer.",
};

export default function AdminUserInventory({ userId, username, inventory, catalog, availableCatalog }: {
  userId: string;
  username: string;
  inventory: AdminInventoryItemView[];
  catalog: ShopItem[];
  availableCatalog: ShopItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const inFlight = useRef(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [source, setSource] = useState<"catalog" | "custom">("catalog");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [itemKey, setItemKey] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [inventorySearch, setInventorySearch] = useState("");
  const catalogByKey = new Map(catalog.map(item => [item.key, item]));
  const filteredCatalog = availableCatalog.filter(item =>
    (!category || item.category === category) && item.name.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr"))
  );
  const selected = filteredCatalog.find(item => item.key === itemKey);
  const addQuantity = Number(quantity);
  const maxAdd = source === "catalog" && selected?.stock === "UNIQUE" ? 1 : MAX_INVENTORY_QUANTITY;
  const validAdd = Number.isInteger(addQuantity) && addQuantity >= 1 && addQuantity <= maxAdd &&
    (source === "catalog" ? !!selected : !!itemName.trim());
  const visibleInventory = inventory.filter(item =>
    `${item.itemName} ${catalogByKey.get(item.itemKey)?.name ?? ""}`.toLocaleLowerCase("fr").includes(inventorySearch.toLocaleLowerCase("fr"))
  );
  const total = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const reserved = inventory.reduce((sum, item) => sum + item.reservedQuantity, 0);

  function mutate(path: string, method: string, body: unknown, success: string, onSuccess?: () => void) {
    if (inFlight.current || pending) return;
    inFlight.current = true;
    setMessage(null);
    start(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/inventory${path}`, {
          method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setMessage({ text: errors[json.error] ?? "L’opération a échoué. Réessaie dans un instant.", error: true });
          if (["CONFLICT", "NOT_FOUND", "INVENTORY_RESERVED"].includes(json.error)) router.refresh();
          return;
        }
        setMessage({ text: success, error: false });
        onSuccess?.();
        router.refresh();
      } catch {
        setMessage({ text: "Connexion interrompue. Actualise l’inventaire pour vérifier si l’action a été enregistrée avant de réessayer.", error: true });
        router.refresh();
      } finally {
        inFlight.current = false;
      }
    });
  }

  function update(item: AdminInventoryItemView, nextQuantity: number) {
    if (nextQuantity < item.quantity && !confirm(
      nextQuantity === 0
        ? `Supprimer tous les exemplaires de « ${item.itemName} » de l’inventaire de ${username} ?`
        : `Retirer ${item.quantity - nextQuantity} exemplaire(s) de « ${item.itemName} » à ${username} ?`
    )) return;
    mutate(`/${item.id}`, "PATCH", { quantity: nextQuantity, expectedQuantity: item.quantity },
      nextQuantity === 0 ? `${item.itemName} supprimé de l’inventaire.` : `${item.itemName} : quantité mise à jour (${nextQuantity}).`);
  }

  return (
    <section className="border border-white/5 bg-ink-700 p-4 sm:p-6" aria-busy={pending}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="mb-2 text-[10px] uppercase tracking-[0.28em] text-ember">Inventaire du joueur</h3>
          <p className="text-xs text-smoke">Ajoute des objets et ajuste les quantités de {username}, sans débit ni remboursement d’XP.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="hnk-chip">{inventory.length} type(s) · {total} exemplaire(s)</span>
          {reserved > 0 && <span className="hnk-chip text-amber-300">{reserved} réservé(s)</span>}
        </div>
      </div>

      <form className="mt-5 space-y-4 border border-ember/20 bg-ink-900/40 p-4" onSubmit={event => {
        event.preventDefault();
        if (!validAdd) return;
        mutate("", "POST", source === "catalog"
          ? { source, itemKey, quantity: addQuantity }
          : { source, itemName: itemName.trim(), quantity: addQuantity },
          `${addQuantity} × ${source === "catalog" ? selected?.name : itemName.trim()} ajouté(s).`,
          () => { setQuantity("1"); setItemName(""); });
      }}>
        <h4 className="text-sm font-semibold text-bone">Ajouter un objet</h4>
        <fieldset disabled={pending} className="space-y-3">
          <legend className="sr-only">Objet à attribuer</legend>
          <div className="flex flex-wrap gap-4 text-sm text-bone">
            <label className="flex items-center gap-2"><input type="radio" name="inventory-source" checked={source === "catalog"} onChange={() => { setSource("catalog"); setQuantity("1"); }} />Depuis le catalogue</label>
            <label className="flex items-center gap-2"><input type="radio" name="inventory-source" checked={source === "custom"} onChange={() => setSource("custom")} />Objet libre</label>
          </div>
          {source === "catalog" ? <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-smoke">Rechercher dans le catalogue
                <input type="search" className={`${fieldClass} mt-1`} value={search} onChange={e => { setSearch(e.target.value); setItemKey(""); }} placeholder="Nom d’un objet…" />
              </label>
              <label className="text-xs text-smoke">Catégorie
                <select className={`${fieldClass} mt-1`} value={category} onChange={e => { setCategory(e.target.value); setItemKey(""); }}>
                  <option value="">Toutes les catégories</option>
                  {SHOP_CATEGORIES.map(key => <option key={key} value={key}>{categoryLabel(key)}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-xs text-smoke">Objet du catalogue ({filteredCatalog.length})
              <select required className={`${fieldClass} mt-1`} value={selected?.key ?? ""} onChange={e => { setItemKey(e.target.value); setQuantity("1"); }}>
                <option value="">{filteredCatalog.length ? "Choisir un objet" : "Aucun objet disponible"}</option>
                {filteredCatalog.map(item => <option key={item.key} value={item.key}>{item.name}{item.stock === "UNIQUE" ? " — unique" : ""}</option>)}
              </select>
            </label>
            {selected && <div className="space-y-1 text-xs text-smoke"><p>{selected.description}</p><p className="text-bone">{selected.effect}</p></div>}
            <p className="text-xs text-smoke">L’attribution ajoute uniquement l’objet à l’inventaire. Les services de progression restent à appliquer dans les outils dédiés. Les limites des objets uniques restent actives.</p>
          </> : <label className="block text-xs text-smoke">Nom de l’objet libre
            <input required maxLength={160} className={`${fieldClass} mt-1`} value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ex. : Médaille du tournoi" />
            <span className="mt-1 block">Objet hors catalogue, avec une valeur indicative de 0 XP.</span>
          </label>}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-smoke">Quantité à ajouter
              <input required type="number" min={1} max={maxAdd} step={1} className={`${fieldClass} mt-1 !w-28`} value={quantity} onChange={e => setQuantity(e.target.value)} />
            </label>
            <button type="submit" className="hnk-btn" disabled={pending || !validAdd}>{pending ? "Enregistrement…" : "Ajouter à l’inventaire"}</button>
          </div>
        </fieldset>
      </form>

      <div aria-live="polite" aria-atomic="true">
        {message && <p className={`mt-4 border p-3 text-sm ${message.error ? "border-red-400/30 text-red-300" : "border-emerald-400/30 text-emerald-300"}`}>{message.text}</p>}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-bone">Objets possédés</h4>
        <label className="text-xs text-smoke">Filtrer l’inventaire
          <input type="search" className={`${fieldClass} mt-1`} value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} placeholder="Nom d’un objet…" />
        </label>
      </div>
      <p className="mt-2 text-xs text-smoke">La quantité totale inclut les exemplaires réservés dans un échange. Ceux-ci ne peuvent pas être retirés.</p>
      {inventory.length === 0 ? <p className="mt-4 text-sm italic text-smoke">Aucun objet dans l’inventaire. Utilise le formulaire ci-dessus pour en ajouter.</p>
        : visibleInventory.length === 0 ? <p className="mt-4 text-sm text-smoke">Aucun objet ne correspond à la recherche.</p>
        : <div className="mt-3 divide-y divide-white/5 border border-white/5 bg-ink-900/50">
          {visibleInventory.map(owned => <InventoryRow key={`${owned.id}:${owned.quantity}:${owned.reservedQuantity}`} owned={owned} item={catalogByKey.get(owned.itemKey)} pending={pending} onUpdate={quantity => update(owned, quantity)} />)}
        </div>}
    </section>
  );
}

function InventoryRow({ owned, item, pending, onUpdate }: {
  owned: AdminInventoryItemView; item?: ShopItem; pending: boolean; onUpdate: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(String(owned.quantity));
  const value = Number(quantity);
  const available = owned.quantity - owned.reservedQuantity;
  const max = item?.stock === "UNIQUE" ? Math.max(1, owned.quantity) : MAX_INVENTORY_QUANTITY;
  const valid = quantity !== "" && Number.isInteger(value) && value >= owned.reservedQuantity && value <= max;
  return <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
    <div className="min-w-0 flex-1 basis-48">
      <p className="break-words font-medium text-bone">{item?.name ?? owned.itemName}</p>
      <p className="mt-1 text-xs text-smoke">{item ? categoryLabel(item.category) : "Objet hors catalogue"} · {owned.costXp} XP (valeur indicative)</p>
      <p className="mt-1 text-xs text-smoke">{available} disponible(s){owned.reservedQuantity > 0 && <span className="text-amber-300"> · {owned.reservedQuantity} réservé(s)</span>}</p>
    </div>
    <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); if (valid && value !== owned.quantity) onUpdate(value); }}>
      <label className="text-xs text-smoke">Quantité totale
        <input aria-label={`Quantité totale : ${owned.itemName}`} required type="number" step={1} min={owned.reservedQuantity} max={max} value={quantity} onChange={e => setQuantity(e.target.value)} disabled={pending} className={`${fieldClass} mt-1 !w-24`} />
      </label>
      <button type="submit" disabled={pending || !valid || value === owned.quantity} className="hnk-btn-ghost !px-3 !py-2 !text-[10px]">Enregistrer</button>
      <button type="button" disabled={pending || available <= 0} onClick={() => onUpdate(owned.reservedQuantity)} className="hnk-btn-ghost !px-3 !py-2 !text-[10px] !text-red-300">
        {owned.reservedQuantity > 0 ? "Retirer les disponibles" : "Supprimer"}
      </button>
    </form>
  </div>;
}

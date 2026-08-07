"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SHOP_CATEGORIES, categoryLabel, type ShopCategory, type ShopItem } from "@/lib/shop";

export interface AdminShopItemView extends ShopItem {
  id: string;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY = {
  itemKey: "",
  name: "",
  category: "OUTILS_SHINOBI" as ShopCategory,
  costXp: 100,
  stock: "UNLIMITED" as ShopItem["stock"],
  kanji: "具",
  resource: "",
  rankHint: "",
  description: "",
  effect: "",
  isActive: true,
  sortOrder: 0,
};

function normalizeEditableCategory(category: string): ShopCategory {
  return (SHOP_CATEGORIES as readonly string[]).includes(category) ? (category as ShopCategory) : "SERVICES";
}

export default function AdminShopItems({ items }: { items: AdminShopItemView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  function edit(item: AdminShopItemView) {
    setSelectedId(item.id);
    setForm({
      itemKey: item.key,
      name: item.name,
      category: normalizeEditableCategory(item.category),
      costXp: item.costXp,
      stock: item.stock,
      kanji: item.kanji,
      resource: item.resource ?? "",
      rankHint: item.rankHint ?? "",
      description: item.description,
      effect: item.effect,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setMsg(`Édition de ${item.name}.`);
  }

  function reset() {
    setSelectedId(null);
    setForm(EMPTY);
    setMsg(null);
  }

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await fetch(selectedId ? `/api/admin/shop-items/${selectedId}` : "/api/admin/shop-items", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(json.error === "KEY_TAKEN" ? "Cette clé existe déjà." : "Enregistrement impossible.");
        return;
      }
      reset();
      setMsg("Catalogue boutique mis à jour.");
      router.refresh();
    });
  }

  function remove(item: AdminShopItemView) {
    if (!confirm(`Supprimer ${item.name} du catalogue ?`)) return;
    start(async () => {
      const res = await fetch(`/api/admin/shop-items/${item.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg("Suppression impossible.");
        return;
      }
      if (selectedId === item.id) reset();
      setMsg("Objet supprimé.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="hnk-panel" data-kanji="商">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="hnk-eyebrow">Catalogue boutique</p>
            <h2 className="hnk-serif text-2xl mt-2">{selected ? "Modifier un objet" : "Ajouter un objet"}</h2>
          </div>
          {selected && (
            <button type="button" className="hnk-btn-ghost !py-2 !px-4 !text-[10px]" onClick={reset}>
              Nouveau
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <Label text="Clé stable">
            <input className="hnk-input" value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })} placeholder="ex: kunai-special" />
          </Label>
          <Label text="Nom">
            <input className="hnk-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Label>
          <Label text="Catégorie">
            <select className="hnk-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ShopCategory })}>
              {SHOP_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </Label>
          <Label text="Coût XP">
            <input className="hnk-input" type="number" min={0} value={form.costXp} onChange={(e) => setForm({ ...form, costXp: Number(e.target.value) })} />
          </Label>
          <Label text="Stock">
            <select className="hnk-input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value as ShopItem["stock"] })}>
              <option value="UNLIMITED">Normal</option>
              <option value="UNIQUE">Unique</option>
            </select>
          </Label>
          <Label text="Kanji">
            <input className="hnk-input" value={form.kanji} onChange={(e) => setForm({ ...form, kanji: e.target.value })} />
          </Label>
          <Label text="Ressource">
            <input className="hnk-input" value={form.resource} onChange={(e) => setForm({ ...form, resource: e.target.value })} />
          </Label>
          <Label text="Ordre">
            <input className="hnk-input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </Label>
          <Label text="Indice rang">
            <input className="hnk-input" value={form.rankHint} onChange={(e) => setForm({ ...form, rankHint: e.target.value })} />
          </Label>
          <label className="flex items-center gap-3 border border-white/10 px-3 py-3 bg-black/20">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            <span className="hnk-eyebrow">Actif en boutique</span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <Label text="Description">
            <textarea className="hnk-input min-h-[120px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Label>
          <Label text="Effet">
            <textarea className="hnk-input min-h-[120px]" value={form.effect} onChange={(e) => setForm({ ...form, effect: e.target.value })} />
          </Label>
        </div>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button type="button" className="hnk-btn" disabled={pending} onClick={submit}>
            {pending ? "..." : selected ? "Modifier" : "Ajouter"}
          </button>
          {msg && <p className="text-sm text-bone">{msg}</p>}
        </div>
      </section>

      <section>
        <h2 className="hnk-section-title">Objets configures</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((item) => (
            <article key={item.id} className={`hnk-panel ${item.stock === "UNIQUE" ? "hnk-shop-unique" : ""}`} data-kanji={item.kanji}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="hnk-eyebrow">{categoryLabel(item.category)} · {item.isActive ? "Actif" : "Masque"}</p>
                  <h3 className="font-display uppercase tracking-wider text-xl text-white mt-2">{item.name}</h3>
                </div>
                <span className="hnk-chip">{item.costXp} XP</span>
              </div>
              <p className="text-xs text-smoke mt-3">{item.key}</p>
              <p className="text-sm text-bone/75 mt-3 leading-relaxed">{item.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="hnk-chip">{item.stock === "UNIQUE" ? "Unique" : "Normal"}</span>
                <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={() => edit(item)}>
                  Modifier
                </button>
                <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" disabled={pending} onClick={() => remove(item)}>
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="hnk-label">{text}</span>
      {children}
    </label>
  );
}

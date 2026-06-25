"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface KekkeiCatalogEntry {
  id: string;
  name: string;
  color: string;
}

export default function KekkeiCatalogAdmin({ kg }: { kg: KekkeiCatalogEntry[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [v, setV] = useState({ name: "", color: "#ff8a4c" });
  const selected = kg.find((entry) => entry.id === selectedId) ?? null;

  function beginEdit(entry: KekkeiCatalogEntry) {
    setSelectedId(entry.id);
    setV({ name: entry.name, color: entry.color });
    setMsg(`Édition de ${entry.name}.`);
  }

  function resetForm() {
    setSelectedId(null);
    setV({ name: "", color: "#ff8a4c" });
    setMsg(null);
  }

  function submit() {
    if (v.name.trim().length < 2) {
      setMsg("Nom requis.");
      return;
    }

    start(async () => {
      const res = await fetch(selectedId ? `/api/admin/kekkei/${selectedId}` : "/api/admin/kekkei", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v.name.trim(), color: v.color }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(json.error === "NAME_TAKEN" ? "Un KG porte déjà ce nom." : "Impossible d'enregistrer le KG.");
        return;
      }
      resetForm();
      setMsg("Catalogue mis à jour.");
      router.refresh();
    });
  }

  function remove(entry: KekkeiCatalogEntry) {
    if (!confirm(`Supprimer le KG « ${entry.name} » ?`)) return;
    start(async () => {
      const res = await fetch(`/api/admin/kekkei/${entry.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg("Suppression impossible.");
        return;
      }
      if (selectedId === entry.id) resetForm();
      setMsg("KG supprimé.");
      router.refresh();
    });
  }

  return (
    <section className="border border-ember/20 bg-ink-700 p-4 space-y-4">
      <div>
        <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember">Catalogue KG</h3>
        <p className="text-xs text-smoke mt-1">Crée un Kekkei Genkai avec son nom et sa couleur.</p>
      </div>

      <div className="grid sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
        <label className="block">
          <span className="block text-[10px] uppercase text-smoke mb-1">Nom</span>
          <input
            type="text"
            value={v.name}
            onChange={(e) => {
              setV((s) => ({ ...s, name: e.target.value }));
              setMsg(null);
            }}
            className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
          />
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase text-smoke mb-1">Couleur</span>
          <input
            type="color"
            value={v.color}
            onChange={(e) => {
              setV((s) => ({ ...s, color: e.target.value }));
              setMsg(null);
            }}
            className="h-10 w-full bg-ink-900 border border-white/10 px-2 py-1"
          />
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {pending ? "…" : selected ? "Modifier" : "Ajouter"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center h-9 px-4 border text-xs uppercase tracking-[0.2em]"
          style={{ color: v.color, borderColor: `${v.color}88`, backgroundColor: `${v.color}14` }}
        >
          {v.name.trim() || "Aperçu"}
        </span>
        {selected && (
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 border border-white/10 text-xs uppercase tracking-[0.2em] text-smoke hover:text-bone"
          >
            Réinitialiser
          </button>
        )}
        {msg && <span className="text-xs text-bone">{msg}</span>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {kg.map((entry) => (
          <div
            key={entry.id}
            className="border border-white/10 bg-ink-900/60 p-3 flex items-center justify-between gap-2"
            style={{ borderColor: `${entry.color}55` }}
          >
            <button type="button" onClick={() => beginEdit(entry)} className="text-left min-w-0">
              <p className="font-medium truncate" style={{ color: entry.color }}>
                {entry.name}
              </p>
            </button>
            <button
              type="button"
              onClick={() => remove(entry)}
              disabled={pending}
              className="text-[10px] uppercase tracking-[0.18em] text-red-300 hover:text-red-200 disabled:opacity-50"
            >
              Suppr.
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

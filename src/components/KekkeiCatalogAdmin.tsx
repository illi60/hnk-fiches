"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["CLANIQUE", "ELEMENTAIRE", "DOJUTSU", "SPECIAL"] as const;

export interface KekkeiCatalogEntry {
  id: string;
  name: string;
  subtitle?: string | null;
  clan?: string | null;
  color?: string;
  category?: string;
  quintessence?: string | null;
  kinjutsu?: string | null;
  finale?: string | null;
}

export default function KekkeiCatalogAdmin({ kg }: { kg: KekkeiCatalogEntry[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [v, setV] = useState({
    name: "",
    subtitle: "",
    clan: "",
    color: "#ff8a4c",
    category: "SPECIAL",
    quintessence: "",
    kinjutsu: "",
    finale: "",
  });
  const selected = kg.find((k) => k.id === selectedId) ?? null;

  function update<K extends keyof typeof v>(key: K, value: string) {
    setV((s) => ({ ...s, [key]: value }));
    setMsg(null);
  }

  function beginEdit(entry: KekkeiCatalogEntry) {
    setSelectedId(entry.id);
    setV({
      name: entry.name,
      subtitle: entry.subtitle ?? "",
      clan: entry.clan ?? "",
      color: entry.color ?? "#ff8a4c",
      category: entry.category ?? "SPECIAL",
      quintessence: entry.quintessence ?? "",
      kinjutsu: entry.kinjutsu ?? "",
      finale: entry.finale ?? "",
    });
    setMsg(`Édition de ${entry.name}.`);
  }

  function resetForm() {
    setSelectedId(null);
    setV({
      name: "",
      subtitle: "",
      clan: "",
      color: "#ff8a4c",
      category: "SPECIAL",
      quintessence: "",
      kinjutsu: "",
      finale: "",
    });
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
        body: JSON.stringify({
          name: v.name.trim(),
          subtitle: v.subtitle.trim() || null,
          clan: v.clan.trim() || null,
          color: v.color,
          category: v.category,
          quintessence: v.quintessence.trim() || null,
          kinjutsu: v.kinjutsu.trim() || null,
          finale: v.finale.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(
          json.error === "NAME_TAKEN"
            ? "Un KG porte déjà ce nom."
            : "Impossible d'enregistrer le KG."
        );
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
      const res = await fetch(`/api/admin/kekkei/${entry.id}`, {
        method: "DELETE",
      });
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
        <p className="text-xs text-smoke mt-1">
          Crée ou remplace un Kekkei Genkai disponible partout dans l'application.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Inp label="Nom" v={v.name} on={(x) => update("name", x)} />
        <Inp label="Sous-titre" v={v.subtitle} on={(x) => update("subtitle", x)} />
        <Inp label="Clan lié" v={v.clan} on={(x) => update("clan", x)} />
        <Sel label="Catégorie" v={v.category} on={(x) => update("category", x)} options={[...CATEGORIES]} />
        <label className="block">
          <span className="block text-[10px] uppercase text-smoke mb-1">Couleur</span>
          <input
            type="color"
            value={v.color}
            onChange={(e) => update("color", e.target.value)}
            className="h-10 w-full bg-ink-900 border border-white/10 px-2 py-1"
          />
        </label>
        <div className="flex items-end">
          <span
            className="inline-flex items-center justify-center h-10 w-full border border-white/10 text-xs uppercase tracking-[0.2em]"
            style={{ color: v.color, borderColor: `${v.color}88`, backgroundColor: `${v.color}14` }}
          >
            Aperçu
          </span>
        </div>
        <Inp label="Quintessence" v={v.quintessence} on={(x) => update("quintessence", x)} />
        <Inp label="Kinjutsu" v={v.kinjutsu} on={(x) => update("kinjutsu", x)} />
        <Inp label="Forme finale" v={v.finale} on={(x) => update("finale", x)} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        {msg && <span className="text-xs text-bone">{msg}</span>}
        {selected && (
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 border border-white/10 text-xs uppercase tracking-[0.2em] text-smoke hover:text-bone"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {kg.length > 0 && (
        <div className="border-t border-white/5 pt-4">
          <p className="text-[10px] tracking-[0.22em] uppercase text-smoke mb-3">
            KG présents ({kg.length})
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {kg.map((entry) => (
              <div
                key={entry.id}
                className="border border-white/10 bg-ink-900/60 p-3 flex items-start justify-between gap-2"
                style={{ borderColor: `${entry.color ?? "#ff8a4c"}55` }}
              >
                <button
                  type="button"
                  onClick={() => beginEdit(entry)}
                  className="text-left min-w-0"
                >
                  <p
                    className="font-medium truncate"
                    style={{ color: entry.color ?? "#ff8a4c" }}
                  >
                    {entry.name}
                  </p>
                  <p className="text-[10px] text-smoke uppercase tracking-[0.18em]">
                    {entry.category ?? "SPECIAL"}{entry.clan ? ` · ${entry.clan}` : ""}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => remove(entry)}
                  className="text-[10px] uppercase tracking-[0.18em] text-red-300 hover:text-red-200"
                >
                  Suppr.
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Inp({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase text-smoke mb-1">{label}</span>
      <input
        type="text"
        value={v}
        onChange={(e) => on(e.target.value)}
        className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
      />
    </label>
  );
}

function Sel({
  label,
  v,
  on,
  options,
}: {
  label: string;
  v: string;
  on: (x: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase text-smoke mb-1">{label}</span>
      <select
        value={v}
        onChange={(e) => on(e.target.value)}
        className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

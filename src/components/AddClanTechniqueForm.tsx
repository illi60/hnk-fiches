"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ART_OPTIONS, ACTION_TYPES, ELEMENTS } from "@/lib/techniques";
import { KG_NAMES } from "@/lib/kekkei";

export default function AddClanTechniqueForm({ clans }: { clans: string[] }) {
  const router = useRouter();
  const [v, setV] = useState({
    clan: clans[0] ?? "",
    nom: "",
    description: "",
    art: "",
    actionType: "",
    element: "",
    kekkeiGenkai: "",
    coutXp: "0",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function up<K extends keyof typeof v>(k: K, val: string) {
    setV((s) => ({ ...s, [k]: val }));
    setMsg(null);
  }

  function submit() {
    if (!v.clan.trim()) return setMsg("Choisis un clan.");
    if (v.nom.trim().length < 2) return setMsg("Nom requis.");
    if (v.description.trim().length < 1) return setMsg("Description requise.");
    if (!v.kekkeiGenkai) return setMsg("Kekkei Genkai associé requis.");
    const payload = {
      clan: v.clan.trim(),
      nom: v.nom.trim(),
      description: v.description.trim(),
      art: v.art || null,
      actionType: v.actionType || null,
      element: v.element || null,
      kekkeiGenkai: v.kekkeiGenkai,
      coutXp: parseInt(v.coutXp, 10) || 0,
    };
    start(async () => {
      const res = await fetch("/api/admin/clan-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setMsg("Erreur lors de l'ajout.");
        return;
      }
      setV((s) => ({ ...s, nom: "", description: "", element: "", kekkeiGenkai: "" }));
      setMsg("Technique ajoutée à la bibliothèque.");
      router.refresh();
    });
  }

  return (
    <section className="border border-ember/20 bg-ink-700 p-4">
      <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember mb-3">
        Ajouter à une bibliothèque de clan
      </h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase text-smoke mb-1">Clan</span>
          <input
            list="clan-list"
            value={v.clan}
            onChange={(e) => up("clan", e.target.value)}
            className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
          />
          <datalist id="clan-list">
            {clans.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <Inp label="Nom" v={v.nom} on={(x) => up("nom", x)} />
        <Sel
          label="Kekkei Genkai associé"
          v={v.kekkeiGenkai}
          on={(x) => up("kekkeiGenkai", x)}
          options={KG_NAMES}
        />
        <Sel label="Art" v={v.art} on={(x) => up("art", x)} options={[...ART_OPTIONS]} />
        <Sel
          label="Type d'action"
          v={v.actionType}
          on={(x) => up("actionType", x)}
          options={ACTION_TYPES.map((a) => a.key)}
        />
        <Sel label="Élément" v={v.element} on={(x) => up("element", x)} options={[...ELEMENTS]} />
        <Inp label="Coût XP (info)" v={v.coutXp} on={(x) => up("coutXp", x)} />
      </div>
      <label className="block mt-3">
        <span className="block text-[10px] uppercase text-smoke mb-1">Description</span>
        <textarea
          value={v.description}
          onChange={(e) => up("description", e.target.value)}
          rows={4}
          className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
        />
      </label>
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={submit}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {pending ? "…" : "Ajouter"}
        </button>
        {msg && <span className="text-xs text-bone">{msg}</span>}
      </div>
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
  options: string[];
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase text-smoke mb-1">{label}</span>
      <select
        value={v}
        onChange={(e) => on(e.target.value)}
        className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ELEMENTS } from "@/lib/techniques";

export interface ClanLibraryPermissionRow {
  id: string;
  clan: string;
  kind: string;
  value: string;
}

export default function ClanLibraryAccessAdmin({
  clans,
  kgNames,
  permissions,
}: {
  clans: string[];
  kgNames: string[];
  permissions: ClanLibraryPermissionRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [clan, setClan] = useState(clans[0] ?? "");
  const [kind, setKind] = useState<"KG" | "AFFINITY">("KG");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const options = kind === "KG" ? kgNames : [...ELEMENTS];

  function add() {
    if (!clan.trim() || !value.trim()) {
      setMsg("Choisis un clan et une valeur.");
      return;
    }

    start(async () => {
      const res = await fetch("/api/admin/clan-library/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clan: clan.trim(), kind, value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg("Ajout impossible.");
        return;
      }
      setValue("");
      setMsg("Autorisation ajoutée.");
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await fetch(`/api/admin/clan-library/permissions/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg("Suppression impossible.");
        return;
      }
      setMsg("Autorisation retirée.");
      router.refresh();
    });
  }

  return (
    <section className="border border-ember/20 bg-ink-700 p-4 space-y-4">
      <div>
        <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember">
          Accès des bibliothèques de clan
        </h3>
        <p className="text-xs text-smoke mt-1">
          Ajoute les KG et affinités qui pourront être proposés en techniques collectives.
        </p>
      </div>

      <div className="grid sm:grid-cols-[1fr_160px_1fr_auto] gap-3 items-end">
        <label className="block">
          <span className="block text-[10px] uppercase text-smoke mb-1">Clan</span>
          <input
            list="clan-access-list"
            value={clan}
            onChange={(e) => {
              setClan(e.target.value);
              setMsg(null);
            }}
            className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
          />
          <datalist id="clan-access-list">
            {clans.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase text-smoke mb-1">Type</span>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as "KG" | "AFFINITY");
              setValue("");
              setMsg(null);
            }}
            className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
          >
            <option value="KG">KG</option>
            <option value="AFFINITY">Affinité</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase text-smoke mb-1">
            {kind === "KG" ? "Kekkei Genkai" : "Affinité"}
          </span>
          <select
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setMsg(null);
            }}
            className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
          >
            <option value="">—</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      {msg && <p className="text-xs text-bone">{msg}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {permissions.map((permission) => (
          <div key={permission.id} className="border border-white/10 bg-ink-900/60 p-3 flex justify-between gap-3">
            <div>
              <p className="text-bone text-sm">{permission.clan}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-smoke">
                {permission.kind === "KG" ? "KG" : "Affinité"} · {permission.value}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(permission.id)}
              disabled={pending}
              className="text-[10px] uppercase tracking-[0.18em] text-red-300 hover:text-red-200 disabled:opacity-50"
            >
              Retirer
            </button>
          </div>
        ))}
        {permissions.length === 0 && (
          <p className="text-sm text-smoke italic">Aucune autorisation additionnelle.</p>
        )}
      </div>
    </section>
  );
}

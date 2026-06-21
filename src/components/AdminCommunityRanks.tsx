"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const RANKS = ["E", "D", "C", "B", "A", "S"] as const;

export interface ScopeRow {
  type: "VILLAGE" | "CLAN";
  key: string;
  label: string;
  base: string;
  derived: string;
  effective: string;
}

function rankClass(r: string) {
  return /^[EDCBAS]$/.test(r) ? `rk-${r.toLowerCase()}` : "";
}

export default function AdminCommunityRanks({ scopes }: { scopes: ScopeRow[] }) {
  return (
    <section>
      <h2 className="font-serif text-xl text-white2 mb-1">Rangs communautaires (base)</h2>
      <p className="text-xs text-smoke mb-3">
        Pose le rang « de base » du village et des clans. Le rang effectif affiché aux joueurs ={" "}
        <span className="text-bone">max(base, dérivé des conditions remplies)</span>.
      </p>
      <ul className="space-y-2">
        {scopes.map((s) => (
          <RankRow key={`${s.type}:${s.key}`} scope={s} />
        ))}
      </ul>

      <NewClanRank />
    </section>
  );
}

// Pose le rang d'un clan par son nom — utile pour un clan sans membre encore
// rattaché (il n'apparaîtrait pas dans la liste dérivée des joueurs).
function NewClanRank() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [base, setBase] = useState("E");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    if (!name.trim()) {
      setErr("Nom de clan requis.");
      return;
    }
    start(async () => {
      const r = await fetch("/api/admin/progression/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeType: "CLAN", scopeKey: name.trim(), baseRank: base }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr("Erreur");
        return;
      }
      setName("");
      setBase("E");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border border-dashed border-white/10 px-4 py-2.5">
      <span className="text-[10px] uppercase text-smoke">Autre clan</span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du clan"
        className="bg-ink-800 border border-white/10 px-2 py-1 text-bone text-sm flex-1 min-w-[120px]"
      />
      <select
        value={base}
        onChange={(e) => setBase(e.target.value)}
        className="bg-ink-800 border border-white/10 px-2 py-1 text-bone text-sm"
      >
        {RANKS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={pending || !name.trim()}
        className="px-3 py-1.5 bg-ember/20 border border-ember/40 text-ember text-xs tracking-[0.2em] uppercase font-bold hover:bg-ember/30 disabled:opacity-40"
      >
        {pending ? "…" : "Poser"}
      </button>
      {err && <span className="text-xs text-ember-hot">{err}</span>}
    </div>
  );
}

function RankRow({ scope }: { scope: ScopeRow }) {
  const router = useRouter();
  const [base, setBase] = useState(scope.base);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const r = await fetch("/api/admin/progression/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeType: scope.type, scopeKey: scope.key, baseRank: base }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr("Erreur");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 border border-white/5 bg-ink-700 px-4 py-2.5">
      <span className="text-sm text-bone flex-1 min-w-[140px]">{scope.label}</span>

      <span className="text-[10px] text-smoke">
        Dérivé{" "}
        <span className={`font-bold ${rankClass(scope.derived)}`}>{scope.derived}</span>
        {" · "}Effectif{" "}
        <span className={`font-bold ${rankClass(scope.effective)}`}>{scope.effective}</span>
      </span>

      <label className="flex items-center gap-2 text-[10px] uppercase text-smoke">
        Base
        <select
          value={base}
          onChange={(e) => {
            setBase(e.target.value);
            setSaved(false);
          }}
          className="bg-ink-800 border border-white/10 px-2 py-1 text-bone text-sm"
        >
          {RANKS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={save}
        disabled={pending || base === scope.base}
        className="px-3 py-1.5 bg-ember/20 border border-ember/40 text-ember text-xs tracking-[0.2em] uppercase font-bold hover:bg-ember/30 disabled:opacity-40"
      >
        {pending ? "…" : saved ? "✓" : "Poser"}
      </button>
      {err && <span className="text-xs text-ember-hot">{err}</span>}
    </li>
  );
}

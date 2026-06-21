"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface ManagedCond {
  condId: string;
  label: string;
  rank: string;
  validated: boolean;
}

// Conditions communautaires « gérées par le staff » (ex : « Atteindre N réponses
// RP postées ») : le staff les valide/dévalide directement, sans soumission.
export default function AdminManagedConditions({
  scopeType,
  scopeKey,
  scopeLabel,
  conditions,
}: {
  scopeType: "VILLAGE" | "CLAN";
  scopeKey: string;
  scopeLabel: string;
  conditions: ManagedCond[];
}) {
  if (conditions.length === 0) return null;
  return (
    <section>
      <h2 className="font-serif text-xl text-white2 mb-1">Conditions validées par le staff</h2>
      <p className="text-xs text-smoke mb-3">
        {scopeLabel} — cumuls globaux à cocher à la main (aucune soumission membre).
      </p>
      <ul className="space-y-2">
        {conditions.map((c) => (
          <Row key={c.condId} scopeType={scopeType} scopeKey={scopeKey} cond={c} />
        ))}
      </ul>
    </section>
  );
}

function Row({
  scopeType,
  scopeKey,
  cond,
}: {
  scopeType: "VILLAGE" | "CLAN";
  scopeKey: string;
  cond: ManagedCond;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function toggle() {
    setErr(null);
    start(async () => {
      const r = await fetch("/api/admin/progression/condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeType, scopeKey, condId: cond.condId, validated: !cond.validated }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr("Erreur");
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 border border-white/5 bg-ink-700 px-4 py-2.5">
      <span className={`text-[10px] uppercase ${cond.validated ? "text-emerald-400" : "text-smoke"}`}>
        {cond.validated ? "✓ Validée" : "○ À valider"}
      </span>
      <span className="text-sm text-bone flex-1 min-w-[180px]">
        <span className="text-smoke">Rang {cond.rank} · </span>
        {cond.label}
      </span>
      <button
        onClick={toggle}
        disabled={pending}
        className={`px-3 py-1.5 text-xs tracking-[0.2em] uppercase font-bold border disabled:opacity-40 ${
          cond.validated
            ? "bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25"
            : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
        }`}
      >
        {pending ? "…" : cond.validated ? "Annuler" : "Valider"}
      </button>
      {err && <span className="text-xs text-ember-hot">{err}</span>}
    </li>
  );
}

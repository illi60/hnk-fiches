"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface AdminCondRow {
  condId: string;
  label: string;
  rank: string;
  track: "VILLAGE" | "CLAN" | "HISTOIRE";
  mode: "count" | "oneshot" | "xp_pool" | "xp_self" | "member_count";
  target: number;
  current: number;
  met: boolean;
}

type Target =
  | { kind: "USER"; userId: string }
  | { kind: "COMMUNITY"; scopeType: "VILLAGE" | "CLAN"; scopeKey: string };

export default function AdminConditionControls({
  title,
  subtitle,
  target,
  conditions,
  empty = "Aucune condition a afficher.",
}: {
  title?: string;
  subtitle?: string;
  target: Target;
  conditions: AdminCondRow[];
  empty?: string;
}) {
  if (conditions.length === 0) return <p className="text-xs text-smoke italic">{empty}</p>;

  return (
    <div className="space-y-2">
      {(title || subtitle) && (
        <div>
          {title && <h3 className="font-serif text-lg text-white2">{title}</h3>}
          {subtitle && <p className="text-xs text-smoke">{subtitle}</p>}
        </div>
      )}
      <ul className="space-y-1.5">
        {conditions.map((c) => (
          <ConditionRow key={c.condId} target={target} cond={c} />
        ))}
      </ul>
    </div>
  );
}

function ConditionRow({ target, cond }: { target: Target; cond: AdminCondRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const binary = cond.mode === "oneshot" || cond.target <= 1;
  const auto = cond.mode === "xp_pool" || cond.mode === "xp_self" || cond.mode === "member_count";
  const unit = cond.mode === "xp_pool" || cond.mode === "xp_self" ? " XP" : "";

  function send(operation: "ADD" | "REMOVE" | "SET_VALIDATED" | "SET_UNVALIDATED") {
    setErr(null);
    start(async () => {
      const r = await fetch("/api/admin/progression/condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, condId: cond.condId, operation }),
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
    <li className="flex flex-wrap items-center gap-2 bg-ink-900 border border-white/5 px-3 py-2 text-xs">
      <span className={`shrink-0 text-[10px] font-bold ${cond.met ? "text-emerald-400" : "text-smoke"}`}>
        {cond.met ? "OK" : "--"}
      </span>
      <span className="shrink-0 text-[10px] text-smoke uppercase">R{cond.rank}</span>
      <span className="flex-1 min-w-[220px] text-bone/90 leading-relaxed">
        {cond.label}
        {auto && <span className="ml-2 text-[9px] uppercase tracking-wider text-smoke">auto</span>}
      </span>
      <span className="shrink-0 text-[10px] tabular-nums text-smoke">
        {binary ? (cond.met ? "1/1" : "0/1") : `${cond.current}/${cond.target}${unit}`}
      </span>
      {binary ? (
        cond.met ? (
          <button
            onClick={() => send("SET_UNVALIDATED")}
            disabled={pending}
            className="px-2.5 py-1 border border-red-500/40 text-red-300 text-[10px] tracking-wider uppercase font-bold hover:bg-red-500/15 disabled:opacity-40"
          >
            {pending ? "..." : "Annuler"}
          </button>
        ) : (
          <button
            onClick={() => send("SET_VALIDATED")}
            disabled={pending}
            className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] tracking-wider uppercase font-bold hover:bg-emerald-500/25 disabled:opacity-40"
          >
            {pending ? "..." : "Valider"}
          </button>
        )
      ) : (
        <span className="shrink-0 flex items-center gap-1">
          <button
            onClick={() => send("REMOVE")}
            disabled={pending || cond.current <= 0}
            className="w-7 h-7 border border-red-500/40 text-red-300 text-sm font-bold hover:bg-red-500/15 disabled:opacity-35"
            title="Retirer une validation"
          >
            -
          </button>
          <button
            onClick={() => send("ADD")}
            disabled={pending || cond.current >= cond.target}
            className="w-7 h-7 border border-emerald-500/40 text-emerald-300 text-sm font-bold hover:bg-emerald-500/15 disabled:opacity-35"
            title="Ajouter une validation"
          >
            +
          </button>
        </span>
      )}
      {err && <span className="w-full text-[10px] text-ember-hot">{err}</span>}
    </li>
  );
}

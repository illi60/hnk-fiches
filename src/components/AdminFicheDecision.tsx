"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AdminFicheDecision({
  ficheId,
  defaultCost,
}: {
  ficheId: string;
  defaultCost: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "validate" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [costOverride, setCostOverride] = useState<string>(String(defaultCost));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function commit(decision: "VALIDATE" | "REJECT") {
    setError(null);
    const body: {
      decision: "VALIDATE" | "REJECT";
      reason?: string;
      costOverride?: number;
    } = { decision };
    if (decision === "REJECT") {
      if (reason.trim().length < 3) {
        setError("Motif requis (3 caractères mini).");
        return;
      }
      body.reason = reason.trim();
    } else {
      const n = parseInt(costOverride, 10);
      if (Number.isFinite(n) && n >= 0) body.costOverride = n;
    }

    start(async () => {
      const res = await fetch(`/api/admin/fiches/${ficheId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(
          j.error === "INSUFFICIENT_XP"
            ? "Le joueur n'a pas assez d'XP."
            : j.error === "CONFLICT"
            ? "Conflit, recharge la page."
            : j.error === "INVALID_STATE"
            ? "État invalide (déjà décidée ?)."
            : "Erreur."
        );
        return;
      }
      setMode("idle");
      router.refresh();
    });
  }

  if (mode === "idle") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setMode("validate")}
          className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs tracking-[0.2em] uppercase font-bold hover:bg-emerald-500/30"
        >
          Valider
        </button>
        <button
          onClick={() => setMode("reject")}
          className="px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-300 text-xs tracking-[0.2em] uppercase font-bold hover:bg-red-500/30"
        >
          Refuser
        </button>
      </div>
    );
  }

  if (mode === "validate") {
    return (
      <div className="space-y-2 bg-ink-900 border border-ember/30 p-3">
        <label className="block">
          <span className="block text-[10px] uppercase text-smoke mb-1">
            Coût XP final (override)
          </span>
          <input
            type="number"
            value={costOverride}
            onChange={(e) => setCostOverride(e.target.value)}
            className="w-32 bg-ink-800 border border-white/10 px-3 py-1.5 text-bone tabular-nums text-sm"
          />
        </label>
        {error && <p className="text-xs text-ember-hot">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => commit("VALIDATE")}
            disabled={pending}
            className="px-3 py-1.5 bg-emerald-500 text-black text-xs tracking-[0.2em] uppercase font-bold disabled:opacity-50"
          >
            {pending ? "…" : "Confirmer"}
          </button>
          <button onClick={() => setMode("idle")} className="px-3 py-1.5 text-xs text-smoke">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 bg-ink-900 border border-red-500/30 p-3">
      <label className="block">
        <span className="block text-[10px] uppercase text-smoke mb-1">Motif du refus</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full bg-ink-800 border border-white/10 px-3 py-1.5 text-bone text-sm"
        />
      </label>
      {error && <p className="text-xs text-ember-hot">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => commit("REJECT")}
          disabled={pending}
          className="px-3 py-1.5 bg-red-500 text-black text-xs tracking-[0.2em] uppercase font-bold disabled:opacity-50"
        >
          {pending ? "…" : "Confirmer le refus"}
        </button>
        <button onClick={() => setMode("idle")} className="px-3 py-1.5 text-xs text-smoke">
          Annuler
        </button>
      </div>
    </div>
  );
}

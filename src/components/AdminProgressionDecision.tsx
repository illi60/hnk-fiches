"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AdminProgressionDecision({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function commit(decision: "VALIDATE" | "REJECT") {
    setError(null);
    const body: { decision: "VALIDATE" | "REJECT"; reason?: string } = { decision };
    if (decision === "REJECT") {
      if (reason.trim().length < 3) {
        setError("Motif requis (3 caractères mini).");
        return;
      }
      body.reason = reason.trim();
    }
    start(async () => {
      const res = await fetch(`/api/admin/progression/${submissionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(
          j.error === "INVALID_STATE"
            ? "État invalide (déjà décidée ?)."
            : j.error === "MOTIF_REQUIS"
            ? "Motif requis."
            : "Erreur."
        );
        return;
      }
      setMode("idle");
      router.refresh();
    });
  }

  if (mode === "reject") {
    return (
      <div className="space-y-2 bg-ink-900 border border-red-500/30 p-3 w-full">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Motif du refus"
          className="w-full bg-ink-800 border border-white/10 px-3 py-1.5 text-bone text-sm"
        />
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

  return (
    <div className="flex gap-2">
      <button
        onClick={() => commit("VALIDATE")}
        disabled={pending}
        className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs tracking-[0.2em] uppercase font-bold hover:bg-emerald-500/30 disabled:opacity-50"
      >
        {pending ? "…" : "Valider"}
      </button>
      <button
        onClick={() => setMode("reject")}
        disabled={pending}
        className="px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-300 text-xs tracking-[0.2em] uppercase font-bold hover:bg-red-500/30 disabled:opacity-50"
      >
        Refuser
      </button>
      {error && <p className="text-xs text-ember-hot self-center">{error}</p>}
    </div>
  );
}

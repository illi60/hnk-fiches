"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { canDeleteFiche, canWithdrawFiche } from "@/lib/fiche-status";

export default function FicheActions({ ficheId, status }: { ficheId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function softDelete() {
    if (!confirm("Supprimer cette technique ?")) return;
    start(async () => {
      const res = await fetch(`/api/fiches/${ficheId}`, { method: "DELETE" });
      if (res.ok) router.push("/technique/fiches");
    });
  }

  function withdraw() {
    if (!confirm("Retirer cette technique de la validation ?")) return;
    start(async () => {
      const res = await fetch(`/api/fiches/${ficheId}/withdraw`, { method: "POST" });
      if (res.ok) router.refresh();
    });
  }

  const showWithdraw = canWithdrawFiche(status);
  const showDelete = canDeleteFiche(status);
  if (!showWithdraw && !showDelete) return null;

  return (
    <div className="flex gap-3">
      {showWithdraw ? (
        <button type="button" onClick={withdraw} disabled={pending} className="hnk-btn-ghost">
          {pending ? "…" : "Retirer de la validation"}
        </button>
      ) : showDelete ? (
        <button
          type="button"
          onClick={softDelete}
          disabled={pending}
          className="hnk-btn-ghost !text-red-400 !border-red-500/40"
        >
          Supprimer
        </button>
      ) : null}
    </div>
  );
}

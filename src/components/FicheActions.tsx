"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function FicheActions({ ficheId, status }: { ficheId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await fetch(`/api/fiches/${ficheId}/submit`, { method: "POST" });
      if (res.ok) router.refresh();
    });
  }

  function softDelete() {
    if (!confirm("Supprimer cette technique ?")) return;
    start(async () => {
      const res = await fetch(`/api/fiches/${ficheId}`, { method: "DELETE" });
      if (res.ok) router.push("/technique/fiches");
    });
  }

  // Actions joueur : seulement sur ses brouillons ou ses techniques refusées.
  if (status !== "DRAFT" && status !== "REJECTED") return null;

  return (
    <div className="flex gap-3">
      <button type="button" onClick={submit} disabled={pending} className="hnk-btn">
        {pending ? "…" : status === "REJECTED" ? "Renvoyer en validation" : "Soumettre au staff"}
      </button>
      <button
        type="button"
        onClick={softDelete}
        disabled={pending}
        className="hnk-btn-ghost !text-red-400 !border-red-500/40"
      >
        Supprimer
      </button>
    </div>
  );
}

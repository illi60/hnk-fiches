"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { nextReconquestItemKey } from "@/lib/shop";

export default function AdminReconquestProgress({ progress }: { progress: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const nextKey = nextReconquestItemKey(progress);
  const nextLabel = nextKey ? nextKey.replace("reconquete-contree-", "") : "max";

  function mutate(action: "decrement" | "reset") {
    const label = action === "reset" ? "remettre à zéro" : "baisser d'un palier";
    if (!confirm(`Confirmer : ${label} la progression globale des Reconquêtes de Contrée ?`)) return;
    setMsg(null);
    start(async () => {
      const res = await fetch("/api/admin/shop-reconquest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg("Modification impossible.");
        return;
      }
      setMsg(`Progression des Reconquêtes de Contrée ajustée : ${json.progress}.`);
      router.refresh();
    });
  }

  return (
    <section className="hnk-panel" data-kanji="旗">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="hnk-eyebrow">Reconquêtes globales</p>
          <h2 className="hnk-serif text-2xl mt-2">Paliers des Reconquêtes de Contrée</h2>
          <p className="text-sm text-smoke mt-3 max-w-2xl">
            Ce compteur pilote uniquement le prix des Reconquêtes de Contrée visible par tous les joueurs.
            Les actions ci-dessous n'effacent pas les objets déjà présents dans les inventaires.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="hnk-chip">Progression Reconquêtes de Contrée {progress}</span>
          <span className="hnk-chip">Prochain palier Reconquêtes de Contrée {nextLabel}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="hnk-btn-ghost !py-2 !px-4 !text-[10px]"
          disabled={pending || progress <= 0}
          onClick={() => mutate("decrement")}
        >
          Baisser d'un palier
        </button>
        <button
          type="button"
          className="hnk-btn-ghost !py-2 !px-4 !text-[10px]"
          disabled={pending || progress <= 0}
          onClick={() => mutate("reset")}
        >
          Remettre à zéro
        </button>
        {msg && <p className="text-sm text-bone">{msg}</p>}
      </div>
    </section>
  );
}

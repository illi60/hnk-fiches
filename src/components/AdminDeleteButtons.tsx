"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AdminDeleteFicheButton({ ficheId, ficheName }: { ficheId: string; ficheName: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  function del() {
    start(async () => {
      await fetch(`/api/admin/fiches/${ficheId}`, { method: "DELETE" });
      router.refresh();
    });
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-0.5 hover:bg-red-500/10"
        title={`Supprimer « ${ficheName} »`}
      >
        Supprimer
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <button
        onClick={del}
        disabled={pending}
        className="text-xs text-red-400 border border-red-500/50 px-2 py-0.5 bg-red-500/10 disabled:opacity-50"
      >
        {pending ? "…" : "Confirmer"}
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="text-xs text-smoke hover:text-bone"
      >
        Annuler
      </button>
    </span>
  );
}

export function AdminDeleteInvocationButton({ invocationId, invocationName }: { invocationId: string; invocationName: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  function del() {
    start(async () => {
      await fetch(`/api/admin/invocations/${invocationId}`, { method: "DELETE" });
      router.refresh();
    });
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-0.5 hover:bg-red-500/10"
        title={`Supprimer l'invocation « ${invocationName} »`}
      >
        Supprimer
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <button
        onClick={del}
        disabled={pending}
        className="text-xs text-red-400 border border-red-500/50 px-2 py-0.5 bg-red-500/10 disabled:opacity-50"
      >
        {pending ? "…" : "Confirmer"}
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="text-xs text-smoke hover:text-bone"
      >
        Annuler
      </button>
    </span>
  );
}

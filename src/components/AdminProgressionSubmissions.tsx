"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Une soumission listée côté admin (détail supprimable). Les conditions AUTO
// (XP / nb de personnages) n'en ont pas → elles n'apparaissent jamais ici.
export interface SubItem {
  id: string;
  track: "VILLAGE" | "CLAN" | "HISTOIRE";
  condId: string;
  label: string | null;
  targetRank: string;
  status: "PENDING" | "VALIDATED";
  rpTitle: string | null;
  rpUrl: string | null;
  collaborators?: string[];
  username: string | null;
  createdAt: string;
}

export async function fetchSubmissions(query: string): Promise<SubItem[]> {
  const r = await fetch(`/api/admin/progression/submissions?${query}`);
  const j = await r.json().catch(() => ({}));
  return j.ok ? (j.items as SubItem[]) : [];
}

// Liste de soumissions avec suppression unitaire. `onChanged` est appelé après
// une suppression réussie (le parent recharge sa liste).
export function SubmissionList({
  items,
  onChanged,
  showUser = false,
}: {
  items: SubItem[];
  onChanged: () => void;
  showUser?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-smoke italic px-1 py-2">
        Aucune condition validée ou en attente à supprimer.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {items.map((s) => (
        <SubRow key={s.id} sub={s} onChanged={onChanged} showUser={showUser} />
      ))}
    </ul>
  );
}

function SubRow({
  sub,
  onChanged,
  showUser,
}: {
  sub: SubItem;
  onChanged: () => void;
  showUser: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function del() {
    setErr(null);
    start(async () => {
      const r = await fetch(`/api/admin/progression/submissions/${sub.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr("Erreur");
        return;
      }
      setConfirming(false);
      onChanged();
      router.refresh();
    });
  }

  return (
    <li className="flex flex-wrap items-start gap-2 bg-ink-900 border border-white/5 px-3 py-2 text-xs">
      <span
        className={`shrink-0 mt-0.5 text-[10px] font-bold ${
          sub.status === "VALIDATED" ? "text-emerald-400" : "text-amber-300"
        }`}
        title={sub.status === "VALIDATED" ? "Validée" : "En attente"}
      >
        {sub.status === "VALIDATED" ? "✓" : "⏳"}
      </span>
      <span className="shrink-0 mt-0.5 text-[10px] text-smoke uppercase">R{sub.targetRank}</span>
      <span className="flex-1 min-w-[180px]">
        <span className="text-bone">
          {sub.label ?? <span className="text-ember-hot">Condition inconnue ({sub.condId})</span>}
        </span>
        {(sub.rpTitle || sub.rpUrl) && (
          <span className="block text-smoke mt-0.5">
            {sub.rpTitle && <span className="text-bone/80">{sub.rpTitle} </span>}
            {sub.rpUrl && (
              <a
                href={sub.rpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ember hover:underline break-all"
              >
                {sub.rpUrl}
              </a>
            )}
          </span>
        )}
        {sub.collaborators && sub.collaborators.length > 0 && (
          <span className="block text-smoke mt-0.5">
            Avec : <span className="text-bone/80">{sub.collaborators.join(", ")}</span>
          </span>
        )}
        {showUser && sub.username && <span className="block text-smoke mt-0.5">par {sub.username}</span>}
      </span>

      {confirming ? (
        <span className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={del}
            disabled={pending}
            className="px-2 py-1 bg-red-500 text-black text-[10px] tracking-wider uppercase font-bold disabled:opacity-50"
          >
            {pending ? "…" : "Confirmer"}
          </button>
          <button onClick={() => setConfirming(false)} className="text-[10px] text-smoke">
            Annuler
          </button>
        </span>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          disabled={pending}
          title="Supprimer cette soumission"
          className="shrink-0 px-2 py-1 border border-red-500/40 text-red-300 text-[10px] tracking-wider uppercase font-bold hover:bg-red-500/15 disabled:opacity-40"
        >
          Supprimer
        </button>
      )}
      {err && <span className="w-full text-[10px] text-ember-hot">{err}</span>}
    </li>
  );
}

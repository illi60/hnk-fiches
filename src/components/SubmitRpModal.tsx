"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { TrackView, CondView } from "./ProgressionBoard";

interface PickItem {
  condId: string;
  label: string;
  trackKey: "VILLAGE" | "CLAN" | "HISTOIRE";
  trackLabel: string;
  rank: string;
  tier: "Communautaire" | "Individuelle";
}

// Aplati la liste des conditions actuellement soumettables (sur toutes les voies).
function collectSubmittable(tracks: TrackView[]): PickItem[] {
  const out: PickItem[] = [];
  const push = (c: CondView, t: TrackView, rank: string, tier: PickItem["tier"]) => {
    if (c.submittable) out.push({ condId: c.id, label: c.label, trackKey: t.key, trackLabel: t.label, rank, tier });
  };
  for (const t of tracks) {
    if (!t.available) continue;
    for (const p of t.paliers) {
      for (const c of p.community ?? []) push(c, t, p.rank, "Communautaire");
      if (p.individual) {
        for (const c of p.individual.alternatives) push(c, t, p.rank, "Individuelle");
        for (const ex of p.individual.extras) for (const c of ex.choices) push(c, t, p.rank, "Individuelle");
      }
    }
  }
  return out;
}

function humanErr(e?: string): string {
  switch (e) {
    case "RP_DEJA_CONDITION":
      return "déjà soumis pour cette condition";
    case "RP_AUTRE_VOIE":
      return "déjà utilisé dans l'autre voie (Village ⊕ Clan)";
    case "DEJA_ATTEINT":
      return "palier déjà atteint";
    case "DEJA_SOUMISE":
      return "déjà en attente";
    case "DEJA_VALIDEE":
      return "déjà validée";
    case "VERROUILLE":
    case "COMMUNAUTE_REQUISE":
      return "condition verrouillée";
    default:
      return "refusée";
  }
}

export default function SubmitRpModal({ tracks, onClose }: { tracks: TrackView[]; onClose: () => void }) {
  const router = useRouter();
  const items = useMemo(() => collectSubmittable(tracks), [tracks]);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [comment, setComment] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [results, setResults] = useState<{ condId: string; ok: boolean; error?: string }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Regroupe par voie pour l'affichage.
  const groups = useMemo(() => {
    const m = new Map<string, { label: string; items: PickItem[] }>();
    for (const it of items) {
      const g = m.get(it.trackKey) ?? { label: it.trackLabel, items: [] };
      g.items.push(it);
      m.set(it.trackKey, g);
    }
    return Array.from(m.entries());
  }, [items]);

  const byId = useMemo(() => new Map(items.map((i) => [i.condId, i])), [items]);
  const selectedTracks = useMemo(
    () => new Set([...selected].map((id) => byId.get(id)?.trackKey).filter(Boolean)),
    [selected, byId]
  );
  const villageClanConflict = selectedTracks.has("VILLAGE") && selectedTracks.has("CLAN");

  function toggle(condId: string) {
    setResults(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(condId)) next.delete(condId);
      else next.add(condId);
      return next;
    });
  }

  const canSubmit = url.trim().length > 0 && selected.size > 0 && !villageClanConflict && !pending;

  function submit() {
    setErr(null);
    setResults(null);
    start(async () => {
      const r = await fetch("/api/me/progression/submit-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condIds: [...selected],
          rpTitle: title.trim() || undefined,
          rpUrl: url.trim(),
          comment: comment.trim() || undefined,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr(j.error === "RATE_LIMITED" ? "Trop de soumissions, patiente une minute." : "Erreur.");
        return;
      }
      setResults(j.results);
      router.refresh();
      // Retire de la sélection les conditions acceptées (laisse les refusées visibles).
      const okIds = new Set<string>((j.results as { condId: string; ok: boolean }[]).filter((x) => x.ok).map((x) => x.condId));
      setSelected((prev) => new Set([...prev].filter((id) => !okIds.has(id))));
      if (okIds.size === j.results.length) {
        // tout est passé → on peut fermer
        setTimeout(onClose, 600);
      }
    });
  }

  const resultById = new Map((results ?? []).map((r) => [r.condId, r]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="hnk-panel w-full max-w-2xl my-4"
        data-kanji="文"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="hnk-eyebrow">Soumettre un RP</p>
            <h2 className="hnk-serif text-2xl mt-1">Un lien, plusieurs conditions</h2>
          </div>
          <button onClick={onClose} className="text-smoke hover:text-bone text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <input
            className="hnk-input"
            placeholder="Titre du RP"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="hnk-input"
            placeholder="Lien du RP (https://…) — requis"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <textarea
            className="hnk-input"
            rows={2}
            placeholder="Commentaire pour le staff (facultatif)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <p className="hnk-eyebrow mb-2">Conditions débloquées par ce RP</p>

        {items.length === 0 ? (
          <p className="text-sm text-smoke">Aucune condition soumettable pour le moment.</p>
        ) : (
          <div className="space-y-4 max-h-[44vh] overflow-y-auto pr-1">
            {groups.map(([key, g]) => (
              <div key={key}>
                <p className="text-[11px] uppercase tracking-[0.2em] text-bone/70 mb-1.5">{g.label}</p>
                <ul className="space-y-1">
                  {g.items.map((it) => {
                    const res = resultById.get(it.condId);
                    return (
                      <li key={it.condId}>
                        <label className="flex items-start gap-2 text-xs cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-ember"
                            checked={selected.has(it.condId)}
                            onChange={() => toggle(it.condId)}
                          />
                          <span className="flex-1 text-bone/85 leading-relaxed">
                            <span className="text-smoke">
                              R{it.rank} · {it.tier} ·{" "}
                            </span>
                            {it.label}
                          </span>
                          {res && (
                            <span
                              className={`flex-none text-[10px] uppercase tracking-wider ${
                                res.ok ? "text-emerald-400" : "text-ember-hot"
                              }`}
                            >
                              {res.ok ? "✓ soumis" : humanErr(res.error)}
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {villageClanConflict && (
          <p className="text-[11px] text-ember-hot mt-3">
            Un même RP ne peut pas servir à la fois au Village et au Clan. Décoche l&apos;une des deux
            voies.
          </p>
        )}
        {err && <p className="text-sm text-ember-hot mt-3">{err}</p>}

        <div className="flex items-center gap-3 mt-5">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="hnk-btn disabled:opacity-40"
          >
            {pending ? "Envoi…" : `Soumettre (${selected.size})`}
          </button>
          <button type="button" onClick={onClose} className="hnk-btn-ghost">
            Fermer
          </button>
          {results && (
            <span className="text-xs text-smoke ml-auto">
              {results.filter((r) => r.ok).length} soumise(s) ·{" "}
              {results.filter((r) => !r.ok).length} refusée(s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

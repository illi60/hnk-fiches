"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import SubmitRpModal from "./SubmitRpModal";

// ---- View models (construits côté serveur dans /technique/progression) ----
export type CondMode = "count" | "oneshot" | "xp_pool" | "xp_self" | "member_count";
export type SubStatus = "PENDING" | "VALIDATED" | "REJECTED";

export interface SubView {
  id: string;
  title?: string;
  url?: string;
  comment?: string;
  collaborators?: string[];
  status: SubStatus;
  author?: string;
  mine: boolean;
  rejectionReason?: string;
  created: string;
}
export interface CondView {
  id: string;
  label: string;
  mode: CondMode;
  submissionMode: "SOLO" | "GROUP" | "MANUAL";
  target: number;
  current: number;
  met: boolean;
  auto: boolean; // xp_* : pas de soumission, jauge automatique
  adminManaged: boolean; // validée en direct par le staff (pas de soumission membre)
  myPending: number;
  submittable: boolean;
  lockReason?: "LOCKED" | "LOCKED_COMMUNITY";
  submissions: SubView[];
}
export interface ExtraView {
  id: string;
  label: string;
  required: boolean;
  choices: CondView[];
}
export interface IndividualView {
  xp: number;
  alternatives: CondView[];
  extras: ExtraView[];
  met: boolean;
}
export type PalierStatus = "DONE" | "ACTIVE" | "LOCKED" | "LOCKED_COMMUNITY";
export interface PalierView {
  rank: string;
  flavorCommunity?: string;
  flavorIndividual?: string;
  communityStatus?: "DONE" | "ACTIVE" | "LOCKED";
  individualStatus?: PalierStatus;
  community?: CondView[];
  communityComplete?: boolean;
  individual?: IndividualView;
  rewards: string[];
}
export interface TrackView {
  key: "VILLAGE" | "CLAN" | "HISTOIRE";
  label: string;
  kanji: string;
  scope: "VILLAGE" | "CLAN" | "PERSO";
  intro: string;
  xpAvailable: number;
  currentRank: string;
  communityRank?: string;
  scopeLabel?: string;
  available: boolean;
  unavailableReason?: string;
  paliers: PalierView[];
}

function rankClass(rang: string | null | undefined): string {
  const g = (rang ?? "").trim().toUpperCase();
  return /^[EDCBAS]$/.test(g) ? `rk-${g.toLowerCase()}` : "";
}

function humanErr(e?: string): string {
  switch (e) {
    case "DEJA_SOUMISE":
      return "Déjà soumise (en attente).";
    case "DEJA_VALIDEE":
      return "Déjà validée.";
    case "CLAN_REQUIS":
      return "Tu dois appartenir à un clan.";
    case "RATE_LIMITED":
      return "Trop de soumissions, patiente une minute.";
    case "VERROUILLE":
      return "Palier verrouillé.";
    case "COMMUNAUTE_REQUISE":
      return "Le rang communautaire doit d'abord être atteint.";
    case "DEJA_ATTEINT":
      return "Palier déjà atteint.";
    case "AUTO":
      return "Condition automatique (XP).";
    case "RP_REQUIS":
      return "Lien RP requis.";
    case "RP_DEJA_CONDITION":
      return "Ce RP a déjà été soumis pour cette condition.";
    case "RP_AUTRE_VOIE":
      return "Ce RP est déjà utilisé dans l'autre voie (Village ⊕ Clan).";
    case "COLLABORATEURS_REQUIS":
      return "Au moins un pseudo exact est requis.";
    case "COLLABORATEUR_INCONNU":
      return "Pseudo participant introuvable.";
    case "COLLABORATEURS_INTERDITS":
      return "Cette condition se soumet en solo.";
    case "SOLO_INTERDIT":
      return "Tu ne peux pas te renseigner toi-même.";
    case "INVALID_STATE":
      return "Action impossible dans cet état.";
    default:
      return "Action impossible.";
  }
}

export default function ProgressionBoard({ tracks }: { tracks: TrackView[] }) {
  const [tab, setTab] = useState<string>(tracks[0]?.key ?? "VILLAGE");
  const [rpOpen, setRpOpen] = useState(false);
  const active = tracks.find((t) => t.key === tab) ?? tracks[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {tracks.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 border text-[11px] uppercase tracking-[0.2em] font-bold transition ${
              tab === t.key
                ? "border-ember text-ember bg-[color-mix(in_srgb,#ff5722_12%,transparent)]"
                : "border-white/10 text-smoke hover:text-bone"
            }`}
          >
            <span className="font-jp mr-2">{t.kanji}</span>
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setRpOpen(true)}
          className="ml-auto hnk-btn !py-2.5 !px-5 !text-[11px]"
        >
          <span className="font-jp mr-2">文</span> Soumettre un RP
        </button>
      </div>

      {active && <TrackPanel track={active} />}

      {rpOpen && <SubmitRpModal tracks={tracks} onClose={() => setRpOpen(false)} />}
    </div>
  );
}

function TrackPanel({ track }: { track: TrackView }) {
  if (!track.available) {
    return (
      <div className="hnk-panel" data-kanji={track.kanji}>
        <p className="hnk-eyebrow">{track.label}</p>
        <p className="text-sm text-smoke mt-3">{track.unavailableReason}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="hnk-panel" data-kanji={track.kanji}>
        <p className="text-bone/80 text-sm leading-relaxed">{track.intro}</p>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <span className="hnk-eyebrow">Ton rang {track.label}</span>
          <span className={`hnk-chip ${rankClass(track.currentRank)}`}>{track.currentRank}</span>
          {track.scope !== "PERSO" && (
            <>
              <span className="hnk-eyebrow ml-2">
                Rang {track.scope === "VILLAGE" ? "du village" : "du clan"}
                {track.scopeLabel ? ` · ${track.scopeLabel}` : ""}
              </span>
              <span className={`hnk-chip ${rankClass(track.communityRank)}`}>
                {track.communityRank}
              </span>
            </>
          )}
        </div>
      </div>

      {track.paliers
        .filter((p) => p.rank !== "E" || p.rewards.length > 0)
        .map((p) => (
          <PalierCard key={p.rank} track={track} palier={p} />
        ))}
    </div>
  );
}

function LockBadge({ status }: { status?: PalierStatus | "DONE" | "ACTIVE" | "LOCKED" }) {
  if (status === "DONE") return <span className="hnk-chip">Atteint ✓</span>;
  if (status === "LOCKED")
    return <span className="hnk-chip !text-smoke !border-white/10">🔒 Verrouillé</span>;
  if (status === "LOCKED_COMMUNITY")
    return (
      <span className="hnk-chip !text-smoke !border-white/10">🔒 Communauté requise</span>
    );
  return null;
}

function PalierCard({ track, palier }: { track: TrackView; palier: PalierView }) {
  const isBase = palier.rank === "E";
  const commLocked = palier.communityStatus === "LOCKED";
  const indLocked = palier.individualStatus === "LOCKED" || palier.individualStatus === "LOCKED_COMMUNITY";

  return (
    <div className="hnk-panel">
      <div className="flex items-center gap-3 mb-1">
        <span
          className={`${rankClass(palier.rank)}`}
          style={{ fontFamily: "var(--display)", fontSize: 34, lineHeight: 1 }}
        >
          {palier.rank}
        </span>
        <div>
          <p className="hnk-eyebrow">
            Rang {palier.rank} · {track.label}
          </p>
          {isBase && <p className="text-xs text-smoke mt-0.5">Situation initiale</p>}
        </div>
      </div>

      {/* Conditions communautaires */}
      {palier.community && palier.community.length > 0 && (
        <section className={`mt-4 ${commLocked ? "opacity-50" : ""}`}>
          <div className="flex items-center gap-2 mb-2">
            <p className="hnk-eyebrow">Conditions communautaires</p>
            {palier.communityComplete ? (
              <LockBadge status="DONE" />
            ) : (
              <LockBadge status={palier.communityStatus} />
            )}
          </div>
          {palier.flavorCommunity && (
            <p className="text-[11px] italic text-smoke mb-3 leading-relaxed">
              « {palier.flavorCommunity} »
            </p>
          )}
          <ul className="space-y-2.5">
            {palier.community.map((c) => (
              <CondRow key={c.id} cond={c} community />
            ))}
          </ul>
        </section>
      )}

      {/* Conditions individuelles */}
      {palier.individual && (
        <section className={`mt-5 ${indLocked ? "opacity-50" : ""}`}>
          <div className="flex items-center gap-2 mb-2">
            <p className="hnk-eyebrow">Conditions individuelles</p>
            {palier.individual.met ? (
              <LockBadge status="DONE" />
            ) : (
              <LockBadge status={palier.individualStatus} />
            )}
          </div>
          {palier.flavorIndividual && (
            <p className="text-[11px] italic text-smoke mb-3 leading-relaxed">
              « {palier.flavorIndividual} »
            </p>
          )}

          {palier.individual.xp > 0 && (
            <div className="mb-3">
              <p className="text-xs text-bone/80">
                <span className="text-ember font-bold">Raccourci :</span> dépenser{" "}
                <span className="tabular-nums">{palier.individual.xp} XP</span> pour monter au Rang{" "}
                {palier.rank} — <span className="text-smoke">OU</span> valider les conditions
                ci-dessous.
              </p>
              {palier.individualStatus === "ACTIVE" && (
                <LevelUpButton
                  track={track.key}
                  rank={palier.rank}
                  cost={palier.individual.xp}
                  xpAvailable={track.xpAvailable}
                />
              )}
            </div>
          )}

          <ul className="space-y-2.5">
            {palier.individual.alternatives.map((c) => (
              <CondRow key={c.id} cond={c} />
            ))}
          </ul>

          {palier.individual.extras.map((ex) => (
            <div key={ex.id} className="mt-3 border-l-2 border-white/10 pl-3">
              <p className="text-[11px] text-smoke mb-1.5">
                {ex.label}{" "}
                <span className="text-bone/60">· {ex.required ? "obligatoire" : "un choix au choix"}</span>
              </p>
              <ul className="space-y-2.5">
                {ex.choices.map((c) => (
                  <CondRow key={c.id} cond={c} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Récompenses */}
      {palier.rewards.length > 0 && (
        <section className="mt-5">
          <p className="hnk-eyebrow mb-2">Récompenses</p>
          <ul className="space-y-1.5">
            {palier.rewards.map((r, i) => (
              <li key={i} className="text-xs text-bone/75 leading-relaxed flex gap-2">
                <span className="text-ember flex-none">◆</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function LevelUpButton({
  track,
  rank,
  cost,
  xpAvailable,
}: {
  track: string;
  rank: string;
  cost: number;
  xpAvailable: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const afford = xpAvailable >= cost;

  function go() {
    setErr(null);
    start(async () => {
      const r = await fetch("/api/me/progression/levelup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr(
          j.error === "INSUFFICIENT_XP"
            ? "XP insuffisant."
            : j.error === "COMMUNAUTE_REQUISE"
            ? "Rang communautaire requis."
            : j.error === "CONFLICT"
            ? "Conflit, réessaie."
            : "Action impossible."
        );
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={go}
        disabled={pending || !afford}
        className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px] disabled:opacity-40"
        title={afford ? undefined : `Il te faut ${cost} XP disponibles.`}
      >
        {pending ? "…" : `Monter au Rang ${rank} · ${cost} XP`}
      </button>
      <span className="text-[10px] text-smoke tabular-nums">({xpAvailable} XP dispo)</span>
      {err && <span className="text-[10px] text-ember-hot">{err}</span>}
    </div>
  );
}

function ProgressMeter({ cond }: { cond: CondView }) {
  // oneshot / count target 1 → pas de jauge chiffrée (binaire).
  if (cond.mode !== "count" && !cond.auto) return null;
  if (cond.target <= 1 && !cond.auto) return null;
  const pct = cond.target > 0 ? Math.min(100, Math.round((cond.current / cond.target) * 100)) : 0;
  const unit = cond.mode === "xp_pool" || cond.mode === "xp_self" ? " XP" : "";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-white/8 overflow-hidden">
        <span
          className="block h-full"
          style={{ width: `${pct}%`, background: cond.met ? "#34d399" : "#ff5722" }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-smoke flex-none">
        {cond.current}/{cond.target}
        {unit}
      </span>
    </div>
  );
}

function CondRow({ cond, community = false }: { cond: CondView; community?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null); // soumission en cours d'annulation
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [comment, setComment] = useState("");
  const [collaborators, setCollaborators] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const requiresCollaborators = cond.submissionMode === "GROUP";
  const manualReview = cond.submissionMode === "MANUAL";

  function openForm() {
    setTitle("");
    setUrl("");
    setComment("");
    setCollaborators("");
    setErr(null);
    setOpen(true);
  }

  function parseCollaborators() {
    return Array.from(
      new Set(
        collaborators
          .split(/[\n,;]/g)
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  }

  function submit() {
    setErr(null);
    if (!manualReview && !comment.trim()) {
      setErr("Commentaire obligatoire.");
      return;
    }
    if (requiresCollaborators && parseCollaborators().length === 0) {
      setErr("Au moins un pseudo exact est requis.");
      return;
    }
    if (cond.submissionMode !== "MANUAL" && !url.trim()) {
      setErr("Lien RP requis.");
      return;
    }
    start(async () => {
      const collaboratorList = parseCollaborators();
      const r = await fetch("/api/me/progression/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condId: cond.id,
          rpTitle: title.trim() || undefined,
          rpUrl: url.trim() || undefined,
          comment: comment.trim() || undefined,
          collaborators: requiresCollaborators ? collaboratorList : undefined,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr(humanErr(j.error));
        return;
      }
      setOpen(false);
      setTitle("");
      setUrl("");
      setComment("");
      setCollaborators("");
      router.refresh();
    });
  }

  function cancel(id: string) {
    setErr(null);
    setBusyId(id);
    start(async () => {
      const r = await fetch(`/api/me/progression/submit/${id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      setBusyId(null);
      if (!j.ok) {
        setErr(humanErr(j.error));
        return;
      }
      router.refresh();
    });
  }

  const icon = cond.met ? "✓" : cond.myPending > 0 ? "◷" : "○";
  const iconColor = cond.met
    ? "text-emerald-400"
    : cond.myPending > 0
    ? "text-amber-400"
    : "text-smoke";
  const subCount = cond.submissions.length;

  return (
    <li className="text-xs">
      <div className="flex items-start gap-2">
        <span className={`flex-none mt-[2px] ${iconColor}`}>{icon}</span>
        <span className="flex-1 text-bone/85 leading-relaxed">{cond.label}</span>

        <ProgressMeter cond={cond} />

        <span className="flex-none">
          {cond.auto ? (
            <span className="text-[9px] text-smoke uppercase tracking-wider">auto</span>
          ) : cond.met ? (
            <span className="text-[10px] text-emerald-400/90 uppercase tracking-wider">OK</span>
          ) : cond.adminManaged ? (
            <span
              className="text-[9px] text-smoke uppercase tracking-wider"
              title="Validée directement par le staff (pas de soumission)"
            >
              staff
            </span>
          ) : cond.submittable ? (
            <span className="inline-flex items-center gap-2">
              {cond.myPending > 0 && (
                <span className="text-[9px] text-amber-400/80 tabular-nums">
                  {cond.myPending} en attente
                </span>
              )}
              <button
                type="button"
                onClick={() => (open ? setOpen(false) : openForm())}
                disabled={pending}
                className="hnk-btn-ghost !py-1 !px-2.5 !text-[9px]"
              >
                + RP
              </button>
            </span>
          ) : cond.myPending > 0 ? (
            <span className="text-[10px] text-amber-400/90 uppercase tracking-wider">
              en attente
            </span>
          ) : cond.lockReason ? (
            <span className="text-[9px] text-smoke">🔒</span>
          ) : null}
        </span>
      </div>

      {/* Liste déroulante des RP soumis (sans objet pour les conditions auto) */}
      {!cond.auto && subCount > 0 && (
        <details className="ml-6 mt-1.5 group">
          <summary className="cursor-pointer text-[10px] text-smoke hover:text-bone select-none list-none">
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span> RP soumis ({subCount})
          </summary>
          <ul className="mt-1.5 space-y-1.5 border-l border-white/10 pl-3">
            {cond.submissions.map((s) => (
              <li key={s.id} className="text-[11px]">
                <div className="flex items-start gap-2">
                  <StatusDot status={s.status} />
                  <div className="flex-1 min-w-0">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-bone hover:text-ember break-words"
                      >
                        {s.title || s.url}
                      </a>
                    ) : (
                      <span className="text-bone break-words">{s.title || "RP sans titre"}</span>
                    )}
                    <span className="text-smoke">
                      {community && s.author ? ` · ${s.author}` : ""} · {s.created}
                    </span>
                    {s.comment && <p className="text-smoke italic mt-0.5">{s.comment}</p>}
                    {s.collaborators && s.collaborators.length > 0 && (
                      <p className="text-smoke mt-0.5">
                        Avec : <span className="text-bone">{s.collaborators.join(", ")}</span>
                      </p>
                    )}
                    {s.status === "REJECTED" && s.rejectionReason && (
                      <p className="text-ember-hot/80 mt-0.5">Refusé : {s.rejectionReason}</p>
                    )}
                  </div>
                  {s.mine && s.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => cancel(s.id)}
                      disabled={busyId === s.id}
                      className="flex-none text-[9px] text-smoke hover:text-ember-hot uppercase tracking-wider disabled:opacity-40"
                    >
                      {busyId === s.id ? "…" : "annuler"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Formulaire de soumission */}
      {open && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-ember/30 pl-3">
          <input
            className="hnk-input !text-xs"
            placeholder="Titre du RP"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="hnk-input !text-xs"
            placeholder={manualReview ? "Lien du RP (optionnel pour cette demande manuelle)" : "Lien du RP (https://…)"}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {requiresCollaborators && (
            <input
              className="hnk-input !text-xs"
              placeholder="Pseudos exacts des autres participants, séparés par des virgules"
              value={collaborators}
              onChange={(e) => setCollaborators(e.target.value)}
            />
          )}
          <textarea
            className="hnk-input !text-xs"
            rows={2}
            placeholder={manualReview ? "Commentaire pour le staff (optionnel)" : "Commentaire pour le staff (obligatoire)"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {manualReview && (
            <p className="text-[10px] text-smoke">
              Demande de validation manuelle : ajoute le contexte à vérifier, sans lien RP obligatoire.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="hnk-btn-ghost !py-1 !px-3 !text-[10px] disabled:opacity-40"
            >
              {pending ? "Envoi…" : "Envoyer au staff"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="text-[10px] text-smoke hover:text-bone"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {err && <p className="ml-6 mt-1 text-[10px] text-ember-hot">{err}</p>}
    </li>
  );
}

function StatusDot({ status }: { status: SubStatus }) {
  const map = {
    VALIDATED: { c: "text-emerald-400", t: "✓" },
    PENDING: { c: "text-amber-400", t: "◷" },
    REJECTED: { c: "text-ember-hot", t: "✕" },
  } as const;
  const s = map[status];
  return <span className={`flex-none ${s.c}`}>{s.t}</span>;
}

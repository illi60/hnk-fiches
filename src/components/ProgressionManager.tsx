"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ART_OPTIONS } from "@/lib/techniques";
import { KG_NAMES, kgColor } from "@/lib/kekkei";
import { RANKS, rankIndex } from "@/lib/arts";
import {
  MODES,
  quoteQuintessence,
  quintessenceKindLabel,
  QUINTESSENCE_COST,
  type ProgressionState,
  type QuintessenceKind,
} from "@/lib/quintessence";

function humanErr(e?: string): string {
  switch (e) {
    case "XP_INSUFFISANT":
      return "XP insuffisant.";
    case "DEJA_ACQUISE":
      return "Déjà acquise.";
    case "HISTOIRE_REQUIS":
      return "Rang Histoire insuffisant.";
    case "VILLAGE_REQUIS":
      return "Rang Village A requis.";
    case "CLAN_REQUIS":
      return "Rang Clan B requis.";
    case "ART_UNIQUE":
      return "Une seule Quintessence d'Art autorisée.";
    case "KG_EXCLUSIF":
      return "Exclusif : Quintessence de KG OU 2nd KG, pas les deux.";
    case "CONFLICT":
      return "Conflit, réessaie.";
    default:
      return "Action impossible.";
  }
}

function rankOk(rank: string | null, min: string): boolean {
  return rankIndex(rank) >= RANKS.indexOf(min as (typeof RANKS)[number]);
}

export default function ProgressionManager({
  progression,
  xpAvailable,
  villageRank,
  clanRank,
  histoireRank,
}: {
  progression: ProgressionState;
  xpAvailable: number;
  villageRank: string | null;
  clanRank: string | null;
  histoireRank: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [art, setArt] = useState("");
  const [kg, setKg] = useState("");
  const [kg2, setKg2] = useState("");

  const owned = progression.quintessences ?? [];
  const hasArt = owned.some((q) => q.kind === "ART");
  const hasKg = owned.some((q) => q.kind === "KG");
  const hasKg2 = owned.some((q) => q.kind === "KG2");

  // Cibles déjà acquises (par type) → on les retire des listes pour empêcher
  // de reprendre deux fois le même.
  const takenArt = new Set(owned.filter((q) => q.kind === "ART").map((q) => q.target.toLowerCase()));
  const takenKg = new Set(owned.filter((q) => q.kind === "KG").map((q) => q.target.toLowerCase()));
  const takenKg2 = new Set(owned.filter((q) => q.kind === "KG2").map((q) => q.target.toLowerCase()));
  const artOptions = (ART_OPTIONS as readonly string[]).filter((o) => !takenArt.has(o.toLowerCase()));
  const kgOptions = KG_NAMES.filter((o) => !takenKg.has(o.toLowerCase()));
  const kg2Options = KG_NAMES.filter((o) => !takenKg2.has(o.toLowerCase()));

  // Une seule quintessence de la famille KG (KG OU 2nd KG) au total.
  const hasAnyKgFamily = hasKg || hasKg2;

  // Blocages de rang (cf. lib/quintessence QUINT_GATE) + unicité (1 max chacune).
  const artGate = rankOk(villageRank, "A") && !hasArt;
  const kgGate = rankOk(clanRank, "B") && !hasAnyKgFamily;
  const kg2Gate = rankOk(histoireRank, "A") && !hasAnyKgFamily;

  function run(body: Record<string, unknown>) {
    setErr(null);
    start(async () => {
      const r = await fetch("/api/me/progression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr(humanErr(j.error));
        return;
      }
      router.refresh();
    });
  }

  function buy(kind: QuintessenceKind, target: string) {
    if (!target) return;
    const q = quoteQuintessence(
      { kind, target },
      progression,
      { xpAvailable, rangVillage: villageRank, rangClan: clanRank, rangHistoire: histoireRank }
    );
    if (!q.ok) {
      setErr(humanErr(q.error));
      return;
    }
    run({ type: "buyQuintessence", kind, target });
  }

  return (
    <section>
      <h2 className="hnk-section-title">Quintessences &amp; Modes spéciaux</h2>

      <div className="hnk-panel" data-kanji="極">
        <p className="hnk-eyebrow">Quintessences · {QUINTESSENCE_COST} XP chacune</p>
        <p className="text-[11px] text-smoke mt-2 leading-relaxed">
          ⚠️ Choix exclusif : tu peux prendre <span className="text-bone">soit</span> une Quintessence
          de Kekkei Genkai, <span className="text-bone">soit</span> un Second Kekkei Genkai —
          <span className="text-bone"> jamais les deux</span>. Une cible déjà acquise ne peut pas être
          reprise.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          <Picker
            label="Quintessence d'Art"
            hint={hasArt ? "Verrouillé — Quintessence d'Art déjà choisie (unique)" : "Requiert Rang Village A · unique"}
            locked={!artGate}
            options={artOptions}
            value={art}
            onChange={setArt}
            onBuy={() => buy("ART", art)}
            pending={pending}
          />
          <Picker
            label="Quintessence de KG"
            hint={
              hasKg
                ? "Verrouillé — Quint. de KG déjà choisie (unique)"
                : hasKg2
                ? "Verrouillé — 2nd KG déjà choisi (exclusif)"
                : "Requiert Rang Clan B · unique"
            }
            locked={!kgGate}
            options={kgOptions}
            value={kg}
            onChange={setKg}
            onBuy={() => buy("KG", kg)}
            pending={pending}
          />
          <Picker
            label="Second Kekkei Genkai"
            hint={
              hasKg2
                ? "Verrouillé — 2nd KG déjà choisi (unique)"
                : hasKg
                ? "Verrouillé — Quint. de KG déjà choisie (exclusif)"
                : "Requiert Rang Histoire A · unique"
            }
            locked={!kg2Gate}
            options={kg2Options}
            value={kg2}
            onChange={setKg2}
            onBuy={() => buy("KG2", kg2)}
            pending={pending}
          />
        </div>

        {owned.length > 0 && (
          <div className="mt-4">
            <p className="hnk-eyebrow mb-2">Acquises</p>
            <div className="flex flex-wrap gap-2">
              {owned.map((q, i) => (
                <span
                  key={i}
                  className="hnk-chip"
                  style={
                    q.kind !== "ART"
                      ? { color: kgColor(q.target), borderColor: kgColor(q.target) }
                      : undefined
                  }
                >
                  {quintessenceKindLabel(q.kind)} · {q.target}
                </span>
              ))}
            </div>
          </div>
        )}

        {err && <p className="text-sm text-ember-hot mt-3">{err}</p>}
      </div>

      <div className="grid sm:grid-cols-3 gap-5 mt-5">
        {MODES.map((m) => {
          const engaged = progression.mode?.path === m.key;
          const stage = engaged ? progression.mode?.stage ?? 0 : 0;
          return (
            <div key={m.key} className="hnk-panel" data-kanji={m.kanji}>
              <h3 className="font-display uppercase tracking-wider text-lg text-white">{m.name}</h3>
              <p className="text-[10px] text-smoke mt-1">{m.voie}</p>
              <p className="text-xs text-bone mt-2">{m.focus}</p>
              <div className="mt-3 space-y-1.5">
                {m.stages.map((s, idx) => {
                  const reached = engaged && stage >= idx + 1;
                  return (
                    <div
                      key={idx}
                      className={`text-xs border-l pl-3 ${
                        reached ? "border-ember" : "border-white/10"
                      }`}
                    >
                      <span className={reached ? "text-ember font-bold" : "text-smoke"}>
                        {s.label}
                      </span>
                      <span className={`block ${reached ? "text-bone" : "text-smoke"}`}>
                        {s.grant}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                {engaged ? (
                  <span className="hnk-chip">Voie empruntée · stade {stage}/3</span>
                ) : (
                  <span
                    className="hnk-chip opacity-60"
                    title="Voie débloquée par le staff (RP / arrangement)"
                  >
                    Réservé au staff
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-smoke mt-3 tracking-wide">
        Les stades des modes spéciaux avancent côté staff (RP / arrangement).
      </p>
    </section>
  );
}

function Picker({
  label,
  hint,
  locked = false,
  options,
  value,
  onChange,
  onBuy,
  pending,
}: {
  label: string;
  hint?: string;
  locked?: boolean;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  onBuy: () => void;
  pending: boolean;
}) {
  return (
    <div className={`border border-white/5 p-3 ${locked ? "opacity-50" : ""}`}>
      <p className="hnk-eyebrow mb-1">{label}</p>
      {hint && <p className="text-[9px] text-smoke mb-2 tracking-wide">{hint}</p>}
      <select
        className="hnk-input mb-2"
        value={value}
        disabled={locked}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px] w-full justify-center disabled:opacity-40"
        disabled={pending || locked || !value}
        onClick={onBuy}
      >
        {locked ? "Verrouillé" : `Acquérir · ${QUINTESSENCE_COST} XP`}
      </button>
    </div>
  );
}

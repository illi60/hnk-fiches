"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RichEditor } from "./RichEditor";
import {
  ADMIN_CONTRACT_RANKS,
  MISSION_RANKS,
  PUBLIC_MISSION_RANKS,
  emptyMission,
  missionDefaultPartySize,
  missionDefaultReward,
  missionForumHtml,
  type MissionData,
  type MissionRank,
} from "@/lib/missions";

const CSS_HREF = "/forum/hnk-presentation.css";

interface Props {
  mode?: "public" | "admin";
}

export default function MissionGenerator({ mode = "public" }: Props) {
  const adminMode = mode === "admin";
  const ranks = adminMode ? ADMIN_CONTRACT_RANKS : PUBLIC_MISSION_RANKS;
  const itemName = adminMode ? "contrat" : "mission";
  const storageKey = adminMode ? "hnk-admin-mission-draft" : "hnk-mission-draft";
  const [d, setD] = useState<MissionData>(() => emptyMission(ranks[0]));
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw) as Partial<MissionData>;
        const rank = p.rank && ranks.includes(p.rank) ? p.rank : ranks[0];
        const next = { ...emptyMission(rank), ...p, rank, status: "ouverte" as const };
        if (!adminMode) {
          next.reward = missionDefaultReward(rank);
          next.partySize = missionDefaultPartySize(rank);
        }
        setD(next);
        setSavedAt("restauré");
      }
    } catch {
      /* localStorage indisponible : on ignore. */
    }
    setLoaded(true);
  }, [adminMode, ranks, storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(d));
      setSavedAt("enregistré");
    } catch {
      /* ignore */
    }
  }, [d, loaded, storageKey]);

  function resetAll() {
    if (!confirm(`Réinitialiser ${adminMode ? "le contrat" : "la mission"} ? La sauvegarde locale sera effacée.`)) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setD(emptyMission(ranks[0]));
    setSavedAt(null);
  }

  const dataForHtml = useMemo<MissionData>(
    () => ({
      ...d,
      status: "ouverte",
      reward: adminMode ? d.reward : missionDefaultReward(d.rank),
      partySize: adminMode ? d.partySize : missionDefaultPartySize(d.rank),
    }),
    [adminMode, d]
  );
  const html = useMemo(
    () => missionForumHtml(dataForHtml, adminMode ? "contrat" : "mission"),
    [adminMode, dataForHtml]
  );

  const baseDoc = useMemo(
    () =>
      `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<base target="_blank">` +
      `<link rel="stylesheet" href="${CSS_HREF}">` +
      `<style>html,body{margin:0;background:#050608}body{padding:24px 16px}</style>` +
      `</head><body><div id="hnk-root"></div></body></html>`,
    []
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);

  function injectPreview() {
    const root = iframeRef.current?.contentDocument?.getElementById("hnk-root");
    if (root) root.innerHTML = html;
  }
  useEffect(injectPreview, [html]);

  function set<K extends keyof MissionData>(key: K, value: MissionData[K]) {
    setD((p) => ({ ...p, [key]: value }));
  }

  function setRank(rankKey: MissionRank) {
    setD((p) => ({
      ...p,
      rank: rankKey,
      urgency: p.urgency.trim() ? p.urgency : MISSION_RANKS[rankKey].name,
      status: "ouverte",
      reward: adminMode ? p.reward : missionDefaultReward(rankKey),
      partySize: adminMode ? p.partySize : missionDefaultPartySize(rankKey),
    }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(html);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = html;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
      <div className="space-y-7 lg:col-span-4">
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Rang de {itemName}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ranks.map((rankKey) => {
              const rank = MISSION_RANKS[rankKey];
              const active = d.rank === rankKey;
              return (
                <button
                  key={rankKey}
                  type="button"
                  onClick={() => setRank(rankKey)}
                  className="min-h-[78px] border p-3 text-left transition"
                  style={{
                    borderColor: active ? rank.color : "rgba(219,222,226,0.18)",
                    background: active ? `color-mix(in srgb, ${rank.color} 16%, transparent)` : "rgba(7,8,10,0.35)",
                    boxShadow: active ? `0 0 16px color-mix(in srgb, ${rank.color} 28%, transparent)` : "none",
                  }}
                >
                  <span className="block font-display text-3xl leading-none" style={{ color: rank.color }}>
                    {rank.label}
                  </span>
                  <span className="hnk-eyebrow mt-2 block">{rank.name}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Urgence / nature">
              <input
                className="hnk-input"
                value={d.urgency}
                onChange={(e) => set("urgency", e.target.value)}
                placeholder="Urgence, escorte, filature..."
              />
            </Field>
            <div>
              <span className="hnk-label block mb-1">Statut</span>
              <div className="hnk-input bg-ink-900/70 text-bone/80">Ouverte</div>
            </div>
          </div>
        </section>

        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">En-tête</h2>
          <Field label={`Titre ${adminMode ? "du contrat" : "de la mission"}`}>
            <input
              className="hnk-input"
              value={d.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={`Titre ${adminMode ? "du contrat" : "de la mission"}`}
            />
          </Field>
          <Field label="Commanditaire">
            <input
              className="hnk-input"
              value={d.giver}
              onChange={(e) => set("giver", e.target.value)}
              placeholder="Village / clan / individu"
            />
          </Field>
        </section>

        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Paramètres</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Lieu">
              <input
                className="hnk-input"
                value={d.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Zone du RP"
              />
            </Field>
            {adminMode ? (
              <Field label="Récompense">
                <input
                  className="hnk-input"
                  value={d.reward}
                  onChange={(e) => set("reward", e.target.value)}
                  placeholder="XP, ryos, objet..."
                />
              </Field>
            ) : (
              <div>
                <span className="hnk-label block mb-1">Récompense</span>
                <div className="hnk-input bg-ink-900/70 text-bone/80">{missionDefaultReward(d.rank)}</div>
              </div>
            )}
            {adminMode ? (
              <Field label="Effectif">
                <input
                  className="hnk-input"
                  value={d.partySize}
                  onChange={(e) => set("partySize", e.target.value)}
                  placeholder="2 shinobi minimum"
                />
              </Field>
            ) : (
              <div>
                <span className="hnk-label block mb-1">Effectif</span>
                <div className="hnk-input bg-ink-900/70 text-bone/80">{missionDefaultPartySize(d.rank)}</div>
              </div>
            )}
            <Field label="Grade requis">
              <input
                className="hnk-input"
                value={d.requiredGrade}
                onChange={(e) => set("requiredGrade", e.target.value)}
                placeholder="Genin, chunin..."
              />
            </Field>
          </div>
        </section>

        <section className="hnk-panel p-5 space-y-3">
          <h2 className="hnk-section-title mb-1">Description</h2>
          <RichEditor
            value={d.description}
            onChange={(html) => set("description", html)}
            minHeight="180px"
            maxHeight="380px"
            placeholder={adminMode ? "Contexte, cible, menace, enjeux..." : "Contexte, situation, menace, enjeux..."}
            withColor
            withBlocks
          />
        </section>

        <section className="hnk-panel p-5 space-y-3">
          <h2 className="hnk-section-title mb-1">Conditions</h2>
          <Field label="Titre du bloc">
            <input
              className="hnk-input"
              value={d.conditionsTitle}
              onChange={(e) => set("conditionsTitle", e.target.value)}
              placeholder="Conditions"
            />
          </Field>
          <RichEditor
            value={d.conditions}
            onChange={(html) => set("conditions", html)}
            minHeight="130px"
            maxHeight="300px"
            placeholder="Objectifs, contraintes, conditions de réussite..."
            withColor
            withBlocks
          />
        </section>
      </div>

      <div className="space-y-4 lg:col-span-8 lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="hnk-eyebrow">Aperçu en direct</span>
            {savedAt && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-smoke" title="Sauvegarde automatique dans ce navigateur">
                · {savedAt}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={resetAll}>
              Réinitialiser
            </button>
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={() => setShowCode((s) => !s)}>
              {showCode ? "Masquer le code" : "Voir le code"}
            </button>
            <button type="button" className="hnk-btn !py-1.5 !px-3 !text-[10px]" onClick={copy}>
              {copied ? "Copié" : "Copier le code forum"}
            </button>
          </div>
        </div>

        <iframe
          ref={iframeRef}
          title={`Aperçu ${adminMode ? "du contrat" : "de la mission"}`}
          srcDoc={baseDoc}
          onLoad={injectPreview}
          className="w-full h-[calc(100vh-6rem)] min-h-[640px] border border-white/10 bg-black"
        />

        {showCode && (
          <textarea
            readOnly
            value={html}
            onFocus={(e) => e.currentTarget.select()}
            className="hnk-input w-full h-48 font-mono text-[11px] leading-relaxed"
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="hnk-label block mb-1">{label}</span>
      {children}
    </label>
  );
}

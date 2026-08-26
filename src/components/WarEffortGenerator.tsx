"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RichEditor } from "./RichEditor";
import {
  WAR_EFFORT_COLORS,
  WAR_EFFORT_STATUSES,
  clampWarEffortValue,
  emptyWarEffort,
  emptyWarEffortEntry,
  parseWarEffortForumHtml,
  warEffortForumHtml,
  warEffortPercent,
  type WarEffortColor,
  type WarEffortData,
  type WarEffortEntry,
  type WarEffortStatus,
} from "@/lib/war-effort";

const CSS_HREF = "/forum/hnk-presentation.css";
const STORAGE_KEY = "hnk-admin-war-effort-draft";

export default function WarEffortGenerator() {
  const [d, setD] = useState<WarEffortData>(() => emptyWarEffort());
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<WarEffortData>;
        const base = emptyWarEffort();
        const accent = p.accent && p.accent in WAR_EFFORT_COLORS ? p.accent : base.accent;
        const status = p.status && p.status in WAR_EFFORT_STATUSES ? p.status : base.status;
        const target = Math.max(1, Math.round(Number(p.target) || base.target));
        setD({
          ...base,
          ...p,
          accent,
          status,
          target,
          current: clampWarEffortValue(Number(p.current) || 0, target),
          entries: Array.isArray(p.entries) && p.entries.length ? p.entries : base.entries,
        });
        setSavedAt("restauré");
      }
    } catch {
      /* localStorage indisponible : on ignore. */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      setSavedAt("enregistré");
    } catch {
      /* ignore */
    }
  }, [d, loaded]);

  const html = useMemo(() => warEffortForumHtml(d), [d]);
  const percent = useMemo(() => warEffortPercent(d.current, d.target), [d.current, d.target]);

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

  function set<K extends keyof WarEffortData>(key: K, value: WarEffortData[K]) {
    setD((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "target") {
        const target = Math.max(1, Math.round(Number(value) || 1));
        next.target = target;
        next.current = clampWarEffortValue(prev.current, target);
      }
      if (key === "current") {
        next.current = clampWarEffortValue(Number(value) || 0, next.target);
      }
      return next;
    });
  }

  function bumpCurrent(delta: number) {
    setD((prev) => ({ ...prev, current: clampWarEffortValue(prev.current + delta, prev.target) }));
  }

  function patchEntry(index: number, patch: Partial<WarEffortEntry>) {
    setD((prev) => ({
      ...prev,
      entries: prev.entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    }));
  }

  function addEntry() {
    setD((prev) => ({ ...prev, entries: [...prev.entries, emptyWarEffortEntry()] }));
  }

  function removeEntry(index: number) {
    setD((prev) => ({
      ...prev,
      entries: prev.entries.length > 1 ? prev.entries.filter((_, i) => i !== index) : prev.entries,
    }));
  }

  function moveEntry(index: number, dir: -1 | 1) {
    setD((prev) => {
      const nextIndex = index + dir;
      if (nextIndex < 0 || nextIndex >= prev.entries.length) return prev;
      const entries = [...prev.entries];
      [entries[index], entries[nextIndex]] = [entries[nextIndex], entries[index]];
      return { ...prev, entries };
    });
  }

  function addEntryContribution(index: number) {
    const contribution = Math.max(0, Math.round(d.entries[index]?.contribution || 0));
    setD((prev) => ({
      ...prev,
      current: clampWarEffortValue(prev.current + contribution, prev.target),
    }));
  }

  function resetAll() {
    if (!confirm("Réinitialiser la jauge d'effort de guerre ? La sauvegarde locale sera effacée.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setD(emptyWarEffort());
    setSavedAt(null);
    setImportMsg(null);
  }

  function importFromCode() {
    const res = parseWarEffortForumHtml(importText);
    if (!res) {
      setImportMsg("Code non reconnu. Colle le code d'une jauge d'effort de guerre générée ici.");
      return;
    }
    setD(res);
    setImportText("");
    setImportMsg("Effort de guerre importé");
    setSavedAt("importé");
    setShowImport(false);
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
          <h2 className="hnk-section-title mb-1">Cadre stratégique</h2>
          <Field label="Titre du bulletin">
            <input className="hnk-input" value={d.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Sous-titre">
            <input className="hnk-input" value={d.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Opération">
              <input className="hnk-input" value={d.operation} onChange={(e) => set("operation", e.target.value)} />
            </Field>
            <Field label="Commandement">
              <input className="hnk-input" value={d.command} onChange={(e) => set("command", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Statut du front">
              <select className="hnk-input" value={d.status} onChange={(e) => set("status", e.target.value as WarEffortStatus)}>
                {Object.entries(WAR_EFFORT_STATUSES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Couleur">
              <select className="hnk-input" value={d.accent} onChange={(e) => set("accent", e.target.value as WarEffortColor)}>
                {Object.entries(WAR_EFFORT_COLORS).map(([key, color]) => (
                  <option key={key} value={key}>
                    {color.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Jauge opérationnelle</h2>
          <Field label="Objectif suivi">
            <input className="hnk-input" value={d.objectiveLabel} onChange={(e) => set("objectiveLabel", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Progression actuelle">
              <input
                type="number"
                min={0}
                max={d.target}
                className="hnk-input"
                value={d.current}
                onChange={(e) => set("current", Number(e.target.value))}
              />
            </Field>
            <Field label="Seuil stratégique">
              <input
                type="number"
                min={1}
                className="hnk-input"
                value={d.target}
                onChange={(e) => set("target", Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {[-10, -5, -1, 1, 5, 10].map((delta) => (
              <button
                key={delta}
                type="button"
                className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]"
                onClick={() => bumpCurrent(delta)}
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
          </div>
          <div className="h-3 border border-white/10 bg-ink-900 overflow-hidden">
            <div className="h-full bg-ember transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-smoke text-xs">{percent}% du seuil stratégique atteint.</p>
        </section>

        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Rapports RP validés</h2>
          {d.entries.map((entry, index) => (
            <div key={index} className="border border-white/10 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="hnk-label">Rapport #{index + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" className="text-smoke hover:text-bone px-1" onClick={() => moveEntry(index, -1)} title="Monter">
                    ↑
                  </button>
                  <button type="button" className="text-smoke hover:text-bone px-1" onClick={() => moveEntry(index, 1)} title="Descendre">
                    ↓
                  </button>
                  {d.entries.length > 1 && (
                    <button type="button" className="text-smoke hover:text-ember text-xl leading-none px-1" onClick={() => removeEntry(index)} title="Retirer">
                      ×
                    </button>
                  )}
                </div>
              </div>
              <Field label="Titre du RP / mission">
                <input className="hnk-input" value={entry.title} onChange={(e) => patchEntry(index, { title: e.target.value })} />
              </Field>
              <Field label="Lien du RP">
                <input className="hnk-input" value={entry.url} onChange={(e) => patchEntry(index, { url: e.target.value })} placeholder="https://..." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Effectifs engagés">
                  <input className="hnk-input" value={entry.participants} onChange={(e) => patchEntry(index, { participants: e.target.value })} placeholder="Noms des personnages" />
                </Field>
                <Field label="Théâtre">
                  <input className="hnk-input" value={entry.theater} onChange={(e) => patchEntry(index, { theater: e.target.value })} placeholder="Front Est, murailles..." />
                </Field>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <Field label="Gain stratégique">
                  <input
                    type="number"
                    min={0}
                    className="hnk-input"
                    value={entry.contribution}
                    onChange={(e) => patchEntry(index, { contribution: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </Field>
                <button type="button" className="hnk-btn !py-3 !px-3 !text-[10px]" onClick={() => addEntryContribution(index)}>
                  Ajouter au front
                </button>
              </div>
              <div>
                <span className="hnk-label block mb-1">Rapport de terrain</span>
                <RichEditor
                  value={entry.report}
                  onChange={(html) => patchEntry(index, { report: html })}
                  minHeight="70px"
                  maxHeight="240px"
                  placeholder="Résumé bref : mission accomplie, pertes évitées, ressources sécurisées..."
                  withColor
                  withBlocks
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="w-full py-2.5 text-[11px] uppercase tracking-[0.22em] font-bold text-ember border border-dashed border-ember/50 hover:bg-ember/10 transition"
            onClick={addEntry}
          >
            + Ajouter un rapport RP
          </button>
        </section>

        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Ordres et cachet</h2>
          <div>
            <span className="hnk-label block mb-1">Ordres en cours</span>
            <RichEditor
              value={d.orders}
              onChange={(html) => set("orders", html)}
              minHeight="90px"
              maxHeight="260px"
              placeholder="Consignes du commandement, prochains objectifs, priorités..."
              withColor
              withBlocks
            />
          </div>
          <Field label="Cachet final">
            <input className="hnk-input" value={d.stamp} onChange={(e) => set("stamp", e.target.value)} />
          </Field>
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
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={() => setShowImport((s) => !s)}>
              {showImport ? "Fermer l'import" : "Importer"}
            </button>
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={() => setShowCode((s) => !s)}>
              {showCode ? "Masquer le code" : "Voir le code"}
            </button>
            <button type="button" className="hnk-btn !py-1.5 !px-3 !text-[10px]" onClick={copy}>
              {copied ? "Copié" : "Copier le code forum"}
            </button>
          </div>
        </div>

        {showImport && (
          <section className="hnk-panel p-4 space-y-3">
            <div>
              <p className="hnk-label">Récupérer une jauge depuis son code forum</p>
              <p className="text-xs text-smoke mt-1">
                Colle le code d'un effort de guerre déjà posté pour recharger ses champs.
              </p>
            </div>
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportMsg(null);
              }}
              rows={5}
              className="hnk-input w-full font-mono text-[11px]"
              placeholder="<div class=&quot;hnkf hnkf--war&quot;..."
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="hnk-btn !py-2 !px-4 !text-[10px]"
                onClick={importFromCode}
                disabled={!importText.trim()}
              >
                Charger la jauge
              </button>
              {importMsg && <span className="text-xs text-bone">{importMsg}</span>}
            </div>
          </section>
        )}

        <iframe
          ref={iframeRef}
          title="Aperçu de la jauge d'effort de guerre"
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

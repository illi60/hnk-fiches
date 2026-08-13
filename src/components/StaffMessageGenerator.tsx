"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RichEditor } from "./RichEditor";
import {
  STAFF_ACCENT_COLORS,
  STAFF_MESSAGE_TYPES,
  STAFF_URGENCY_LEVELS,
  emptyStaffMessage,
  parseStaffMessageForumHtml,
  staffMessageForumHtml,
  type StaffMessageData,
  type StaffAccentColor,
  type StaffUrgencyLevel,
} from "@/lib/staffMessages";

const CSS_HREF = "/forum/hnk-presentation.css";
const STORAGE_KEY = "hnk-admin-staff-message-draft";

export default function StaffMessageGenerator() {
  const [d, setD] = useState<StaffMessageData>(() => emptyStaffMessage());
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<StaffMessageData>;
        const base = emptyStaffMessage();
        const type = p.type && p.type in STAFF_MESSAGE_TYPES ? p.type : base.type;
        const accent = p.accent && p.accent in STAFF_ACCENT_COLORS ? p.accent : base.accent;
        setD({
          ...base,
          ...p,
          type,
          accent,
          typeLabel: p.typeLabel ?? STAFF_MESSAGE_TYPES[type],
          meta: Array.isArray(p.meta) ? base.meta.map((m, i) => ({ ...m, ...(p.meta?.[i] ?? {}) })) : base.meta,
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

  const html = useMemo(() => staffMessageForumHtml(d), [d]);

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

  function set<K extends keyof StaffMessageData>(key: K, value: StaffMessageData[K]) {
    setD((p) => ({ ...p, [key]: value }));
  }

  function setMeta(index: number, patch: Partial<StaffMessageData["meta"][number]>) {
    setD((p) => ({
      ...p,
      meta: p.meta.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  function resetAll() {
    if (!confirm("Réinitialiser le message d'administration ? La sauvegarde locale sera effacée.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setD(emptyStaffMessage());
    setSavedAt(null);
  }

  function doImport() {
    const res = parseStaffMessageForumHtml(importText);
    if (!res) {
      setImportMsg("Code non reconnu. Colle le code d'un message d'administration généré ici.");
      return;
    }
    setD(res);
    setImportMsg("Message importé ✓");
    setImportText("");
    setImportOpen(false);
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
          <h2 className="hnk-section-title mb-1">Cadre administratif</h2>
          <Field label="Titre du cadre">
            <input
              className="hnk-input"
              value={d.typeLabel}
              onChange={(e) => set("typeLabel", e.target.value)}
              placeholder="Décret officiel"
            />
          </Field>
          <Field label="Couleur du cadre">
            <select
              className="hnk-input"
              value={d.accent}
              onChange={(e) => set("accent", e.target.value as StaffAccentColor)}
            >
              {Object.entries(STAFF_ACCENT_COLORS).map(([key, color]) => (
                <option key={key} value={key}>
                  {color.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sceau / référence">
            <input
              className="hnk-input"
              value={d.seal}
              onChange={(e) => set("seal", e.target.value)}
              placeholder="Sceau N° VII · 003"
            />
          </Field>
          <label className="flex items-center gap-3 text-sm text-bone">
            <input
              type="checkbox"
              checked={d.showUrgency}
              onChange={(e) => set("showUrgency", e.target.checked)}
              className="accent-ember"
            />
            Afficher la balise d'urgence en haut
          </label>
          {d.showUrgency && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Niveau">
                <select
                  className="hnk-input"
                  value={d.urgency}
                  onChange={(e) => set("urgency", e.target.value as StaffUrgencyLevel)}
                >
                  {Object.entries(STAFF_URGENCY_LEVELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Libellé">
                <input
                  className="hnk-input"
                  value={d.urgencyLabel}
                  onChange={(e) => set("urgencyLabel", e.target.value)}
                  placeholder="Urgent"
                />
              </Field>
            </div>
          )}
        </section>

        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">En-tête</h2>
          <Field label="Titre">
            <input
              className="hnk-input"
              value={d.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Fermeture de la Porte Rouge"
            />
          </Field>
          <div className="space-y-3">
            {d.meta.map((meta, i) => (
              <div key={meta.label} className="grid grid-cols-[auto_1fr] gap-3 items-end">
                <label className="flex items-center gap-2 pb-3 text-sm text-bone">
                  <input
                    type="checkbox"
                    checked={meta.enabled}
                    onChange={(e) => setMeta(i, { enabled: e.target.checked })}
                    className="accent-ember"
                  />
                  <span className="hnk-label">{meta.label}</span>
                </label>
                <input
                  className="hnk-input"
                  value={meta.value}
                  onChange={(e) => setMeta(i, { value: e.target.value })}
                  disabled={!meta.enabled}
                  placeholder={meta.label}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="hnk-panel p-5 space-y-3">
          <h2 className="hnk-section-title mb-1">Corps du message</h2>
          <RichEditor
            value={d.body}
            onChange={(html) => set("body", html)}
            minHeight="260px"
            maxHeight="460px"
            placeholder="Rédige le message administratif..."
            withColor
            withBlocks
            withStaffTools
          />
        </section>

        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Sceau final</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Signature">
              <input
                className="hnk-input"
                value={d.signature}
                onChange={(e) => set("signature", e.target.value)}
                placeholder="忍 · 戦 · 影"
              />
            </Field>
            <Field label="Cachet">
              <input
                className="hnk-input"
                value={d.stamp}
                onChange={(e) => set("stamp", e.target.value)}
                placeholder="Sceau du Conseil"
              />
            </Field>
          </div>
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
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={() => { setImportOpen((s) => !s); setImportMsg(null); }}>
              {importOpen ? "Fermer l'import" : "Importer"}
            </button>
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={() => setShowCode((s) => !s)}>
              {showCode ? "Masquer le code" : "Voir le code"}
            </button>
            <button type="button" className="hnk-btn !py-1.5 !px-3 !text-[10px]" onClick={copy}>
              {copied ? "Copié" : "Copier le code forum"}
            </button>
          </div>
        </div>

        {importOpen && (
          <div className="hnk-panel p-4 space-y-2">
            <p className="hnk-label">Récupérer un message depuis son code forum</p>
            <p className="text-smoke text-[11px]">
              Colle le code d'un message d'administration généré ici pour recharger ses champs.
            </p>
            <textarea
              className="hnk-input w-full h-32 font-mono text-[11px] leading-relaxed"
              placeholder="Colle ici le code &lt;div class=&quot;hnkf hnkf--staff&quot;&gt;..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button type="button" className="hnk-btn !py-1.5 !px-3 !text-[10px]" onClick={doImport} disabled={!importText.trim()}>
                Charger le message
              </button>
              {importMsg && <span className="text-xs text-bone">{importMsg}</span>}
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          title="Aperçu du message d'administration"
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

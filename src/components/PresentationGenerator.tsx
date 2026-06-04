"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHARACTER_QUESTIONS,
  CLAN_EMBLEMS,
  CLAN_KEYS,
  FOUNDING_CLANS,
  TRAMES,
  emptyAnswers,
  emptyPresentation,
  presentationForumHtml,
  parsePresentationForumHtml,
  type ChronoEvent,
  type ClanKey,
  type PresentationData,
} from "@/lib/presentation";

const CSS_HREF = "/forum/hnk-presentation.css";
const STORAGE_KEY = "hnk-presentation-draft";

export default function PresentationGenerator() {
  const [d, setD] = useState<PresentationData>(emptyPresentation);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  // Sauvegarde locale (sans compte) : on restaure au montage, puis on
  // enregistre dans le navigateur à chaque modification.
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<PresentationData>;
        const base = emptyPresentation();
        setD({
          ...base,
          ...p,
          hrp: { ...base.hrp, ...(p.hrp ?? {}) },
          answers:
            p.answers && typeof p.answers === "object" && !Array.isArray(p.answers)
              ? { ...emptyAnswers(), ...p.answers }
              : base.answers,
          chrono:
            Array.isArray(p.chrono) && p.chrono.length > 0 ? p.chrono : base.chrono,
        });
        setSavedAt("restauré");
      }
    } catch {
      /* localStorage indisponible (mode privé strict) : on ignore. */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      setSavedAt("enregistré ✓");
    } catch {
      /* ignore */
    }
  }, [d, loaded]);

  function resetAll() {
    if (!confirm("Réinitialiser la fiche ? La sauvegarde locale sera effacée.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setD(emptyPresentation());
    setSavedAt(null);
  }

  function doImport() {
    const res = parsePresentationForumHtml(importText);
    if (!res) {
      setImportMsg("Code non reconnu. Colle le code d'une fiche de présentation générée ici.");
      return;
    }
    setD(res);
    setImportMsg("Fiche importée ✓");
    setImportText("");
    setImportOpen(false);
  }

  const html = useMemo(() => presentationForumHtml(d), [d]);

  // Document de base de l'aperçu : STABLE (ne change jamais) → l'iframe ne se
  // recharge pas quand on tape. On injecte seulement le HTML dans #hnk-root,
  // ce qui préserve la position de scroll de l'aperçu (plus de « saut »).
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

  // Injecte le HTML dans l'iframe sans la recharger (préserve le scroll de
  // l'aperçu). Idempotent : appelé à chaque changement de html ET à chaque
  // (re)chargement de l'iframe (srcDoc peut déclencher 2 events load).
  function injectPreview() {
    const root = iframeRef.current?.contentDocument?.getElementById("hnk-root");
    if (root) root.innerHTML = html;
  }
  useEffect(injectPreview, [html]);

  function set<K extends keyof PresentationData>(key: K, value: PresentationData[K]) {
    setD((p) => ({ ...p, [key]: value }));
  }
  function setHrp<K extends keyof PresentationData["hrp"]>(key: K, value: string) {
    setD((p) => ({ ...p, hrp: { ...p.hrp, [key]: value } }));
  }
  function setAnswer(id: string, value: string) {
    setD((p) => ({ ...p, answers: { ...p.answers, [id]: value } }));
  }
  function setEvent(i: number, patch: Partial<ChronoEvent>) {
    setD((p) => {
      const chrono = p.chrono.map((e, idx) => (idx === i ? { ...e, ...patch } : e));
      return { ...p, chrono };
    });
  }
  function addEvent() {
    setD((p) => ({ ...p, chrono: [...p.chrono, { year: "", label: "", text: "" }] }));
  }
  function removeEvent(i: number) {
    setD((p) => ({ ...p, chrono: p.chrono.filter((_, idx) => idx !== i) }));
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
      {/* ===================== FORMULAIRE ===================== */}
      <div className="space-y-7 lg:col-span-4">
        {/* Clan fondateur */}
        <section className="hnk-panel p-5">
          <h2 className="hnk-section-title mb-4">Clan / Groupe représenté</h2>
          <p className="text-smoke text-xs mb-3">
            Clan fondateur ou « Shinobis simples » — définit la couleur de fond et l'emblème de la fiche.
          </p>
          <div className="flex flex-wrap gap-2">
            {CLAN_KEYS.map((k) => {
              const c = FOUNDING_CLANS[k];
              const active = d.clan === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("clan", k as ClanKey)}
                  className="px-3 py-2 text-[11px] uppercase tracking-[0.18em] font-bold border transition"
                  style={{
                    borderColor: active ? c.color : "rgba(219,222,226,0.18)",
                    color: active ? "#fff" : "#dbdee2",
                    background: active
                      ? `color-mix(in srgb, ${c.color} 22%, transparent)`
                      : "transparent",
                    boxShadow: active ? `0 0 16px color-mix(in srgb, ${c.color} 40%, transparent)` : "none",
                  }}
                >
                  <span
                    className="inline-block w-[18px] h-[18px] align-middle mr-1.5 [&>svg]:w-full [&>svg]:h-full"
                    style={{ color: c.color }}
                    dangerouslySetInnerHTML={{ __html: CLAN_EMBLEMS[k] }}
                  />
                  {c.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* En-tête */}
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">En-tête</h2>
          <Field label="Nom du personnage">
            <input className="hnk-input" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Uchiha Kaito" />
          </Field>
          <Field label="Surnom / citation (sous-titre)">
            <input className="hnk-input" value={d.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="« Celui qui regarde brûler le monde… »" />
          </Field>
        </section>

        {/* Personnage */}
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Personnage</h2>
          <Field label="URL de l'avatar (portrait)">
            <input className="hnk-input" value={d.avatarUrl} onChange={(e) => set("avatarUrl", e.target.value)} placeholder="https://i.imgur.com/…" />
            <p className="text-smoke text-[11px] mt-1">
              Cadre <strong className="text-bone">200 × 280 px</strong> (portrait, ratio ~5:7). L'image est recadrée pour remplir le cadre — fournis de préférence un portrait, idéalement ≥ 400 × 560 px.
            </p>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Naissance">
              <input className="hnk-input" value={d.age} onChange={(e) => set("age", e.target.value)} placeholder="An -12" />
            </Field>
            <Field label="Origine">
              <input className="hnk-input" value={d.origine} onChange={(e) => set("origine", e.target.value)} placeholder="Konohagakure no Sato" />
            </Field>
          </div>
          <Field label="Trame (départ avancé)">
            <select className="hnk-input" value={d.trame} onChange={(e) => set("trame", e.target.value)}>
              <option value="">Sans trame (sans départ avancé)</option>
              {TRAMES.map((g) => (
                <optgroup key={g.axe} label={g.axe}>
                  {g.trames.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
        </section>

        {/* Traits */}
        <section className="hnk-panel p-5 space-y-3">
          <h2 className="hnk-section-title mb-1">Traits particuliers</h2>
          <textarea className="hnk-input min-h-[90px]" value={d.traits} onChange={(e) => set("traits", e.target.value)} placeholder="Cicatrice, posture, signe distinctif…" />
        </section>

        {/* Caractère : questions verrouillées */}
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Regards sur le Monde</h2>
          <p className="text-smoke text-xs">Questions imposées — tu n'as qu'à répondre.</p>
          {CHARACTER_QUESTIONS.filter((q) => !q.requiresTrame || d.trame).map((q) => (
            <Field key={q.id} label={q.label}>
              <textarea className="hnk-input min-h-[70px]" value={d.answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
            </Field>
          ))}
        </section>

        {/* Chronologie */}
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Chronologie</h2>
          <p className="text-smoke text-xs">
            Ajoute autant de dates que tu veux — chacune reprend le format de la fresque (date · titre · récit).
          </p>
          {d.chrono.map((e, i) => (
            <div key={i} className="border border-white/10 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <label className="block">
                    <span className="hnk-label block mb-1">Date</span>
                    <input className="hnk-input" value={e.year} onChange={(ev) => setEvent(i, { year: ev.target.value })} placeholder="An 0" />
                  </label>
                  <label className="block col-span-2">
                    <span className="hnk-label block mb-1">Titre</span>
                    <input className="hnk-input" value={e.label} onChange={(ev) => setEvent(i, { label: ev.target.value })} placeholder="Titre de l'événement" />
                  </label>
                </div>
                {d.chrono.length > 1 && (
                  <button type="button" className="text-smoke hover:text-ember text-xl leading-none px-1 mt-6" onClick={() => removeEvent(i)} title="Retirer cette date">
                    ×
                  </button>
                )}
              </div>
              <textarea className="hnk-input min-h-[60px]" value={e.text} onChange={(ev) => setEvent(i, { text: ev.target.value })} placeholder="Récit de l'événement…" />
            </div>
          ))}
          <button
            type="button"
            className="w-full py-2.5 text-[11px] uppercase tracking-[0.22em] font-bold text-ember border border-dashed border-ember/50 hover:bg-ember/10 transition"
            onClick={addEvent}
          >
            + Ajouter une date
          </button>
        </section>

        {/* HRP */}
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Hors-RP</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pseudo joueur">
              <input className="hnk-input" value={d.hrp.pseudo} onChange={(e) => setHrp("pseudo", e.target.value)} />
            </Field>
            <Field label="Trouvé le forum via">
              <input className="hnk-input" value={d.hrp.found} onChange={(e) => setHrp("found", e.target.value)} placeholder="Top-sites, bouche-à-oreille…" />
            </Field>
            <Field label="Parrain">
              <input className="hnk-input" value={d.hrp.parrain} onChange={(e) => setHrp("parrain", e.target.value)} placeholder="Aucun" />
            </Field>
            <Field label="Forum partenaire / autre">
              <input className="hnk-input" value={d.hrp.partenaire} onChange={(e) => setHrp("partenaire", e.target.value)} placeholder="Non / nom du forum" />
            </Field>
          </div>
        </section>
      </div>

      {/* ===================== PREVIEW + EXPORT ===================== */}
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
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={resetAll} title="Effacer la fiche et la sauvegarde locale">
              Réinitialiser
            </button>
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={() => { setImportOpen((s) => !s); setImportMsg(null); }}>
              {importOpen ? "Fermer l'import" : "Importer"}
            </button>
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={() => setShowCode((s) => !s)}>
              {showCode ? "Masquer le code" : "Voir le code"}
            </button>
            <button type="button" className="hnk-btn !py-1.5 !px-3 !text-[10px]" onClick={copy}>
              {copied ? "Copié ✓" : "Copier le code forum"}
            </button>
          </div>
        </div>

        {importOpen && (
          <div className="hnk-panel p-4 space-y-2">
            <p className="hnk-label">Récupérer une fiche depuis son code forum</p>
            <p className="text-smoke text-[11px]">
              Colle le code d'une fiche générée ici : les champs sont réextraits automatiquement.
              Utile si la sauvegarde locale a sauté.
            </p>
            <textarea
              className="hnk-input w-full h-32 font-mono text-[11px] leading-relaxed"
              placeholder="Colle ici le code &lt;div class=&quot;hnk-pres …&quot;&gt;…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button type="button" className="hnk-btn !py-1.5 !px-3 !text-[10px]" onClick={doImport} disabled={!importText.trim()}>
                Charger la fiche
              </button>
              {importMsg && <span className="text-xs text-bone">{importMsg}</span>}
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          title="Aperçu de la fiche"
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

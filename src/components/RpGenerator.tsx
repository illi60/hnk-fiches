"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RichEditor } from "./RichEditor";
import {
  CLAN_EMBLEMS,
  CLAN_KEYS,
  FOUNDING_CLANS,
  type ClanKey,
} from "@/lib/presentation";
import {
  emptyRpPost,
  rpForumHtml,
  parseRpForumHtml,
  type RpParticipant,
  type RpPostData,
} from "@/lib/rp";

const CSS_HREF = "/forum/hnk-presentation.css";
const STORAGE_KEY = "hnk-rp-draft";

export default function RpGenerator() {
  const [d, setD] = useState<RpPostData>(emptyRpPost);
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
        const p = JSON.parse(raw) as Partial<RpPostData>;
        const base = emptyRpPost();
        setD({
          ...base,
          ...p,
          participants:
            Array.isArray(p.participants) && p.participants.length > 0
              ? p.participants.map((pp) => ({
                  pseudo: pp?.pseudo ?? "",
                  avatarUrl: pp?.avatarUrl ?? "",
                }))
              : base.participants,
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
    if (!confirm("Réinitialiser le post ? La sauvegarde locale sera effacée.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setD(emptyRpPost());
    setSavedAt(null);
  }

  function doImport() {
    const res = parseRpForumHtml(importText);
    if (!res) {
      setImportMsg("Code non reconnu. Colle le code d'un post RP généré ici.");
      return;
    }
    setD(res);
    setImportMsg("Post importé ✓");
    setImportText("");
    setImportOpen(false);
  }

  const html = useMemo(() => rpForumHtml(d), [d]);

  // Document de base de l'aperçu : STABLE (ne change jamais) → l'iframe ne se
  // recharge pas quand on tape. On injecte seulement le HTML dans #hnk-root,
  // ce qui préserve la position de scroll de l'aperçu (plus de « saut »).
  const baseDoc = useMemo(
    () =>
      `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<base target="_blank">` +
      `<link rel="stylesheet" href="${CSS_HREF}">` +
      `<script src="/forum/hnk-player.js" defer></script>` +
      `<style>html,body{margin:0;background:#050608}body{padding:24px 16px}</style>` +
      `</head><body><div id="hnk-root"></div></body></html>`,
    []
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Injecte le HTML dans l'iframe sans la recharger (préserve le scroll de
  // l'aperçu). Idempotent : appelé à chaque changement de html ET à chaque
  // (re)chargement de l'iframe.
  function injectPreview() {
    const root = iframeRef.current?.contentDocument?.getElementById("hnk-root");
    if (root) root.innerHTML = html;
  }
  useEffect(injectPreview, [html]);

  function set<K extends keyof RpPostData>(key: K, value: RpPostData[K]) {
    setD((p) => ({ ...p, [key]: value }));
  }
  function setParticipant(i: number, patch: Partial<RpParticipant>) {
    setD((p) => ({
      ...p,
      participants: p.participants.map((pp, idx) => (idx === i ? { ...pp, ...patch } : pp)),
    }));
  }
  function addParticipant() {
    setD((p) => ({ ...p, participants: [...p.participants, { pseudo: "", avatarUrl: "" }] }));
  }
  function removeParticipant(i: number) {
    setD((p) => ({ ...p, participants: p.participants.filter((_, idx) => idx !== i) }));
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
        {/* Ambiance / couleur */}
        <section className="hnk-panel p-5">
          <h2 className="hnk-section-title mb-4">Ambiance du post</h2>
          <p className="text-smoke text-xs mb-3">
            Clan / groupe dont la couleur teinte le post (liserés, kanji, séparateurs).
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

        {/* Bannière */}
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Bannière</h2>
          <Field label="URL de l'image de bannière">
            <input
              className="hnk-input"
              value={d.banniereUrl}
              onChange={(e) => set("banniereUrl", e.target.value)}
              placeholder="https://i.imgur.com/…"
            />
            <p className="text-smoke text-[11px] mt-1">
              Format <strong className="text-bone">paysage large</strong> (≈ 1000 × 420 px). L'image est recadrée
              pour remplir la bannière — fournis un visuel panoramique. Laisse vide pour la bannière par défaut
              (porte de Konoha).
            </p>
          </Field>
        </section>

        {/* En-tête */}
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">En-tête</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Lieu du RP">
              <input
                className="hnk-input"
                value={d.lieu}
                onChange={(e) => set("lieu", e.target.value)}
                placeholder="Quartier des braises"
              />
            </Field>
            <Field label="Mention (date / moment)">
              <input
                className="hnk-input"
                value={d.tag}
                onChange={(e) => set("tag", e.target.value)}
                placeholder="Nuit · An 0"
              />
            </Field>
          </div>
          <Field label="Titre du RP">
            <input
              className="hnk-input"
              value={d.titre}
              onChange={(e) => set("titre", e.target.value)}
              placeholder="Titre du RP"
            />
          </Field>
          <Field label="Citation (sous le titre)">
            <input
              className="hnk-input"
              value={d.citation}
              onChange={(e) => set("citation", e.target.value)}
              placeholder="« Une petite citation »"
            />
          </Field>
        </section>

        {/* Corps */}
        <section className="hnk-panel p-5 space-y-3">
          <h2 className="hnk-section-title mb-1">Corps du post</h2>
          <p className="text-smoke text-xs">
            Le texte de ton RP. Utilise la barre d'outils pour le gras / l'italique / l'alignement. Saute une
            ligne (double entrée) pour séparer tes paragraphes.
          </p>
          <RichEditor
            value={d.corps}
            onChange={(html) => set("corps", html)}
            minHeight="260px"
            placeholder="Lorem ipsum dolor sit amet…"
            withColor
            withBlocks
          />
        </section>

        {/* Participants */}
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Participants</h2>
          <p className="text-smoke text-xs">
            Affichés dans le pied du post (emblème du clan + pseudo). Ajoute-en autant que de joueurs.
          </p>
          {d.participants.map((p, i) => (
            <div key={i} className="border border-white/10 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <label className="block">
                    <span className="hnk-label block mb-1">Pseudo</span>
                    <input
                      className="hnk-input"
                      value={p.pseudo}
                      onChange={(e) => setParticipant(i, { pseudo: e.target.value })}
                      placeholder={`Pseudo ${i + 1}`}
                    />
                  </label>
                  <label className="block">
                    <span className="hnk-label block mb-1">Avatar (URL)</span>
                    <input
                      className="hnk-input"
                      value={p.avatarUrl}
                      onChange={(e) => setParticipant(i, { avatarUrl: e.target.value })}
                      placeholder="https://i.imgur.com/…"
                    />
                  </label>
                </div>
                {d.participants.length > 1 && (
                  <button
                    type="button"
                    className="text-smoke hover:text-ember text-xl leading-none px-1 mt-6"
                    onClick={() => removeParticipant(i)}
                    title="Retirer ce participant"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="w-full py-2.5 text-[11px] uppercase tracking-[0.22em] font-bold text-ember border border-dashed border-ember/50 hover:bg-ember/10 transition"
            onClick={addParticipant}
          >
            + Ajouter un participant
          </button>
        </section>

        {/* Type de RP */}
        <section className="hnk-panel p-5 space-y-3">
          <h2 className="hnk-section-title mb-1">Type de RP</h2>
          <Field label="Type (coin bas droit)">
            <input
              className="hnk-input"
              value={d.type}
              onChange={(e) => set("type", e.target.value)}
              placeholder="Libre / Trivia / Event…"
            />
          </Field>
        </section>

        {/* Résumé du tour (deuxième box) */}
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Résumé du tour</h2>
          <p className="text-smoke text-xs">
            Deuxième box affichée sous le post : l'état de combat et les actions du tour. Laisse tout vide pour
            ne pas l'afficher.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Santé">
              <input
                className="hnk-input"
                value={d.sante}
                onChange={(e) => set("sante", e.target.value)}
                placeholder="En forme, fatigué, blessé, blessé grièvement…"
              />
            </Field>
            <Field label="Chakra">
              <input
                className="hnk-input"
                value={d.chakra}
                onChange={(e) => set("chakra", e.target.value)}
                placeholder="Nombre d'actions effectuées"
              />
            </Field>
          </div>
          <div>
            <span className="hnk-label block mb-1">Résumé des actions</span>
            <RichEditor
              value={d.actions}
              onChange={(html) => set("actions", html)}
              minHeight="120px"
              placeholder="Déroulé des actions du tour…"
              withColor
            />
          </div>
          <Field label="Techniques utilisées (codes de la fiche technique)">
            <textarea
              className="hnk-input w-full h-32 font-mono text-[11px] leading-relaxed"
              value={d.techniques}
              onChange={(e) => set("techniques", e.target.value)}
              placeholder="Colle ici les codes de tes techniques (depuis la fiche technique automatisée)…"
            />
            <p className="text-smoke text-[11px] mt-1">
              Zone de passe-plat : les codes sont insérés <strong className="text-bone">tels quels</strong> et{" "}
              <strong className="text-bone">masqués sous balises [HIDE]</strong> sur le forum.
            </p>
          </Field>
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
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={resetAll} title="Effacer le post et la sauvegarde locale">
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
            <p className="hnk-label">Récupérer un post depuis son code forum</p>
            <p className="text-smoke text-[11px]">
              Colle le code d'un post RP généré ici : les champs sont réextraits automatiquement.
              Utile si la sauvegarde locale a sauté.
            </p>
            <textarea
              className="hnk-input w-full h-32 font-mono text-[11px] leading-relaxed"
              placeholder="Colle ici le HTML complet d'un post généré (la ou les box)…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button type="button" className="hnk-btn !py-1.5 !px-3 !text-[10px]" onClick={doImport} disabled={!importText.trim()}>
                Charger le post
              </button>
              {importMsg && <span className="text-xs text-bone">{importMsg}</span>}
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          title="Aperçu du post RP"
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

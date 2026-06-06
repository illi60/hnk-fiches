"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RichEditor } from "./RichEditor";
import {
  ACC_CATEGORIES,
  CLAN_EMBLEMS,
  CLAN_KEYS,
  FOUNDING_CLANS,
  GRADES,
  SENTIMENTS,
  TRAMES,
  carnetForumHtml,
  emptyCarnet,
  emptyLien,
  parseCarnetForumHtml,
  type AccCategory,
  type CarnetData,
  type CarnetTab,
  type ChronoItem,
  type ClanKey,
  type LienItem,
  type Sentiment,
} from "@/lib/carnet";

const CSS_HREF = "/forum/hnk-presentation.css";
const STORAGE_KEY = "hnk-carnet-draft";

const TABS: { id: CarnetTab; label: string }[] = [
  { id: "personnage", label: "Personnage" },
  { id: "liens", label: "Liens" },
  { id: "chrono", label: "Chronologie" },
  { id: "accomplissements", label: "Accomplissements" },
];

export default function CarnetGenerator() {
  const [c, setC] = useState<CarnetData>(emptyCarnet);
  const [tab, setTab] = useState<CarnetTab>("personnage");
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const TAB_LABELS: Record<CarnetTab, string> = {
    personnage: "Personnage",
    liens: "Liens",
    chrono: "Chronologie",
    accomplissements: "Accomplissements",
  };

  function doImport() {
    const res = parseCarnetForumHtml(importText);
    if (!res) {
      setImportMsg("Code non reconnu. Colle le code d'un bloc de carnet (Personnage, Liens, Chronologie ou Accomplissements).");
      return;
    }
    setC((prev) => {
      const next: CarnetData = {
        ...prev,
        clan: res.clan,
        name: res.name || prev.name,
        subtitle: res.subtitle || prev.subtitle,
      };
      if (res.section === "personnage" && res.personnage) next.personnage = res.personnage;
      if (res.section === "liens" && res.liens) next.liens = res.liens;
      if (res.section === "chrono" && res.chrono) next.chrono = res.chrono;
      if (res.section === "accomplissements" && res.accomplissements)
        next.accomplissements = res.accomplissements;
      return next;
    });
    setTab(res.section);
    setImportMsg(`Bloc « ${TAB_LABELS[res.section]} » importé ✓`);
    setImportText("");
    setImportOpen(false);
  }

  // Restauration locale (sans compte) au montage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<CarnetData>;
        const base = emptyCarnet();
        setC({
          ...base,
          ...p,
          personnage: { ...base.personnage, ...(p.personnage ?? {}) },
          liens: Array.isArray(p.liens) && p.liens.length ? p.liens : base.liens,
          chrono: Array.isArray(p.chrono) && p.chrono.length ? p.chrono : base.chrono,
          accomplissements:
            Array.isArray(p.accomplissements) && p.accomplissements.length
              ? p.accomplissements
              : base.accomplissements,
        });
        setSavedAt("restauré");
      }
    } catch {
      /* localStorage indisponible : on ignore. */
    }
    setLoaded(true);
  }, []);

  // Sauvegarde automatique des 4 générateurs (un seul carnet).
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
      setSavedAt("enregistré ✓");
    } catch {
      /* ignore */
    }
  }, [c, loaded]);

  function resetAll() {
    if (!confirm("Réinitialiser le carnet entier ? La sauvegarde locale sera effacée.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setC(emptyCarnet());
    setSavedAt(null);
  }

  // HTML du bloc affiché (= onglet actif) → c'est ce qu'on copie.
  const html = useMemo(() => carnetForumHtml(c, tab), [c, tab]);

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

  // ---- setters ----
  function setRoot<K extends keyof CarnetData>(key: K, value: CarnetData[K]) {
    setC((p) => ({ ...p, [key]: value }));
  }
  function setPerso<K extends keyof CarnetData["personnage"]>(
    key: K,
    value: CarnetData["personnage"][K]
  ) {
    setC((p) => ({ ...p, personnage: { ...p.personnage, [key]: value } }));
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

  const activeLabel = TABS.find((t) => t.id === tab)?.label ?? "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
      {/* ===================== FORMULAIRE ===================== */}
      <div className="space-y-7 lg:col-span-4">
        {/* Identité partagée : clan + nom + sous-titre (communs aux 4 blocs) */}
        <section className="hnk-panel p-5 space-y-4">
          <h2 className="hnk-section-title mb-1">Identité du carnet</h2>
          <p className="text-smoke text-xs">
            Partagée par les 4 blocs : teinte la fiche et alimente chaque en-tête.
          </p>
          <div className="flex flex-wrap gap-2">
            {CLAN_KEYS.map((k) => {
              const cl = FOUNDING_CLANS[k];
              const active = c.clan === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setRoot("clan", k as ClanKey)}
                  className="px-3 py-2 text-[11px] uppercase tracking-[0.18em] font-bold border transition"
                  style={{
                    borderColor: active ? cl.color : "rgba(219,222,226,0.18)",
                    color: active ? "#fff" : "#dbdee2",
                    background: active ? `color-mix(in srgb, ${cl.color} 22%, transparent)` : "transparent",
                    boxShadow: active ? `0 0 16px color-mix(in srgb, ${cl.color} 40%, transparent)` : "none",
                  }}
                >
                  <span
                    className="inline-block w-[18px] h-[18px] align-middle mr-1.5 [&>svg]:w-full [&>svg]:h-full"
                    style={{ color: cl.color }}
                    dangerouslySetInnerHTML={{ __html: CLAN_EMBLEMS[k] }}
                  />
                  {cl.label}
                </button>
              );
            })}
          </div>
          <Field label="Nom du personnage">
            <input className="hnk-input" value={c.name} onChange={(e) => setRoot("name", e.target.value)} placeholder="Uchiha Kaito" />
          </Field>
          <Field label="Sous-titre / citation">
            <input className="hnk-input" value={c.subtitle} onChange={(e) => setRoot("subtitle", e.target.value)} placeholder="« Le feu ne s'éteint jamais… »" />
          </Field>
        </section>

        {/* Onglets */}
        <section className="hnk-panel p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="px-3 py-2 text-[11px] uppercase tracking-[0.16em] font-bold border transition"
                  style={{
                    borderColor: active ? "var(--ember,#ff5722)" : "rgba(219,222,226,0.18)",
                    color: active ? "#fff" : "#dbdee2",
                    background: active ? "rgba(255,87,34,0.16)" : "transparent",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "personnage" && <PersonnageForm c={c} setPerso={setPerso} setC={setC} />}
          {tab === "liens" && <LiensForm c={c} setC={setC} />}
          {tab === "chrono" && <ChronoForm c={c} setC={setC} />}
          {tab === "accomplissements" && <AccForm c={c} setC={setC} />}
        </section>
      </div>

      {/* ===================== PREVIEW + EXPORT ===================== */}
      <div className="space-y-4 lg:col-span-8 lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="hnk-eyebrow">Aperçu · {activeLabel}</span>
            {savedAt && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-smoke" title="Sauvegarde automatique dans ce navigateur">
                · {savedAt}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={resetAll} title="Effacer le carnet et la sauvegarde locale">
              Réinitialiser
            </button>
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={() => { setImportOpen((s) => !s); setImportMsg(null); }}>
              {importOpen ? "Fermer l'import" : "Importer"}
            </button>
            <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={() => setShowCode((s) => !s)}>
              {showCode ? "Masquer le code" : "Voir le code"}
            </button>
            <button type="button" className="hnk-btn !py-1.5 !px-3 !text-[10px]" onClick={copy}>
              {copied ? "Copié ✓" : `Copier le code · ${activeLabel}`}
            </button>
          </div>
        </div>

        <p className="text-smoke text-[11px]">
          Chaque onglet produit son propre code à coller dans un message distinct du sujet « Carnet de bord ».
        </p>

        {importOpen && (
          <div className="hnk-panel p-4 space-y-2">
            <p className="hnk-label">Récupérer un bloc depuis son code forum</p>
            <p className="text-smoke text-[11px]">
              Colle le code d'<strong className="text-bone">un seul bloc</strong> (Personnage, Liens, Chronologie ou
              Accomplissements). Le bon onglet est détecté automatiquement et rempli. Utile si la sauvegarde locale a sauté.
            </p>
            <textarea
              className="hnk-input w-full h-32 font-mono text-[11px] leading-relaxed"
              placeholder="Colle ici le code &lt;div class=&quot;hnk-pres …&quot;&gt;…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button type="button" className="hnk-btn !py-1.5 !px-3 !text-[10px]" onClick={doImport} disabled={!importText.trim()}>
                Charger ce bloc
              </button>
              {importMsg && <span className="text-xs text-bone">{importMsg}</span>}
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          title="Aperçu du carnet"
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

/* ============================================================
   ONGLET 1 — PERSONNAGE
   ============================================================ */
function PersonnageForm({
  c,
  setPerso,
  setC,
}: {
  c: CarnetData;
  setPerso: <K extends keyof CarnetData["personnage"]>(key: K, value: CarnetData["personnage"][K]) => void;
  setC: React.Dispatch<React.SetStateAction<CarnetData>>;
}) {
  const p = c.personnage;

  function setList(field: "qualites" | "defauts", i: number, value: string) {
    setC((prev) => {
      const arr = prev.personnage[field].map((x, idx) => (idx === i ? value : x));
      return { ...prev, personnage: { ...prev.personnage, [field]: arr } };
    });
  }
  function addItem(field: "qualites" | "defauts") {
    setC((prev) => ({ ...prev, personnage: { ...prev.personnage, [field]: [...prev.personnage[field], ""] } }));
  }
  function removeItem(field: "qualites" | "defauts", i: number) {
    setC((prev) => ({
      ...prev,
      personnage: { ...prev.personnage, [field]: prev.personnage[field].filter((_, idx) => idx !== i) },
    }));
  }

  return (
    <div className="space-y-5 pt-2">
      <Field label="URL de l'avatar (portrait)">
        <input className="hnk-input" value={p.avatarUrl} onChange={(e) => setPerso("avatarUrl", e.target.value)} placeholder="https://i.imgur.com/…" />
        <p className="text-smoke text-[11px] mt-1">
          Cadre <strong className="text-bone">200 × 280 px</strong> (portrait). L'image est recadrée pour remplir le cadre.
        </p>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Origine">
          <input className="hnk-input" value={p.origine} onChange={(e) => setPerso("origine", e.target.value)} placeholder="Konohagakure" />
        </Field>
        <Field label="Naissance">
          <input className="hnk-input" value={p.naissance} onChange={(e) => setPerso("naissance", e.target.value)} placeholder="An -12" />
        </Field>
      </div>
      <Field label="Trame">
        <select className="hnk-input" value={p.trame} onChange={(e) => setPerso("trame", e.target.value)}>
          <option value="">Sans trame</option>
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
      <Field label="Grade">
        <select className="hnk-input" value={p.grade} onChange={(e) => setPerso("grade", e.target.value)}>
          <option value="">—</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </Field>

      <div className="border-t border-white/10 pt-4 space-y-4">
        <h3 className="hnk-label">Traits particuliers</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Timbre de voix">
            <input className="hnk-input" value={p.voix} onChange={(e) => setPerso("voix", e.target.value)} placeholder="Grave, posée" />
          </Field>
          <Field label="Démarche">
            <input className="hnk-input" value={p.demarche} onChange={(e) => setPerso("demarche", e.target.value)} placeholder="Souple, féline" />
          </Field>
        </div>
        <Field label="Signes distinctifs">
          <input className="hnk-input" value={p.signes} onChange={(e) => setPerso("signes", e.target.value)} placeholder="Cicatrice à l'œil, tatouage…" />
        </Field>
        <div>
          <span className="hnk-label block mb-1">Autres détails (texte libre)</span>
          <RichEditor value={p.traitsLibre} onChange={(html) => setPerso("traitsLibre", html)} minHeight="80px" placeholder="Tics, accessoires, parfum…" />
        </div>
      </div>

      <div className="border-t border-white/10 pt-4 space-y-4">
        <h3 className="hnk-label">Caractère</h3>
        <ListEditor
          title="Qualités"
          items={p.qualites}
          onChange={(i, v) => setList("qualites", i, v)}
          onAdd={() => addItem("qualites")}
          onRemove={(i) => removeItem("qualites", i)}
          placeholder="Loyal"
        />
        <ListEditor
          title="Défauts"
          items={p.defauts}
          onChange={(i, v) => setList("defauts", i, v)}
          onAdd={() => addItem("defauts")}
          onRemove={(i) => removeItem("defauts", i)}
          placeholder="Rancunier"
        />
      </div>

      <div className="border-t border-white/10 pt-4">
        <div>
          <span className="hnk-label block mb-1">Ambitions (résumé)</span>
          <RichEditor value={p.ambitions} onChange={(html) => setPerso("ambitions", html)} minHeight="90px" placeholder="Ce que vise ton personnage, en quelques phrases." />
        </div>
      </div>
    </div>
  );
}

function ListEditor({
  title,
  items,
  onChange,
  onAdd,
  onRemove,
  placeholder,
}: {
  title: string;
  items: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <span className="hnk-label block">{title}</span>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input className="hnk-input flex-1" value={it} onChange={(e) => onChange(i, e.target.value)} placeholder={placeholder} />
          <button type="button" className="text-smoke hover:text-ember text-xl leading-none px-2" onClick={() => onRemove(i)} title="Retirer">
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="w-full py-2 text-[11px] uppercase tracking-[0.2em] font-bold text-ember border border-dashed border-ember/50 hover:bg-ember/10 transition"
        onClick={onAdd}
      >
        + Ajouter
      </button>
    </div>
  );
}

/* ============================================================
   ONGLET 2 — LIENS
   ============================================================ */
function LiensForm({ c, setC }: { c: CarnetData; setC: React.Dispatch<React.SetStateAction<CarnetData>> }) {
  function patchLien(i: number, patch: Partial<LienItem>) {
    setC((prev) => ({ ...prev, liens: prev.liens.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));
  }
  function addLien() {
    setC((prev) => ({ ...prev, liens: [...prev.liens, emptyLien()] }));
  }
  function removeLien(i: number) {
    setC((prev) => ({ ...prev, liens: prev.liens.filter((_, idx) => idx !== i) }));
  }
  function patchRp(li: number, ri: number, patch: Partial<{ title: string; url: string }>) {
    setC((prev) => ({
      ...prev,
      liens: prev.liens.map((l, idx) =>
        idx === li ? { ...l, rps: l.rps.map((r, j) => (j === ri ? { ...r, ...patch } : r)) } : l
      ),
    }));
  }
  function addRp(li: number) {
    setC((prev) => ({
      ...prev,
      liens: prev.liens.map((l, idx) => (idx === li ? { ...l, rps: [...l.rps, { title: "", url: "" }] } : l)),
    }));
  }
  function removeRp(li: number, ri: number) {
    setC((prev) => ({
      ...prev,
      liens: prev.liens.map((l, idx) => (idx === li ? { ...l, rps: l.rps.filter((_, j) => j !== ri) } : l)),
    }));
  }

  return (
    <div className="space-y-5 pt-2">
      <p className="text-smoke text-xs">
        Une carte par relation. Force exprimée en étoiles : <strong className="text-bone">dorées</strong> pour les
        appréciés, <strong className="text-bone">rouges</strong> pour les ennemis.
      </p>
      {c.liens.map((l, i) => (
        <div key={i} className="border border-white/10 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="hnk-label">Lien #{i + 1}</span>
            {c.liens.length > 1 && (
              <button type="button" className="text-smoke hover:text-ember text-xl leading-none px-1" onClick={() => removeLien(i)} title="Retirer ce lien">
                ×
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pseudo">
              <input className="hnk-input" value={l.pseudo} onChange={(e) => patchLien(i, { pseudo: e.target.value })} placeholder="Hyûga Rin" />
            </Field>
            <Field label="Nature du lien">
              <input className="hnk-input" value={l.nature} onChange={(e) => patchLien(i, { nature: e.target.value })} placeholder="Rival · Mentor…" />
            </Field>
          </div>
          <Field label="URL avatar (carré)">
            <input className="hnk-input" value={l.avatarUrl} onChange={(e) => patchLien(i, { avatarUrl: e.target.value })} placeholder="https://i.imgur.com/…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sentiment">
              <select className="hnk-input" value={l.sentiment} onChange={(e) => patchLien(i, { sentiment: e.target.value as Sentiment })}>
                {(Object.keys(SENTIMENTS) as Sentiment[]).map((s) => (
                  <option key={s} value={s}>
                    {SENTIMENTS[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Force : ${l.force}/5`}>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={l.force}
                onChange={(e) => patchLien(i, { force: Number(e.target.value) })}
                className="w-full accent-ember"
              />
            </Field>
          </div>
          <div>
            <span className="hnk-label block mb-1">Description</span>
            <RichEditor value={l.desc} onChange={(html) => patchLien(i, { desc: html })} minHeight="70px" placeholder="Quelques mots sur la relation…" />
          </div>

          <div className="space-y-2">
            <span className="hnk-label block">RP communs (titre + lien)</span>
            {l.rps.map((r, ri) => (
              <div key={ri} className="flex gap-2">
                <input className="hnk-input flex-1" value={r.title} onChange={(e) => patchRp(i, ri, { title: e.target.value })} placeholder="Titre du RP" />
                <input className="hnk-input flex-1" value={r.url} onChange={(e) => patchRp(i, ri, { url: e.target.value })} placeholder="https://…" />
                <button type="button" className="text-smoke hover:text-ember text-xl leading-none px-1" onClick={() => removeRp(i, ri)} title="Retirer">
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="w-full py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-ember border border-dashed border-ember/50 hover:bg-ember/10 transition"
              onClick={() => addRp(i)}
            >
              + RP commun
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="w-full py-2.5 text-[11px] uppercase tracking-[0.22em] font-bold text-ember border border-dashed border-ember/50 hover:bg-ember/10 transition"
        onClick={addLien}
      >
        + Ajouter un lien
      </button>
    </div>
  );
}

/* ============================================================
   ONGLET 3 — CHRONOLOGIE
   ============================================================ */
function ChronoForm({ c, setC }: { c: CarnetData; setC: React.Dispatch<React.SetStateAction<CarnetData>> }) {
  function patch(i: number, p: { date?: string; title?: string; url?: string; text?: string }) {
    setC((prev) => ({
      ...prev,
      chrono: prev.chrono.map((it, idx) => (idx === i ? ({ ...it, ...p } as ChronoItem) : it)),
    }));
  }
  function addRp() {
    setC((prev) => ({ ...prev, chrono: [...prev.chrono, { kind: "rp", date: "", title: "", url: "", text: "" }] }));
  }
  function addInterlude() {
    setC((prev) => ({ ...prev, chrono: [...prev.chrono, { kind: "interlude", title: "", text: "" }] }));
  }
  function remove(i: number) {
    setC((prev) => ({ ...prev, chrono: prev.chrono.filter((_, idx) => idx !== i) }));
  }
  function move(i: number, dir: -1 | 1) {
    setC((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.chrono.length) return prev;
      const arr = [...prev.chrono];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...prev, chrono: arr };
    });
  }

  return (
    <div className="space-y-4 pt-2">
      <p className="text-smoke text-xs">
        Liste de RP (le titre devient un lien cliquable). Insère des <strong className="text-bone">interludes</strong> pour
        découper tes mini-arcs.
      </p>
      {c.chrono.map((it, i) => (
        <div key={i} className="border border-white/10 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="hnk-label">
              {it.kind === "interlude" ? "✦ Interlude" : "RP"} #{i + 1}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" className="text-smoke hover:text-bone px-1" onClick={() => move(i, -1)} title="Monter">
                ↑
              </button>
              <button type="button" className="text-smoke hover:text-bone px-1" onClick={() => move(i, 1)} title="Descendre">
                ↓
              </button>
              {c.chrono.length > 1 && (
                <button type="button" className="text-smoke hover:text-ember text-xl leading-none px-1" onClick={() => remove(i)} title="Retirer">
                  ×
                </button>
              )}
            </div>
          </div>

          {it.kind === "rp" ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Date">
                  <input className="hnk-input" value={it.date} onChange={(e) => patch(i, { date: e.target.value })} placeholder="An 0" />
                </Field>
                <label className="block col-span-2">
                  <span className="hnk-label block mb-1">Titre du RP</span>
                  <input className="hnk-input" value={it.title} onChange={(e) => patch(i, { title: e.target.value })} placeholder="La nuit des braises" />
                </label>
              </div>
              <Field label="Lien du RP">
                <input className="hnk-input" value={it.url} onChange={(e) => patch(i, { url: e.target.value })} placeholder="https://hi-no-kuni.forumactif.com/t…" />
              </Field>
              <div>
                <span className="hnk-label block mb-1">Description</span>
                <RichEditor value={it.text} onChange={(html) => patch(i, { text: html })} minHeight="60px" placeholder="Ce qui s'y joue, en bref…" />
              </div>
            </>
          ) : (
            <>
              <Field label="Titre de l'interlude (arc)">
                <input className="hnk-input" value={it.title} onChange={(e) => patch(i, { title: e.target.value })} placeholder="— Arc I : Les cendres —" />
              </Field>
              <div>
                <span className="hnk-label block mb-1">Texte</span>
                <RichEditor value={it.text} onChange={(html) => patch(i, { text: html })} minHeight="70px" placeholder="Quelques lignes stylisées de transition…" />
              </div>
            </>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.18em] font-bold text-ember border border-dashed border-ember/50 hover:bg-ember/10 transition"
          onClick={addRp}
        >
          + RP
        </button>
        <button
          type="button"
          className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.18em] font-bold text-bone/70 border border-dashed border-white/20 hover:bg-white/5 transition"
          onClick={addInterlude}
        >
          + Interlude
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ONGLET 4 — ACCOMPLISSEMENTS
   ============================================================ */
function AccForm({ c, setC }: { c: CarnetData; setC: React.Dispatch<React.SetStateAction<CarnetData>> }) {
  function patch(i: number, patch: Partial<{ category: AccCategory; date: string; title: string; text: string }>) {
    setC((prev) => ({ ...prev, accomplissements: prev.accomplissements.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));
  }
  function add() {
    setC((prev) => ({ ...prev, accomplissements: [...prev.accomplissements, { category: "village", date: "", title: "", text: "" }] }));
  }
  function remove(i: number) {
    setC((prev) => ({ ...prev, accomplissements: prev.accomplissements.filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="space-y-4 pt-2">
      <p className="text-smoke text-xs">
        Exploits pour le village, le clan ou l'avancée de ta trame. En cas de doute sur les conditions, réfère-toi au
        règlement du forum.
      </p>
      {c.accomplissements.map((a, i) => (
        <div key={i} className="border border-white/10 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="hnk-label">Accomplissement #{i + 1}</span>
            {c.accomplissements.length > 1 && (
              <button type="button" className="text-smoke hover:text-ember text-xl leading-none px-1" onClick={() => remove(i)} title="Retirer">
                ×
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie">
              <select className="hnk-input" value={a.category} onChange={(e) => patch(i, { category: e.target.value as AccCategory })}>
                {(Object.keys(ACC_CATEGORIES) as AccCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {ACC_CATEGORIES[k].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date (optionnel)">
              <input className="hnk-input" value={a.date} onChange={(e) => patch(i, { date: e.target.value })} placeholder="An 1" />
            </Field>
          </div>
          <Field label="Titre">
            <input className="hnk-input" value={a.title} onChange={(e) => patch(i, { title: e.target.value })} placeholder="Défense du mur Est" />
          </Field>
          <div>
            <span className="hnk-label block mb-1">Description</span>
            <RichEditor value={a.text} onChange={(html) => patch(i, { text: html })} minHeight="60px" placeholder="Ce qui a été accompli, et son impact…" />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="w-full py-2.5 text-[11px] uppercase tracking-[0.22em] font-bold text-ember border border-dashed border-ember/50 hover:bg-ember/10 transition"
        onClick={add}
      >
        + Ajouter un accomplissement
      </button>
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

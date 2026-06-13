"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  /** Hauteur max : au-delà, la zone défile au lieu de s'agrandir. */
  maxHeight?: string;
  /** Active la palette de couleurs de texte. */
  withColor?: boolean;
  /** Active les blocs spéciaux : bulle de dialogue + player YouTube. */
  withBlocks?: boolean;
}

// Classes autorisées à survivre au nettoyage (blocs spéciaux de l'éditeur).
const ALLOWED_CLASSES = new Set([
  "hnk-img-banner",
  "hnk-rp-bubble",
  "hnk-rp-bubble-ava",
  "hnk-rp-bubble-ava--empty",
  "hnk-rp-bubble-tx",
  "hnk-rp-player",
  "hnk-rp-player-btn",
  "hnk-rp-player-lab",
  "hnk-rp-player-eq",
]);

// Seul href autorisé sur un lien-player : l'URL watch reconstruite par NOUS
// depuis l'ID (Forumactif préserve les liens, contrairement aux iframes).
const YT_WATCH_RE = /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{6,15}$/;

// Extrait l'ID vidéo d'une URL YouTube (watch, youtu.be, shorts, embed, live)
// ou accepte un ID nu de 11 caractères. null si non reconnu.
export function ytVideoId(input: string): string | null {
  const s = (input ?? "").trim();
  const m = s.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/i
  );
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}

// Nettoyage du HTML émis par l'éditeur. On ne garde que :
//  - les balises de mise en forme (b, i, u, s, br, div, span, figure, img…) ;
//  - les styles inline `text-align` (alignement) et `color` (couleur de texte
//    posée via la palette) ;
//  - les classes des blocs spéciaux (ALLOWED_CLASSES) et `src`/`alt` sur les
//    images ; les iframes uniquement si leur src est un embed YouTube.
// Tout le reste (polices, tailles, fonds collés ou injectés par Chrome via
// execCommand) est SUPPRIMÉ : c'est ce qui faisait « sauter » la police de la
// fiche sur le forum. Fonction idempotente (sanitize(sanitize(x)) ==
// sanitize(x)) : indispensable pour la synchro DOM ↔ valeur React.
function sanitizeHtml(raw: string): string {
  if (typeof document === "undefined") return raw;
  const box = document.createElement("div");
  box.innerHTML = raw;
  box.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const align = (el as HTMLElement).style.textAlign;
    const color = (el as HTMLElement).style.color;
    const cls = (el.getAttribute("class") ?? "")
      .split(/\s+/)
      .filter((c) => ALLOWED_CLASSES.has(c));
    const src = tag === "img" ? el.getAttribute("src") : null;
    const alt = tag === "img" ? el.getAttribute("alt") : null;
    const href = tag === "a" ? el.getAttribute("href") : null;
    // Purge tous les attributs, puis on réintroduit uniquement ceux autorisés.
    [...el.attributes].forEach((a) => el.removeAttribute(a.name));
    if (align) (el as HTMLElement).style.textAlign = align;
    if (color) (el as HTMLElement).style.color = color;
    if (tag === "figure") el.setAttribute("class", "hnk-img-banner");
    else if (cls.length) el.setAttribute("class", cls.join(" "));
    if (tag === "img") {
      if (src) el.setAttribute("src", src);
      if (alt) el.setAttribute("alt", alt);
    }
    // Lien-player : href YouTube whitelisté ; cible un nouvel onglet en
    // secours (sans le script hnk-player.js, le lien ouvre YouTube).
    if (tag === "a" && cls.includes("hnk-rp-player") && href && YT_WATCH_RE.test(href)) {
      el.setAttribute("href", href);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    }
    // Les iframes ne survivent pas au nettoyage Forumactif → jamais émises.
    if (tag === "iframe") el.remove();
  });
  return box.innerHTML;
}

// Patterns that represent a "truly empty" contenteditable state.
const EMPTY_PATTERNS = new Set([
  "",
  "<br>",
  "<p></p>",
  "<p><br></p>",
  "<div></div>",
  "<div><br></div>",
]);

// Palette de couleurs proposées (teintes du forum : ember, clans, neutres).
const TEXT_COLORS = [
  "#ff5722",
  "#C0392B",
  "#E67E22",
  "#C99B3A",
  "#3FA34D",
  "#5E83A8",
  "#8E7CC3",
  "#e23b2e",
  "#f5f1ea",
  "#6c7079",
];

type Dialog = null | "img" | "bubble" | "yt";

function ToolBtn({
  active,
  onExec,
  title,
  children,
}: {
  active: boolean;
  onExec: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onExec();
      }}
      className={`hnk-rich-btn${active ? " hnk-rich-btn--on" : ""}`}
    >
      {children}
    </button>
  );
}

export function RichEditor({
  value,
  onChange,
  placeholder = "",
  minHeight = "80px",
  maxHeight,
  withColor = false,
  withBlocks = false,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(value);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dlgUrl, setDlgUrl] = useState("");
  const [dlgLabel, setDlgLabel] = useState("");
  const [showColors, setShowColors] = useState(false);
  const savedRange = useRef<Range | null>(null);
  const [fmt, setFmt] = useState<Record<string, boolean>>({});

  // Sync external value into the editor (uniquement si le contenu diffère
  // réellement). On compare la version NETTOYÉE du DOM à `value` : ainsi, après
  // une frappe, la valeur sanitizée renvoyée au parent ne provoque pas de
  // réécriture du DOM (qui déplacerait le curseur).
  useEffect(() => {
    const ed = editorRef.current;
    if (ed && sanitizeHtml(ed.innerHTML) !== value) {
      ed.innerHTML = value;
      lastHtml.current = ed.innerHTML;
    }
  }, [value]);

  // On ne stocke JAMAIS le HTML brut de l'éditeur : execCommand/Chrome y
  // injecte des artefacts (spans de fond, styles de police inline) qui
  // écraseraient le rendu de la fiche sur le forum. On ne conserve que le
  // strict nécessaire : balises de mise en forme + `text-align` + `color`.
  const emit = useCallback(() => {
    const raw = editorRef.current?.innerHTML ?? "";
    if (raw === lastHtml.current) return;
    lastHtml.current = raw;
    onChange(sanitizeHtml(raw));
  }, [onChange]);

  function refreshFmt() {
    const cmds = [
      "bold", "italic", "underline", "strikeThrough",
      "justifyLeft", "justifyCenter", "justifyRight", "justifyFull",
    ];
    const next: Record<string, boolean> = {};
    cmds.forEach((c) => {
      try { next[c] = document.queryCommandState(c); } catch { next[c] = false; }
    });
    setFmt(next);
  }

  function exec(cmd: string) {
    const isAlign = cmd.startsWith("justify");
    editorRef.current?.focus();
    // styleWithCSS=false partout : gras/italique → balises sémantiques (<b>,<i>),
    // alignement → <div style="text-align:…"> propre (sans <span> parasite que
    // Chrome injecte quand styleWithCSS=true). Tout est capturé par innerHTML.
    try {
      // Valeur en chaîne : les navigateurs n'activent styleWithCSS que si la
      // valeur vaut "true" → "false" le désactive (balises sémantiques + style
      // text-align propre, sans <span> parasite).
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      /* navigateurs anciens : ignore */
    }
    document.execCommand(cmd, false);
    if (isAlign) hoistRootAlign();
    emit();
    setTimeout(refreshFmt, 0);
  }

  // La sélection courante est-elle bien à l'intérieur de l'éditeur ?
  function selectionInEditor(): boolean {
    const sel = window.getSelection();
    const ed = editorRef.current;
    if (!sel || sel.rangeCount === 0 || !ed) return false;
    return ed.contains(sel.getRangeAt(0).commonAncestorContainer);
  }

  // Couleur de texte : EXCEPTION au styleWithCSS=false — foreColor avec
  // styleWithCSS=true produit un <span style="color:…"> propre (avec false ce
  // serait un <font color> dont l'attribut serait purgé au nettoyage).
  function applyColor(c: string) {
    if (!selectionInEditor()) restoreRange();
    editorRef.current?.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* ignore */
    }
    document.execCommand("foreColor", false, c);
    try {
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      /* ignore */
    }
    emit();
  }

  // Quand TOUT le contenu est sélectionné, execCommand pose `text-align` sur la
  // racine éditable elle-même — un style qui N'EST PAS dans innerHTML, donc
  // perdu à l'enregistrement (« le justify saute »). On le déplace dans un <div>
  // wrapper pour qu'il soit persistant. Si execCommand a déjà créé un <div>
  // d'alignement (sélection partielle), la racine n'a pas de style → no-op.
  function hoistRootAlign() {
    const ed = editorRef.current;
    if (!ed) return;
    const align = ed.style.textAlign;
    if (!align) return;
    const wrap = document.createElement("div");
    wrap.style.textAlign = align;
    while (ed.firstChild) wrap.appendChild(ed.firstChild);
    ed.appendChild(wrap);
    ed.style.textAlign = "";
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(wrap);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function handleInput() {
    if (editorRef.current && EMPTY_PATTERNS.has(editorRef.current.innerHTML)) {
      editorRef.current.innerHTML = "";
    }
    emit();
  }

  // Collage : on N'IMPORTE JAMAIS la mise en forme de la source (polices,
  // couleurs, tailles inline collées depuis Word/Discord/un autre forum
  // écraseraient le rendu de la fiche). On ne garde que le TEXTE BRUT ;
  // l'utilisateur applique ensuite gras/italique/etc. via la barre d'outils.
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    // Réinjecte le texte en préservant uniquement les sauts de ligne.
    const frag = document.createDocumentFragment();
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    lines.forEach((line, i) => {
      if (i > 0) frag.appendChild(document.createElement("br"));
      if (line) frag.appendChild(document.createTextNode(line));
    });
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(frag);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    handleInput();
  }

  function saveRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  }

  function restoreRange() {
    const ed = editorRef.current;
    ed?.focus();
    const sel = window.getSelection();
    if (!sel || !ed) return;
    if (savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    } else {
      // Pas de sélection mémorisée (l'éditeur n'avait pas le focus) :
      // on insère en FIN de contenu plutôt qu'au début.
      const range = document.createRange();
      range.selectNodeContents(ed);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function openDialog(kind: Exclude<Dialog, null>) {
    saveRange();
    setDlgUrl("");
    setDlgLabel("");
    setShowColors(false);
    setDialog(kind);
  }

  function openColors() {
    saveRange();
    setDialog(null);
    setShowColors((s) => !s);
  }

  function insertImg() {
    const url = dlgUrl.trim();
    if (!url) return;
    restoreRange();
    document.execCommand(
      "insertHTML",
      false,
      `<figure class="hnk-img-banner"><img src="${url.replace(/"/g, "&quot;")}" alt=""></figure>`
    );
    emit();
    setDialog(null);
    setDlgUrl("");
  }

  // Bulle de dialogue : avatar (optionnel) + zone de texte éditable. On insère
  // un <div> vide derrière pour pouvoir continuer à écrire sous la bulle.
  function insertBubble() {
    const url = dlgUrl.trim();
    restoreRange();
    const ava = url
      ? `<span class="hnk-rp-bubble-ava"><img src="${url.replace(/"/g, "&quot;")}" alt=""></span>`
      : `<span class="hnk-rp-bubble-ava hnk-rp-bubble-ava--empty"></span>`;
    document.execCommand(
      "insertHTML",
      false,
      `<div class="hnk-rp-bubble">${ava}<div class="hnk-rp-bubble-tx">«&nbsp;…&nbsp;»</div></div><div><br></div>`
    );
    emit();
    setDialog(null);
    setDlgUrl("");
  }

  // Lecteur d'ambiance YouTube : simple lien-pilule (les href survivent au
  // nettoyage Forumactif, pas les iframes). Le script forum hnk-player.js
  // intercepte le clic et joue l'audio ; sans lui, le lien ouvre YouTube.
  function insertYt() {
    const id = ytVideoId(dlgUrl);
    if (!id) return;
    const label = (dlgLabel.trim() || "Ambiance sonore")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    restoreRange();
    document.execCommand(
      "insertHTML",
      false,
      `<a class="hnk-rp-player" href="https://www.youtube.com/watch?v=${id}">` +
        `<span class="hnk-rp-player-btn"></span>` +
        `<span class="hnk-rp-player-lab">${label}</span>` +
        `<span class="hnk-rp-player-eq"><i></i><i></i><i></i></span>` +
        `</a><div><br></div>`
    );
    emit();
    setDialog(null);
    setDlgUrl("");
    setDlgLabel("");
  }

  const btn = (cmd: string, title: string, children: React.ReactNode) => (
    <ToolBtn key={cmd} active={!!fmt[cmd]} onExec={() => exec(cmd)} title={title}>
      {children}
    </ToolBtn>
  );

  const dialogMeta: Record<Exclude<Dialog, null>, { placeholder: string; onInsert: () => void; canInsert: boolean }> = {
    img: { placeholder: "https://i.imgur.com/…", onInsert: insertImg, canInsert: !!dlgUrl.trim() },
    bubble: { placeholder: "URL de l'avatar (optionnel)…", onInsert: insertBubble, canInsert: true },
    yt: { placeholder: "Lien YouTube (https://youtu.be/…)", onInsert: insertYt, canInsert: !!ytVideoId(dlgUrl) },
  };

  return (
    <div className="hnk-rich-wrap">
      {/* ---- Barre d'outils ---- */}
      <div className="hnk-rich-toolbar" onMouseDown={(e) => e.preventDefault()}>
        {btn("bold",          "Gras (Ctrl+B)",        <b>G</b>)}
        {btn("italic",        "Italique (Ctrl+I)",     <i>I</i>)}
        {btn("underline",     "Souligné (Ctrl+U)",     <u>S</u>)}
        {btn("strikeThrough", "Barré",                 <s>B</s>)}
        <span className="hnk-rich-sep" />
        {btn("justifyLeft",   "Aligner à gauche",      <span className="hnk-rich-aln">←</span>)}
        {btn("justifyCenter", "Centrer",               <span className="hnk-rich-aln">↔</span>)}
        {btn("justifyRight",  "Aligner à droite",      <span className="hnk-rich-aln">→</span>)}
        {btn("justifyFull",   "Justifier",             <span className="hnk-rich-aln">⇔</span>)}
        <span className="hnk-rich-sep" />
        {withColor && (
          <button
            type="button"
            title="Couleur du texte"
            onMouseDown={(e) => { e.preventDefault(); openColors(); }}
            className={`hnk-rich-btn${showColors ? " hnk-rich-btn--on" : ""}`}
          >
            <span className="hnk-rich-color-ico">A</span>
          </button>
        )}
        <button
          type="button"
          title="Insérer une image (format bannière avec cadre)"
          onMouseDown={(e) => { e.preventDefault(); openDialog("img"); }}
          className={`hnk-rich-btn${dialog === "img" ? " hnk-rich-btn--on" : ""}`}
        >
          ⊞
        </button>
        {withBlocks && (
          <>
            <button
              type="button"
              title="Insérer une bulle de dialogue (avatar + réplique)"
              onMouseDown={(e) => { e.preventDefault(); openDialog("bubble"); }}
              className={`hnk-rich-btn${dialog === "bubble" ? " hnk-rich-btn--on" : ""}`}
            >
              ❝
            </button>
            <button
              type="button"
              title="Insérer une musique YouTube (player discret)"
              onMouseDown={(e) => { e.preventDefault(); openDialog("yt"); }}
              className={`hnk-rich-btn${dialog === "yt" ? " hnk-rich-btn--on" : ""}`}
            >
              ♪
            </button>
          </>
        )}
      </div>

      {/* ---- Palette de couleurs ---- */}
      {showColors && (
        <div className="hnk-rich-img-dialog hnk-rich-colors">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="hnk-rich-swatch"
              style={{ background: c }}
              title={c}
              onMouseDown={(e) => { e.preventDefault(); applyColor(c); }}
            />
          ))}
          <input
            type="color"
            className="hnk-rich-swatch hnk-rich-swatch--custom"
            title="Couleur personnalisée"
            onChange={(e) => applyColor(e.target.value)}
          />
          <button
            type="button"
            className="hnk-btn-ghost !py-1 !px-2 !text-[11px]"
            onClick={() => setShowColors(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ---- Zone d'édition ---- */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyUp={refreshFmt}
        onMouseUp={refreshFmt}
        onSelect={refreshFmt}
        data-placeholder={placeholder}
        className="hnk-rich-editor"
        style={{ minHeight, maxHeight, overflowY: maxHeight ? "auto" : undefined }}
      />

      {/* ---- Dialog d'insertion (image / bulle / YouTube) ---- */}
      {dialog && (
        <div className="hnk-rich-img-dialog">
          <input
            autoFocus
            type="url"
            value={dlgUrl}
            onChange={(e) => setDlgUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); dialogMeta[dialog].onInsert(); }
              if (e.key === "Escape") setDialog(null);
            }}
            placeholder={dialogMeta[dialog].placeholder}
            className="hnk-input"
          />
          {dialog === "yt" && (
            <input
              type="text"
              value={dlgLabel}
              onChange={(e) => setDlgLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); insertYt(); }
                if (e.key === "Escape") setDialog(null);
              }}
              placeholder="Nom affiché (Ambiance sonore)"
              className="hnk-input"
            />
          )}
          <button
            type="button"
            className="hnk-btn !py-1 !px-3 !text-[11px] whitespace-nowrap"
            onClick={dialogMeta[dialog].onInsert}
            disabled={!dialogMeta[dialog].canInsert}
          >
            Insérer
          </button>
          <button
            type="button"
            className="hnk-btn-ghost !py-1 !px-3 !text-[11px]"
            onClick={() => setDialog(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

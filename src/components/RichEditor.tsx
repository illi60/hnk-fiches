"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// Nettoyage du HTML émis par l'éditeur. On ne garde que :
//  - les balises de mise en forme (b, i, u, s, br, div, span, figure, img…) ;
//  - le style inline `text-align` (alignement voulu par l'utilisateur) ;
//  - `class="hnk-img-banner"` sur les figures et `src`/`alt` sur les images.
// Tout le reste (couleurs, polices, tailles, fonds collés ou injectés par
// Chrome via execCommand) est SUPPRIMÉ : c'est ce qui faisait « sauter » la
// police de la fiche sur le forum. Fonction idempotente (sanitize(sanitize(x))
// == sanitize(x)) : indispensable pour la synchro DOM ↔ valeur React.
function sanitizeHtml(raw: string): string {
  if (typeof document === "undefined") return raw;
  const box = document.createElement("div");
  box.innerHTML = raw;
  box.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const align = (el as HTMLElement).style.textAlign;
    const src = tag === "img" ? el.getAttribute("src") : null;
    const alt = tag === "img" ? el.getAttribute("alt") : null;
    // Purge tous les attributs, puis on réintroduit uniquement ceux autorisés.
    [...el.attributes].forEach((a) => el.removeAttribute(a.name));
    if (align) (el as HTMLElement).style.textAlign = align;
    if (tag === "figure") el.setAttribute("class", "hnk-img-banner");
    if (tag === "img") {
      if (src) el.setAttribute("src", src);
      if (alt) el.setAttribute("alt", alt);
    }
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

export function RichEditor({ value, onChange, placeholder = "", minHeight = "80px" }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(value);
  const [showImg, setShowImg] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
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
  // strict nécessaire : balises de mise en forme + `text-align`. → sortie fiable.
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
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }

  function openImg() {
    saveRange();
    setImgUrl("");
    setShowImg(true);
  }

  function insertImg() {
    const url = imgUrl.trim();
    if (!url) return;
    restoreRange();
    document.execCommand(
      "insertHTML",
      false,
      `<figure class="hnk-img-banner"><img src="${url.replace(/"/g, "&quot;")}" alt=""></figure>`
    );
    emit();
    setShowImg(false);
    setImgUrl("");
  }

  const btn = (cmd: string, title: string, children: React.ReactNode) => (
    <ToolBtn key={cmd} active={!!fmt[cmd]} onExec={() => exec(cmd)} title={title}>
      {children}
    </ToolBtn>
  );

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
        <button
          type="button"
          title="Insérer une image (format bannière avec cadre)"
          onMouseDown={(e) => { e.preventDefault(); openImg(); }}
          className="hnk-rich-btn"
        >
          ⊞
        </button>
      </div>

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
        style={{ minHeight }}
      />

      {/* ---- Dialog insertion d'image ---- */}
      {showImg && (
        <div className="hnk-rich-img-dialog">
          <input
            autoFocus
            type="url"
            value={imgUrl}
            onChange={(e) => setImgUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); insertImg(); }
              if (e.key === "Escape") setShowImg(false);
            }}
            placeholder="https://i.imgur.com/…"
            className="hnk-input"
          />
          <button
            type="button"
            className="hnk-btn !py-1 !px-3 !text-[11px] whitespace-nowrap"
            onClick={insertImg}
            disabled={!imgUrl.trim()}
          >
            Insérer
          </button>
          <button
            type="button"
            className="hnk-btn-ghost !py-1 !px-3 !text-[11px]"
            onClick={() => setShowImg(false)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

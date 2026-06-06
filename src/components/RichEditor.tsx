"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
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

  // Sync external value into the editor (only when it genuinely changed).
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      lastHtml.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    if (html !== lastHtml.current) {
      lastHtml.current = html;
      onChange(html);
    }
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
    editorRef.current?.focus();
    document.execCommand(cmd, false);
    emit();
    setTimeout(refreshFmt, 0);
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

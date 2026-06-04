"use client";

import { useState } from "react";
import { techniqueForumHtml, type TechniqueExportData } from "@/lib/techniques";

export default function TechniqueExport({ data }: { data: TechniqueExportData }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const html = techniqueForumHtml(data);

  async function copy() {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setOpen(true);
    }
  }

  return (
    <div className="hnk-panel" data-kanji="写">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="hnk-eyebrow">Export forum</p>
          <p className="text-sm text-bone mt-1">
            Code HTML prêt à coller dans un message Forumactif.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="hnk-btn" onClick={copy}>
            {copied ? "Copié ✓" : "Copier le code forum"}
          </button>
          <button
            type="button"
            className="hnk-btn-ghost"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Masquer" : "Voir le code"}
          </button>
        </div>
      </div>
      {open && (
        <textarea
          readOnly
          rows={8}
          value={html}
          onFocus={(e) => e.currentTarget.select()}
          className="hnk-input font-mono text-xs mt-4"
        />
      )}
    </div>
  );
}

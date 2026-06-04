"use client";

import { useState } from "react";
import { techniqueForumHtml, type TechniqueExportData } from "@/lib/techniques";

// Bouton compact « Copier le code forum » à poser sur une carte de technique.
// Le HTML généré (techniqueForumHtml) est volontairement SANS bouton ni script :
// juste la carte prête à coller dans une boîte de texte Forumactif.
export default function ForumCopyButton({
  data,
  className,
}: {
  data: TechniqueExportData;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState(false);

  async function copy() {
    const html = techniqueForumHtml(data);
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setErr(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Repli : sélection manuelle via un textarea temporaire.
      try {
        const ta = document.createElement("textarea");
        ta.value = html;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setErr(true);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={className ?? "hnk-btn-ghost !py-1.5 !px-3 !text-[10px]"}
      title="Copier le code HTML pour Forumactif"
    >
      {err ? "Erreur" : copied ? "Copié ✓" : "Copier code forum"}
    </button>
  );
}

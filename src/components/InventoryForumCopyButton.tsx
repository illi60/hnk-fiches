"use client";

import { useState } from "react";

import { inventoryForumHtml, type InventoryForumData } from "@/lib/inventory-forum";

export default function InventoryForumCopyButton({ data }: { data: InventoryForumData }) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState(false);

  async function copy() {
    const html = inventoryForumHtml(data);
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setErr(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
        setErr(false);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setErr(true);
      }
    }
  }

  return (
    <button
      type="button"
      className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]"
      onClick={copy}
      title="Copier le code HTML pour Forumactif"
    >
      {err ? "Erreur" : copied ? "Copié" : "Copier code forum"}
    </button>
  );
}

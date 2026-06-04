"use client";

import { useState, useTransition } from "react";

export default function ChangePassword() {
  const [pending, start] = useTransition();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    start(async () => {
      const r = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: cur, next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setMsg(
          j.error === "BAD_CURRENT"
            ? "Mot de passe actuel incorrect."
            : j.error === "INVALID"
            ? "Nouveau mot de passe trop court (≥ 8)."
            : "Erreur."
        );
        return;
      }
      setMsg("Mot de passe changé ✓");
      setCur("");
      setNext("");
    });
  }

  return (
    <div className="hnk-panel" data-kanji="鍵">
      <p className="hnk-eyebrow mb-3">Changer mon mot de passe</p>
      <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
        <input
          className="hnk-input"
          type="password"
          placeholder="Mot de passe actuel"
          value={cur}
          onChange={(e) => setCur(e.target.value)}
        />
        <input
          className="hnk-input"
          type="password"
          placeholder="Nouveau (≥ 8 caractères)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button
          className="hnk-btn"
          disabled={pending || !cur || next.length < 8}
          onClick={submit}
        >
          {pending ? "…" : "Mettre à jour"}
        </button>
        {msg && <span className="text-xs text-bone">{msg}</span>}
      </div>
    </div>
  );
}

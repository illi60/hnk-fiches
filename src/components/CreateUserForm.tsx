"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CreateUserForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ username: "", password: "" });
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    start(async () => {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setMsg(
          j.error === "DUPLICATE"
            ? "Pseudo déjà pris."
            : j.error === "INVALID"
            ? "Champs invalides (pseudo ≥ 3, mot de passe ≥ 8)."
            : "Erreur."
        );
        return;
      }
      setMsg("Compte créé ✓");
      setF({ username: "", password: "" });
      router.refresh();
    });
  }

  return (
    <section className="hnk-panel" data-kanji="証">
      <p className="hnk-eyebrow mb-3">Créer un compte joueur</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          className="hnk-input"
          placeholder="Pseudo"
          value={f.username}
          onChange={(e) => setF((s) => ({ ...s, username: e.target.value }))}
        />
        <input
          className="hnk-input"
          placeholder="Mot de passe provisoire"
          value={f.password}
          onChange={(e) => setF((s) => ({ ...s, password: e.target.value }))}
        />
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button
          className="hnk-btn"
          disabled={pending || !f.username || !f.password}
          onClick={submit}
        >
          {pending ? "…" : "Créer le compte"}
        </button>
        {msg && <span className="text-xs text-bone">{msg}</span>}
      </div>
      <p className="text-[10px] text-smoke mt-2">
        Le joueur pourra changer son mot de passe une fois connecté.
      </p>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm({
  from,
  initialError,
}: {
  from?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? "");
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");

    start(async () => {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError("Identifiants invalides.");
        return;
      }
      router.push(from && from.startsWith("/") ? from : "/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="hnk-label">Nom d&apos;utilisateur</label>
        <input
          type="text"
          name="username"
          required
          autoComplete="username"
          className="hnk-input"
        />
      </div>
      <div>
        <label className="hnk-label">Mot de passe</label>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="hnk-input"
        />
      </div>

      {error && (
        <div className="text-sm text-ember-hot border border-ember/40 border-l-2 px-3 py-2 bg-ember/5">
          {error}
        </div>
      )}

      <button type="submit" disabled={pending} className="hnk-btn w-full justify-center">
        {pending ? "Connexion…" : "Entrer"}
      </button>
    </form>
  );
}

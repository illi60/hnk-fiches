"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ACTION_TYPES, actionLabel, natureLabel } from "@/lib/techniques";
import { SPECIAL_UNIT_NAMES, unitFromKinjutsuScope } from "@/lib/kinjutsu";

export interface AdminKinjutsuRow {
  id: string;
  nom: string;
  description: string;
  actionType: string | null;
  kinjutsuScope: string | null;
  clan: string | null;
  coutXp: number;
}

type ScopeType = "UNIT" | "CLAN";
type SpecialUnit = (typeof SPECIAL_UNIT_NAMES)[number];
type FormState = {
  nom: string;
  description: string;
  actionType: string;
  scopeType: ScopeType;
  unit: SpecialUnit;
  clan: string;
  coutXp: string;
};

function emptyForm(clans: string[]): FormState {
  return {
    nom: "",
    description: "",
    actionType: "CHARGEE",
    scopeType: "UNIT" as ScopeType,
    unit: SPECIAL_UNIT_NAMES[0],
    clan: clans[0] ?? "",
    coutXp: "0",
  };
}

function formFromRow(row: AdminKinjutsuRow, clans: string[]): FormState {
  const unit = unitFromKinjutsuScope(row.kinjutsuScope);
  return {
    nom: row.nom,
    description: row.description,
    actionType: row.actionType ?? "CHARGEE",
    scopeType: unit ? ("UNIT" as ScopeType) : ("CLAN" as ScopeType),
    unit: (unit ?? SPECIAL_UNIT_NAMES[0]) as SpecialUnit,
    clan: row.clan ?? clans[0] ?? "",
    coutXp: String(row.coutXp ?? 0),
  };
}

export default function AdminKinjutsuManager({
  clans,
  rows,
}: {
  clans: string[];
  rows: AdminKinjutsuRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [v, setV] = useState(() => emptyForm(clans));

  const scopeOptions = useMemo(() => {
    const scopes = new Map<string, string>();
    for (const unit of SPECIAL_UNIT_NAMES) scopes.set(`UNIT:${unit}`, `Unité · ${unit}`);
    for (const clan of clans) scopes.set(`CLAN:${clan}`, `Clan · ${clan}`);
    return Array.from(scopes.entries());
  }, [clans]);

  const visibleRows = rows.filter((row) => {
    if (scopeFilter === "ALL") return true;
    if (scopeFilter.startsWith("UNIT:")) return row.kinjutsuScope === scopeFilter;
    if (scopeFilter.startsWith("CLAN:")) return row.kinjutsuScope === "CLAN" && row.clan === scopeFilter.slice(5);
    return true;
  });

  function update<K extends keyof typeof v>(key: K, value: (typeof v)[K]) {
    setV((state) => ({ ...state, [key]: value }));
    setMsg(null);
  }

  function reset() {
    setEditingId(null);
    setV(emptyForm(clans));
    setMsg(null);
  }

  function beginEdit(row: AdminKinjutsuRow) {
    setEditingId(row.id);
    setV(formFromRow(row, clans));
    setMsg(`Edition de ${row.nom}.`);
  }

  function payload() {
    if (v.nom.trim().length < 2 || v.description.trim().length < 1) {
      setMsg("Nom et description requis.");
      return null;
    }
    if (v.scopeType === "CLAN" && !v.clan.trim()) {
      setMsg("Choisis un clan.");
      return null;
    }
    return {
      nom: v.nom.trim(),
      description: v.description.trim(),
      actionType: v.actionType || "CHARGEE",
      scopeType: v.scopeType,
      unit: v.scopeType === "UNIT" ? v.unit : null,
      clan: v.scopeType === "CLAN" ? v.clan.trim() : null,
      coutXp: parseInt(v.coutXp, 10) || 0,
    };
  }

  function submit() {
    const body = payload();
    if (!body) return;
    start(async () => {
      const res = await fetch(editingId ? `/api/admin/kinjutsu/${editingId}` : "/api/admin/kinjutsu", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(json.error === "SCOPE_REQUIRED" ? "Portée invalide." : "Enregistrement impossible.");
        return;
      }
      reset();
      setMsg(editingId ? "Kinjutsu modifié." : "Kinjutsu créé.");
      router.refresh();
    });
  }

  function remove(row: AdminKinjutsuRow) {
    if (!confirm(`Supprimer le Kinjutsu « ${row.nom} » ?`)) return;
    start(async () => {
      const res = await fetch(`/api/admin/kinjutsu/${row.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg("Suppression impossible.");
        return;
      }
      if (editingId === row.id) reset();
      setMsg("Kinjutsu supprimé.");
      router.refresh();
    });
  }

  return (
    <section className="border border-ember/20 bg-ink-700 p-4 space-y-5">
      <div>
        <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember">Kinjutsu</h3>
        <p className="text-xs text-smoke mt-1">
          Gestion staff des techniques interdites de clan et d'unité. Elles sont validées
          directement et restent hors création membre.
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setScopeFilter("ALL")}
              className={`px-3 py-1.5 border text-[10px] tracking-[0.2em] uppercase ${
                scopeFilter === "ALL" ? "border-ember text-ember" : "border-white/10 text-smoke hover:text-bone"
              }`}
            >
              Tous · {rows.length}
            </button>
            {scopeOptions.map(([scope, label]) => {
              const count = rows.filter((row) =>
                scope.startsWith("UNIT:")
                  ? row.kinjutsuScope === scope
                  : row.kinjutsuScope === "CLAN" && row.clan === scope.slice(5)
              ).length;
              return (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setScopeFilter(scope)}
                  className={`px-3 py-1.5 border text-[10px] tracking-[0.2em] uppercase ${
                    scopeFilter === scope ? "border-ember text-ember" : "border-white/10 text-smoke hover:text-bone"
                  }`}
                >
                  {label} · {count}
                </button>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {visibleRows.map((row) => (
              <article key={row.id} className="border border-white/10 bg-ink-900/55 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-display uppercase tracking-wider text-bone break-words">
                      {row.nom}
                    </h4>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-ember mt-1">
                      {natureLabel("KINJUTSU", row.kinjutsuScope, row.clan)} ·{" "}
                      {row.actionType ? actionLabel(row.actionType) : "Sans type"}
                    </p>
                  </div>
                  <span className="text-2xl text-ember/70 leading-none">禁</span>
                </div>
                <p className="text-sm text-bone/75 whitespace-pre-line text-justify mt-3 line-clamp-4">
                  {row.description}
                </p>
                <div className="flex items-center justify-between gap-2 mt-3">
                  <span className="text-xs text-smoke">{row.coutXp} XP</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => beginEdit(row)}
                      className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]"
                    >
                      Editer
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      disabled={pending}
                      className="text-[10px] uppercase tracking-[0.18em] text-red-300 hover:text-red-200 disabled:opacity-50"
                    >
                      Suppr.
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {visibleRows.length === 0 && (
              <p className="text-sm text-smoke italic">Aucun Kinjutsu sur cette portée.</p>
            )}
          </div>
        </div>

        <div className="border border-white/10 bg-ink-900/60 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[10px] uppercase tracking-[0.24em] text-ember">
              {editingId ? "Modifier" : "Créer"}
            </h4>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                className="text-[10px] uppercase tracking-[0.18em] text-smoke hover:text-bone"
              >
                Annuler
              </button>
            )}
          </div>

          <Field label="Nom">
            <input
              type="text"
              value={v.nom}
              onChange={(e) => update("nom", e.target.value)}
              className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
            />
          </Field>

          <Field label="Portée">
            <select
              value={v.scopeType}
              onChange={(e) => update("scopeType", e.target.value as ScopeType)}
              className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
            >
              <option value="UNIT">Unité spéciale</option>
              <option value="CLAN">Clan</option>
            </select>
          </Field>

          {v.scopeType === "UNIT" ? (
            <Field label="Unité">
              <select
                value={v.unit}
                onChange={(e) => update("unit", e.target.value as (typeof SPECIAL_UNIT_NAMES)[number])}
                className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
              >
                {SPECIAL_UNIT_NAMES.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Clan">
              <select
                value={v.clan}
                onChange={(e) => update("clan", e.target.value)}
                className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
              >
                {clans.map((clan) => (
                  <option key={clan} value={clan}>
                    {clan}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Action">
            <select
              value={v.actionType}
              onChange={(e) => update("actionType", e.target.value)}
              className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
            >
              {ACTION_TYPES.map((action) => (
                <option key={action.key} value={action.key}>
                  {action.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Coût XP">
            <input
              type="number"
              min={0}
              value={v.coutXp}
              onChange={(e) => update("coutXp", e.target.value)}
              className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={v.description}
              onChange={(e) => update("description", e.target.value)}
              rows={8}
              className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
            />
          </Field>

          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="w-full px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
          >
            {pending ? "…" : editingId ? "Enregistrer" : "Créer"}
          </button>
          {msg && <p className="text-xs text-bone">{msg}</p>}
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase text-smoke mb-1">{label}</span>
      {children}
    </label>
  );
}

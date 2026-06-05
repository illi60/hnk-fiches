"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ARTS_ALL, KUCHIYOSE, getArtState, type ArtsState } from "@/lib/arts";
import { ART_OPTIONS } from "@/lib/techniques";
import { KG_NAMES } from "@/lib/kekkei";

const RANKS_UI = ["E", "D", "C", "B", "A", "S"];

// ===== Arts (god mode) =====
export function AdminArtsForm({ userId, artsState }: { userId: string; artsState: ArtsState }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [rows, setRows] = useState(() =>
    ARTS_ALL.map((a) => {
      const st = getArtState(artsState, a.key);
      return {
        key: a.key,
        name: a.name,
        kuchi: a.key === "kuchiyose",
        specNames: a.specs as readonly string[],
        expertised: !!st.expertised,
        unlocked: !!st.unlocked,
        primary: st.primarySpec === undefined ? "" : String(st.primarySpec),
        s0: (st.specs?.[0] as string) ?? "",
        s1: (st.specs?.[1] as string) ?? "",
        s2: (st.specs?.[2] as string) ?? "",
      };
    })
  );

  function update(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  function save() {
    const out: Record<
      string,
      { expertised?: boolean; unlocked?: boolean; primarySpec?: number; specs: (string | null)[] }
    > = {};
    rows.forEach((r) => {
      out[r.key] = {
        ...(r.kuchi ? { unlocked: r.unlocked } : { expertised: r.expertised }),
        ...(r.primary !== "" ? { primarySpec: Number(r.primary) } : {}),
        specs: [r.s0 || null, r.s1 || null, r.s2 || null],
      };
    });
    start(async () => {
      const res = await fetch(`/api/admin/users/${userId}/arts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artsState: out }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <section className="border border-white/5 bg-ink-700 p-4">
      <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember mb-3">Arts Shinobi</h3>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.key} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-bone w-28">{r.name}</span>
            <label className="flex items-center gap-1 text-xs text-smoke">
              <input
                type="checkbox"
                checked={r.kuchi ? r.unlocked : r.expertised}
                onChange={(e) =>
                  update(i, r.kuchi ? { unlocked: e.target.checked } : { expertised: e.target.checked })
                }
              />
              {r.kuchi ? "obtenu" : "expertisé"}
            </label>
            <label className="text-xs text-smoke flex items-center gap-1">
              principale
              <select
                value={r.primary}
                onChange={(e) => update(i, { primary: e.target.value })}
                className="bg-ink-900 border border-white/10 px-2 py-1 text-bone"
              >
                <option value="">—</option>
                {r.specNames.map((sn, idx) => (
                  <option key={idx} value={idx}>
                    {sn}
                  </option>
                ))}
              </select>
            </label>
            <RankPick label={r.specNames[0]} v={r.s0} on={(x) => update(i, { s0: x })} />
            <RankPick label={r.specNames[1]} v={r.s1} on={(x) => update(i, { s1: x })} />
            <RankPick label={r.specNames[2]} v={r.s2} on={(x) => update(i, { s2: x })} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={save}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer arts"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Enregistré.</span>}
      </div>
    </section>
  );
}

function RankPick({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return (
    <label className="text-xs text-smoke flex items-center gap-1">
      {label}
      <select
        value={v}
        onChange={(e) => on(e.target.value)}
        className="bg-ink-900 border border-white/10 px-2 py-1 text-bone"
      >
        <option value="">—</option>
        {RANKS_UI.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </label>
  );
}

// ===== Quintessences (god mode) =====
export function AdminQuintForm({
  userId,
  quintessences,
}: {
  userId: string;
  quintessences: { kind: string; target: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [list, setList] = useState(quintessences ?? []);
  const [kind, setKind] = useState("ART");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState(false);

  const targetOptions =
    kind === "ART" ? [...ART_OPTIONS] :
    kind === "KUCHIYOSE" ? [...KUCHIYOSE.specs] :
    KG_NAMES;

  function add() {
    if (!target) return;
    setList((l) => [...l, { kind, target }]);
    setTarget("");
    setSaved(false);
  }
  function remove(i: number) {
    setList((l) => l.filter((_, j) => j !== i));
    setSaved(false);
  }
  function save() {
    start(async () => {
      const res = await fetch(`/api/admin/users/${userId}/quintessences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quintessences: list }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <section className="border border-white/5 bg-ink-700 p-4">
      <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember mb-3">Quintessences</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {list.length === 0 && <span className="text-xs text-smoke italic">Aucune.</span>}
        {list.map((q, i) => (
          <span key={i} className="hnk-chip">
            {q.kind} · {q.target}
            <button onClick={() => remove(i)} className="ml-2 text-red-400">
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-smoke flex flex-col gap-1">
          Type
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setTarget("");
            }}
            className="bg-ink-900 border border-white/10 px-2 py-1.5 text-bone"
          >
            <option value="ART">Quintessence d&apos;Art</option>
            <option value="KG">Quintessence de KG</option>
            <option value="KG2">Second KG</option>
            <option value="KUCHIYOSE">Quintessence Kuchiyose</option>
          </select>
        </label>
        <label className="text-xs text-smoke flex flex-col gap-1">
          Cible
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="bg-ink-900 border border-white/10 px-2 py-1.5 text-bone"
          >
            <option value="">—</option>
            {targetOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={add}
          disabled={!target}
          className="px-3 py-2 border border-ember/50 text-ember text-xs uppercase tracking-wide disabled:opacity-40"
        >
          + Ajouter
        </button>
        <button
          onClick={save}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Enregistré.</span>}
      </div>
    </section>
  );
}

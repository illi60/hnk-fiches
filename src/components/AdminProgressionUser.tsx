"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SubmissionList, fetchSubmissions, type SubItem } from "@/components/AdminProgressionSubmissions";

const RANKS = ["E", "D", "C", "B", "A", "S"] as const;

type Track = "VILLAGE" | "CLAN" | "HISTOIRE";

const TRACKS: { key: Track; label: string; kanji: string; field: "rangVillage" | "rangClan" | "rangHistoire" }[] = [
  { key: "VILLAGE", label: "Village", kanji: "里", field: "rangVillage" },
  { key: "CLAN", label: "Clan", kanji: "氏", field: "rangClan" },
  { key: "HISTOIRE", label: "Histoire", kanji: "史", field: "rangHistoire" },
];

export interface ProgUser {
  id: string;
  username: string;
  clan: string | null;
  rangVillage: string | null;
  rangClan: string | null;
  rangHistoire: string | null;
}

function rankClass(r: string) {
  return /^[EDCBAS]$/.test(r) ? `rk-${r.toLowerCase()}` : "";
}

// Gestion centralisée de la progression d'un joueur : choisir un membre, puis
// pour chacune des 3 voies, poser/baisser son rang, voir le DÉTAIL de ses
// conditions (RP soumis) et en supprimer une par une — ou tout effacer.
export default function AdminProgressionUser({ users }: { users: ProgUser[] }) {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<SubItem[]>([]);
  const [loading, setLoading] = useState(false);
  const selected = useMemo(() => users.find((u) => u.id === userId), [users, userId]);

  async function load(id: string) {
    if (!id) {
      setItems([]);
      return;
    }
    setLoading(true);
    setItems(await fetchSubmissions(`userId=${encodeURIComponent(id)}`));
    setLoading(false);
  }

  function onSelect(id: string) {
    setUserId(id);
    void load(id);
  }

  return (
    <section>
      <h2 className="font-serif text-xl text-white2 mb-1">Progression d&apos;un joueur</h2>
      <p className="text-xs text-smoke mb-3">
        Baisse un rang OU supprime des conditions individuelles validées d&apos;une voie (au détail,
        une par une, ou tout d&apos;un coup). Les deux sont indépendants : supprimer des conditions ne
        change pas le rang stocké (l&apos;auto-promotion ne redescend jamais), et baisser le rang ne
        supprime pas les conditions déjà validées.
      </p>

      <label className="block max-w-sm mb-4">
        <span className="block text-[10px] uppercase text-smoke mb-1">Joueur</span>
        <select
          value={userId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full bg-ink-800 border border-white/10 px-3 py-2 text-bone text-sm"
        >
          <option value="">— Choisir un joueur —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
              {u.clan ? ` · ${u.clan}` : ""}
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <ul className="space-y-2">
          {TRACKS.map((t) => (
            <TrackRow
              key={`${selected.id}:${t.key}`}
              user={selected}
              track={t}
              items={items.filter((i) => i.track === t.key)}
              loading={loading}
              onChanged={() => load(selected.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TrackRow({
  user,
  track,
  items,
  loading,
  onChanged,
}: {
  user: ProgUser;
  track: { key: Track; label: string; kanji: string; field: "rangVillage" | "rangClan" | "rangHistoire" };
  items: SubItem[];
  loading: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const current = (user[track.field] ?? "E") as string;
  const [rank, setRank] = useState(current);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const noClan = track.key === "CLAN" && !user.clan?.trim();

  function saveRank() {
    setErr(null);
    setMsg(null);
    start(async () => {
      const r = await fetch(`/api/admin/users/${user.id}/profil`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [track.field]: rank }),
      });
      if (!r.ok) {
        setErr("Erreur");
        return;
      }
      setMsg("Rang posé.");
      router.refresh();
    });
  }

  function wipeAll() {
    setErr(null);
    setMsg(null);
    start(async () => {
      const r = await fetch("/api/admin/progression/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "USER", userId: user.id, track: track.key }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr("Erreur");
        return;
      }
      setConfirmWipe(false);
      setMsg(`${j.deleted ?? 0} condition(s) effacée(s).`);
      onChanged();
      router.refresh();
    });
  }

  return (
    <li className="border border-white/5 bg-ink-700 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-bone flex-1 min-w-[120px]">
          <span className="text-smoke mr-1.5" aria-hidden>
            {track.kanji}
          </span>
          {track.label}
          <span className="text-[10px] text-smoke ml-2">
            actuel <span className={`font-bold ${rankClass(current)}`}>{current}</span>
          </span>
        </span>

        <label className="flex items-center gap-2 text-[10px] uppercase text-smoke">
          Rang
          <select
            value={rank}
            onChange={(e) => {
              setRank(e.target.value);
              setMsg(null);
            }}
            className="bg-ink-800 border border-white/10 px-2 py-1 text-bone text-sm"
          >
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={saveRank}
          disabled={pending || rank === current}
          className="px-3 py-1.5 bg-ember/20 border border-ember/40 text-ember text-xs tracking-[0.2em] uppercase font-bold hover:bg-ember/30 disabled:opacity-40"
        >
          {pending ? "…" : "Poser"}
        </button>

        <button
          onClick={() => setOpen((o) => !o)}
          disabled={noClan}
          className="px-3 py-1.5 border border-white/15 text-bone text-xs tracking-[0.2em] uppercase font-bold hover:bg-white/5 disabled:opacity-40"
        >
          {open ? "Masquer" : "Détail"} ({loading ? "…" : items.length})
        </button>

        {msg && <span className="text-xs text-emerald-400">{msg}</span>}
        {err && <span className="text-xs text-ember-hot">{err}</span>}
      </div>

      {noClan && (
        <p className="text-[10px] text-smoke mt-1.5">
          Ce joueur n&apos;a pas de clan : la voie clanique ne s&apos;applique pas tant qu&apos;un clan
          ne lui est pas attribué.
        </p>
      )}

      {open && !noClan && (
        <div className="mt-3 border-t border-white/5 pt-3 space-y-3">
          {loading ? (
            <p className="text-xs text-smoke italic">Chargement…</p>
          ) : (
            <SubmissionList items={items} onChanged={onChanged} />
          )}

          {items.length > 0 &&
            (confirmWipe ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-smoke">Supprimer les {items.length} ?</span>
                <button
                  onClick={wipeAll}
                  disabled={pending}
                  className="px-3 py-1.5 bg-red-500 text-black text-xs tracking-[0.2em] uppercase font-bold disabled:opacity-50"
                >
                  {pending ? "…" : "Tout effacer"}
                </button>
                <button onClick={() => setConfirmWipe(false)} className="text-xs text-smoke">
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmWipe(true)}
                disabled={pending}
                className="text-[10px] uppercase tracking-wider text-red-300/80 hover:text-red-300"
              >
                Tout effacer la voie
              </button>
            ))}
        </div>
      )}
    </li>
  );
}

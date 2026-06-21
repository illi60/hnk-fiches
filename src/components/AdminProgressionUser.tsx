"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
// pour chacune des 3 voies, poser/baisser son rang OU effacer ses conditions
// individuelles validées (deux actions distinctes).
export default function AdminProgressionUser({ users }: { users: ProgUser[] }) {
  const [userId, setUserId] = useState("");
  const selected = useMemo(() => users.find((u) => u.id === userId), [users, userId]);

  return (
    <section>
      <h2 className="font-serif text-xl text-white2 mb-1">Progression d&apos;un joueur</h2>
      <p className="text-xs text-smoke mb-3">
        Baisse un rang OU efface les conditions individuelles validées d&apos;une voie. Les deux
        sont indépendants : effacer les conditions ne change pas le rang stocké (l&apos;auto-promotion
        ne redescend jamais), et baisser le rang ne supprime pas les conditions déjà validées.
      </p>

      <label className="block max-w-sm mb-4">
        <span className="block text-[10px] uppercase text-smoke mb-1">Joueur</span>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
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
            <TrackRow key={`${selected.id}:${t.key}`} user={selected} track={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TrackRow({
  user,
  track,
}: {
  user: ProgUser;
  track: { key: Track; label: string; kanji: string; field: "rangVillage" | "rangClan" | "rangHistoire" };
}) {
  const router = useRouter();
  const current = (user[track.field] ?? "E") as string;
  const [rank, setRank] = useState(current);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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

  function resetConditions() {
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
      setConfirming(false);
      setMsg(`${j.deleted ?? 0} condition(s) effacée(s).`);
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

        {confirming ? (
          <span className="flex items-center gap-2">
            <button
              onClick={resetConditions}
              disabled={pending}
              className="px-3 py-1.5 bg-red-500 text-black text-xs tracking-[0.2em] uppercase font-bold disabled:opacity-50"
            >
              {pending ? "…" : "Confirmer"}
            </button>
            <button onClick={() => setConfirming(false)} className="text-xs text-smoke">
              Annuler
            </button>
          </span>
        ) : (
          <button
            onClick={() => {
              setConfirming(true);
              setMsg(null);
              setErr(null);
            }}
            disabled={pending}
            className="px-3 py-1.5 bg-red-500/15 border border-red-500/40 text-red-300 text-xs tracking-[0.2em] uppercase font-bold hover:bg-red-500/25 disabled:opacity-40"
          >
            Effacer les conditions
          </button>
        )}

        {msg && <span className="text-xs text-emerald-400">{msg}</span>}
        {err && <span className="text-xs text-ember-hot">{err}</span>}
      </div>
      {noClan && (
        <p className="text-[10px] text-smoke mt-1.5">
          Ce joueur n&apos;a pas de clan : la voie clanique ne s&apos;applique pas tant qu&apos;un clan
          ne lui est pas attribué.
        </p>
      )}
    </li>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

import { rankClass, rankIndex } from "@/lib/arts";
import type { LadderClan, LadderPlayer } from "@/lib/ladder";

// ---- Tri / onglets ----
type Tab = "players" | "clans";
type PlayerSort = "xp" | "contribution" | "rang" | "name";
type ClanSort = "xp" | "contribution" | "level" | "name";
type Dir = "asc" | "desc";

const PLAYER_SORTS: { key: PlayerSort; label: string }[] = [
  { key: "xp", label: "XP" },
  { key: "contribution", label: "Contribution" },
  { key: "rang", label: "Rang" },
  { key: "name", label: "A → Z" },
];
const CLAN_SORTS: { key: ClanSort; label: string }[] = [
  { key: "xp", label: "XP cumulé" },
  { key: "contribution", label: "Contribution" },
  { key: "level", label: "Niveau" },
  { key: "name", label: "A → Z" },
];

const MEDALS: Record<number, string> = { 1: "#ffc23c", 2: "#cfd6dd", 3: "#cd7f4d" };

const fmt = (n: number) => n.toLocaleString("fr-FR");

export default function LadderView({
  players,
  clans,
}: {
  players: LadderPlayer[];
  clans: LadderClan[];
}) {
  const [tab, setTab] = useState<Tab>("players");
  const [query, setQuery] = useState("");
  const [pSort, setPSort] = useState<PlayerSort>("xp");
  const [pDir, setPDir] = useState<Dir>("desc");
  const [cSort, setCSort] = useState<ClanSort>("xp");
  const [cDir, setCDir] = useState<Dir>("desc");
  const [selPlayer, setSelPlayer] = useState<LadderPlayer | null>(null);
  const [selClan, setSelClan] = useState<LadderClan | null>(null);

  // Échap ferme l'aperçu ouvert.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelPlayer(null);
        setSelClan(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const clanByKey = useMemo(() => {
    const m = new Map<string, LadderClan>();
    for (const c of clans) m.set(c.key, c);
    return m;
  }, [clans]);

  const sortedPlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? players.filter(
          (p) =>
            p.name.toLowerCase().includes(q) || (p.clan ?? "").toLowerCase().includes(q)
        )
      : players;
    const mul = pDir === "desc" ? -1 : 1;
    return [...base].sort((a, b) => {
      switch (pSort) {
        case "name":
          return a.name.localeCompare(b.name, "fr") * mul;
        case "rang": {
          const d = rankIndex(a.rang) - rankIndex(b.rang);
          return (d !== 0 ? d : a.xp - b.xp) * mul;
        }
        case "contribution": {
          const d = a.contribution - b.contribution;
          return (d !== 0 ? d : a.xp - b.xp) * mul;
        }
        case "xp":
        default:
          return (a.xp - b.xp) * mul;
      }
    });
  }, [players, query, pSort, pDir]);

  const sortedClans = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? clans.filter((c) => c.name.toLowerCase().includes(q)) : clans;
    const mul = cDir === "desc" ? -1 : 1;
    return [...base].sort((a, b) => {
      switch (cSort) {
        case "name":
          return a.name.localeCompare(b.name, "fr") * mul;
        case "level": {
          const d = rankIndex(a.level) - rankIndex(b.level);
          return (d !== 0 ? d : a.xp - b.xp) * mul;
        }
        case "contribution": {
          const d = a.contribution - b.contribution;
          return (d !== 0 ? d : a.xp - b.xp) * mul;
        }
        case "xp":
        default:
          return (a.xp - b.xp) * mul;
      }
    });
  }, [clans, query, cSort, cDir]);

  function pickPSort(s: PlayerSort) {
    if (s === pSort) setPDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setPSort(s);
      setPDir(s === "name" ? "asc" : "desc");
    }
  }
  function pickCSort(s: ClanSort) {
    if (s === cSort) setCDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setCSort(s);
      setCDir(s === "name" ? "asc" : "desc");
    }
  }

  const sorts = tab === "players" ? PLAYER_SORTS : CLAN_SORTS;
  const activeSort = tab === "players" ? pSort : cSort;
  const activeDir = tab === "players" ? pDir : cDir;

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-2">
        <TabBtn active={tab === "players"} onClick={() => setTab("players")}>
          Joueurs <span className="opacity-60">{players.length}</span>
        </TabBtn>
        <TabBtn active={tab === "clans"} onClick={() => setTab("clans")}>
          Clans <span className="opacity-60">{clans.length}</span>
        </TabBtn>
      </div>

      {/* Tris + recherche */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="hnk-eyebrow mr-1">Classer par</span>
        {sorts.map((s) => {
          const on = s.key === activeSort;
          return (
            <button
              key={s.key}
              onClick={() =>
                tab === "players"
                  ? pickPSort(s.key as PlayerSort)
                  : pickCSort(s.key as ClanSort)
              }
              className="px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] font-bold border transition"
              style={{
                color: on ? "var(--ink-900)" : "var(--bone)",
                background: on ? "var(--ember)" : "transparent",
                borderColor: on
                  ? "var(--ember)"
                  : "color-mix(in srgb, var(--bone) 18%, transparent)",
              }}
            >
              {s.label}
              {on && s.key !== "name" && (
                <span aria-hidden className="ml-1.5">
                  {activeDir === "desc" ? "↓" : "↑"}
                </span>
              )}
            </button>
          );
        })}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher…"
          className="hnk-input ml-auto w-44 !py-1.5 !text-sm"
        />
      </div>

      {/* Liste */}
      {tab === "players" ? (
        <ol className="space-y-1.5">
          {sortedPlayers.map((p, i) => (
            <li key={p.id}>
              <PlayerRow pos={i + 1} player={p} active={pSort} onClick={() => setSelPlayer(p)} />
            </li>
          ))}
          {sortedPlayers.length === 0 && <Empty />}
        </ol>
      ) : (
        <ol className="space-y-1.5">
          {sortedClans.map((c, i) => (
            <li key={c.key}>
              <ClanRow pos={i + 1} clan={c} active={cSort} onClick={() => setSelClan(c)} />
            </li>
          ))}
          {sortedClans.length === 0 && <Empty />}
        </ol>
      )}

      {/* Aperçus */}
      {selPlayer && (
        <PlayerModal
          player={selPlayer}
          clan={selPlayer.clanKey ? clanByKey.get(selPlayer.clanKey) ?? null : null}
          onClose={() => setSelPlayer(null)}
        />
      )}
      {selClan && (
        <ClanModal
          clan={selClan}
          onClose={() => setSelClan(null)}
          onMember={(id) => {
            const p = players.find((x) => x.id === id);
            if (p) {
              setSelClan(null);
              setSelPlayer(p);
            }
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Sous-composants
// ============================================================

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 font-display uppercase tracking-[0.16em] text-sm border-b-2 transition"
      style={{
        color: active ? "var(--ember)" : "var(--smoke)",
        borderColor: active ? "var(--ember)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

function PosBadge({ pos }: { pos: number }) {
  const medal = MEDALS[pos];
  return (
    <span
      className="grid place-items-center w-9 h-9 flex-none font-display text-sm tabular-nums"
      style={
        medal
          ? {
              color: "#07080a",
              background: `linear-gradient(140deg, ${medal}, color-mix(in srgb, ${medal} 55%, #000))`,
              boxShadow: `0 0 14px color-mix(in srgb, ${medal} 45%, transparent)`,
            }
          : { color: "var(--smoke)", border: "1px solid color-mix(in srgb, var(--bone) 12%, transparent)" }
      }
    >
      {pos}
    </span>
  );
}

function Metric({
  label,
  value,
  on,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  on?: boolean;
  className?: string;
}) {
  return (
    <span className={`flex flex-col items-end leading-tight ${className}`}>
      <span className="hnk-eyebrow !text-[8px]">{label}</span>
      <span
        className="font-bold tabular-nums text-sm"
        style={{ color: on ? "var(--ember)" : "var(--bone)" }}
      >
        {value}
      </span>
    </span>
  );
}

function rowStyle(pos: number): React.CSSProperties {
  const podium = pos <= 3;
  return {
    borderColor: podium
      ? `color-mix(in srgb, ${MEDALS[pos]} 40%, transparent)`
      : "rgba(219,222,226,0.10)",
    background:
      "linear-gradient(160deg, var(--ink-600), var(--ink-700) 60%, var(--ink-800))",
  };
}

function PlayerRow({
  pos,
  player: p,
  active,
  onClick,
}: {
  pos: number;
  player: LadderPlayer;
  active: PlayerSort;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 sm:gap-4 p-2.5 sm:px-4 border text-left transition hover:-translate-y-px hover:border-ember/50"
      style={rowStyle(pos)}
    >
      <PosBadge pos={pos} />
      {p.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.avatar} alt="" className="hnk-avatar w-11 h-11 flex-none" />
      ) : (
        <span className="hnk-avatar w-11 h-11 flex-none grid place-items-center font-jp text-smoke">
          忍
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block hnk-serif text-base sm:text-lg text-white truncate">
          {p.name}
        </span>
        <span className="block text-xs text-smoke truncate">{p.clan ?? "Sans clan"}</span>
      </span>

      <span className={`hnk-chip ${rankClass(p.rang)} flex-none`}>{p.rang}</span>
      <Metric label="XP" value={fmt(p.xp)} on={active === "xp"} className="w-16 sm:w-20" />
      <Metric
        label="RP"
        value={p.contribution}
        on={active === "contribution"}
        className="flex w-10 sm:w-12"
      />
    </button>
  );
}

function ClanCrest({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span
      className="flex-none grid place-items-center font-display text-ember"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: "rgba(255,87,34,0.10)",
        border: "1px solid color-mix(in srgb, var(--ember) 45%, transparent)",
        textShadow: "0 0 12px color-mix(in srgb, var(--ember) 55%, transparent)",
      }}
    >
      {name.charAt(0).toUpperCase() || "氏"}
    </span>
  );
}

function ClanRow({
  pos,
  clan: c,
  active,
  onClick,
}: {
  pos: number;
  clan: LadderClan;
  active: ClanSort;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 sm:gap-4 p-2.5 sm:px-4 border text-left transition hover:-translate-y-px hover:border-ember/50"
      style={rowStyle(pos)}
    >
      <PosBadge pos={pos} />
      <ClanCrest name={c.name} />
      <span className="flex-1 min-w-0">
        <span className="block hnk-serif text-base sm:text-lg text-white truncate uppercase tracking-wide">
          {c.name}
        </span>
        <span className="block text-xs text-smoke truncate">
          {c.memberCount} membre{c.memberCount > 1 ? "s" : ""}
        </span>
      </span>

      <span className="flex-none flex flex-col items-end leading-tight">
        <span
          className="hnk-eyebrow !text-[8px]"
          style={active === "level" ? { color: "var(--ember)" } : undefined}
        >
          Niveau
        </span>
        <span className={`font-display text-xl leading-none ${rankClass(c.level)}`}>
          {c.level}
        </span>
      </span>
      <Metric label="XP" value={fmt(c.xp)} on={active === "xp"} className="w-16 sm:w-24" />
      <Metric
        label="RP"
        value={c.contribution}
        on={active === "contribution"}
        className="flex w-10 sm:w-12"
      />
    </button>
  );
}

function Empty() {
  return (
    <li className="text-center text-smoke text-sm py-12 border border-dashed border-white/10">
      Aucun résultat.
    </li>
  );
}

// ---- Modales ----

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgba(7,8,10,0.78)", backdropFilter: "blur(3px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="hnk-panel w-full max-w-md relative"
        style={{ animation: "none" }}
      >
        {children}
      </div>
    </div>
  );
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Fermer"
      className="absolute top-2 right-2 w-8 h-8 grid place-items-center text-smoke hover:text-ember transition text-lg"
    >
      ✕
    </button>
  );
}

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="hnk-field text-center sm:text-left">
      <p className="k">{label}</p>
      <p className="v tabular-nums">{value}</p>
    </div>
  );
}

function PlayerModal({
  player: p,
  clan,
  onClose,
}: {
  player: LadderPlayer;
  clan: LadderClan | null;
  onClose: () => void;
}) {
  return (
    <Backdrop onClose={onClose}>
      <CloseBtn onClose={onClose} />
      <div className="flex items-center gap-4">
        {p.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar} alt="" className="hnk-avatar w-20 h-20 flex-none" />
        ) : (
          <span className="hnk-avatar w-20 h-20 flex-none grid place-items-center font-jp text-3xl text-smoke">
            忍
          </span>
        )}
        <div className="min-w-0">
          <p className="hnk-eyebrow">{p.clan ?? "Sans clan"}</p>
          <h3 className="hnk-serif text-2xl text-white truncate">{p.name}</h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`hnk-chip ${rankClass(p.rang)}`}>Rang {p.rang}</span>
            {p.grade && <span className="hnk-chip">{p.grade}</span>}
          </div>
        </div>
      </div>

      {/* Les 3 rangs */}
      <div className="grid grid-cols-3 gap-2 mt-5">
        <MiniRank label="Village" value={p.rangVillage} />
        <MiniRank label="Histoire" value={p.rangHistoire} />
        <MiniRank label="Clan" value={p.rangClan} />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-5">
        <StatBox label="XP" value={fmt(p.xp)} />
        <StatBox label="Contribution" value={`${p.contribution} RP`} />
      </div>

      {clan && (
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
          <span className="flex items-center gap-2 text-sm text-bone">
            <ClanCrest name={clan.name} size={28} />
            <span className="uppercase tracking-wide">{clan.name}</span>
          </span>
          <span className="hnk-eyebrow">
            Niveau de clan ·{" "}
            <span className={`font-bold ${rankClass(clan.level)}`}>{clan.level}</span>
          </span>
        </div>
      )}

      {p.forumUrl && (
        <a
          href={p.forumUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hnk-btn-ghost mt-5 w-full justify-center"
        >
          Voir le profil forum <span aria-hidden>→</span>
        </a>
      )}
    </Backdrop>
  );
}

function MiniRank({ label, value }: { label: string; value: string | null }) {
  return (
    <div
      className="text-center py-2 border"
      style={{ borderColor: "rgba(219,222,226,0.10)", background: "var(--ink-800)" }}
    >
      <p className="hnk-eyebrow !text-[8px]">{label}</p>
      <p className={`font-display text-2xl leading-none mt-1 ${value ? rankClass(value) : "text-smoke"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function ClanModal({
  clan: c,
  onClose,
  onMember,
}: {
  clan: LadderClan;
  onClose: () => void;
  onMember: (id: string) => void;
}) {
  return (
    <Backdrop onClose={onClose}>
      <CloseBtn onClose={onClose} />
      <div className="flex items-center gap-4">
        <ClanCrest name={c.name} size={64} />
        <div className="min-w-0">
          <p className="hnk-eyebrow">Clan</p>
          <h3 className="hnk-serif text-2xl text-white truncate uppercase tracking-wide">
            {c.name}
          </h3>
          <p className="hnk-eyebrow mt-1.5">
            Niveau de clan ·{" "}
            <span className={`font-display text-lg align-middle ${rankClass(c.level)}`}>
              {c.level}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-1 mt-5">
        <StatBox label="XP cumulé" value={fmt(c.xp)} />
        <StatBox label="Contribution" value={`${c.contribution} RP`} />
        <StatBox label="Effectif" value={c.memberCount} />
      </div>

      {c.topMembers.length > 0 && (
        <div className="mt-5">
          <p className="hnk-eyebrow mb-2">Top membres</p>
          <ul className="space-y-1.5">
            {c.topMembers.map((m, i) => (
              <li key={m.id}>
                <button
                  onClick={() => onMember(m.id)}
                  className="w-full flex items-center gap-3 p-2 border text-left transition hover:border-ember/50"
                  style={{ borderColor: "rgba(219,222,226,0.10)", background: "var(--ink-800)" }}
                >
                  <span className="w-5 text-center text-smoke font-display text-sm">{i + 1}</span>
                  {m.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar} alt="" className="hnk-avatar w-8 h-8 flex-none" />
                  ) : (
                    <span className="hnk-avatar w-8 h-8 flex-none grid place-items-center text-xs text-smoke font-jp">
                      忍
                    </span>
                  )}
                  <span className="flex-1 min-w-0 truncate text-sm text-bone">{m.name}</span>
                  <span className={`hnk-chip ${rankClass(m.rang)} flex-none`}>{m.rang}</span>
                  <span className="tabular-nums text-sm text-smoke flex-none w-16 text-right">
                    {fmt(m.xp)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Backdrop>
  );
}

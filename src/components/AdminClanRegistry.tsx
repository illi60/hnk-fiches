"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface AdminClanRegistryRow {
  key: string;
  name: string;
  status: string;
  memberCount: number;
  techniqueCount: number;
  kinjutsuCount: number;
  permissionCount: number;
  hasCommunityRank: boolean;
  canDelete: boolean;
}

export default function AdminClanRegistry({ rows }: { rows: AdminClanRegistryRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const visibleRows = query
    ? rows.filter((row) => row.name.toLowerCase().includes(query) || row.status.toLowerCase().includes(query))
    : rows;

  function remove(row: AdminClanRegistryRow) {
    if (!row.canDelete) return;
    const totalLinks = row.memberCount + row.techniqueCount + row.kinjutsuCount + row.permissionCount;
    if (
      !confirm(
        `Supprimer le clan « ${row.name} » ? ${totalLinks} élément(s) lié(s) seront nettoyés.`
      )
    ) {
      return;
    }
    start(async () => {
      const res = await fetch(`/api/admin/clans/${encodeURIComponent(row.name)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(
          json.error === "FOUNDER_CLAN_PROTECTED"
            ? "Clan fondateur protégé."
            : "Suppression impossible."
        );
        return;
      }
      setMsg(`Clan ${row.name} supprimé.`);
      router.refresh();
    });
  }

  return (
    <section className="border border-ember/20 bg-ink-700 p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember">Clans existants</h3>
          <p className="text-xs text-smoke mt-1">
            Vue consolidée des clans présents dans les profils, permissions, rangs communautaires
            et bibliothèques.
          </p>
        </div>
        <label className="block md:w-72">
          <span className="block text-[10px] uppercase text-smoke mb-1">Filtrer</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom ou statut"
            className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
          />
        </label>
      </div>

      <div className="overflow-x-auto border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-ink-900/80 text-[10px] uppercase tracking-[0.2em] text-smoke">
            <tr>
              <th className="text-left px-3 py-2">Clan</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-right px-3 py-2">Membres</th>
              <th className="text-right px-3 py-2">Techniques</th>
              <th className="text-right px-3 py-2">Kinjutsu</th>
              <th className="text-right px-3 py-2">Accès</th>
              <th className="text-right px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visibleRows.map((row) => (
              <tr key={row.key} className="bg-ink-900/35">
                <td className="px-3 py-2 font-medium text-bone">{row.name}</td>
                <td className="px-3 py-2 text-smoke">
                  {row.status}
                  {row.hasCommunityRank && <span className="ml-2 text-ember">rang posé</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{row.memberCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.techniqueCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.kinjutsuCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.permissionCount}</td>
                <td className="px-3 py-2 text-right">
                  {row.canDelete ? (
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      disabled={pending}
                      className="text-[10px] uppercase tracking-[0.18em] text-red-300 hover:text-red-200 disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-smoke">Protégé</span>
                  )}
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-smoke italic">
                  Aucun clan trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {msg && <p className="text-xs text-bone">{msg}</p>}
    </section>
  );
}

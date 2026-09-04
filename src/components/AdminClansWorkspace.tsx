"use client";

import { useState } from "react";

import ClanLibraryView, { type LibTech } from "@/components/ClanLibraryView";
import ClanLibraryAccessAdmin, { type ClanLibraryPermissionRow } from "@/components/ClanLibraryAccessAdmin";
import AdminKinjutsuManager, { type AdminKinjutsuRow } from "@/components/AdminKinjutsuManager";
import AdminClanRegistry, { type AdminClanRegistryRow } from "@/components/AdminClanRegistry";
import KekkeiCatalogAdmin, { type KekkeiCatalogEntry } from "@/components/KekkeiCatalogAdmin";
import { SPECIAL_UNIT_NAMES } from "@/lib/kinjutsu";

type Tab = "registry" | "kinjutsu" | "clans" | "access" | "kg";

export interface AdminClanGroup {
  clan: string;
  active: LibTech[];
  forgotten: LibTech[];
}

export default function AdminClansWorkspace({
  clans,
  clanGroups,
  kgCatalogRows,
  kgNames,
  kgColors,
  permissions,
  kinjutsu,
  registryRows,
}: {
  clans: string[];
  clanGroups: AdminClanGroup[];
  kgCatalogRows: KekkeiCatalogEntry[];
  kgNames: string[];
  kgColors: Record<string, string>;
  permissions: ClanLibraryPermissionRow[];
  kinjutsu: AdminKinjutsuRow[];
  registryRows: AdminClanRegistryRow[];
}) {
  const [tab, setTab] = useState<Tab>("registry");
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "registry", label: "Clans", count: registryRows.length },
    { key: "kinjutsu", label: "Kinjutsu", count: kinjutsu.length },
    { key: "clans", label: "Bibliothèques", count: clanGroups.reduce((sum, group) => sum + group.active.length + group.forgotten.length, 0) },
    { key: "access", label: "Accès KG", count: permissions.length },
    { key: "kg", label: "Catalogue KG", count: kgCatalogRows.length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`border px-4 py-3 text-left transition ${
              tab === item.key ? "border-ember bg-ember/10" : "border-white/10 bg-ink-700 hover:border-white/20"
            }`}
          >
            <span className="block text-[10px] uppercase tracking-[0.24em] text-smoke">
              Admin clans
            </span>
            <span className={`font-display uppercase tracking-wider ${tab === item.key ? "text-ember" : "text-bone"}`}>
              {item.label}
            </span>
            {item.count !== undefined && <span className="ml-2 text-xs text-smoke">· {item.count}</span>}
          </button>
        ))}
      </div>

      {tab === "registry" && <AdminClanRegistry rows={registryRows} />}

      {tab === "kinjutsu" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {SPECIAL_UNIT_NAMES.map((unit) => (
              <div key={unit} className="border border-white/10 bg-ink-700 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-smoke">Unité spéciale</p>
                <p className="font-display uppercase tracking-wider text-bone mt-1">{unit}</p>
                <p className="text-xs text-smoke mt-1">Déblocage membre : Chunin+</p>
              </div>
            ))}
          </div>
          <AdminKinjutsuManager clans={clans} rows={kinjutsu} />
        </div>
      )}

      {tab === "clans" && (
        <div className="space-y-3">
          {clanGroups.map((group) => (
            <details key={group.clan} className="border border-white/5 bg-ink-700 p-4" open={group.active.length + group.forgotten.length > 0}>
              <summary className="cursor-pointer font-display uppercase tracking-[0.2em] text-ember">
                {group.clan} <span className="text-smoke text-xs">· {group.active.length + group.forgotten.length}</span>
              </summary>
              <div className="mt-4">
                <ClanLibraryView
                  clan={group.clan}
                  showUsable={false}
                  kgColors={kgColors}
                  techniques={group.active}
                  forgottenTechniques={group.forgotten}
                />
              </div>
            </details>
          ))}
        </div>
      )}

      {tab === "access" && (
        <ClanLibraryAccessAdmin clans={clans} kgNames={kgNames} permissions={permissions} />
      )}

      {tab === "kg" && <KekkeiCatalogAdmin kg={kgCatalogRows} />}
    </div>
  );
}

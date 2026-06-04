"use client";

import { useMemo, useState } from "react";

import { actionLabel } from "@/lib/techniques";
import { kgColor, kgCardStyle } from "@/lib/kekkei";
import ForumCopyButton from "@/components/ForumCopyButton";

export interface LibTech {
  id: string;
  nom: string;
  description: string | null;
  art: string | null;
  secondaryArt?: string | null;
  actionType: string | null;
  element: string | null;
  kekkeiGenkai: string | null;
  coutXp: number;
  author: { username: string } | null;
  usable?: boolean;
}

type GroupBy = "actionType" | "art" | "kekkeiGenkai" | "nom";

const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: "actionType", label: "Type d'action" },
  { key: "art", label: "Art shinobi" },
  { key: "kekkeiGenkai", label: "Kekkei Genkai" },
  { key: "nom", label: "Alphabétique" },
];

function groupKey(t: LibTech, by: GroupBy): string {
  if (by === "actionType") return t.actionType ? actionLabel(t.actionType) : "Sans type";
  if (by === "art") return t.art ?? "Sans art";
  if (by === "kekkeiGenkai") return t.kekkeiGenkai ?? "Sans Kekkei Genkai";
  return "Toutes";
}

export default function ClanLibraryView({
  techniques,
  clan,
  showUsable = true,
}: {
  techniques: LibTech[];
  clan: string;
  showUsable?: boolean;
}) {
  const [by, setBy] = useState<GroupBy>("actionType");

  const groups = useMemo(() => {
    const map = new Map<string, LibTech[]>();
    const sorted = [...techniques].sort((a, b) => a.nom.localeCompare(b.nom));
    for (const t of sorted) {
      const k = groupKey(t, by);
      const list = map.get(k) ?? [];
      list.push(t);
      map.set(k, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [techniques, by]);

  if (techniques.length === 0) {
    return (
      <p className="text-sm text-smoke italic">
        Aucune technique dans la bibliothèque du clan pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="hnk-eyebrow">Trier par</span>
        {GROUP_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setBy(o.key)}
            className={`px-3 py-1.5 border text-[10px] tracking-[0.2em] uppercase ${
              by === o.key ? "border-ember text-ember" : "border-white/10 text-smoke hover:text-bone"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {groups.map(([label, list]) => (
        <section key={label}>
          <h2 className="hnk-section-title !text-base">
            {label} <span className="text-smoke text-xs">· {list.length}</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {list.map((t) => (
              <div key={t.id} className="hnk-panel" data-kanji="蔵" style={kgCardStyle(t.kekkeiGenkai)}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display uppercase tracking-wider text-lg text-white min-w-0 break-words">
                    {t.nom}
                  </h3>
                  {showUsable && (
                    <span
                      className="text-xl leading-none flex-none"
                      title={t.usable ? "Utilisable" : "Kekkei Genkai requis manquant"}
                      style={{ color: t.usable ? "var(--ember)" : "#555" }}
                    >
                      ●
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {t.art && <span className="hnk-tech-chip">{t.art}</span>}
                  {t.secondaryArt && <span className="hnk-tech-chip">+ {t.secondaryArt}</span>}
                  {t.actionType && <span className="hnk-tech-chip">{actionLabel(t.actionType)}</span>}
                  {t.element && <span className="hnk-tech-chip">{t.element}</span>}
                  {t.kekkeiGenkai && (
                    <span
                      className="hnk-tech-chip"
                      style={{ color: kgColor(t.kekkeiGenkai), borderColor: kgColor(t.kekkeiGenkai) }}
                    >
                      KG · {t.kekkeiGenkai}
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-sm text-bone/80 mt-3 whitespace-pre-line break-words text-justify">
                    {t.description}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 mt-3">
                  <p className="text-[10px] text-smoke">Déposée par {t.author?.username ?? "—"}</p>
                  {/* Membre : code forum copiable seulement si le KG requis est possédé.
                      Admin (showUsable=false) : toujours copiable. */}
                  {(!showUsable || t.usable) && (
                    <ForumCopyButton
                      data={{
                        nom: t.nom,
                        art: t.art,
                        secondaryArt: t.secondaryArt,
                        actionType: t.actionType,
                        element: t.element,
                        kekkeiGenkai: t.kekkeiGenkai,
                        nature: "COLLECTIVE",
                        kinjutsuScope: null,
                        clan,
                        description: t.description ?? "",
                        coutXp: t.coutXp,
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

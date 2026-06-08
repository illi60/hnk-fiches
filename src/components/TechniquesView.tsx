"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { actionLabel } from "@/lib/techniques";
import { kgColor, kgCardStyle } from "@/lib/kekkei";
import ForumCopyButton from "@/components/ForumCopyButton";

export interface MyTech {
  id: string;
  nom: string;
  description: string | null;
  art: string | null;
  spec?: string | null;
  specRank?: string | null;
  secondaryArt: string | null;
  secondarySpec?: string | null;
  secondarySpecRank?: string | null;
  actionType: string | null;
  element: string | null;
  kekkeiGenkai: string | null;
  secondaryElement: string | null;
  secondaryKekkeiGenkai: string | null;
  nature: string | null;
  kinjutsuScope: string | null;
  clan: string | null;
  coutXp: number;
  status: string;
  mine: boolean;
  invocationNom?: string | null;
  invocationEspece?: string | null;
}

type GroupBy = "status" | "actionType" | "art" | "kekkeiGenkai" | "nom";

const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: "status", label: "Statut" },
  { key: "actionType", label: "Type d'action" },
  { key: "art", label: "Art shinobi" },
  { key: "kekkeiGenkai", label: "Kekkei Genkai" },
  { key: "nom", label: "Alphabétique" },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente",
  VALIDATED: "Validée",
  REJECTED: "Refusée",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "text-smoke",
  PENDING: "text-ember-hot",
  VALIDATED: "text-emerald-400",
  REJECTED: "text-red-400",
};

function groupKey(t: MyTech, by: GroupBy): string {
  if (by === "status") return STATUS_LABEL[t.status] ?? t.status;
  if (by === "actionType") return t.actionType ? actionLabel(t.actionType) : "Sans type";
  if (by === "art") return t.art ?? "Sans art";
  if (by === "kekkeiGenkai") return t.kekkeiGenkai ?? "Sans Kekkei Genkai";
  return "Toutes";
}

export default function TechniquesView({ techniques }: { techniques: MyTech[] }) {
  const [by, setBy] = useState<GroupBy>("status");

  const groups = useMemo(() => {
    const map = new Map<string, MyTech[]>();
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
    return <p className="text-smoke italic">Aucune technique pour l&apos;instant.</p>;
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
              <div key={t.id} className="hnk-panel" data-kanji="技" style={kgCardStyle(t.kekkeiGenkai)}>
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/technique/fiches/${t.id}`}
                    className="font-display uppercase tracking-wider text-lg text-white hover:text-ember min-w-0 break-words"
                  >
                    {t.nom}
                  </Link>
                  <span
                    className={`text-[10px] tracking-[0.2em] uppercase flex-none ${
                      STATUS_COLOR[t.status] ?? "text-smoke"
                    }`}
                  >
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {t.art && (
                    <span className="hnk-tech-chip">
                      {t.art}{t.spec ? ` · ${t.spec}` : ""}{t.specRank ? ` · ${t.specRank}` : ""}
                    </span>
                  )}
                  {t.secondaryArt && (
                    <span className="hnk-tech-chip">
                      + {t.secondaryArt}{t.secondarySpec ? ` · ${t.secondarySpec}` : ""}{t.secondarySpecRank ? ` · ${t.secondarySpecRank}` : ""}
                    </span>
                  )}
                  {t.actionType && <span className="hnk-tech-chip">{actionLabel(t.actionType)}</span>}
                  {t.element && <span className="hnk-tech-chip">{t.element}</span>}
                  {t.secondaryElement && <span className="hnk-tech-chip">{t.secondaryElement}</span>}
                  {t.kekkeiGenkai && (
                    <span
                      className="hnk-tech-chip"
                      style={{ color: kgColor(t.kekkeiGenkai), borderColor: kgColor(t.kekkeiGenkai) }}
                    >
                      KG · {t.kekkeiGenkai}
                    </span>
                  )}
                  {t.secondaryKekkeiGenkai && (
                    <span
                      className="hnk-tech-chip"
                      style={{
                        color: kgColor(t.secondaryKekkeiGenkai),
                        borderColor: kgColor(t.secondaryKekkeiGenkai),
                      }}
                    >
                      KG · {t.secondaryKekkeiGenkai}
                    </span>
                  )}
                  {t.invocationNom && (
                    <span className="hnk-tech-chip">
                      口 {t.invocationEspece ? `${t.invocationEspece} · ` : ""}
                      {t.invocationNom}
                    </span>
                  )}
                  {!t.mine && <span className="hnk-tech-chip">Tag Team (partenaire)</span>}
                </div>
                {t.description && (
                  <p className="text-sm text-bone/80 mt-3 whitespace-pre-line break-words text-justify line-clamp-3">
                    {t.description}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 mt-3">
                  <span className="text-xs text-smoke tabular-nums">{t.coutXp} XP</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/technique/fiches/${t.id}`}
                      className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]"
                    >
                      Voir
                    </Link>
                    {t.status === "VALIDATED" && (
                      <ForumCopyButton
                        data={{
                          nom: t.nom,
                          art: t.art,
                          spec: t.spec ?? null,
                          specRank: t.specRank ?? null,
                          secondaryArt: t.secondaryArt,
                          secondarySpec: t.secondarySpec ?? null,
                          secondarySpecRank: t.secondarySpecRank ?? null,
                          actionType: t.actionType,
                          element: t.element,
                          kekkeiGenkai: t.kekkeiGenkai,
                          secondaryElement: t.secondaryElement,
                          secondaryKekkeiGenkai: t.secondaryKekkeiGenkai,
                          nature: t.nature,
                          kinjutsuScope: t.kinjutsuScope,
                          clan: t.clan,
                          espece: t.invocationEspece ?? null,
                          description: t.description ?? "",
                          coutXp: t.coutXp,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { KG_NAMES, kgColor } from "@/lib/kekkei";
import { ELEMENTS } from "@/lib/techniques";
import { RANKS, rankIndex } from "@/lib/arts";

export default function IdentityChooser({
  primaryKg,
  primaryAffinity,
  rang,
  secondAffinity,
  kgNames = KG_NAMES,
  kgColors,
}: {
  primaryKg: string | null;
  primaryAffinity: string | null;
  rang?: string | null;
  secondAffinity?: string | null;
  kgNames?: string[];
  kgColors?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kg, setKg] = useState("");
  const [aff, setAff] = useState("");
  const [aff2, setAff2] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // 2e affinité : débloquée au rang global B, après avoir fixé la 1ère.
  const rankB = rankIndex(rang) >= RANKS.indexOf("B");
  const canSecondAffinity = rankB && !!primaryAffinity;

  function choose(field: "kg" | "affinity" | "secondAffinity", value: string, label: string) {
    if (!value) return;
    if (
      !confirm(
        `Confirmer ${label} : « ${value} » ?\n\nCe choix est DÉFINITIF et irréversible.`
      )
    )
      return;
    setErr(null);
    start(async () => {
      const r = await fetch("/api/me/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr("Action impossible (déjà choisi ?).");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="hnk-panel" data-kanji="血">
      <p className="hnk-eyebrow">Identité · choix définitifs</p>
      <div className="grid sm:grid-cols-2 gap-5 mt-3">
        <div>
          <p className="hnk-label">Kekkei Genkai</p>
          {primaryKg ? (
            <span
              className="hnk-chip"
              style={{
                color: resolveKgColor(primaryKg, kgColors),
                borderColor: resolveKgColor(primaryKg, kgColors),
              }}
            >
              {primaryKg}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <select className="hnk-input" value={kg} onChange={(e) => setKg(e.target.value)}>
                <option value="">— Choisir mon 1er KG</option>
                {kgNames.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="hnk-btn !py-2 !px-3 !text-[10px]"
                disabled={pending || !kg}
                onClick={() => choose("kg", kg, "mon Kekkei Genkai")}
              >
                Valider
              </button>
            </div>
          )}
        </div>

        <div>
          <p className="hnk-label">Affinité élémentaire</p>
          {primaryAffinity ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="hnk-chip">{primaryAffinity}</span>
              {secondAffinity && <span className="hnk-chip">{secondAffinity}</span>}
              {canSecondAffinity && !secondAffinity && (
                <div className="flex items-center gap-2 w-full mt-1">
                  <select
                    className="hnk-input"
                    value={aff2}
                    onChange={(e) => setAff2(e.target.value)}
                  >
                    <option value="">— Choisir ma 2e affinité (Rang B)</option>
                    {ELEMENTS.filter((a) => a !== primaryAffinity).map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="hnk-btn !py-2 !px-3 !text-[10px]"
                    disabled={pending || !aff2}
                    onClick={() => choose("secondAffinity", aff2, "ma 2e affinité")}
                  >
                    Valider
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select className="hnk-input" value={aff} onChange={(e) => setAff(e.target.value)}>
                <option value="">— Choisir ma 1ère affinité</option>
                {ELEMENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="hnk-btn !py-2 !px-3 !text-[10px]"
                disabled={pending || !aff}
                onClick={() => choose("affinity", aff, "mon affinité")}
              >
                Valider
              </button>
            </div>
          )}
        </div>
      </div>
      {(!primaryKg || !primaryAffinity) && (
        <p className="text-[10px] text-smoke mt-3">
          ⚠️ Ces choix sont définitifs et irréversibles (sauf intervention du staff).
        </p>
      )}
      {err && <p className="text-sm text-ember-hot mt-2">{err}</p>}
    </div>
  );
}

function resolveKgColor(name: string, kgColors?: Record<string, string>) {
  return kgColors?.[name] ?? kgColor(name);
}

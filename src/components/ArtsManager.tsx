"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  ARTS_ALL,
  artRank,
  specRank,
  isExpertised,
  getArtState,
  quoteAction,
  rankClass,
  artSlots,
  ownedArtCount,
  isArtOwned,
  type ArtsState,
  type ArtAction,
  type ActionQuote,
} from "@/lib/arts";

function humanError(e?: string): string {
  switch (e) {
    case "XP_INSUFFISANT":
      return "XP insuffisant.";
    case "MAX_EXPERTISE":
      return "Maximum 3 arts expertisés.";
    case "HISTOIRE_C_REQUIS":
      return "Rang Histoire C requis pour le Kuchiyose.";
    case "PLAFOND_ART":
      return "Plafonné au rang de l'art (expertise requise au-delà de B).";
    case "RANG_MAX":
      return "Rang maximum atteint.";
    case "DEJA_EXPERTISE":
      return "Art déjà expertisé.";
    case "SPE_PRINCIPALE_AUTO":
      return "Spé principale (suit l'art, gratuite).";
    case "DEJA_CHOISIE":
      return "Spé principale déjà choisie.";
    case "SLOTS_PLEINS":
      return "Tous tes slots d'Arts sont occupés (monte ton rang).";
    case "ART_NON_DEBLOQUE":
      return "Débloque d'abord cet Art.";
    case "CONFLICT":
      return "Conflit (autre action simultanée), réessaie.";
    default:
      return "Action impossible.";
  }
}

export default function ArtsManager({
  artsState,
  villageRank,
  histoireRank,
  xpAvailable,
}: {
  artsState: ArtsState;
  villageRank: string | null;
  histoireRank: string | null;
  xpAvailable: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const ctx = { villageRank, histoireRank, xpAvailable };

  // Le déblocage des Arts suit le RANG GLOBAL (passé via villageRank).
  const slots = artSlots(villageRank);
  const usedSlots = ownedArtCount(artsState, villageRank);
  const allUnlocked = usedSlots >= ARTS_ALL.filter((a) => a.key !== "kuchiyose").length;

  function run(action: ArtAction) {
    setErr(null);
    start(async () => {
      const res = await fetch("/api/me/arts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const j = await res.json().catch(() => ({}));
      if (!j.ok) {
        setErr(humanError(j.error));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="hnk-eyebrow">
          {allUnlocked ? "Tous les Arts débloqués" : `Arts débloqués · ${usedSlots} / ${slots}`}
        </p>
        <p className="text-[10px] text-smoke tracking-wide">
          Slots selon le rang global — E:1 · D:2 · C:3 · B+:tous
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
      {ARTS_ALL.map((art) => {
        const kuchi = art.key === "kuchiyose";
        const kuchiLocked = kuchi && !getArtState(artsState, "kuchiyose").unlocked;
        const owned = isArtOwned(artsState, art.key, villageRank);
        const mainLocked = !kuchi && !owned;
        const ar = artRank(art.key, artsState, villageRank);
        const expert = isExpertised(artsState, art.key);
        const primary = getArtState(artsState, art.key).primarySpec;

        return (
          <div
            key={art.key}
            className={`hnk-panel ${mainLocked ? "opacity-60" : ""}`}
            data-kanji={art.kanji}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display uppercase tracking-wider text-lg text-white">
                {art.name}
              </h3>
              {kuchiLocked ? (
                <span className="hnk-chip">Verrouillé</span>
              ) : mainLocked ? (
                <span className="hnk-chip">Non débloqué</span>
              ) : (
                <span className={`hnk-chip ${rankClass(ar)}`}>Rang {ar}</span>
              )}
            </div>

            {kuchiLocked ? (
              <ActionButton
                quote={quoteAction({ type: "unlockKuchiyose" }, artsState, ctx)}
                pending={pending}
                label="Obtenir le Kuchiyose"
                onClick={() => run({ type: "unlockKuchiyose" })}
              />
            ) : mainLocked ? (
              <div className="space-y-2">
                <p className="text-[11px] text-smoke">
                  Occupe un slot d&apos;Art ouvert par ton Rang Histoire.
                </p>
                <ActionButton
                  quote={quoteAction({ type: "selectArt", art: art.key }, artsState, ctx)}
                  pending={pending}
                  label="Débloquer cet Art"
                  onClick={() => run({ type: "selectArt", art: art.key })}
                />
              </div>
            ) : (
              <>
                <div className="space-y-0.5">
                  {art.specs.map((s, i) => {
                    const r = specRank(art.key, i, artsState, villageRank);
                    const isPrimary = primary === i;
                    const noPrimary = primary === undefined;
                    const q =
                      isPrimary || noPrimary
                        ? null
                        : quoteAction({ type: "rankSpec", art: art.key, spec: i }, artsState, ctx);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0"
                      >
                        <span className="text-sm text-bone">
                          {s}
                          {isPrimary && (
                            <span className="text-ember text-[10px] ml-2">★ principale</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold tabular-nums ${rankClass(r)}`}>{r}</span>
                          {isPrimary ? (
                            <span className="text-smoke text-[9px] uppercase">auto</span>
                          ) : noPrimary ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Définir « ${s} » comme spécialisation principale ?\n\nCe choix est définitif.`
                                  )
                                )
                                  run({ type: "choosePrimary", art: art.key, spec: i });
                              }}
                              title="Définir comme spé principale (définitif)"
                              className="hnk-btn-ghost !py-1 !px-2 !text-[9px] disabled:opacity-40"
                            >
                              ★ définir
                            </button>
                          ) : (
                            q && (
                              <button
                                type="button"
                                disabled={pending || !q.ok}
                                onClick={() => run({ type: "rankSpec", art: art.key, spec: i })}
                                title={q.ok ? `Monter (${q.cost} XP)` : humanError(q.error)}
                                className="hnk-btn-ghost !py-1 !px-2 !text-[9px] disabled:opacity-40"
                              >
                                ▲ {q.cost} XP
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!kuchi && !expert && (
                  <div className="pt-3">
                    <ActionButton
                      quote={quoteAction({ type: "expertise", art: art.key }, artsState, ctx)}
                      pending={pending}
                      label="Expertiser (A / S)"
                      onClick={() => run({ type: "expertise", art: art.key })}
                    />
                  </div>
                )}
                {!kuchi && expert && (
                  <p className="text-[10px] text-ember mt-3 tracking-[0.18em] uppercase">
                    ✦ Expertisé — accès A / S
                  </p>
                )}
                {!kuchi && getArtState(artsState, art.key).owned && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        confirm(
                          `Libérer le slot de « ${art.name} » ?\n\nTa progression sur cet Art est conservée et reviendra si tu le redébloques.`
                        )
                      )
                        run({ type: "deselectArt", art: art.key });
                    }}
                    className="mt-3 text-[9px] text-smoke hover:text-ember-hot transition-colors disabled:opacity-40"
                  >
                    ✕ Libérer le slot
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}

        {err && <p className="text-sm text-ember-hot sm:col-span-2">{err}</p>}
      </div>
    </div>
  );
}

function ActionButton({
  quote,
  pending,
  label,
  onClick,
}: {
  quote: ActionQuote;
  pending: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending || !quote.ok}
      onClick={onClick}
      title={quote.ok ? undefined : humanError(quote.error)}
      className="hnk-btn-ghost !py-2 !px-3 !text-[10px] w-full justify-center disabled:opacity-40"
    >
      {label} · {quote.cost} XP
    </button>
  );
}

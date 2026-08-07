"use client";

import { useState } from "react";

import {
  ARTS_ALL,
  artRank,
  isArtOwned,
  type ArtsState,
} from "@/lib/arts";
import type { ShopItem } from "@/lib/shop";
import ArtsManager from "@/components/ArtsManager";
import ArtsRadar from "@/components/ArtsRadar";
import ProfileInventory, { type ProfileInventoryItem } from "@/components/ProfileInventory";

type Tab = "ARTS" | "INVENTORY";

export default function ProfileDetailTabs({
  artsState,
  artsRank,
  histoireRank,
  xpAvailable,
  inventory,
  catalog,
}: {
  artsState: ArtsState;
  artsRank: string | null;
  histoireRank: string | null;
  xpAvailable: number;
  inventory: ProfileInventoryItem[];
  catalog: ShopItem[];
}) {
  const [tab, setTab] = useState<Tab>("ARTS");

  return (
    <section>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="hnk-section-title flex-1">
          {tab === "ARTS" ? "Arts Shinobi" : "Inventaire"}
        </h2>
        <div className="grid grid-cols-2 border border-white/10 min-w-[260px]">
          <button
            type="button"
            className={`hnk-shop-subtab ${tab === "ARTS" ? "hnk-shop-subtab--active" : ""}`}
            onClick={() => setTab("ARTS")}
          >
            Arts
          </button>
          <button
            type="button"
            className={`hnk-shop-subtab ${tab === "INVENTORY" ? "hnk-shop-subtab--active" : ""}`}
            onClick={() => setTab("INVENTORY")}
          >
            Inventaire
          </button>
        </div>
      </div>

      {tab === "ARTS" ? (
        <>
          <div className="grid lg:grid-cols-[minmax(0,360px),1fr] gap-6 items-start">
            <div className="hnk-panel flex items-center justify-center" data-kanji="技">
              <ArtsRadar
                axes={ARTS_ALL.map((art) => ({
                  kanji: art.kanji,
                  label: art.name,
                  rank: isArtOwned(artsState, art.key, histoireRank)
                    ? artRank(art.key, artsState, artsRank)
                    : "E",
                }))}
              />
            </div>
            <ArtsManager
              artsState={artsState}
              artsRank={artsRank}
              histoireRank={histoireRank}
              xpAvailable={xpAvailable}
            />
          </div>
          <p className="text-[10px] text-smoke mt-3 tracking-wide">
            Arts debloques selon le Rang Histoire (E:1 · D:2 · C:3 · B+:tous).
            Montee automatique E vers B. Au-dela: expertise, cout en XP.
          </p>
        </>
      ) : (
        <ProfileInventory inventory={inventory} catalog={catalog} showHeader={false} />
      )}
    </section>
  );
}

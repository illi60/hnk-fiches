"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import AdminAlertCards, { type AdminAlertCardView } from "@/components/AdminAlertCards";
import AdminReconquestProgress from "@/components/AdminReconquestProgress";
import AdminRelicOwners, { type AdminRelicView } from "@/components/AdminRelicOwners";
import AdminShopItems, { type AdminShopItemView } from "@/components/AdminShopItems";

export type AdminShopAlertPreview = AdminAlertCardView;

export default function AdminShopWorkspace({
  items,
  relics,
  reconquestProgress,
  alerts,
}: {
  items: AdminShopItemView[];
  relics: AdminRelicView[];
  reconquestProgress: number;
  alerts: AdminShopAlertPreview[];
}) {
  const [tab, setTab] = useState<"suivi" | "catalogue" | "alertes">("suivi");
  const stats = useMemo(() => {
    const active = items.filter((item) => item.isActive).length;
    const inactive = items.length - active;
    const globalOwned = relics.reduce((sum, relic) => sum + relic.owners.length, 0);
    const unreadAlerts = alerts.filter((alert) => !alert.isRead).length;
    return { active, inactive, globalOwned, unreadAlerts };
  }, [alerts, items, relics]);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <ShopKpi label="Objets actifs" value={stats.active} />
        <ShopKpi label="Objets masqués" value={stats.inactive} />
        <ShopKpi label="Reliques / contes détenus" value={stats.globalOwned} />
        <ShopKpi label="Alertes à traiter" value={stats.unreadAlerts} accent={stats.unreadAlerts > 0} />
      </div>

      <section className="hnk-panel !py-4" data-kanji="店">
        <div className="flex flex-wrap items-center gap-3">
          <TabButton active={tab === "suivi"} onClick={() => setTab("suivi")}>
            Suivi
          </TabButton>
          <TabButton active={tab === "catalogue"} onClick={() => setTab("catalogue")}>
            Catalogue
          </TabButton>
          <TabButton active={tab === "alertes"} onClick={() => setTab("alertes")}>
            Alertes
          </TabButton>
          <Link href="/admin/alertes" className="hnk-btn-ghost !py-2 !px-4 !text-[10px] ml-auto">
            Ouvrir la file complète
          </Link>
        </div>
      </section>

      {tab === "suivi" && (
        <div className="space-y-6">
          <AdminReconquestProgress progress={reconquestProgress} />
          <AdminRelicOwners relics={relics} />
        </div>
      )}

      {tab === "catalogue" && <AdminShopItems items={items} />}

      {tab === "alertes" && (
        <section className="hnk-panel" data-kanji="告">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div>
              <p className="hnk-eyebrow">Alertes boutique</p>
              <h2 className="hnk-serif text-2xl mt-2">Achats à suivre</h2>
              <p className="text-sm text-smoke mt-3 max-w-2xl">
                Clique une alerte pour consulter son dossier, ou supprime-la directement si elle est déjà traitée.
              </p>
            </div>
            <Link href="/admin/alertes" className="hnk-btn-ghost !py-2 !px-4 !text-[10px]">
              Tout voir
            </Link>
          </div>
          <AdminAlertCards alerts={alerts} empty="Aucune alerte boutique récente." />
        </section>
      )}
    </div>
  );
}

function ShopKpi({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`border p-4 ${accent ? "border-ember/60 bg-ember/10" : "border-white/10 bg-ink-700"}`}>
      <p className="hnk-eyebrow">{label}</p>
      <p className={`font-display text-3xl mt-2 ${accent ? "text-ember" : "text-white"}`}>{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`hnk-btn-ghost !py-2 !px-5 !text-[10px] ${
        active ? "!border-ember !bg-ember/15 !text-ember" : ""
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

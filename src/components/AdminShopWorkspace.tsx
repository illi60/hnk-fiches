"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import AdminReconquestProgress from "@/components/AdminReconquestProgress";
import AdminRelicOwners, { type AdminRelicView } from "@/components/AdminRelicOwners";
import AdminShopItems, { type AdminShopItemView } from "@/components/AdminShopItems";
import { categoryLabel } from "@/lib/shop";

export interface AdminShopAlertPreview {
  id: string;
  title: string;
  body: string;
  kind: string;
  itemName: string | null;
  costXp: number | null;
  isRead: boolean;
  createdAt: string;
  user: {
    username: string;
    forumPseudo?: string | null;
    clan?: string | null;
  };
}

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
  const [tab, setTab] = useState<"pilotage" | "catalogue" | "alertes">("pilotage");
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
          <TabButton active={tab === "pilotage"} onClick={() => setTab("pilotage")}>
            Pilotage
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

      {tab === "pilotage" && (
        <div className="space-y-6">
          <AdminReconquestProgress progress={reconquestProgress} />
          <AdminRelicOwners relics={relics} />
        </div>
      )}

      {tab === "catalogue" && <AdminShopItems items={items} />}

      {tab === "alertes" && <ShopAlertPanel alerts={alerts} />}
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

function ShopAlertPanel({ alerts }: { alerts: AdminShopAlertPreview[] }) {
  return (
    <section className="hnk-panel" data-kanji="告">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="hnk-eyebrow">Alertes boutique</p>
          <h2 className="hnk-serif text-2xl mt-2">Achats à suivre</h2>
          <p className="text-sm text-smoke mt-3 max-w-2xl">
            Clique une alerte pour consulter son dossier, voir le joueur concerné et la marquer comme lue.
          </p>
        </div>
        <Link href="/admin/alertes" className="hnk-btn-ghost !py-2 !px-4 !text-[10px]">
          Tout voir
        </Link>
      </div>

      <div className="mt-5 grid lg:grid-cols-2 gap-3">
        {alerts.map((alert) => {
          const holder = alert.user.forumPseudo || alert.user.username;
          return (
            <Link
              key={alert.id}
              href={`/admin/alertes/${alert.id}`}
              className={`border px-4 py-4 transition ${
                alert.isRead
                  ? "border-white/10 bg-black/20 hover:bg-white/[0.03]"
                  : "border-ember/35 bg-ember/5 hover:bg-ember/10"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="hnk-chip">{alert.isRead ? "Lu" : "À traiter"}</span>
                <span className="hnk-chip">{alertKindLabel(alert.kind)}</span>
                {alert.itemName && <span className="hnk-chip">{categoryLabelFromName(alert.itemName)}</span>}
              </div>
              <h3 className="font-display uppercase tracking-wider text-xl text-white mt-3">{alert.title}</h3>
              <p className="text-sm text-smoke mt-2 line-clamp-2">{alert.body}</p>
              <p className="text-xs text-bone/70 mt-3">
                {holder}
                {alert.costXp !== null ? ` - ${alert.costXp} XP` : ""}
              </p>
            </Link>
          );
        })}
        {alerts.length === 0 && (
          <p className="text-sm text-smoke italic border border-white/10 bg-black/20 px-4 py-8">
            Aucune alerte boutique récente.
          </p>
        )}
      </div>
    </section>
  );
}

function alertKindLabel(kind: string) {
  if (kind === "SHOP_RECONQUEST") return "Reconquête";
  if (kind === "SHOP_GRADE_REQUEST") return "Grade";
  if (kind === "SHOP_RECONQUEST_ADMIN") return "Admin";
  return kind.replace(/_/g, " ").toLowerCase();
}

function categoryLabelFromName(name: string) {
  return name.toLowerCase().includes("grade") ? categoryLabel("SERVICES") : "Boutique";
}

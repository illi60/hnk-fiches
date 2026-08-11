"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { adminAlertKindLabel, repairAdminAlertText } from "@/lib/admin-alerts";

export interface AdminAlertCardView {
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

export default function AdminAlertCards({
  alerts,
  empty = "Aucune alerte boutique pour le moment.",
}: {
  alerts: AdminAlertCardView[];
  empty?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function remove(alert: AdminAlertCardView) {
    if (!confirm(`Supprimer l'alerte "${repairAdminAlertText(alert.title)}" ?`)) return;
    setMsg(null);
    setDeletingId(alert.id);
    start(async () => {
      const res = await fetch(`/api/admin/alertes/${alert.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg("Suppression impossible.");
        setDeletingId(null);
        return;
      }
      setMsg("Alerte supprimée.");
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="grid lg:grid-cols-2 gap-3">
        {alerts.map((alert) => {
          const holder = alert.user.forumPseudo || alert.user.username;
          return (
            <article
              key={alert.id}
              className={`border px-4 py-4 transition ${
                alert.isRead
                  ? "border-white/10 bg-black/20 hover:bg-white/[0.03]"
                  : "border-ember/35 bg-ember/5 hover:bg-ember/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/admin/alertes/${alert.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="hnk-chip">{alert.isRead ? "Lu" : "À traiter"}</span>
                    <span className="hnk-chip">{adminAlertKindLabel(alert.kind)}</span>
                    {alert.itemName && <span className="hnk-chip">Boutique</span>}
                  </div>
                  <h3 className="font-display uppercase tracking-wider text-xl text-white mt-3">
                    {repairAdminAlertText(alert.title)}
                  </h3>
                  <p className="text-sm text-smoke mt-2 line-clamp-2">{repairAdminAlertText(alert.body)}</p>
                  <p className="text-xs text-bone/70 mt-3">
                    {holder}
                    {alert.user.clan ? ` - ${alert.user.clan}` : ""}
                    {alert.itemName ? ` - ${alert.itemName}` : ""}
                    {alert.costXp !== null ? ` - ${alert.costXp} XP` : ""}
                  </p>
                  <p className="text-xs text-smoke mt-2">
                    {new Date(alert.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </Link>

                <button
                  type="button"
                  className="hnk-btn-ghost !py-2 !px-3 !text-[10px] shrink-0"
                  disabled={pending && deletingId === alert.id}
                  onClick={() => remove(alert)}
                >
                  {pending && deletingId === alert.id ? "..." : "Supprimer"}
                </button>
              </div>
            </article>
          );
        })}

        {alerts.length === 0 && (
          <p className="text-sm text-smoke italic border border-white/10 bg-black/20 px-4 py-8">{empty}</p>
        )}
      </div>
      {msg && <p className="text-sm text-bone mt-3">{msg}</p>}
    </div>
  );
}

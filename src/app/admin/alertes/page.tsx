import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireFicheModerator } from "@/lib/permissions";

export default async function AdminAlertsPage() {
  await requireFicheModerator();

  const alerts = await prisma.adminAlert.findMany({
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    take: 80,
    select: {
      id: true,
      title: true,
      body: true,
      kind: true,
      itemName: true,
      costXp: true,
      isRead: true,
      createdAt: true,
      user: { select: { username: true, forumPseudo: true, clan: true } },
    },
  });

  const unread = alerts.filter((alert) => !alert.isRead).length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="hnk-eyebrow">File staff</p>
          <h1 className="font-serif text-3xl text-white2 mt-1">Alertes boutique</h1>
          <p className="text-sm text-smoke mt-2 max-w-2xl">
            Consulte les achats qui demandent une action humaine : promotions, reconquêtes et validations
            forum. Une alerte ouverte est marquée comme lue.
          </p>
        </div>
        <span className="hnk-chip">{unread} à traiter</span>
      </div>

      <section className="hnk-panel" data-kanji="告">
        <div className="divide-y divide-white/10 border border-white/10 bg-black/20">
          {alerts.map((alert) => {
            const holder = alert.user.forumPseudo || alert.user.username;
            return (
              <Link
                key={alert.id}
                href={`/admin/alertes/${alert.id}`}
                className={`block px-4 py-4 transition ${
                  alert.isRead ? "hover:bg-white/[0.03]" : "bg-ember/5 hover:bg-ember/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg uppercase tracking-wider text-white">{alert.title}</p>
                      <span className="hnk-chip">{alert.isRead ? "Lu" : "À traiter"}</span>
                      <span className="hnk-chip">{alertKindLabel(alert.kind)}</span>
                    </div>
                    <p className="text-sm text-smoke mt-2 line-clamp-2">{alert.body}</p>
                    <p className="text-xs text-bone/70 mt-3">
                      {holder}
                      {alert.user.clan ? ` - ${alert.user.clan}` : ""}
                      {alert.itemName ? ` - ${alert.itemName}` : ""}
                      {alert.costXp !== null ? ` - ${alert.costXp} XP` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-smoke">
                    {new Date(alert.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </Link>
            );
          })}
          {alerts.length === 0 && (
            <p className="px-4 py-8 text-sm text-smoke italic">Aucune alerte boutique pour le moment.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function alertKindLabel(kind: string) {
  if (kind === "SHOP_RECONQUEST") return "Reconquête";
  if (kind === "SHOP_GRADE_REQUEST") return "Grade";
  if (kind === "SHOP_RECONQUEST_ADMIN") return "Admin";
  return kind.replace(/_/g, " ").toLowerCase();
}

import AdminAlertCards, { type AdminAlertCardView } from "@/components/AdminAlertCards";
import { prisma } from "@/lib/prisma";
import { requireFicheModerator } from "@/lib/permissions";

export default async function AdminAlertsPage() {
  await requireFicheModerator();

  const rows = await prisma.adminAlert.findMany({
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

  const alerts: AdminAlertCardView[] = rows.map((alert) => ({
    ...alert,
    createdAt: alert.createdAt.toISOString(),
  }));
  const unread = alerts.filter((alert) => !alert.isRead).length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="hnk-eyebrow">File staff</p>
          <h1 className="font-serif text-3xl text-white2 mt-1">Alertes boutique</h1>
          <p className="text-sm text-smoke mt-2 max-w-2xl">
            Consulte les achats qui demandent une action humaine : promotions, reconquêtes et validations
            forum. Une alerte ouverte est marquée comme lue, et peut être supprimée directement depuis la liste.
          </p>
        </div>
        <span className="hnk-chip">{unread} à traiter</span>
      </div>

      <section className="hnk-panel" data-kanji="告">
        <AdminAlertCards alerts={alerts} />
      </section>
    </div>
  );
}

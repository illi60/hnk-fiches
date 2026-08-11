import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireFicheModerator } from "@/lib/permissions";

export default async function AdminAlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireFicheModerator();
  const { id } = await params;

  const alert = await prisma.adminAlert.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          forumPseudo: true,
          clan: true,
          grade: true,
          rangHistoire: true,
          rangVillage: true,
          rangClan: true,
        },
      },
    },
  });

  if (!alert) notFound();

  if (!alert.isRead) {
    await prisma.adminAlert.update({
      where: { id: alert.id },
      data: { isRead: true },
    });
  }

  const holder = alert.user.forumPseudo || alert.user.username;
  const metadata = formatMetadata(alert.metadata);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="hnk-eyebrow">Alerte boutique</p>
          <h1 className="font-display text-4xl uppercase tracking-wider text-ember mt-2">
            {alert.title}
          </h1>
          <p className="text-sm text-smoke mt-2">
            Ouverte le{" "}
            {new Date(alert.createdAt).toLocaleString("fr-FR", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="hnk-chip">{alertKindLabel(alert.kind)}</span>
          <span className="hnk-chip">Marquée comme lue</span>
        </div>
      </div>

      <section className="hnk-panel" data-kanji="告">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div>
            <p className="hnk-eyebrow">Message joueur</p>
            <div className="mt-3 border border-ember/25 bg-ember/5 px-5 py-4 text-bone leading-relaxed">
              {alert.body}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/admin/alertes" className="hnk-btn-ghost !py-2 !px-4 !text-[10px]">
                Retour aux alertes
              </Link>
              {me.role === "ADMIN" && (
                <Link href={`/admin/users/${alert.user.id}`} className="hnk-btn-ghost !py-2 !px-4 !text-[10px]">
                  Voir le joueur
                </Link>
              )}
            </div>
          </div>

          <aside className="border border-white/10 bg-black/20 p-4">
            <p className="hnk-eyebrow">Dossier</p>
            <dl className="mt-4 space-y-3 text-sm">
              <Info label="Joueur" value={holder} />
              <Info label="Compte" value={alert.user.username} />
              <Info label="Clan" value={alert.user.clan || "Non renseigné"} />
              <Info label="Grade" value={alert.user.grade || "Non renseigné"} />
              <Info label="Rang histoire" value={alert.user.rangHistoire || "Non renseigné"} />
              <Info label="Rang village" value={alert.user.rangVillage || "Non renseigné"} />
              <Info label="Rang clan" value={alert.user.rangClan || "Non renseigné"} />
              {alert.itemName && <Info label="Objet" value={alert.itemName} />}
              {alert.costXp !== null && <Info label="Coût" value={`${alert.costXp} XP`} />}
              {alert.itemKey && <Info label="Clé objet" value={alert.itemKey} />}
            </dl>
          </aside>
        </div>

        {metadata && (
          <div className="mt-6 border border-white/10 bg-black/20 p-4">
            <p className="hnk-eyebrow">Détails techniques</p>
            <pre className="mt-3 whitespace-pre-wrap text-xs text-smoke leading-relaxed">{metadata}</pre>
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-2">
      <dt className="text-smoke">{label}</dt>
      <dd className="text-bone text-right">{value}</dd>
    </div>
  );
}

function formatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  return JSON.stringify(metadata, null, 2);
}

function alertKindLabel(kind: string) {
  if (kind === "SHOP_RECONQUEST") return "Reconquête";
  if (kind === "SHOP_GRADE_REQUEST") return "Grade";
  if (kind === "SHOP_RECONQUEST_ADMIN") return "Admin";
  return kind.replace(/_/g, " ").toLowerCase();
}

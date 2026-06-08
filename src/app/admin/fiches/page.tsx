import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireFicheModerator } from "@/lib/permissions";
import AdminFicheDecision from "@/components/AdminFicheDecision";
import { actionLabel, natureLabel, ART_KANJI } from "@/lib/techniques";
import { kgColor } from "@/lib/kekkei";
import { ARTS_ALL, specRank, type ArtsState } from "@/lib/arts";

export default async function AdminFichesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const me = await requireFicheModerator();
  const isAdmin = me.role === "ADMIN";
  const sp = await searchParams;
  const allowed = ["PENDING", "VALIDATED", "REJECTED", "DRAFT"] as const;
  const status = (allowed as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as (typeof allowed)[number])
    : "PENDING";

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "En attente",
    VALIDATED: "Validées",
    REJECTED: "Refusées",
    DRAFT: "Brouillons",
  };

  const fiches = await prisma.ficheTechnique.findMany({
    where: { status, isActive: true },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      slug: true,
      nom: true,
      description: true,
      art: true,
      spec: true,
      actionType: true,
      element: true,
      kekkeiGenkai: true,
      nature: true,
      kinjutsuScope: true,
      clan: true,
      coutXp: true,
      status: true,
      rejectionReason: true,
      comment: true,
      createdAt: true,
      author: {
        select: { id: true, username: true, xpAvailable: true, clan: true, rang: true, artsState: true, rangVillage: true },
      },
    },
  });

  const fichesWithSpec = fiches.map((f) => {
    const artKey = f.art
      ? f.art.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      : null;
    const artDef = artKey ? ARTS_ALL.find((a) => a.key === artKey) : null;
    const specIdx = artDef && f.spec ? (artDef.specs as string[]).indexOf(f.spec) : -1;
    const ficheSpecRank =
      artDef && specIdx >= 0 && f.author.artsState != null && f.author.rangVillage != null
        ? specRank(artDef.key, specIdx, f.author.artsState as ArtsState, f.author.rangVillage)
        : null;
    return { ...f, ficheSpecRank };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">Modération</p>
          <h1 className="font-serif text-3xl text-white2 mt-1">
            {STATUS_LABELS[status] ?? "Techniques en attente"}
          </h1>
        </div>
        <nav className="flex gap-2 text-xs tracking-[0.2em] uppercase">
          {allowed.map((s) => (
            <Link
              key={s}
              href={`/admin/fiches?status=${s}`}
              className={`px-3 py-1.5 border ${
                s === status
                  ? "border-ember text-ember"
                  : "border-white/10 text-smoke hover:text-bone"
              }`}
            >
              {STATUS_LABELS[s]}
            </Link>
          ))}
        </nav>
      </div>

      <ul className="space-y-3">
        {fichesWithSpec.map((f) => (
          <li key={f.id} className="border border-white/5 bg-ink-700 p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="font-serif text-xl text-white2">{f.nom}</h3>
                <p className="text-xs text-smoke mt-1">
                  Coût {f.coutXp} XP · par{" "}
                  {isAdmin ? (
                    <Link href={`/admin/users/${f.author.id}`} className="text-ember hover:text-ember-hot">
                      {f.author.username}
                    </Link>
                  ) : (
                    <span className="text-ember">{f.author.username}</span>
                  )}{" "}
                  ({f.author.xpAvailable} XP dispo)
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {f.art && (
                    <span className="hnk-chip">
                      {`${ART_KANJI[f.art] ?? ""} ${f.art}`}
                      {f.spec ? ` · ${f.spec}` : ""}
                      {f.ficheSpecRank ? ` · ${f.ficheSpecRank}` : ""}
                    </span>
                  )}
                  {f.actionType && <span className="hnk-chip">{actionLabel(f.actionType)}</span>}
                  {f.element && <span className="hnk-chip">Élément · {f.element}</span>}
                  {f.kekkeiGenkai && (
                    <span
                      className="hnk-chip"
                      style={{ color: kgColor(f.kekkeiGenkai), borderColor: kgColor(f.kekkeiGenkai) }}
                    >
                      KG · {f.kekkeiGenkai}
                    </span>
                  )}
                  {f.nature && (
                    <span className="hnk-chip">{natureLabel(f.nature, f.kinjutsuScope, f.clan)}</span>
                  )}
                  {!f.art && !f.actionType && !f.element && !f.kekkeiGenkai && !f.nature && (
                    <span className="text-xs text-smoke italic">Aucune métadonnée renseignée</span>
                  )}
                </div>
              </div>
              {status === "PENDING" && (
                <AdminFicheDecision ficheId={f.id} defaultCost={f.coutXp} />
              )}
            </div>
            <div className="text-sm text-bone whitespace-pre-wrap leading-relaxed border-l-2 border-ember/30 pl-3 text-justify">
              {f.description}
            </div>
            {f.comment && status === "PENDING" && (
              <p className="text-xs text-amber-300 mt-2 italic border-l-2 border-amber-400/50 pl-3">
                Note du joueur : {f.comment}
              </p>
            )}
            {f.rejectionReason && (
              <p className="text-xs text-red-400 mt-2 italic">
                Motif du refus : {f.rejectionReason}
              </p>
            )}
          </li>
        ))}
        {fiches.length === 0 && (
          <li className="text-sm text-smoke italic">Aucune technique dans cet état.</li>
        )}
      </ul>
    </div>
  );
}

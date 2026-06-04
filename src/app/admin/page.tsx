import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export default async function AdminHome() {
  await requireAdmin();

  const [users, pending, validated, recent] = await Promise.all([
    prisma.user.count(),
    prisma.ficheTechnique.count({ where: { status: "PENDING", isActive: true } }),
    prisma.ficheTechnique.count({ where: { status: "VALIDATED", isActive: true } }),
    prisma.xPTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        reason: true,
        createdAt: true,
        user: { select: { id: true, username: true } },
        actor: { select: { id: true, username: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">Tableau de bord</p>
        <h1 className="font-serif text-3xl text-white2 mt-1">Vigie du Pays du Feu</h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Kpi label="Joueurs" value={users} />
        <Kpi
          label="Fiches en attente"
          value={pending}
          href="/admin/fiches"
          accent={pending > 0}
        />
        <Kpi label="Fiches validées" value={validated} />
      </div>

      <section>
        <h2 className="font-serif text-xl text-white2 mb-3 pb-2 border-b border-ember/20">
          Dernière activité XP
        </h2>
        <ul className="divide-y divide-white/5 border border-white/5 bg-ink-700">
          {recent.map((t) => (
            <li
              key={t.id}
              className="px-4 py-2 flex items-center justify-between text-sm"
            >
              <div>
                <Link
                  href={`/admin/users/${t.user.id}`}
                  className="text-bone hover:text-ember"
                >
                  {t.user.username}
                </Link>
                <span className="text-xs text-smoke ml-2">
                  · {t.reason.replace(/_/g, " ").toLowerCase()}
                  {t.actor && (
                    <>
                      {" · par "}
                      <Link
                        href={`/admin/users/${t.actor.id}`}
                        className="hover:text-ember"
                      >
                        {t.actor.username}
                      </Link>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`tabular-nums ${
                    t.amount > 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount}
                </span>
                <span className="text-xs text-smoke">
                  {new Date(t.createdAt).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </li>
          ))}
          {recent.length === 0 && (
            <li className="px-4 py-6 text-sm text-smoke italic">Aucune activité.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className={`p-4 border ${
        accent ? "border-ember/50 bg-ember/5" : "border-white/5 bg-ink-700"
      }`}
    >
      <p className="text-[10px] tracking-[0.24em] uppercase text-smoke">{label}</p>
      <p
        className={`font-serif text-3xl mt-1 ${accent ? "text-ember" : "text-white2"}`}
      >
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

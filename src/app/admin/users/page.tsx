import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import CreateUserForm from "@/components/CreateUserForm";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const users = await prisma.user.findMany({
    where: q
      ? { username: { contains: q, mode: "insensitive" } }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      username: true,
      role: true,
      canManageAdmins: true,
      xpAvailable: true,
      clan: true,
      rang: true,
      forumPseudo: true,
      forumLastSyncAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">Joueurs</p>
        <h1 className="font-serif text-3xl text-white2 mt-1">Registre des shinobi</h1>
      </div>

      <CreateUserForm />

      <form className="flex gap-2" action="/admin/users" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Pseudo…"
          className="flex-1 bg-ink-900 border border-white/10 border-b-2 border-b-ember/50 px-3 py-2 text-bone focus:outline-none focus:border-ember"
        />
        <button className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot transition">
          Chercher
        </button>
      </form>

      <ul className="divide-y divide-white/5 border border-white/5 bg-ink-700">
        {users.map((u) => (
          <li key={u.id}>
            <Link
              href={`/admin/users/${u.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-ember/5 transition"
            >
              <div>
                <p className="text-bone font-medium">
                  {u.username}
                  {u.role === "ADMIN" && (
                    <span className="ml-2 text-[10px] tracking-[0.24em] uppercase text-ember">
                      admin{u.canManageAdmins ? " maître" : ""}
                    </span>
                  )}
                  {u.role === "TECH_MOD" && (
                    <span className="ml-2 text-[10px] tracking-[0.24em] uppercase text-amber-400">
                      mod technique
                    </span>
                  )}
                </p>
                <p className="text-xs text-smoke">
                  {u.clan ?? "Sans clan"}
                  {u.rang && ` · Rang ${u.rang}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-ember tabular-nums">{u.xpAvailable} XP</p>
                <p className="text-xs text-smoke">
                  {u.forumLastSyncAt
                    ? `sync ${new Date(u.forumLastSyncAt).toLocaleDateString("fr-FR")}`
                    : "pas de lien forum"}
                </p>
              </div>
            </Link>
          </li>
        ))}
        {users.length === 0 && (
          <li className="px-4 py-6 text-sm text-smoke italic">Aucun joueur trouvé.</li>
        )}
      </ul>
    </div>
  );
}

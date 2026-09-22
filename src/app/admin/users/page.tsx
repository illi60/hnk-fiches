import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import CreateUserForm from "@/components/CreateUserForm";
import { XP_AUDIT_REASONS, xpAudit, type XpReasonSums } from "@/lib/xp-audit";

const USERS_PAGE_LIMIT = 500;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const where = q
    ? {
        OR: [
          { username: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { forumPseudo: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const totalUsers = await prisma.user.count({ where });

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: USERS_PAGE_LIMIT,
    select: {
      id: true,
      username: true,
      role: true,
      xpBudgetExempt: true,
      canManageAdmins: true,
      characterStatus: true,
      xpAvailable: true,
      xpTotalEarned: true,
      forumLastXp: true,
      clan: true,
      rang: true,
      forumPseudo: true,
      forumLastSyncAt: true,
    },
  });

  const ids = users.map(u => u.id);
  const [entries, trades] = await Promise.all([
    prisma.xPTransaction.findMany({where:{userId:{in:ids}},select:{id:true,userId:true,amount:true,reason:true,metadata:true,createdAt:true}}),
    prisma.trade.findMany({where:{OR:[{initiatorId:{in:ids}},{recipientId:{in:ids}}]},select:{status:true,initiatorId:true,recipientId:true,initiatorXpOffered:true,recipientXpOffered:true}}),
  ]);
  const auditRows =
    users.length > 0
      ? await prisma.xPTransaction.groupBy({
          by: ["userId", "reason"],
          where: {
            userId: { in: users.map((u) => u.id) },
            reason: { in: XP_AUDIT_REASONS },
          },
          _sum: { amount: true },
        })
      : [];
  const sumsByUser = new Map<string, XpReasonSums>();
  for (const row of auditRows) {
    const sums = sumsByUser.get(row.userId) ?? {};
    sums[row.reason] = row._sum.amount ?? 0;
    sumsByUser.set(row.userId, sums);
  }

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
          placeholder="Pseudo, email, pseudo forum…"
          className="flex-1 bg-ink-900 border border-white/10 border-b-2 border-b-ember/50 px-3 py-2 text-bone focus:outline-none focus:border-ember"
        />
        <button className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot transition">
          Chercher
        </button>
      </form>
      <p className="text-xs text-smoke">
        {users.length} joueur{users.length > 1 ? "s" : ""} affiché{users.length > 1 ? "s" : ""} sur{" "}
        {totalUsers}
        {totalUsers > USERS_PAGE_LIMIT ? ` · résultats limités aux ${USERS_PAGE_LIMIT} plus récents` : ""}
      </p>

      <ul className="divide-y divide-white/5 border border-white/5 bg-ink-700">
        {users.map((u) => {
          const audit = xpAudit({
            userId: u.id, entries: entries.filter(e=>e.userId===u.id), trades: trades.filter(t=>t.initiatorId===u.id || t.recipientId===u.id),
            xpAvailable: u.xpAvailable,
            xpTotalEarned: u.xpTotalEarned,
            forumLastXp: u.forumLastXp,
            reasonSums: sumsByUser.get(u.id) ?? {},
          });
          const showXpAlert = u.characterStatus === "ACTIVE" && u.role === "USER" && !u.xpBudgetExempt && audit.hasAlert;
          const alertLabel = audit.deficit > 0
            ? `DÉFICIT ${audit.deficit} XP`
            : audit.extraXp > 0
              ? `SOLDE +${audit.extraXp} XP`
              : "HISTORIQUE XP";

          return (
            <li key={u.id}>
              <Link
                href={`/admin/users/${u.id}`}
                className={`flex items-center justify-between px-4 py-3 transition ${
                  showXpAlert ? "bg-red-500/10 hover:bg-red-500/15" : "hover:bg-ember/5"
                }`}
              >
                <div>
                  <p className="text-bone font-medium">
                    {u.username}
                    {u.role === "ADMIN" && (
                      <span className="ml-2 text-[10px] tracking-[0.24em] uppercase text-ember">
                        admin{u.canManageAdmins ? " maître" : ""}
                      </span>
                    )}
                    {u.xpBudgetExempt && <span className="ml-2 text-[10px] tracking-[0.24em] uppercase text-smoke">test XP</span>}
                    {u.role === "TECH_MOD" && (
                      <span className="ml-2 text-[10px] tracking-[0.24em] uppercase text-amber-400">
                        mod technique
                      </span>
                    )}
                    {u.role === "FORUM_MOD" && (
                      <span className="ml-2 text-[10px] tracking-[0.24em] uppercase text-sky-300">
                        mod forum
                      </span>
                    )}
                    {u.characterStatus === "DEAD_MISSING" && (
                      <span className="ml-2 text-[10px] tracking-[0.24em] uppercase text-smoke">
                        mort / disparu
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-smoke">
                    {u.clan ?? "Sans clan"}
                    {u.rang && ` · Rang ${u.rang}`}
                    {showXpAlert && (
                      <span className="ml-2 text-red-300 font-bold">
                        {alertLabel}
                      </span>
                    )}
                    {u.characterStatus === "DEAD_MISSING" && <span className="ml-2 text-smoke">XP gelée</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-ember tabular-nums">{u.xpAvailable} XP dispo</p>
                  <p className="text-xs text-smoke tabular-nums">{audit.xpSpentTotal} XP dépensés</p>
                  <p className="text-xs text-smoke tabular-nums">
                    staff {audit.staffNet >= 0 ? "+" : ""}{audit.staffNet}
                  </p>
                  <p className="text-xs text-smoke">
                    {u.forumLastSyncAt
                      ? `sync ${new Date(u.forumLastSyncAt).toLocaleDateString("fr-FR")}`
                      : "pas de lien forum"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
        {users.length === 0 && (
          <li className="px-4 py-6 text-sm text-smoke italic">Aucun joueur trouvé.</li>
        )}
      </ul>
    </div>
  );
}

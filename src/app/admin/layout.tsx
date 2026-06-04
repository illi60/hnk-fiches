import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";

// 2e couche de la triple garde admin (middleware → ICI → requireAdmin dans chaque route API).
// Le rôle est lu EN BASE (et non depuis le JWT, qui peut être périmé après une
// promotion) → un nouvel admin accède au panneau immédiatement, sans reconnexion.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, username: true },
  });
  if (!me || me.role !== "ADMIN") redirect("/technique");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="hnk-header">
        <Link href="/admin" className="brand">
          <span className="kanji">監</span>
          <span className="name">Vigie · Admin</span>
        </Link>
        <nav className="hnk-nav">
          <Link href="/admin">KPIs</Link>
          <Link href="/admin/users">Joueurs</Link>
          <Link href="/admin/fiches">Fiches</Link>
          <Link href="/admin/clans">Clans</Link>
          <Link href="/technique" className="!text-smoke">
            ← Joueur
          </Link>
        </nav>
        <div className="flex items-center gap-4 pl-2">
          <span className="hnk-eyebrow hidden sm:inline">{me.username}</span>
          <LogoutButton className="hnk-btn-ghost !py-2 !px-4 !text-[10px]" />
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

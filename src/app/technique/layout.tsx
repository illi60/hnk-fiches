import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getArtState, type ArtsState } from "@/lib/arts";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { artsState: true, clan: true, role: true },
  });
  // Rôle lu en base (le JWT peut être périmé après une promotion).
  const isAdmin = dbUser?.role === "ADMIN";
  const isMod = dbUser?.role === "TECH_MOD";
  const artsState = ((dbUser?.artsState ?? {}) as unknown) as ArtsState;
  const hasKuchiyose = !!getArtState(artsState, "kuchiyose").unlocked;
  const hasClan = !!dbUser?.clan;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="hnk-header">
        <Link href="/technique" className="brand">
          <span className="kanji">火</span>
          <span className="name">Hi no Kuni</span>
        </Link>
        <nav className="hnk-nav">
          <Link href="/">Hub</Link>
          <Link href="/technique">Profil</Link>
          <Link href="/technique/progression">Progression</Link>
          <Link href="/technique/fiches">Mes techniques</Link>
          {hasClan && <Link href="/technique/clan">Bibliothèque clan</Link>}
          {hasKuchiyose && <Link href="/technique/invocations">Invocations</Link>}
          {isAdmin && (
            <Link href="/admin" className="active">
              Admin
            </Link>
          )}
          {isMod && (
            <Link href="/admin/fiches" className="active">
              Modération
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4 pl-2">
          <span className="hnk-eyebrow hidden sm:inline">{session.user.username}</span>
          <LogoutButton className="hnk-btn-ghost !py-2 !px-4 !text-[10px]" />
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">{children}</main>
    </div>
  );
}

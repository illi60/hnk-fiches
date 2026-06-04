// ============================================================
// Middleware Edge — 1ère couche de la triple garde.
//
// /dashboard/* : exige une session.
// /admin/*     : exige une session. Le rôle ADMIN n'est PAS vérifié ici :
//   le token JWT (Edge) peut être périmé après une promotion, et le middleware
//   n'a pas accès à la DB. Le rôle est donc revalidé EN BASE par le layout admin
//   (RSC) ET par chaque route API (requireAdmin) — défense en profondeur. Une
//   promotion prend ainsi effet immédiatement, sans reconnexion.
//
// Les routes API se protègent elles-mêmes via requireUser /
// requireAdmin (cf. lib/permissions.ts) — on ne fait PAS de
// matching API ici pour éviter de coupler Edge et Node.
// ============================================================

import { NextResponse } from "next/server";
import NextAuth from "next-auth";

import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLogged = !!req.auth?.user;

  if (pathname.startsWith("/admin")) {
    if (!isLogged) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/dashboard") && !isLogged) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";

// Edge-safe auth instance (no Prisma/argon2) just to read the JWT session.
const { auth } = NextAuth(authConfig);

// Page prefixes that require a staff session (build-spec §6).
const PROTECTED_PAGE_PREFIXES = ["/dashboard", "/tickets", "/properties"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);
  const { pathname } = nextUrl;

  const isStaffApi = pathname.startsWith("/api/staff");
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isLoggedIn) {
    // Bounce authenticated users away from the login page.
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // Unauthenticated:
  if (isStaffApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isProtectedPage) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/tickets/:path*", "/properties/:path*", "/login", "/api/staff/:path*"],
};

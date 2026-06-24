import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (build-spec §6). Contains NO Prisma or argon2 so it
 * can run in middleware on the edge. The Credentials provider (which needs the
 * DB) is added in `auth.ts`. JWT sessions let the edge read auth from the
 * cookie without a database round-trip.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  // Filled in `auth.ts` with the Credentials provider.
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      if (typeof token.role === "string") session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;

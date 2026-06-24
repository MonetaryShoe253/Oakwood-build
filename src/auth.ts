import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import * as argon2 from "argon2";
import { z } from "zod";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * Full Auth.js instance (build-spec §6). Credentials provider verifies the
 * argon2id password hash against the seeded staff users. Runs on the Node.js
 * runtime (Prisma + argon2), unlike the edge `authConfig` used by middleware.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) return null;

        // Never return the password hash to the session.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});

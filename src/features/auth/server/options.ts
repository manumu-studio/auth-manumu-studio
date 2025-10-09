// src/features/auth/server/options.ts (or src/lib/options.ts)
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // Use JWT strategy with credentials
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
          select: { id: true, name: true, email: true, password: true, role: true, emailVerified: true },
        });
        if (!user || !user.password) return null;

        const ok = await compare(password, user.password);
        if (!ok) return null;

        // ⛔️ Block sign-in until verified
        if (!user.emailVerified) {
          // NextAuth surfaces this on the client as res.error === 'EMAIL_NOT_VERIFIED'
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email!,
          role: user.role as any,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.name = user.name;
        token.email = user.email;
        // @ts-ignore
        token.role = (user as any).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        // @ts-ignore
        session.user.id = token.uid as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        // @ts-ignore
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
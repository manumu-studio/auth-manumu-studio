// src/features/auth/server/options.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";
import { googleProvider } from "@/features/auth/server/providers/google";

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // Use JWT strategy so credentials + OAuth both work without DB sessions
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
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            emailVerified: true,
          },
        });
        if (!user || !user.password) return null;

        const ok = await compare(password, user.password);
        if (!ok) return null;

        // Block credentials sign-in until verified
        if (!user.emailVerified) {
          // NextAuth surfaces this as res.error === 'EMAIL_NOT_VERIFIED'
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email!,
          // carry role forward via jwt callback
           
          role: (user as any).role ?? "USER",
        };
      },
    }),

    // Google OAuth provider (enabled only if env vars exist)
    ...(googleProvider() ? [googleProvider()!] : []),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Persist minimal user info on initial sign-in
         
        const anyUser = user as any;
        // custom fields on token
         
        (token as any).uid = anyUser.id;
         
        (token as any).role = anyUser.role ?? "USER";
        token.name = anyUser.name ?? token.name;
        token.email = anyUser.email ?? token.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // hydrate session with our custom fields from jwt
         
        (session.user as any).id = (token as any).uid;
         
        (session.user as any).role = (token as any).role ?? "USER";
        session.user.name = token.name ?? session.user.name ?? undefined;
        session.user.email = token.email ?? session.user.email ?? undefined;
      }
      return session;
    },
  },
};
// src/lib/authOptions.ts
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { z } from 'zod';

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  // You can keep the adapter for future OAuth use.
  adapter: PrismaAdapter(prisma),

  // ⬇️ IMPORTANT: Use JWT for Credentials in v4
  session: { strategy: 'jwt' },

  // (Recommended) set your secret — NextAuth will also read NEXTAUTH_SECRET env
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
        });
        if (!user || !user.password) return null;

        const ok = await compare(password, user.password);
        if (!ok) return null;

        // User object for JWT with role
        return { 
          id: user.id, 
          name: user.name ?? undefined, 
          email: user.email,
          role: user.role
        };
      },
    }),
  ],

  // Put the user data onto the session for your client
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role ?? 'USER';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        // @ts-expect-error extend at runtime
        session.user.id = token.uid as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        // @ts-expect-error extend at runtime
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
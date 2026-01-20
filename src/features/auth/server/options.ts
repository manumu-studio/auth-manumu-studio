/**
 * NextAuth.js configuration for ManuMu Studio Authentication
 * 
 * Supports multiple authentication providers:
 * - Credentials (email/password) with email verification
 * - Google OAuth (conditional)
 * - GitHub OAuth (conditional)
 * 
 * Uses JWT strategy for stateless sessions that work with both
 * credentials and OAuth providers.
 * 
 * @module auth/server/options
 */

import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";
import { googleProvider } from "@/features/auth/server/providers/google";
import { githubProvider } from "@/features/auth/server/providers/github";
import { env } from "@/lib/env";
import { buildRateLimitKey, getRequestIp, rateLimit } from "@/lib/rateLimit";

/**
 * Zod schema for validating credentials input
 */
const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * NextAuth.js configuration object
 * 
 * @type {NextAuthOptions}
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // Use JWT strategy so credentials + OAuth both work without DB sessions
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      /**
       * Authorize function for credentials provider
       * 
       * Validates email/password credentials and enforces email verification.
       * 
       * @param {Object} credentials - User credentials (email, password)
       * @returns {Promise<Object|null>} User object if valid, null otherwise
       * @throws {Error} "EMAIL_NOT_VERIFIED" if email not verified
       */
      async authorize(credentials, req) {
        // Validate input format with Zod
        const parsed = CredentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        
        // Normalize email (lowercase, trimmed) and fetch user
        const normalizedEmail = email.trim().toLowerCase();

        const ip = getRequestIp(req?.headers ?? {});
        const identifier = buildRateLimitKey({
          scope: "signin",
          ip,
          email: normalizedEmail,
        });
        const limitResult = await rateLimit(identifier);
        if (!limitResult.success) {
          throw new Error("RATE_LIMITED");
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            emailVerified: true,
          },
        });
        
        // User not found or no password (OAuth-only account)
        if (!user || !user.password) return null;

        // Verify password using bcrypt (constant-time comparison)
        const ok = await compare(password, user.password);
        if (!ok) return null;

        // Security: Block credentials sign-in until email is verified
        // This prevents unauthorized access before email ownership is confirmed
        if (!user.emailVerified) {
          // NextAuth surfaces this as res.error === 'EMAIL_NOT_VERIFIED'
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Return user object with role for JWT token
        // Type assertion needed because NextAuth User type doesn't include role
        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email!,
          role: (user.role as "USER" | "ADMIN") ?? "USER",
        };
      },
    }),

    // Google OAuth provider (enabled only if env vars exist)
    ...(googleProvider() ? [googleProvider()!] : []),
    // GitHub OAuth provider (enabled only if env vars exist)
    ...(githubProvider() ? [githubProvider()!] : []),
  ],

  callbacks: {
    /**
     * JWT callback - called whenever a JWT is created or updated
     * 
     * Augments the JWT token with custom fields:
     * - uid: User ID (stored as 'uid' to avoid conflicts)
     * - role: User role (USER or ADMIN)
     * 
     * @param {Object} params - Callback parameters
     * @param {JWT} params.token - Current JWT token
     * @param {User} params.user - User object (only on initial sign-in)
     * @returns {Promise<JWT>} Augmented JWT token
     */
    async jwt({ token, user }) {
      // On initial sign-in, user object is provided
      if (user) {
        // Persist user ID and role in token for session hydration
        token.uid = user.id;
        token.role = user.role ?? "USER";
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
      }
      return token;
    },

    /**
     * Session callback - called whenever a session is accessed
     * 
     * Hydrates the session object with custom fields from the JWT token.
     * This makes user.id and user.role available in getServerSession() calls.
     * 
     * @param {Object} params - Callback parameters
     * @param {Session} params.session - Current session object
     * @param {JWT} params.token - JWT token with custom fields
     * @returns {Promise<Session>} Augmented session object
     */
    async session({ session, token }) {
      if (session.user) {
        // Hydrate session with custom fields from JWT
        session.user.id = token.uid ?? "";
        session.user.role = token.role ?? "USER";
        session.user.name = token.name ?? session.user.name ?? undefined;
        session.user.email = token.email ?? session.user.email ?? undefined;
      }
      return session;
    },
  },
};
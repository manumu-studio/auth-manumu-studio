import GoogleProvider from "next-auth/providers/google";
import { env } from "@/lib/env";

export function googleProvider() {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return GoogleProvider({
    clientId,
    clientSecret,
    // Allow linking existing accounts by email
    allowDangerousEmailAccountLinking: true,
  });
}

/**
 * Google Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
 *
 * Authorized redirect URIs:
 *   {APP_URL}/api/auth/callback/google
 *
 * Local:
 *   http://localhost:3000/api/auth/callback/google
 */

import GitHubProvider from "next-auth/providers/github";
import { env } from "@/lib/env";

export function githubProvider() {
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return GitHubProvider({
    clientId,
    clientSecret,
    // Allow linking existing accounts by email
    allowDangerousEmailAccountLinking: true,
  });
}

/**
 * GitHub Developer Settings → OAuth Apps → New OAuth App
 *
 * Authorized redirect URIs:
 *   {APP_URL}/api/auth/callback/github
 *
 * Local:
 *   http://localhost:3000/api/auth/callback/github
 */


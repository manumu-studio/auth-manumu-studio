// src/features/auth/server/oauth/rateLimitKeys.ts
// Helpers for building rate-limit bucket identifiers for the OAuth token
// and userinfo endpoints. Secrets and raw bearer tokens never enter any key.
import { createHash } from "node:crypto";

/**
 * Normalizes a client ID for use as a rate-limit key segment.
 * Unknown / empty client IDs collapse to the shared "unknown" bucket.
 */
export function normalizeClientId(clientId: string | null | undefined): string {
  const trimmed = (clientId ?? "").trim().toLowerCase();
  return trimmed || "unknown";
}

/**
 * Returns a SHA-256 hex fingerprint of a bearer token.
 * This is the ONLY form of token material that may appear in a rate-limit key.
 */
export function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Per-IP key for the /oauth/token endpoint. */
export function tokenEndpointIpKey(ip: string | null): string {
  return `oauth-token:ip:${ip ?? "unknown"}`;
}

/** Per-client key for the /oauth/token endpoint. Secrets never appear here. */
export function tokenEndpointClientKey(clientId: string | null | undefined): string {
  return `oauth-token:client:${normalizeClientId(clientId)}`;
}

/** Per-IP key for the /oauth/userinfo endpoint. */
export function userinfoEndpointIpKey(ip: string | null): string {
  return `oauth-userinfo:ip:${ip ?? "unknown"}`;
}

/**
 * Per-token key for the /oauth/userinfo endpoint.
 * Key contains only the SHA-256 fingerprint — never the raw token.
 */
export function userinfoEndpointTokenKey(token: string): string {
  return `oauth-userinfo:token:${tokenFingerprint(token)}`;
}

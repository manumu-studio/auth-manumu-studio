// PKCE (RFC 7636) utilities: validation, S256 challenge computation, and timing-safe comparison.
import crypto from "crypto";

// RFC 7636 §4.1 — code_verifier must be 43–128 unreserved characters.
const PKCE_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;

/**
 * Returns true if `value` is a syntactically valid PKCE code_verifier or
 * code_challenge per RFC 7636: 43–128 chars, only unreserved characters.
 */
export function isValidPkceValue(value: string): boolean {
  return PKCE_PATTERN.test(value);
}

/**
 * Computes the S256 code_challenge for a given code_verifier.
 * SHA-256 hash, then Base64URL-encoded WITHOUT padding.
 */
export function computeS256Challenge(verifier: string): string {
  const digest = crypto.createHash("sha256").update(verifier).digest();
  return digest.toString("base64url");
}

/**
 * Returns true when the S256 challenge derived from `verifier` matches
 * `expectedChallenge`, using a constant-time comparison to prevent
 * timing attacks. Returns false (never throws) if lengths differ or
 * `verifier` fails the RFC 7636 character/length check.
 */
export function pkceChallengeMatches(
  verifier: string,
  expectedChallenge: string
): boolean {
  if (!isValidPkceValue(verifier)) return false;

  const computed = computeS256Challenge(verifier);

  // timingSafeEqual requires equal-length buffers — guard before calling.
  if (computed.length !== expectedChallenge.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(expectedChallenge)
  );
}

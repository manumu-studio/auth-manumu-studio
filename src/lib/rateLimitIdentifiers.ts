// src/lib/rateLimitIdentifiers.ts
// Hashes and normalizes identifiers before they are used in limiter keys.
import { createHash } from "node:crypto";

export function hashRateLimitIdentifier(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeRateLimitIdentifier(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : "unknown";
}

export function normalizeInviteRateLimitHash(value: string | null | undefined): string {
  const trimmed = normalizeRateLimitIdentifier(value);
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return trimmed.toLowerCase();
  return hashRateLimitIdentifier(trimmed);
}

// src/features/auth/server/invites/token.ts
// Token normalization and SHA-256 helpers for hash-only invite storage.
import crypto from "node:crypto";

const INVITE_TOKEN_BYTES = 32;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateInviteToken(): string {
  return crypto.randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

export function hashInviteToken(rawToken: string): Buffer {
  return crypto.createHash("sha256").update(rawToken).digest();
}

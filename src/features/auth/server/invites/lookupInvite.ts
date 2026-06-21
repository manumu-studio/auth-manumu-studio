// src/features/auth/server/invites/lookupInvite.ts
// Performs generic, side-effect-free invite lookup without exposing miss reasons.
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { InviteLookupResult } from "./invite.types";
import { hashInviteToken, normalizeInviteEmail } from "./token";

const DECOY_INVITE_HASH = crypto
  .createHash("sha256")
  .update("manumu:invite-lookup-decoy")
  .digest();

function toBuffer(value: Buffer | Uint8Array): Buffer {
  return Buffer.from(value);
}

function constantTimeHashMatches(candidateHash: Buffer, storedHash: Buffer | Uint8Array | null): boolean {
  const comparableHash = storedHash ? toBuffer(storedHash) : DECOY_INVITE_HASH;
  return crypto.timingSafeEqual(candidateHash, comparableHash);
}

export async function lookupInviteByToken(
  rawToken: string,
  expectedEmail: string | null,
): Promise<InviteLookupResult> {
  const tokenHash = hashInviteToken(rawToken);
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      tokenHash: true,
      normalizedEmail: true,
      status: true,
      expiresAt: true,
    },
  });

  const hashMatches = constantTimeHashMatches(tokenHash, invite?.tokenHash ?? null);
  const normalizedExpectedEmail =
    expectedEmail === null ? null : normalizeInviteEmail(expectedEmail);
  const emailMatches =
    normalizedExpectedEmail === null ||
    invite?.normalizedEmail === null ||
    invite?.normalizedEmail === normalizedExpectedEmail;

  if (
    !invite ||
    !hashMatches ||
    invite.status !== "ISSUED" ||
    invite.expiresAt <= new Date() ||
    !emailMatches
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    invite: {
      id: invite.id,
      tokenHash: toBuffer(invite.tokenHash),
      normalizedEmail: invite.normalizedEmail,
      expiresAt: invite.expiresAt,
    },
  };
}

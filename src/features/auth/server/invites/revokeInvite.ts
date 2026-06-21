// src/features/auth/server/invites/revokeInvite.ts
// Idempotently revokes issued invites without reopening terminal states.
import { prisma } from "@/lib/prisma";
import type { RevokeInviteInput, RevokeInviteResult } from "./invite.types";

export async function revokeInvite(input: RevokeInviteInput): Promise<RevokeInviteResult> {
  const now = new Date();

  await prisma.invite.updateMany({
    where: {
      id: input.inviteId,
      status: "ISSUED",
      expiresAt: { gt: now },
    },
    data: {
      status: "REVOKED",
      revokedAt: now,
    },
  });

  return { ok: true };
}

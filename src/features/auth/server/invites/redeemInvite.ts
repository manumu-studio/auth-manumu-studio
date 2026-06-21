// src/features/auth/server/invites/redeemInvite.ts
// Conditionally redeems server-resolved invite identities inside a transaction.
import type {
  InviteTransactionClient,
  RedeemInviteResult,
  ResolvedInvite,
} from "./invite.types";
import { alertInviteReuse } from "./reuseAlert";
import { normalizeInviteEmail } from "./token";

function buildResolvedWhere(
  resolvedInvite: ResolvedInvite,
): { id?: string; tokenHash?: Buffer } {
  if ("tokenHash" in resolvedInvite) {
    return { tokenHash: resolvedInvite.tokenHash };
  }

  return { id: resolvedInvite.inviteId };
}

async function auditRedeemedInviteReuse(
  tx: InviteTransactionClient,
  where: { id?: string; tokenHash?: Buffer },
): Promise<void> {
  const invite = await tx.invite.findFirst({
    where: {
      ...where,
      status: "REDEEMED",
    },
    select: {
      id: true,
      tokenHash: true,
      normalizedEmail: true,
      status: true,
      expiresAt: true,
      redeemedByUserId: true,
      redeemedAt: true,
      revokedAt: true,
    },
  });

  if (!invite) return;

  await tx.auditEvent.create({
    data: {
      action: "invite.reuse_detected",
      targetType: "Invite",
      targetId: invite.id,
      metadata: {
        inviteStatus: invite.status,
      },
    },
  });
  await alertInviteReuse(invite.id);
}

export async function redeemInviteInTx(
  tx: InviteTransactionClient,
  resolvedInvite: ResolvedInvite,
  expectedNormalizedEmail: string | null,
): Promise<RedeemInviteResult> {
  if (expectedNormalizedEmail === null) {
    return { ok: false };
  }

  const normalizedEmail = normalizeInviteEmail(expectedNormalizedEmail);
  const user = await tx.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    return { ok: false };
  }

  const now = new Date();
  const where = buildResolvedWhere(resolvedInvite);
  const redeemed = await tx.invite.updateMany({
    where: {
      ...where,
      status: "ISSUED",
      expiresAt: { gt: now },
      normalizedEmail,
    },
    data: {
      status: "REDEEMED",
      redeemedAt: now,
      redeemedByUserId: user.id,
    },
  });

  if (redeemed.count !== 1) {
    await auditRedeemedInviteReuse(tx, where);
    return { ok: false };
  }

  const invite = await tx.invite.findFirst({
    where: {
      ...where,
      status: "REDEEMED",
    },
    select: {
      id: true,
      tokenHash: true,
      normalizedEmail: true,
      status: true,
      expiresAt: true,
      redeemedByUserId: true,
      redeemedAt: true,
      revokedAt: true,
    },
  });

  if (!invite || invite.status !== "REDEEMED" || !invite.redeemedAt) {
    return { ok: false };
  }

  return { ok: true, invite };
}

// Guards social sign-in so OAuth cannot create or silently link accounts.
import type { Account } from "next-auth";

import { prisma } from "@/lib/prisma";

type SocialAccount = Pick<Account, "type" | "provider" | "providerAccountId">;
type DenialReason =
  | "invalid_oauth_account"
  | "linked_account_not_active"
  | "unlinked_oauth_account";

async function recordSocialSignInDenied(
  provider: string,
  reason: DenialReason,
  targetUserId: string | null,
): Promise<void> {
  const baseData = {
    action: "auth.social_signin_denied",
    targetType: "SocialSignIn",
    metadata: {
      provider,
      reason,
    },
  };

  try {
    if (targetUserId) {
      await prisma.auditEvent.create({
        data: {
          ...baseData,
          targetUserId,
        },
      });
      return;
    }

    await prisma.auditEvent.create({
      data: baseData,
    });
  } catch {
    // Authentication denial must not depend on telemetry persistence.
  }
}

export async function allowSocialSignIn(account?: SocialAccount | null): Promise<boolean> {
  if (account?.type !== "oauth") return true;
  if (!account.provider || !account.providerAccountId) {
    await recordSocialSignInDenied(
      account.provider ?? "unknown",
      "invalid_oauth_account",
      null,
    );
    return false;
  }

  const linkedAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    include: {
      user: true,
    },
  });

  if (!linkedAccount) {
    await recordSocialSignInDenied(
      account.provider,
      "unlinked_oauth_account",
      null,
    );
    return false;
  }

  if (linkedAccount.user.status !== "ACTIVE") {
    await recordSocialSignInDenied(
      account.provider,
      "linked_account_not_active",
      linkedAccount.user.id,
    );
    return false;
  }

  return true;
}

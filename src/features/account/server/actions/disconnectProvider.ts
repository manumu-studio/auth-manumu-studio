// Server action for disconnecting an OAuth provider
"use server";

import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { prisma } from '@/lib/prisma';
import { DisconnectProviderSchema } from '@/lib/validation/account';
import { buildRateLimitKey, getRequestIp, rateLimit } from '@/lib/rateLimit';
import { headers } from 'next/headers';
import type { AccountActionResult } from './types';

export async function disconnectProvider(formData: FormData): Promise<AccountActionResult> {
  // Session validation
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, errors: { formErrors: ['Unauthorized'] } };

  // Rate limiting
  const ip = getRequestIp(await headers());
  const key = buildRateLimitKey({ scope: 'disconnect-provider', ip, email: session.user.email });
  const limit = await rateLimit(key);
  if (!limit.success) return { ok: false, errors: { formErrors: ['Too many requests. Please try again later.'] } };

  // Parse and validate
  const raw = { provider: formData.get('provider')?.toString() };
  const parsed = DisconnectProviderSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { ok: false, errors: { formErrors: flat.formErrors, fieldErrors: flat.fieldErrors } };
  }
  const { provider } = parsed.data;

  // Lockout guard: ensure user has password OR another provider
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        password: true,
        accounts: { select: { provider: true } },
      },
    });
    if (!user) return { ok: false, errors: { formErrors: ['User not found'] } };

    const otherProviders = user.accounts.filter((a) => a.provider !== provider);
    if (!user.password && otherProviders.length === 0) {
      return { ok: false, errors: { formErrors: ['Cannot disconnect your only sign-in method. Set a password first.'] } };
    }

    // Delete the account record
    await prisma.account.deleteMany({
      where: { userId: session.user.id, provider },
    });
    return { ok: true };
  } catch {
    return { ok: false, errors: { formErrors: ['Failed to disconnect provider'] } };
  }
}

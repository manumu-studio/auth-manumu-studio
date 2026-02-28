// Server action for completing required onboarding data after OAuth sign-in.
"use server";

import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { prisma } from '@/lib/prisma';
import { buildRateLimitKey, getRequestIp, rateLimit } from '@/lib/rateLimit';
import { OnboardingSchema } from '@/lib/validation/account';
import type { AccountActionResult } from './types';

export async function completeOnboarding(formData: FormData): Promise<AccountActionResult> {
  // Session validation
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, errors: { formErrors: ['Unauthorized'] } };
  }

  // Rate limiting
  const ip = getRequestIp(await headers());
  const key = buildRateLimitKey({ scope: 'complete-onboarding', ip, email: session.user.email });
  const limit = await rateLimit(key);
  if (!limit.success) {
    return { ok: false, errors: { formErrors: ['Too many requests. Please try again later.'] } };
  }

  // Parse and validate input
  const raw = {
    displayName: formData.get('displayName')?.toString(),
    country: formData.get('country')?.toString(),
    nickname: formData.get('nickname')?.toString() || undefined,
  };
  const parsed = OnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { ok: false, errors: { formErrors: flat.formErrors, fieldErrors: flat.fieldErrors } };
  }

  const data = parsed.data;

  // Upsert profile country and keep user display name in sync
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { name: data.displayName.trim() },
      }),
      prisma.userProfile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          country: data.country.toUpperCase(),
        },
        update: {
          country: data.country.toUpperCase(),
        },
      }),
    ]);

    return { ok: true };
  } catch {
    return { ok: false, errors: { formErrors: ['Failed to complete onboarding'] } };
  }
}

// Server action for updating user profile information
"use server";

import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { prisma } from '@/lib/prisma';
import { UpdateProfileSchema } from '@/lib/validation/account';
import { buildRateLimitKey, getRequestIp, rateLimit } from '@/lib/rateLimit';
import { headers } from 'next/headers';
import type { AccountActionResult } from './types';

export async function updateProfile(formData: FormData): Promise<AccountActionResult> {
  // Session validation
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, errors: { formErrors: ['Unauthorized'] } };

  // Rate limiting
  const ip = getRequestIp(await headers());
  const key = buildRateLimitKey({ scope: 'update-profile', ip, email: session.user.email });
  const limit = await rateLimit(key);
  if (!limit.success) return { ok: false, errors: { formErrors: ['Too many requests. Please try again later.'] } };

  // Parse and validate
  const raw = {
    name: formData.get('name')?.toString(),
    country: formData.get('country')?.toString() || undefined,
    city: formData.get('city')?.toString() || undefined,
    address: formData.get('address')?.toString() || undefined,
  };
  const parsed = UpdateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { ok: false, errors: { formErrors: flat.formErrors, fieldErrors: flat.fieldErrors } };
  }
  const data = parsed.data;

  // Update user name + upsert profile
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { name: data.name.trim() },
      }),
      prisma.userProfile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          country: data.country?.toUpperCase() ?? null,
          city: data.city?.trim() ?? null,
          address: data.address?.trim() ?? null,
        },
        update: {
          country: data.country?.toUpperCase() ?? null,
          city: data.city?.trim() ?? null,
          address: data.address?.trim() ?? null,
        },
      }),
    ]);
    return { ok: true };
  } catch {
    return { ok: false, errors: { formErrors: ['Failed to update profile'] } };
  }
}

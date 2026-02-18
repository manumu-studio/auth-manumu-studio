// Server action for permanent account deletion
"use server";

import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { prisma } from '@/lib/prisma';
import { DeleteAccountSchema } from '@/lib/validation/account';
import { buildRateLimitKey, getRequestIp, rateLimit } from '@/lib/rateLimit';
import { headers } from 'next/headers';
import type { AccountActionResult } from './types';

export async function deleteAccount(formData: FormData): Promise<AccountActionResult> {
  // Session validation
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, errors: { formErrors: ['Unauthorized'] } };

  // Rate limiting
  const ip = getRequestIp(await headers());
  const key = buildRateLimitKey({ scope: 'delete-account', ip, email: session.user.email });
  const limit = await rateLimit(key);
  if (!limit.success) return { ok: false, errors: { formErrors: ['Too many requests. Please try again later.'] } };

  // Parse and validate
  const raw = { emailConfirmation: formData.get('emailConfirmation')?.toString() };
  const parsed = DeleteAccountSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { ok: false, errors: { formErrors: flat.formErrors, fieldErrors: flat.fieldErrors } };
  }

  // Verify email matches session
  const normalizedInput = parsed.data.emailConfirmation.trim().toLowerCase();
  const sessionEmail = session.user.email?.trim().toLowerCase();
  if (normalizedInput !== sessionEmail) {
    return { ok: false, errors: { fieldErrors: { emailConfirmation: ['Email does not match your account'] } } };
  }

  // Delete user (Prisma cascades all relations)
  try {
    await prisma.user.delete({ where: { id: session.user.id } });
    return { ok: true };
  } catch {
    return { ok: false, errors: { formErrors: ['Failed to delete account'] } };
  }
}

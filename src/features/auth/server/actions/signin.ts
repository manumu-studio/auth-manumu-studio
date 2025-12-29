/**
 * Server action for credentials-based sign-in
 * 
 * Validates user credentials and verifies password. This is a placeholder
 * action - the actual authentication is handled by NextAuth's authorize
 * function in options.ts. This action can be used for additional validation
 * or custom sign-in flows.
 * 
 * @param {FormData} formData - Form data containing email and password
 * @returns {Promise<ActionResult>} Success or error result
 * 
 * @example
 * ```ts
 * const result = await signinAction(formData);
 * if (result.ok) {
 *   // Sign-in successful
 * }
 * ```
 */

'use server';

import { SignInSchema } from '@/lib/validation/signin';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import type { ActionResult } from './types';

/**
 * Sign-in action for credentials authentication
 * 
 * @param {FormData} formData - Form data with email and password fields
 * @returns {Promise<ActionResult>} Action result with success/error status
 */
export async function signinAction(formData: FormData): Promise<ActionResult> {
  // Extract and validate form data with Zod schema
  const raw = Object.fromEntries(formData.entries());
  const parsed = SignInSchema.safeParse(raw);
  if (!parsed.success) {
    // Return validation errors in unified format
    const flat = parsed.error.flatten();
    return {
      ok: false,
      errors: {
        formErrors: flat.formErrors?.length ? flat.formErrors : ['Invalid input'],
        fieldErrors: flat.fieldErrors,
      },
    };
  }

  // Normalize email (lowercase, trimmed) for consistent lookups
  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  
  // Check if user exists and has a password (not OAuth-only account)
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    // Generic error message to prevent email enumeration
    return { ok: false, errors: { formErrors: ['Invalid credentials'] } };
  }

  // Verify password using bcrypt (constant-time comparison)
  const valid = await compare(password, user.password);
  if (!valid) {
    // Generic error message to prevent timing attacks
    return { ok: false, errors: { formErrors: ['Invalid credentials'] } };
  }

  // If using Auth.js credentials, you would do:
  // await signIn('credentials', { email, password, redirect: false });

  return { ok: true };
}
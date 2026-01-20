/**
 * Server action for user registration
 * 
 * Handles the complete user sign-up flow:
 * 1. Validates input with Zod
 * 2. Checks for duplicate email
 * 3. Hashes password with bcrypt
 * 4. Creates user and profile records
 * 5. Generates verification token
 * 6. Sends verification email
 * 
 * @param {FormData} formData - Form data containing user registration fields
 * @returns {Promise<ActionResult>} Success result with email verification metadata
 * 
 * @example
 * ```ts
 * const result = await registerUser(formData);
 * if (result.ok && result.meta?.requiresEmailVerification) {
 *   // Show "check your email" message
 * }
 * ```
 */

"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { SignUpSchema } from "@/lib/validation/signup";
import type { ActionResult } from "./types";
import { createVerificationToken } from "@/features/auth/server/verify/createToken";
import { sendVerificationEmail } from "@/features/auth/lib/email/provider";
import { headers } from "next/headers";
import { buildRateLimitKey, getRequestIp, rateLimit } from "@/lib/rateLimit";

/**
 * Register a new user account
 * 
 * @param {FormData} formData - Registration form data
 * @returns {Promise<ActionResult>} Action result with success/error status
 */
export async function registerUser(formData: FormData): Promise<ActionResult> {
  const raw = {
    firstname: formData.get("firstname")?.toString(),
    lastname: formData.get("lastname")?.toString(),
    email: formData.get("email")?.toString(),
    password: formData.get("password")?.toString(),
    repeatpassword: formData.get("repeatpassword")?.toString(),
    country: formData.get("country")?.toString(),
    city: formData.get("city")?.toString(),
    address: formData.get("address")?.toString(),
  };

  const parsed = SignUpSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      ok: false,
      errors: {
        formErrors: flat.formErrors?.length ? flat.formErrors : [parsed.error.issues[0]?.message ?? "Invalid form"],
        fieldErrors: flat.fieldErrors,
      },
    };
  }

  const data = parsed.data;

  // Normalize and sanitize input data
  const email = data.email.trim().toLowerCase();
  const firstname = data.firstname?.trim();
  const lastname = data.lastname?.trim();
  const country = data.country?.toUpperCase();
  const city = data.city?.trim();
  const address = data.address?.trim();

  const ip = getRequestIp(await headers());
  const identifier = buildRateLimitKey({
    scope: "signup",
    ip,
    email,
  });
  const limitResult = await rateLimit(identifier);
  if (!limitResult.success) {
    return { ok: false, errors: { formErrors: ["Too many requests. Please try again later."] } };
  }

  // Check for duplicate email before creating user
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { ok: false, errors: { formErrors: ["Unable to create account. Please try again."] } };
  }

  // Hash password with bcrypt (10 salt rounds - balanced security/performance)
  const hash = await bcrypt.hash(data.password, 10);

  try {
    // 1) Create user UNVERIFIED
    await prisma.user.create({
      data: {
        email,
        name: [firstname, lastname].filter(Boolean).join(" ").trim() || null,
        password: hash,
        profile: { create: { country, city, address } },
        // emailVerified stays null until they click the link
      },
    });

    // 2) Issue verification token + email
    const { verifyUrl } = await createVerificationToken(email);
    await sendVerificationEmail({ to: email, verifyUrl, name: [firstname, lastname].filter(Boolean).join(" ").trim() });

    // 3) Tell the client to show "check your email"
    return {
      ok: true,
      meta: { requiresEmailVerification: true, email },
    };
  } catch (err: unknown) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, errors: { formErrors: ["Unable to create account. Please try again."] } };
    }
    return { ok: false, errors: { formErrors: ["Unexpected error creating user"] } };
  }
}
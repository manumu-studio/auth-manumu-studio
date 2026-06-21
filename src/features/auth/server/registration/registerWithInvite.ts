// src/features/auth/server/registration/registerWithInvite.ts
// Atomically redeems an invite, creates an inactive credential account, and queues OTP email.
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { z } from "zod";

import { verifyTurnstileToken, type TurnstileFetcher } from "@/features/auth/lib/turnstile";
import { createGenericAdmissionFailure, padAdmissionTiming, validateCsrf } from "@/features/auth/server/admission";
import { redeemInviteInTx } from "@/features/auth/server/invites";
import type {
  InviteTransactionClient,
  RedeemedInviteRecord,
  ResolvedInvite,
} from "@/features/auth/server/invites/invite.types";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { buildAdmissionRateLimitChecks, getClientIp, rateLimit, type HeaderSource } from "@/lib/rateLimit";
import { isValidCountryCode } from "@/lib/data/countries";

export const REGISTRATION_SESSION_COOKIE_NAME = "registration_session";
export const REGISTRATION_CSRF_COOKIE_NAME = "registration_csrf";

const RegisterWithInviteFormSchema = z.object({
  firstname: z.string().trim().optional(),
  lastname: z.string().trim().optional(),
  email: z.string().email(),
  country: z
    .string()
    .length(2, "Country is required")
    .refine((value) => isValidCountryCode(value), "Invalid country"),
  city: z.string().min(2).max(120).optional(),
  address: z.string().min(3).max(500).optional(),
  csrfToken: z.string().min(1),
  turnstileToken: z.string().min(1),
});

export type RegisterWithInviteInput = {
  formData: FormData;
  headers: HeaderSource;
  expectedOrigin: string;
  registrationHandle: string | null;
  csrfSessionToken: string | null;
  now?: Date;
  fetcher?: TurnstileFetcher;
};

export type RegistrationResult =
  | {
      ok: true;
      email: string;
      userId: string;
    }
  | {
      ok: false;
      status: number;
      body: {
        ok: false;
        message: string;
        supportId: string;
      };
    };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function handleHash(handle: string): Buffer {
  return createHash("sha256").update(handle, "utf8").digest();
}

function hashForRateLimit(value: Buffer | Uint8Array | null): string | null {
  if (!value) return null;
  return Buffer.from(value).toString("hex");
}

function toResolvedInvite(row: { inviteTokenHash: Buffer | Uint8Array | null; inviteId: string | null }): ResolvedInvite | null {
  if (row.inviteTokenHash) return { tokenHash: Buffer.from(row.inviteTokenHash) };
  if (row.inviteId) return { inviteId: row.inviteId };
  return null;
}

function genericFailure(): RegistrationResult {
  const failure = createGenericAdmissionFailure();
  return {
    ok: false,
    status: failure.status,
    body: failure.body,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2002";
}

function toRedeemedInviteRecord(invite: {
  id: string;
  tokenHash: Uint8Array;
  normalizedEmail: string | null;
  status: string;
  expiresAt: Date;
  redeemedByUserId: string | null;
  redeemedAt: Date | null;
  revokedAt: Date | null;
} | null): RedeemedInviteRecord | null {
  if (
    !invite ||
    invite.status !== "REDEEMED" ||
    !invite.redeemedByUserId ||
    !invite.redeemedAt
  ) {
    return null;
  }

  return {
    id: invite.id,
    tokenHash: invite.tokenHash,
    normalizedEmail: invite.normalizedEmail,
    status: "REDEEMED",
    expiresAt: invite.expiresAt,
    redeemedByUserId: invite.redeemedByUserId,
    redeemedAt: invite.redeemedAt,
    revokedAt: invite.revokedAt,
  };
}

function createInviteTransactionClient(tx: Prisma.TransactionClient): InviteTransactionClient {
  return {
    invite: {
      updateMany: (args) => tx.invite.updateMany(args),
      findFirst: async (args) => toRedeemedInviteRecord(await tx.invite.findFirst(args)),
    },
    user: {
      findUnique: (args) => tx.user.findUnique(args),
    },
    auditEvent: {
      create: (args) => tx.auditEvent.create(args),
    },
  };
}

async function runAdmissionLimiters(input: {
  ip: string | null;
  email: string;
  inviteTokenHash: Buffer | Uint8Array | null;
}): Promise<boolean> {
  const checks = buildAdmissionRateLimitChecks({
    surface: "registration",
    ip: input.ip,
    accountIdentifier: input.email,
    inviteTokenHash: hashForRateLimit(input.inviteTokenHash),
  });

  for (const check of checks) {
    const result = await rateLimit(check.key, check.policy);
    if (!result.success) return false;
  }

  return true;
}

export async function registerWithInvite(input: RegisterWithInviteInput): Promise<RegistrationResult> {
  const startedAtMs = Date.now();
  const fail = async () => {
    await padAdmissionTiming(startedAtMs);
    return genericFailure();
  };

  if (env.SELF_SERVICE_REGISTRATION_ENABLED === "false") {
    return fail();
  }

  const parsed = RegisterWithInviteFormSchema.safeParse({
    firstname: input.formData.get("firstname")?.toString(),
    lastname: input.formData.get("lastname")?.toString(),
    email: input.formData.get("email")?.toString(),
    country: input.formData.get("country")?.toString(),
    city: input.formData.get("city")?.toString(),
    address: input.formData.get("address")?.toString(),
    csrfToken: input.formData.get("csrfToken")?.toString(),
    turnstileToken: input.formData.get("turnstileToken")?.toString(),
  });
  if (!parsed.success) return fail();

  const csrf = validateCsrf({
    headers: input.headers,
    expectedOrigin: input.expectedOrigin,
    sessionToken: input.csrfSessionToken,
    submittedToken: parsed.data.csrfToken,
  });
  if (!csrf.ok) return fail();

  const ip = getClientIp(input.headers);
  const turnstile = await verifyTurnstileToken({
    token: parsed.data.turnstileToken,
    remoteIp: ip,
    fetcher: input.fetcher,
    now: input.now,
  });
  if (!turnstile.ok) return fail();

  if (!input.registrationHandle) return fail();

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const refHash = handleHash(input.registrationHandle);
  const session = await prisma.registrationSession.findUnique({
    where: { handleHash: refHash },
    select: {
      id: true,
      handleHash: true,
      inviteTokenHash: true,
      inviteId: true,
      normalizedEmail: true,
      status: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (!session) return fail();
  if (!(await runAdmissionLimiters({ ip, email: normalizedEmail, inviteTokenHash: session.inviteTokenHash }))) {
    return fail();
  }

  const resolvedInvite = toResolvedInvite(session);
  if (!resolvedInvite || normalizeEmail(session.normalizedEmail ?? "") !== normalizedEmail) {
    return fail();
  }

  const now = input.now ?? new Date();
  const fullName = [parsed.data.firstname, parsed.data.lastname].filter(Boolean).join(" ").trim() || null;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const consumed = await tx.registrationSession.updateMany({
        where: {
          handleHash: refHash,
          status: "PENDING",
          expiresAt: { gt: now },
          consumedAt: null,
        },
        data: {
          status: "CONSUMED",
          consumedAt: now,
        },
      });
      if (consumed.count !== 1) throw new Error("REGISTRATION_ADMISSION_DENIED");

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: fullName,
          password: null,
          passwordHash: null,
          hasPasswordCredential: true,
          emailVerified: null,
          status: "INACTIVE",
          origin: "FIRST_PARTY",
          profile: {
            create: {
              country: parsed.data.country.toUpperCase(),
              city: parsed.data.city?.trim(),
              address: parsed.data.address?.trim(),
            },
          },
        },
        select: { id: true },
      });

      const redeemed = await redeemInviteInTx(
        createInviteTransactionClient(tx),
        resolvedInvite,
        session.normalizedEmail
      );
      if (!redeemed.ok) throw new Error("REGISTRATION_ADMISSION_DENIED");

      await tx.outboxEmail.create({
        data: {
          eventType: "EMAIL_VERIFICATION",
          aggregateId: user.id,
          recipientUserId: user.id,
          dedupId: `email-verification:${user.id}`,
          status: "PENDING",
          availableAt: now,
        },
      });

      return user;
    });

    return { ok: true, email: normalizedEmail, userId: created.id };
  } catch (error) {
    if (isUniqueConstraintError(error) || error instanceof Error) {
      return fail();
    }
    return fail();
  }
}

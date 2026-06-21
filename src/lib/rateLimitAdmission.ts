// src/lib/rateLimitAdmission.ts
// Builds Packet 02 admission limiter checks across public and admin auth surfaces.
import type { RateLimitPolicy } from "@/lib/rateLimit";
import {
  hashRateLimitIdentifier,
  normalizeInviteRateLimitHash,
  normalizeRateLimitIdentifier,
} from "./rateLimitIdentifiers";

export type AdmissionRateLimitSurface =
  | "fragment-exchange"
  | "registration"
  | "invite-redemption"
  | "login"
  | "password-reset"
  | "otp-verify"
  | "admin-operation";

export type AdmissionRateLimitScope =
  | "ip"
  | "account"
  | "invite"
  | "admin"
  | "global-exchange-write";

export type AdmissionRateLimitInput = {
  surface: AdmissionRateLimitSurface;
  ip?: string | null;
  accountIdentifier?: string | null;
  inviteTokenHash?: string | null;
  adminActorId?: string | null;
};

export type AdmissionRateLimitCheck = {
  scope: AdmissionRateLimitScope;
  key: string;
  policy: RateLimitPolicy;
};

const ADMISSION_SCOPES = {
  "fragment-exchange": ["ip", "invite", "global-exchange-write"],
  registration: ["ip", "account", "invite"],
  "invite-redemption": ["ip", "invite"],
  login: ["ip", "account"],
  "password-reset": ["ip", "account"],
  "otp-verify": ["ip", "account"],
  "admin-operation": ["admin", "ip"],
} as const satisfies Record<AdmissionRateLimitSurface, readonly AdmissionRateLimitScope[]>;

const ADMISSION_POLICIES = {
  "fragment-exchange": {
    ip: "fragment-exchange-ip",
    invite: "fragment-exchange-invite",
    "global-exchange-write": "exchange-write-global",
  },
  registration: {
    ip: "registration-ip",
    account: "registration-account",
    invite: "registration-invite",
  },
  "invite-redemption": {
    ip: "invite-redemption-ip",
    invite: "invite-redemption-invite",
  },
  login: {
    ip: "login-ip",
    account: "login-account",
  },
  "password-reset": {
    ip: "password-reset-ip",
    account: "password-reset-account",
  },
  "otp-verify": {
    ip: "otp-verify-ip",
    account: "otp-verify-account",
  },
  "admin-operation": {
    ip: "admin-operation-ip",
    admin: "admin-operation-admin",
  },
} as const satisfies Record<
  AdmissionRateLimitSurface,
  Partial<Record<AdmissionRateLimitScope, RateLimitPolicy>>
>;

function buildAdmissionScopeKey(input: AdmissionRateLimitInput, scope: AdmissionRateLimitScope): string {
  switch (scope) {
    case "ip":
      return `${input.surface}:ip:${normalizeRateLimitIdentifier(input.ip)}`;
    case "account":
      return `${input.surface}:account:${hashRateLimitIdentifier(
        normalizeRateLimitIdentifier(input.accountIdentifier).toLowerCase()
      )}`;
    case "invite":
      return `${input.surface}:invite:${normalizeInviteRateLimitHash(input.inviteTokenHash)}`;
    case "admin":
      return `${input.surface}:admin:${hashRateLimitIdentifier(
        normalizeRateLimitIdentifier(input.adminActorId)
      )}`;
    case "global-exchange-write":
      return "fragment-exchange:global-write";
  }
}

export function buildAdmissionRateLimitChecks(input: AdmissionRateLimitInput): AdmissionRateLimitCheck[] {
  return ADMISSION_SCOPES[input.surface].map((scope) => {
    const policiesForSurface: Partial<Record<AdmissionRateLimitScope, RateLimitPolicy>> =
      ADMISSION_POLICIES[input.surface];
    const policy = policiesForSurface[scope];
    if (!policy) throw new Error(`Missing rate-limit policy for ${input.surface}:${scope}`);
    return {
      scope,
      key: buildAdmissionScopeKey(input, scope),
      policy,
    };
  });
}

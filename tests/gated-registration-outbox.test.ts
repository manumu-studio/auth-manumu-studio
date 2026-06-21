// gated-registration-outbox.test.ts - Packet 02 transactional email outbox worker invariants.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const WORKER_SECRET = "worker-secret-for-tests-at-least-32";

function resetEnv(): void {
  Object.keys(process.env).forEach((key) => {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
}

function setBaseEnv(): void {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/app?schema=public";
  process.env.NEXTAUTH_SECRET = "test-nextauth-secret-at-least-32";
}

function buildWorkerRequest(headers?: Record<string, string>): Request {
  return new Request("https://auth.example.com/api/internal/outbox-email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      id: "outbox_123",
      eventType: "EMAIL_VERIFICATION",
      keyVersion: "v1",
    }),
  });
}

const CLAIMABLE_VERIFICATION_ROW = {
  id: "outbox_123",
  eventType: "EMAIL_VERIFICATION",
  aggregateId: "user_123",
  recipientUserId: "user_123",
  attempts: 0,
  inviteCiphertext: null,
  keyVersion: null,
};

const INVITE_KEY_HEX = "a".repeat(64);
const WRONG_INVITE_KEY_HEX = "b".repeat(64);

type InvitationEmailCall = {
  to: string;
  inviteUrl: string;
  name?: string;
};

describe("Packet 02 transactional email outbox worker", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.doUnmock("@/features/auth/server/outbox");
    vi.doUnmock("@/lib/rateLimit");
    resetEnv();
    setBaseEnv();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.doUnmock("@/features/auth/server/outbox");
    vi.doUnmock("@/lib/rateLimit");
    resetEnv();
  });

  it("rejects absent or empty worker secrets fail-closed before processing", async () => {
    const processOutboxEmailMessage = vi.fn(async () => ({ ok: true }));
    vi.doMock("@/features/auth/server/outbox", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/features/auth/server/outbox")>();
      return {
        ...actual,
        processOutboxEmailMessage,
      };
    });

    const { POST } = await import("@/app/api/internal/outbox-email/route");

    await expect(POST(buildWorkerRequest())).resolves.toMatchObject({ status: 401 });

    process.env.INTERNAL_WORKER_AUTH_SECRET = "";
    await expect(
      POST(buildWorkerRequest({ authorization: `Bearer ${WORKER_SECRET}` }))
    ).resolves.toMatchObject({ status: 401 });

    expect(processOutboxEmailMessage).not.toHaveBeenCalled();
  });

  it("accepts a valid worker secret, rate-limits the worker, and delegates by opaque id", async () => {
    process.env.INTERNAL_WORKER_AUTH_SECRET = WORKER_SECRET;
    const processOutboxEmailMessage = vi.fn(async () => ({ ok: true }));
    const buildAdmissionRateLimitChecks = vi.fn(() => [
      { scope: "admin", key: "outbox:admin-key", policy: "admin-operation-admin" },
      { scope: "ip", key: "outbox:ip-key", policy: "admin-operation-ip" },
    ]);
    const rateLimit = vi.fn(async () => ({
      success: true,
      limit: 30,
      remaining: 29,
      reset: Date.now(),
    }));

    vi.doMock("@/features/auth/server/outbox", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/features/auth/server/outbox")>();
      return {
        ...actual,
        processOutboxEmailMessage,
      };
    });
    vi.doMock("@/lib/rateLimit", () => ({
      buildAdmissionRateLimitChecks,
      buildRateLimitKey: vi.fn(),
      getClientIp: vi.fn(() => "203.0.113.10"),
      rateLimit,
    }));

    const { POST } = await import("@/app/api/internal/outbox-email/route");
    const response = await POST(buildWorkerRequest({ authorization: `Bearer ${WORKER_SECRET}` }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(buildAdmissionRateLimitChecks).toHaveBeenCalledWith({
      surface: "admin-operation",
      ip: "203.0.113.10",
      adminActorId: "internal-outbox-email-worker",
    });
    expect(rateLimit).toHaveBeenCalledWith("outbox:admin-key", "admin-operation-admin");
    expect(rateLimit).toHaveBeenCalledWith("outbox:ip-key", "admin-operation-ip");
    expect(processOutboxEmailMessage).toHaveBeenCalledWith({
      id: "outbox_123",
      eventType: "EMAIL_VERIFICATION",
      keyVersion: "v1",
    });
  });

  it("builds QStash-safe worker bodies without payload or secret material", async () => {
    const { buildOutboxWorkerMessage } = await import("@/features/auth/server/outbox");
    const body = buildOutboxWorkerMessage({
      id: "outbox_123",
      eventType: "INVITATION_DELIVERY",
      keyVersion: "v1",
    });

    expect(body).toEqual({
      id: "outbox_123",
      eventType: "INVITATION_DELIVERY",
      keyVersion: "v1",
    });
    expect(JSON.stringify(body)).not.toContain("payload");
    expect(JSON.stringify(body)).not.toContain("recipient");
    expect(JSON.stringify(body)).not.toContain("inviteCiphertext");
    expect(JSON.stringify(body)).not.toContain("raw");
    expect(JSON.stringify(body)).not.toContain("otp");
  });

  it("builds deterministic dedup ids without embedding raw token or email", async () => {
    const { buildOutboxDedupId } = await import("@/features/auth/server/outbox");
    const dedupId = buildOutboxDedupId({
      eventType: "INVITATION_DELIVERY",
      subjectId: "invite_123",
      keyVersion: 1,
      contentVersion: "v1",
    });

    expect(dedupId).toBe(
      buildOutboxDedupId({
        eventType: "INVITATION_DELIVERY",
        subjectId: "invite_123",
        keyVersion: 1,
        contentVersion: "v1",
      })
    );
    expect(dedupId).toMatch(/^[a-f0-9]{64}$/);
    expect(dedupId).not.toContain("invite_123");
    expect(dedupId).not.toContain("invitee@example.com");
    expect(dedupId).not.toContain("raw-invite-token");
  });

  it("builds QStash publish requests with dedup header and opaque worker body", async () => {
    const { buildQStashPublishRequest } = await import("@/features/auth/server/outbox");
    const request = buildQStashPublishRequest({
      qstashBaseUrl: "https://qstash.upstash.io",
      qstashToken: "qstash-token",
      destinationUrl: "https://auth.example.com/api/internal/outbox-email",
      dedupId: "dedup_123",
      message: {
        id: "outbox_123",
        eventType: "INVITATION_DELIVERY",
        keyVersion: "1",
      },
    });

    expect(request).toEqual({
      url: "https://qstash.upstash.io/v2/publish/https://auth.example.com/api/internal/outbox-email",
      init: {
        method: "POST",
        headers: {
          Authorization: "Bearer qstash-token",
          "Content-Type": "application/json",
          "Upstash-Deduplication-Id": "dedup_123",
        },
        body: JSON.stringify({
          id: "outbox_123",
          eventType: "INVITATION_DELIVERY",
          keyVersion: "1",
        }),
      },
    });
    expect(request.init.body).not.toContain("payload");
    expect(request.init.body).not.toContain("invitee@example.com");
    expect(request.init.body).not.toContain("raw-invite-token");
    expect(request.init.body).not.toContain("inviteCiphertext");
  });

  it("claims one due row with SKIP LOCKED, sends OTP email, and finalizes with the claim token", async () => {
    const now = new Date("2026-06-21T00:00:00.000Z");
    const tx = {
      queryClaimableOutboxEmails: vi.fn(async () => [CLAIMABLE_VERIFICATION_ROW]),
      updateOutboxEmailMany: vi.fn(async () => ({ count: 1 })),
      findRecipientUser: vi.fn(async () => ({
        id: "user_123",
        email: "user@example.com",
        name: "Ada",
        status: "INACTIVE",
      })),
    };
    const deps = {
      db: {
        $transaction: vi.fn(async (callback) => callback(tx)),
        queryClaimableOutboxEmails: tx.queryClaimableOutboxEmails,
        updateOutboxEmailMany: tx.updateOutboxEmailMany,
        findRecipientUser: tx.findRecipientUser,
      },
      now: vi.fn(() => now),
      generateClaimToken: vi.fn(() => "claim_123"),
      createVerificationToken: vi.fn(async () => ({ ok: true as const, code: "123456" })),
      sendVerificationEmail: vi.fn(async () => undefined),
      decryptInviteToken: vi.fn(),
      buildInviteAcceptUrl: vi.fn(),
      sendInvitationEmail: vi.fn(),
    };
    const { CLAIM_DUE_OUTBOX_EMAIL_SQL, processOutboxEmailMessage } = await import(
      "@/features/auth/server/outbox"
    );

    const result = await processOutboxEmailMessage({ id: "outbox_123" }, deps);

    expect(CLAIM_DUE_OUTBOX_EMAIL_SQL).toMatch(/FOR UPDATE SKIP LOCKED/);
    expect(result).toEqual({ ok: true, outcome: "sent" });
    expect(tx.queryClaimableOutboxEmails).toHaveBeenCalledWith("outbox_123", now);
    expect(tx.updateOutboxEmailMany).toHaveBeenNthCalledWith(1, {
      where: { id: "outbox_123", status: { in: ["PENDING", "CLAIMED"] } },
      data: {
        status: "CLAIMED",
        claimedAt: now,
        claimToken: "claim_123",
        leaseExpiresAt: new Date("2026-06-21T00:05:00.000Z"),
        lastErrorCode: null,
      },
    });
    expect(deps.createVerificationToken).toHaveBeenCalledWith("user@example.com");
    expect(deps.sendVerificationEmail).toHaveBeenCalledWith({
      to: "user@example.com",
      code: "123456",
      name: "Ada",
    });
    expect(tx.updateOutboxEmailMany).toHaveBeenNthCalledWith(2, {
      where: { id: "outbox_123", claimToken: "claim_123", status: "CLAIMED" },
      data: {
        status: "SENT",
        sentAt: now,
        claimToken: null,
        leaseExpiresAt: null,
        inviteCiphertext: null,
        clearedAt: now,
      },
    });
  });

  it("prevents stale claim tokens from finalizing a re-claimed row", async () => {
    const now = new Date("2026-06-21T00:00:00.000Z");
    const updateOutboxEmailMany = vi.fn(async () => ({ count: 0 }));
    const { finalizeOutboxEmailSent } = await import("@/features/auth/server/outbox");

    const finalized = await finalizeOutboxEmailSent("outbox_123", "stale_claim", {
      db: { updateOutboxEmailMany },
      now: vi.fn(() => now),
    });

    expect(finalized).toBe(false);
    expect(updateOutboxEmailMany).toHaveBeenCalledWith({
      where: { id: "outbox_123", claimToken: "stale_claim", status: "CLAIMED" },
      data: {
        status: "SENT",
        sentAt: now,
        claimToken: null,
        leaseExpiresAt: null,
        inviteCiphertext: null,
        clearedAt: now,
      },
    });
  });

  it("terminal failure clears invite ciphertext while preserving row identity", async () => {
    const now = new Date("2026-06-21T00:00:00.000Z");
    const updateOutboxEmailMany = vi.fn(async () => ({ count: 1 }));
    const { recordOutboxEmailFailure } = await import("@/features/auth/server/outbox");

    await recordOutboxEmailFailure(
      {
        id: "outbox_456",
        eventType: "INVITATION_DELIVERY",
        aggregateId: "invite_123",
        recipientUserId: "user_456",
        attempts: 4,
        inviteCiphertext: new Uint8Array([1, 2, 3]),
        keyVersion: 1,
      },
      "claim_456",
      new Error("EMAIL_SEND_FAILED"),
      {
        db: { updateOutboxEmailMany },
        now: vi.fn(() => now),
      }
    );

    expect(updateOutboxEmailMany).toHaveBeenCalledWith({
      where: { id: "outbox_456", claimToken: "claim_456", status: "CLAIMED" },
      data: {
        status: "FAILED",
        attempts: 5,
        failedAt: now,
        nextAttemptAt: null,
        claimToken: null,
        leaseExpiresAt: null,
        lastErrorCode: "EMAIL_SEND_FAILED",
        inviteCiphertext: null,
        clearedAt: now,
      },
    });
  });

  it("rejects unsupported outbox event types without sending email", async () => {
    const now = new Date("2026-06-21T00:00:00.000Z");
    const tx = {
      queryClaimableOutboxEmails: vi.fn(async () => [
        {
          id: "outbox_admin",
          eventType: "ADMIN_STEP_UP",
          aggregateId: "challenge_123",
          recipientUserId: "user_123",
          attempts: 4,
          inviteCiphertext: null,
          keyVersion: null,
        },
      ]),
      updateOutboxEmailMany: vi.fn(async () => ({ count: 1 })),
      findRecipientUser: vi.fn(async () => ({
        id: "user_123",
        email: "user@example.com",
        name: null,
        status: "INACTIVE",
      })),
    };
    const deps = {
      db: {
        $transaction: vi.fn(async (callback) => callback(tx)),
        queryClaimableOutboxEmails: tx.queryClaimableOutboxEmails,
        updateOutboxEmailMany: tx.updateOutboxEmailMany,
        findRecipientUser: tx.findRecipientUser,
      },
      now: vi.fn(() => now),
      generateClaimToken: vi.fn(() => "claim_admin"),
      createVerificationToken: vi.fn(async () => ({ ok: true as const, code: "123456" })),
      sendVerificationEmail: vi.fn(async () => undefined),
      decryptInviteToken: vi.fn(),
      buildInviteAcceptUrl: vi.fn(),
      sendInvitationEmail: vi.fn(),
    };
    const { processOutboxEmailMessage } = await import("@/features/auth/server/outbox");

    await expect(processOutboxEmailMessage({ id: "outbox_admin" }, deps)).resolves.toEqual({
      ok: true,
      outcome: "failed",
    });

    expect(deps.createVerificationToken).not.toHaveBeenCalled();
    expect(deps.sendVerificationEmail).not.toHaveBeenCalled();
    expect(deps.sendInvitationEmail).not.toHaveBeenCalled();
    expect(tx.updateOutboxEmailMany).toHaveBeenLastCalledWith({
      where: { id: "outbox_admin", claimToken: "claim_admin", status: "CLAIMED" },
      data: {
        status: "FAILED",
        attempts: 5,
        failedAt: now,
        nextAttemptAt: null,
        claimToken: null,
        leaseExpiresAt: null,
        lastErrorCode: "OUTBOX_UNSUPPORTED_EVENT_TYPE",
        inviteCiphertext: null,
        clearedAt: now,
      },
    });
  });

  it("rejects invite ciphertext encrypted for the wrong key", async () => {
    const { decryptInviteDeliveryToken, encryptInviteDeliveryToken } = await import(
      "@/features/auth/server/outbox"
    );
    const ciphertext = encryptInviteDeliveryToken("raw-invite-token", INVITE_KEY_HEX);

    expect(() => decryptInviteDeliveryToken(ciphertext, WRONG_INVITE_KEY_HEX)).toThrow(
      "INVITE_DELIVERY_DECRYPT_FAILED"
    );
  });

  it("decrypts pending invite rows with their original key version after rotation", async () => {
    const { createInviteTokenDecryptor, encryptInviteDeliveryToken } = await import(
      "@/features/auth/server/outbox"
    );
    const ciphertext = encryptInviteDeliveryToken("raw-invite-token", INVITE_KEY_HEX);
    const decrypt = createInviteTokenDecryptor(
      new Map([
        [1, INVITE_KEY_HEX],
        [2, WRONG_INVITE_KEY_HEX],
      ])
    );

    expect(decrypt(ciphertext, 1)).toBe("raw-invite-token");
    expect(() => decrypt(ciphertext, 2)).toThrow("INVITE_DELIVERY_DECRYPT_FAILED");
  });

  it("decrypts invitation tokens in memory and emits the raw token only in the URL fragment", async () => {
    const now = new Date("2026-06-21T00:00:00.000Z");
    const rawToken = "raw-invite-token";
    const { buildInviteAcceptUrl, decryptInviteDeliveryToken, encryptInviteDeliveryToken } =
      await import("@/features/auth/server/outbox");
    const ciphertext = encryptInviteDeliveryToken(rawToken, INVITE_KEY_HEX);
    const tx = {
      queryClaimableOutboxEmails: vi.fn(async () => [
        {
          id: "outbox_456",
          eventType: "INVITATION_DELIVERY",
          aggregateId: "invite_123",
          recipientUserId: "user_456",
          attempts: 0,
          inviteCiphertext: ciphertext,
          keyVersion: 1,
        },
      ]),
      updateOutboxEmailMany: vi.fn(async () => ({ count: 1 })),
      findRecipientUser: vi.fn(async () => ({
        id: "user_456",
        email: "invitee@example.com",
        name: null,
        status: "INACTIVE",
      })),
    };
    const sendInvitationEmail = vi.fn(async (_args: InvitationEmailCall) => undefined);
    const deps = {
      db: {
        $transaction: vi.fn(async (callback) => callback(tx)),
        queryClaimableOutboxEmails: tx.queryClaimableOutboxEmails,
        updateOutboxEmailMany: tx.updateOutboxEmailMany,
        findRecipientUser: tx.findRecipientUser,
      },
      now: vi.fn(() => now),
      generateClaimToken: vi.fn(() => "claim_456"),
      createVerificationToken: vi.fn(async () => ({ ok: true as const, code: "123456" })),
      sendVerificationEmail: vi.fn(async () => undefined),
      decryptInviteToken: vi.fn((value: Uint8Array, _keyVersion: number | null) =>
        decryptInviteDeliveryToken(value, INVITE_KEY_HEX)
      ),
      buildInviteAcceptUrl: vi.fn((token: string) =>
        buildInviteAcceptUrl(token, "https://auth.example.com")
      ),
      sendInvitationEmail,
    };
    const { processOutboxEmailMessage } = await import("@/features/auth/server/outbox");

    await expect(processOutboxEmailMessage({ id: "outbox_456" }, deps)).resolves.toEqual({
      ok: true,
      outcome: "sent",
    });

    const sentArgs = sendInvitationEmail.mock.calls[0]?.[0];
    if (!sentArgs) throw new Error("Expected invitation email to be sent");

    const inviteUrl = new URL(sentArgs.inviteUrl);
    expect(inviteUrl.pathname).toBe("/invite");
    expect(inviteUrl.search).toBe("");
    expect(inviteUrl.hash).toBe(`#token=${rawToken}`);
    expect(sentArgs).toEqual({
      to: "invitee@example.com",
      inviteUrl: "https://auth.example.com/invite#token=raw-invite-token",
    });
    expect(sentArgs.inviteUrl.split("#")[0]).not.toContain(rawToken);
    expect(tx.updateOutboxEmailMany).toHaveBeenLastCalledWith({
      where: { id: "outbox_456", claimToken: "claim_456", status: "CLAIMED" },
      data: {
        status: "SENT",
        sentAt: now,
        claimToken: null,
        leaseExpiresAt: null,
        inviteCiphertext: null,
        clearedAt: now,
      },
    });
  });
});

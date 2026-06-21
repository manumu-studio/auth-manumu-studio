// gated-registration-invites.test.ts - Invite lifecycle service invariants.
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const NOW = new Date("2026-06-21T00:00:00.000Z");

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invite: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.DATABASE_URL = "postgres://localhost/test";
  process.env.NEXTAUTH_SECRET = "x".repeat(32);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  Object.keys(process.env).forEach((key) => {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("createInvite", () => {
  it("returns a 256-bit token once and persists only its SHA-256 hash", async () => {
    const { prisma } = await import("@/lib/prisma");
    const createInviteRecord = vi.mocked(prisma.invite.create);
    createInviteRecord.mockResolvedValue({
      id: "invite-1",
      tokenHash: Buffer.alloc(32),
      normalizedEmail: "person@example.com",
      status: "ISSUED",
      expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
      issuerUserId: "admin-1",
      redeemedByUserId: null,
      redeemedAt: null,
      revokedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const { createInvite } = await import("@/features/auth/server/invites");

    const result = await createInvite({
      issuerUserId: "admin-1",
      email: "  Person@Example.COM  ",
    });

    const rawToken = result.rawToken;
    const decoded = Buffer.from(rawToken, "base64url");
    const expectedHash = crypto.createHash("sha256").update(rawToken).digest();

    expect(decoded).toHaveLength(32);
    expect(result.inviteId).toBe("invite-1");
    expect(result.normalizedEmail).toBe("person@example.com");
    expect(result.expiresAt).toEqual(new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000));
    expect(createInviteRecord).toHaveBeenCalledWith({
      data: {
        issuerUserId: "admin-1",
        normalizedEmail: "person@example.com",
        tokenHash: expectedHash,
        expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      select: {
        id: true,
        normalizedEmail: true,
        expiresAt: true,
      },
    });
    expect(JSON.stringify(createInviteRecord.mock.calls)).not.toContain(rawToken);
  });
});

describe("lookupInviteByToken", () => {
  it("returns one generic failure shape and compares a miss in constant time", async () => {
    const { prisma } = await import("@/lib/prisma");
    const findInvite = vi.mocked(prisma.invite.findUnique);
    const timingSpy = vi.spyOn(crypto, "timingSafeEqual");

    findInvite.mockResolvedValue(null);

    const { lookupInviteByToken } = await import("@/features/auth/server/invites");

    const absent = await lookupInviteByToken("absent-token", "person@example.com");
    const malformed = await lookupInviteByToken("", "person@example.com");

    expect(absent).toEqual({ ok: false });
    expect(malformed).toEqual({ ok: false });
    expect(timingSpy).toHaveBeenCalledTimes(2);
    expect(timingSpy.mock.calls[0]?.[0]).toHaveLength(32);
    expect(timingSpy.mock.calls[0]?.[1]).toHaveLength(32);
    expect(findInvite).toHaveBeenCalledWith({
      where: {
        tokenHash: crypto.createHash("sha256").update("absent-token").digest(),
      },
      select: {
        id: true,
        tokenHash: true,
        normalizedEmail: true,
        status: true,
        expiresAt: true,
      },
    });
  });
});

describe("redeemInviteInTx", () => {
  it("uses a server-resolved CAS and writes redeemedByUserId from the normalized email user", async () => {
    const tokenHash = crypto.createHash("sha256").update("server-resolved").digest();
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findFirst = vi.fn().mockResolvedValue({
      id: "invite-1",
      tokenHash,
      normalizedEmail: "person@example.com",
      status: "REDEEMED",
      expiresAt: new Date(NOW.getTime() + 60_000),
      redeemedByUserId: "user-1",
      redeemedAt: NOW,
      revokedAt: null,
    });
    const findUnique = vi.fn().mockResolvedValue({ id: "user-1" });
    const createAuditEvent = vi.fn();

    const tx = {
      invite: { updateMany, findFirst },
      user: { findUnique },
      auditEvent: { create: createAuditEvent },
    };

    const { redeemInviteInTx } = await import("@/features/auth/server/invites");

    const result = await redeemInviteInTx(
      tx,
      { tokenHash },
      " Person@Example.COM ",
    );

    expect(result.ok).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "person@example.com" },
      select: { id: true },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash,
        status: "ISSUED",
        expiresAt: { gt: NOW },
        normalizedEmail: "person@example.com",
      },
      data: {
        status: "REDEEMED",
        redeemedAt: NOW,
        redeemedByUserId: "user-1",
      },
    });
    expect(createAuditEvent).not.toHaveBeenCalled();
  });

  it("audits and alerts on redeemed invite reuse without leaking token or email", async () => {
    const tokenHash = crypto.createHash("sha256").update("server-resolved").digest();
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findFirst = vi.fn().mockResolvedValue({
      id: "invite-1",
      tokenHash,
      normalizedEmail: "person@example.com",
      status: "REDEEMED",
      expiresAt: new Date(NOW.getTime() + 60_000),
      redeemedByUserId: "user-1",
      redeemedAt: NOW,
      revokedAt: null,
    });
    const findUnique = vi.fn().mockResolvedValue({ id: "user-1" });
    const createAuditEvent = vi.fn().mockResolvedValue({ id: "audit-1" });
    const alertReuse = vi.fn();

    const tx = {
      invite: { updateMany, findFirst },
      user: { findUnique },
      auditEvent: { create: createAuditEvent },
    };

    const { redeemInviteInTx, setInviteReuseAlertHandler } = await import(
      "@/features/auth/server/invites"
    );
    const resetAlertHandler = setInviteReuseAlertHandler(alertReuse);

    const result = await redeemInviteInTx(tx, { tokenHash }, "person@example.com");

    resetAlertHandler();

    expect(result).toEqual({ ok: false });
    expect(createAuditEvent).toHaveBeenCalledWith({
      data: {
        action: "invite.reuse_detected",
        targetType: "Invite",
        targetId: "invite-1",
        metadata: {
          inviteStatus: "REDEEMED",
        },
      },
    });
    expect(alertReuse).toHaveBeenCalledWith({
      inviteId: "invite-1",
      status: "REDEEMED",
    });
    expect(JSON.stringify(createAuditEvent.mock.calls)).not.toContain("server-resolved");
    expect(JSON.stringify(createAuditEvent.mock.calls)).not.toContain("person@example.com");
  });
});

describe("revokeInvite", () => {
  it("idempotently revokes only issued, unexpired invites", async () => {
    const { prisma } = await import("@/lib/prisma");
    const revokeInviteRecord = vi.mocked(prisma.invite.updateMany);
    revokeInviteRecord.mockResolvedValue({ count: 1 });

    const { revokeInvite } = await import("@/features/auth/server/invites");

    const result = await revokeInvite({ inviteId: "invite-1" });

    expect(result).toEqual({ ok: true });
    expect(revokeInviteRecord).toHaveBeenCalledWith({
      where: {
        id: "invite-1",
        status: "ISSUED",
        expiresAt: { gt: NOW },
      },
      data: {
        status: "REVOKED",
        revokedAt: NOW,
      },
    });
  });
});

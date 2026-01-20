import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

vi.mock('@/lib/prisma', () => ({
  prisma: {
    verificationToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/features/auth/lib/email/provider', () => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => Buffer.from('a'.repeat(32))),
  },
}));

const NOW = new Date('2024-01-01T00:00:00Z');

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env.SKIP_ENV_VALIDATION = 'true';
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost/test';
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'x'.repeat(32);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();

  Object.keys(process.env).forEach((key) => {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('Email verification tokens', () => {
  it('creates a token and persists it', async () => {
    process.env.APP_URL = 'https://app.test';
    process.env.VERIFY_TOKEN_TTL_MINUTES = '30';

    const { createVerificationToken } = await import(
      '@/features/auth/server/verify/createToken'
    );
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      verificationToken: { create: Mock };
    };

    const result = await createVerificationToken('User@Example.com');
    const expectedToken = Buffer.from('a'.repeat(32)).toString('base64url');
    const expectedExpires = new Date(NOW.getTime() + 30 * 60 * 1000);

    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith({
      data: {
        identifier: 'user@example.com',
        token: expectedToken,
        expires: expectedExpires,
      },
    });
    expect(result).toEqual({
      ok: true,
      token: expectedToken,
      verifyUrl: `https://app.test/verify?token=${encodeURIComponent(
        expectedToken
      )}`,
    });
  });

  it('returns not-found for unknown tokens', async () => {
    const { consumeVerificationToken } = await import(
      '@/features/auth/server/verify/consumeToken'
    );
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      verificationToken: { findUnique: Mock };
    };

    prismaMock.verificationToken.findUnique.mockResolvedValue(null);

    await expect(consumeVerificationToken('missing')).resolves.toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('returns expired when token is stale', async () => {
    const { consumeVerificationToken } = await import(
      '@/features/auth/server/verify/consumeToken'
    );
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      verificationToken: { findUnique: Mock };
      user: { findUnique: Mock };
    };

    prismaMock.verificationToken.findUnique.mockResolvedValue({
      token: 'expired',
      identifier: 'user@example.com',
      expires: new Date(NOW.getTime() - 1000),
    });

    await expect(consumeVerificationToken('expired')).resolves.toEqual({
      ok: false,
      reason: 'expired',
    });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns not-found when user is missing', async () => {
    const { consumeVerificationToken } = await import(
      '@/features/auth/server/verify/consumeToken'
    );
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      verificationToken: { findUnique: Mock };
      user: { findUnique: Mock };
    };

    prismaMock.verificationToken.findUnique.mockResolvedValue({
      token: 'token',
      identifier: 'user@example.com',
      expires: new Date(NOW.getTime() + 1000),
    });
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(consumeVerificationToken('token')).resolves.toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('returns already-verified when user is verified', async () => {
    const { consumeVerificationToken } = await import(
      '@/features/auth/server/verify/consumeToken'
    );
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      verificationToken: { findUnique: Mock };
      user: { findUnique: Mock };
    };

    prismaMock.verificationToken.findUnique.mockResolvedValue({
      token: 'token',
      identifier: 'user@example.com',
      expires: new Date(NOW.getTime() + 1000),
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-id',
      emailVerified: new Date(),
    });

    await expect(consumeVerificationToken('token')).resolves.toEqual({
      ok: false,
      reason: 'already-verified',
    });
  });

  it('marks user verified and deletes tokens on success', async () => {
    const { consumeVerificationToken } = await import(
      '@/features/auth/server/verify/consumeToken'
    );
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      verificationToken: { findUnique: Mock; deleteMany: Mock };
      user: { findUnique: Mock; update: Mock };
      $transaction: Mock;
    };

    prismaMock.verificationToken.findUnique.mockResolvedValue({
      token: 'token',
      identifier: 'user@example.com',
      expires: new Date(NOW.getTime() + 1000),
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-id',
      emailVerified: null,
    });
    prismaMock.user.update.mockResolvedValue({ id: 'user-id' });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockResolvedValue([]);

    await expect(consumeVerificationToken('token')).resolves.toEqual({
      ok: true,
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { emailVerified: expect.any(Date) },
    });
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: 'user@example.com' },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe('Verification resend flow', () => {
  it('rejects unknown emails', async () => {
    const { resendVerificationToken } = await import(
      '@/features/auth/server/verify/resend'
    );
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      user: { findUnique: Mock };
    };

    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(resendVerificationToken('unknown@example.com')).resolves.toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('rejects already verified users', async () => {
    const { resendVerificationToken } = await import(
      '@/features/auth/server/verify/resend'
    );
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      user: { findUnique: Mock };
    };

    prismaMock.user.findUnique.mockResolvedValue({ emailVerified: new Date() });

    await expect(resendVerificationToken('verified@example.com')).resolves.toEqual({
      ok: false,
      reason: 'already-verified',
    });
  });

  it('enforces resend cooldown', async () => {
    process.env.VERIFY_RESEND_COOLDOWN_MINUTES = '2';

    const { resendVerificationToken } = await import(
      '@/features/auth/server/verify/resend'
    );
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      user: { findUnique: Mock };
      verificationToken: { findFirst: Mock };
    };

    prismaMock.user.findUnique.mockResolvedValue({ emailVerified: null });
    prismaMock.verificationToken.findFirst.mockResolvedValue({
      expires: new Date(NOW.getTime() - 60 * 1000),
    });

    await expect(resendVerificationToken('cooldown@example.com')).resolves.toEqual({
      ok: false,
      reason: 'cooldown',
    });
  });

  it('creates and sends a new token after cooldown', async () => {
    process.env.APP_URL = 'https://app.test';
    process.env.VERIFY_TOKEN_TTL_MINUTES = '30';
    process.env.VERIFY_RESEND_COOLDOWN_MINUTES = '2';

    const { resendVerificationToken } = await import(
      '@/features/auth/server/verify/resend'
    );
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      user: { findUnique: Mock };
      verificationToken: { findFirst: Mock; create: Mock };
    };
    const { sendVerificationEmail } = await import(
      '@/features/auth/lib/email/provider'
    );

    prismaMock.user.findUnique.mockResolvedValue({ emailVerified: null });
    prismaMock.verificationToken.findFirst.mockResolvedValue({
      expires: new Date(NOW.getTime() - 10 * 60 * 1000),
    });
    prismaMock.verificationToken.create.mockResolvedValue({ token: 'token' });

    await expect(
      resendVerificationToken('User@Example.com')
    ).resolves.toEqual({ ok: true });

    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith({
      data: {
        identifier: 'user@example.com',
        token: Buffer.from('a'.repeat(32)).toString('base64url'),
        expires: new Date(NOW.getTime() + 30 * 60 * 1000),
      },
    });
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      verifyUrl: expect.stringContaining('/verify?token='),
    });
  });
});

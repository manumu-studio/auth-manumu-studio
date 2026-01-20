import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/rateLimit', () => ({
  buildRateLimitKey: vi.fn(() => 'rate:limit:key'),
  getRequestIp: vi.fn(() => '127.0.0.1'),
  rateLimit: vi.fn(async () => ({
    success: true,
    limit: 3,
    remaining: 2,
    reset: Date.now(),
  })),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock('@/features/auth/server/verify/createToken', () => ({
  createVerificationToken: vi.fn(),
}));

vi.mock('@/features/auth/lib/email/provider', () => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Headers({ 'x-forwarded-for': '127.0.0.1' })),
}));

beforeEach(() => {
  vi.resetModules();
  process.env.SKIP_ENV_VALIDATION = 'true';
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost/test';
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'x'.repeat(32);
});

afterEach(() => {
  vi.clearAllMocks();
  Object.keys(process.env).forEach((key) => {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('Signup hashing flow', () => {
  it('hashes the password before saving the user', async () => {
    const { prisma } = await import('@/lib/prisma');
    const prismaMock = prisma as unknown as {
      user: { findUnique: Mock; create: Mock };
    };
    const bcrypt = await import('bcryptjs');
    const { createVerificationToken } = await import(
      '@/features/auth/server/verify/createToken'
    );
    const { sendVerificationEmail } = await import(
      '@/features/auth/lib/email/provider'
    );

    const bcryptHash = bcrypt.default.hash as unknown as Mock;
    const createVerificationTokenMock = createVerificationToken as unknown as Mock;

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'user-id' });
    bcryptHash.mockResolvedValue('hashed-password');
    createVerificationTokenMock.mockResolvedValue({
      ok: true,
      token: 'token',
      verifyUrl: 'https://app.test/verify?token=token',
    });

    const { registerUser } = await import(
      '@/features/auth/server/actions/signup'
    );

    const formData = new FormData();
    formData.set('firstname', 'Test');
    formData.set('lastname', 'User');
    formData.set('email', 'User@Example.com');
    formData.set('password', 'password123');
    formData.set('repeatpassword', 'password123');
    formData.set('country', 'us');
    formData.set('city', 'NYC');
    formData.set('address', '123 Test St');

    const result = await registerUser(formData);

    expect(result.ok).toBe(true);
    expect(bcryptHash).toHaveBeenCalledWith('password123', 10);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'user@example.com',
          password: 'hashed-password',
        }),
      })
    );
    expect(createVerificationTokenMock).toHaveBeenCalledWith('user@example.com');
    expect(sendVerificationEmail).toHaveBeenCalled();
  });
});

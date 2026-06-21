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
  getClientIp: vi.fn(() => '127.0.0.1'),
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
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
  })),
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

describe('Signup registration flow', () => {
  it('delegates to shared invite registration without hashing or direct email send', async () => {
    const bcrypt = await import('bcryptjs');
    const { createVerificationToken } = await import(
      '@/features/auth/server/verify/createToken'
    );
    const { sendVerificationEmail } = await import(
      '@/features/auth/lib/email/provider'
    );

    const bcryptHash = bcrypt.default.hash as unknown as Mock;
    const createVerificationTokenMock = createVerificationToken as unknown as Mock;
    const sharedRegisterUser = vi.fn(async () => ({
      ok: true as const,
      meta: { requiresEmailVerification: true, email: 'user@example.com' },
    }));

    vi.doMock('@/features/auth/server/registration/registerAction', () => ({
      registerUser: sharedRegisterUser,
    }));

    const { registerUser } = await import(
      '@/features/auth/server/actions/signup'
    );

    const formData = new FormData();
    formData.set('firstname', 'Test');
    formData.set('lastname', 'User');
    formData.set('email', 'User@Example.com');
    formData.set('password', 'MyP@ss123');
    formData.set('repeatpassword', 'MyP@ss123');
    formData.set('country', 'us');
    formData.set('city', 'NYC');
    formData.set('address', '123 Test St');

    const result = await registerUser(formData);

    expect(result).toEqual({
      ok: true,
      meta: { requiresEmailVerification: true, email: 'user@example.com' },
    });
    expect(sharedRegisterUser).toHaveBeenCalledWith(formData);
    expect(bcryptHash).not.toHaveBeenCalled();
    expect(createVerificationTokenMock).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});

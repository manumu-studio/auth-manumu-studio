// tests/gated-registration-social-jit.test.ts
// Proves Packet 02 closes social JIT creation and silent email linking.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Account } from "next-auth";

const ORIGINAL_ENV = { ...process.env };
const OAUTH_ACCOUNT = {
  type: "oauth",
  provider: "google",
  providerAccountId: "google-profile-id",
} satisfies Account;

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
  process.env.GOOGLE_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
  process.env.GITHUB_CLIENT_ID = "github-client-id";
  process.env.GITHUB_CLIENT_SECRET = "github-client-secret";
}

async function importAuthOptionsWithLinkedAccount(linkedAccount: unknown, auditEventCreate = vi.fn()) {
  vi.doMock("@auth/prisma-adapter", () => ({
    PrismaAdapter: vi.fn(() => ({})),
  }));
  const findAccount = vi.fn(async () => linkedAccount);
  const createAccount = vi.fn();
  const findUser = vi.fn();
  const createUser = vi.fn();
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      account: {
        findUnique: findAccount,
        create: createAccount,
      },
      user: {
        findUnique: findUser,
        create: createUser,
      },
      auditEvent: {
        create: auditEventCreate,
      },
    },
  }));

  const { authOptions } = await import("@/features/auth/server/options");
  const signIn = authOptions.callbacks?.signIn;

  expect(signIn).toBeTypeOf("function");
  if (typeof signIn !== "function") {
    throw new Error("expected signIn callback to be configured");
  }

  return { signIn, findAccount, createAccount, findUser, createUser, auditEventCreate };
}

beforeEach(() => {
  vi.resetModules();
  resetEnv();
  setBaseEnv();
});

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  resetEnv();
});

describe("Packet 02 social provider config", () => {
  it("does not opt Google or GitHub into dangerous email account linking", async () => {
    const [{ googleProvider }, { githubProvider }] = await Promise.all([
      import("@/features/auth/server/providers/google"),
      import("@/features/auth/server/providers/github"),
    ]);

    const google = googleProvider();
    const github = githubProvider();

    if (!google || !github) throw new Error("expected social providers to be enabled");

    expect(google.options).not.toHaveProperty("allowDangerousEmailAccountLinking");
    expect(github.options).not.toHaveProperty("allowDangerousEmailAccountLinking");
  });
});

describe("Packet 02 social sign-in gate", () => {
  it("denies an unlinked OAuth account before adapter persistence", async () => {
    const { signIn, findAccount, createAccount, createUser } =
      await importAuthOptionsWithLinkedAccount(null);

    const result = await signIn({
      user: {
        id: "google-profile-id",
        email: "new-person@example.com",
      },
      account: OAUTH_ACCOUNT,
      profile: {
        email: "new-person@example.com",
      },
    });

    expect(result).toBe(false);
    expect(findAccount).toHaveBeenCalledWith({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: "google-profile-id",
        },
      },
      include: {
        user: true,
      },
    });
    expect(createAccount).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("allows an existing linked ACTIVE social account", async () => {
    const { signIn } = await importAuthOptionsWithLinkedAccount({
      user: {
        id: "user-1",
        status: "ACTIVE",
      },
    });

    const result = await signIn({
      user: {
        id: "user-1",
        email: "linked-person@example.com",
      },
      account: OAUTH_ACCOUNT,
      profile: {
        email: "linked-person@example.com",
      },
    });

    expect(result).toBe(true);
  });

  it("denies a same-email credentials user when no social Account is linked", async () => {
    const { signIn, createAccount, createUser, findUser } =
      await importAuthOptionsWithLinkedAccount(null);

    const result = await signIn({
      user: {
        id: "google-profile-id",
        email: "classic-user@example.com",
      },
      account: OAUTH_ACCOUNT,
      profile: {
        email: "classic-user@example.com",
      },
    });

    expect(result).toBe(false);
    expect(findUser).not.toHaveBeenCalled();
    expect(createAccount).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("records redacted denial telemetry without email or provider account id", async () => {
    const auditEventCreate = vi.fn(async () => ({ id: "audit-1" }));
    const { signIn } = await importAuthOptionsWithLinkedAccount(null, auditEventCreate);

    const result = await signIn({
      user: {
        id: "google-profile-id",
        email: "classic-user@example.com",
      },
      account: OAUTH_ACCOUNT,
      profile: {
        email: "classic-user@example.com",
      },
    });

    expect(result).toBe(false);
    expect(auditEventCreate).toHaveBeenCalledWith({
      data: {
        action: "auth.social_signin_denied",
        targetType: "SocialSignIn",
        metadata: {
          provider: "google",
          reason: "unlinked_oauth_account",
        },
      },
    });

    const auditPayload = JSON.stringify(auditEventCreate.mock.calls);
    expect(auditPayload).not.toContain("classic-user@example.com");
    expect(auditPayload).not.toContain("google-profile-id");
  });

  it.each(["INACTIVE", "SUSPENDED", "DELETED"])(
    "denies an existing linked %s social account",
    async (status) => {
      const { signIn } = await importAuthOptionsWithLinkedAccount({
        user: {
          id: "user-1",
          status,
        },
      });

      const result = await signIn({
        user: {
          id: "user-1",
          email: "linked-person@example.com",
        },
        account: OAUTH_ACCOUNT,
        profile: {
          email: "linked-person@example.com",
        },
      });

      expect(result).toBe(false);
    }
  );
});

describe("Packet 02 social adapter backstop", () => {
  it("blocks createUser and linkAccount before the underlying adapter can persist", async () => {
    const createUser = vi.fn(async () => ({
      id: "created-user",
      email: "new-person@example.com",
      emailVerified: null,
    }));
    const linkAccount = vi.fn(async () => undefined);
    const baseAdapter = {
      createUser,
      linkAccount,
    };

    const { createGatedSocialAdapter } = await import(
      "@/features/auth/server/social/gatedPrismaAdapter"
    );
    const adapter = createGatedSocialAdapter(baseAdapter);

    if (!adapter.createUser || !adapter.linkAccount) {
      throw new Error("expected gated adapter to expose guarded methods");
    }

    await expect(
      adapter.createUser({
        id: "new-user",
        email: "new-person@example.com",
        emailVerified: null,
      })
    ).rejects.toThrow("SOCIAL_JIT_DISABLED");
    await expect(
      adapter.linkAccount({
        type: "oauth",
        provider: "google",
        providerAccountId: "google-profile-id",
        userId: "user-1",
      })
    ).rejects.toThrow("SOCIAL_LINKING_REQUIRES_EXPLICIT_INTENT");

    expect(createUser).not.toHaveBeenCalled();
    expect(linkAccount).not.toHaveBeenCalled();
  });
});

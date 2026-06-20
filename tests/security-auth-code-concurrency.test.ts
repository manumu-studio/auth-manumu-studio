// Security tests for atomic authorization-code consumption (TASK-014).
// Verifies that the updateMany-based claim is the sole gate for code replay
// protection, that pre-claim validation rejects early without touching the
// claim write, and that token signing is never called when the claim fails.
import crypto from "crypto";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const NOW = new Date("2024-01-01T00:00:00Z");

// Shared PKCE pair (RFC 7636 example values)
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    oAuthAuthorizationCode: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/features/auth/server/oauth/clientRegistry", () => ({
  getOAuthClient: vi.fn(),
  verifyClientSecret: vi.fn(),
  assertRedirectUriAllowed: vi.fn(),
}));

// Capture the real signAccessToken so we can spy on it.
vi.mock("@/features/auth/server/oauth/jwt", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/features/auth/server/oauth/jwt")>();
  return {
    ...real,
    signAccessToken: vi.fn(real.signAccessToken),
  };
});

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://localhost/test";
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "x".repeat(32);
  process.env.AUTH_URL = "http://localhost:3000";
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env.OAUTH_JWT_PRIVATE_KEY = privateKey;
  process.env.OAUTH_JWT_PUBLIC_KEY = publicKey;
  process.env.OAUTH_JWT_KID = "test-key-1";
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  Object.keys(process.env).forEach((key) => {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidCodeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "code-1",
    code: "auth-code",
    clientId: "client-123",
    userId: "user-456",
    redirectUri: "https://app.example.com/callback",
    scopes: ["openid", "email"],
    codeChallenge: CHALLENGE,
    codeChallengeMethod: "S256",
    expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
    usedAt: null,
    nonce: null,
    ...overrides,
  };
}

function makeValidClient() {
  return { clientId: "client-123", clientSecretHash: "hash", isActive: true };
}

async function buildPostRequest(extra: Record<string, string> = {}) {
  const { POST } = await import("@/app/oauth/token/route");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: "auth-code",
    client_id: "client-123",
    client_secret: "secret",
    code_verifier: VERIFIER,
    ...extra,
  });
  return {
    POST,
    req: new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }),
  };
}

// ---------------------------------------------------------------------------
// 1. Claim returns count: 0 → invalid_grant, no token signing
// ---------------------------------------------------------------------------

describe("Atomic claim — count: 0", () => {
  it("returns invalid_grant and does NOT sign a token when updateMany returns count 0", async () => {
    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { findUnique: Mock; updateMany: Mock };
    };
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(makeValidCodeRecord());
    prismaMock.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 0 });

    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    (getOAuthClient as unknown as Mock).mockResolvedValue(makeValidClient());
    (verifyClientSecret as unknown as Mock).mockReturnValue(true);

    const { signAccessToken } = await import("@/features/auth/server/oauth/jwt");
    const signSpy = signAccessToken as unknown as Mock;

    const { POST, req } = await buildPostRequest();
    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload).toEqual({
      error: "invalid_grant",
      error_description: "Authorization code is invalid or already used.",
    });
    expect(signSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. Concurrency: two simultaneous exchanges for the same code
// ---------------------------------------------------------------------------

describe("Concurrency — two exchanges race for the same code", () => {
  it("grants exactly one token and rejects the other with invalid_grant", async () => {
    // This models atomic semantics via mock; a real-Postgres concurrency test is
    // a tracked follow-up (see docs/incidents/INCIDENT_REGISTRY.md and the follow-up
    // note at the bottom of this file). This mock does NOT claim database-level proof.
    let claimCount = 0;

    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { findUnique: Mock; updateMany: Mock };
      user: { findUnique: Mock };
    };

    // Both requests find the same unclaimed record on their initial load.
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(makeValidCodeRecord());

    // Only the first call that hits the DB with usedAt: null wins (count: 1);
    // all subsequent calls get count: 0 — same row, usedAt is now set.
    prismaMock.oAuthAuthorizationCode.updateMany.mockImplementation(() => {
      claimCount += 1;
      return Promise.resolve({ count: claimCount === 1 ? 1 : 0 });
    });

    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-456",
      email: "test@example.com",
      emailVerified: new Date(),
      name: "Test User",
      image: null,
    });

    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    (getOAuthClient as unknown as Mock).mockResolvedValue(makeValidClient());
    (verifyClientSecret as unknown as Mock).mockReturnValue(true);

    const { POST } = await import("@/app/oauth/token/route");

    function makeReq() {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code: "auth-code",
        client_id: "client-123",
        client_secret: "secret",
        code_verifier: VERIFIER,
      });
      return new Request("http://localhost/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
    }

    // Fire both exchanges concurrently.
    const [res1, res2] = await Promise.all([POST(makeReq()), POST(makeReq())]);
    const [payload1, payload2] = await Promise.all([res1.json(), res2.json()]);

    const results = [
      { status: res1.status, body: payload1 },
      { status: res2.status, body: payload2 },
    ];

    const successes = results.filter((r) => r.status === 200);
    const failures = results.filter((r) => r.status === 400);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(successes[0]?.body).toMatchObject({ token_type: "Bearer" });
    expect(failures[0]?.body).toEqual({
      error: "invalid_grant",
      error_description: "Authorization code is invalid or already used.",
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Regression: pre-claim validation rejects BEFORE updateMany is called
// ---------------------------------------------------------------------------

describe("Pre-claim validation regression", () => {
  async function setupMocks() {
    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { findUnique: Mock; updateMany: Mock };
    };
    prismaMock.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 1 });
    return { prismaMock };
  }

  it("rejects on client mismatch before claiming the code", async () => {
    const { prismaMock } = await setupMocks();
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(
      makeValidCodeRecord({ clientId: "other-client" })
    );

    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    (getOAuthClient as unknown as Mock).mockResolvedValue(makeValidClient());
    (verifyClientSecret as unknown as Mock).mockReturnValue(true);

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      client_secret: "secret",
      code_verifier: VERIFIER,
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
    expect(prismaMock.oAuthAuthorizationCode.updateMany).not.toHaveBeenCalled();
  });

  it("rejects on redirect_uri mismatch before claiming the code", async () => {
    const { prismaMock } = await setupMocks();
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(makeValidCodeRecord());

    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    (getOAuthClient as unknown as Mock).mockResolvedValue(makeValidClient());
    (verifyClientSecret as unknown as Mock).mockReturnValue(true);

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      client_secret: "secret",
      code_verifier: VERIFIER,
      redirect_uri: "https://evil.example.com/callback",
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
    expect(prismaMock.oAuthAuthorizationCode.updateMany).not.toHaveBeenCalled();
  });

  it("rejects on expiry before claiming the code", async () => {
    const { prismaMock } = await setupMocks();
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(
      makeValidCodeRecord({ expiresAt: new Date(NOW.getTime() - 1) })
    );

    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    (getOAuthClient as unknown as Mock).mockResolvedValue(makeValidClient());
    (verifyClientSecret as unknown as Mock).mockReturnValue(true);

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      client_secret: "secret",
      code_verifier: VERIFIER,
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
    expect(prismaMock.oAuthAuthorizationCode.updateMany).not.toHaveBeenCalled();
  });

  it("rejects on PKCE mismatch before claiming the code", async () => {
    const { prismaMock } = await setupMocks();
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(makeValidCodeRecord());

    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    (getOAuthClient as unknown as Mock).mockResolvedValue(makeValidClient());
    (verifyClientSecret as unknown as Mock).mockReturnValue(true);

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      client_secret: "secret",
      code_verifier: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", // wrong verifier
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
    expect(prismaMock.oAuthAuthorizationCode.updateMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Token signing never called when claim fails
// ---------------------------------------------------------------------------

describe("Token signing isolation", () => {
  it("does not call signAccessToken when updateMany returns count 0", async () => {
    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { findUnique: Mock; updateMany: Mock };
    };
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(makeValidCodeRecord());
    prismaMock.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 0 });

    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    (getOAuthClient as unknown as Mock).mockResolvedValue(makeValidClient());
    (verifyClientSecret as unknown as Mock).mockReturnValue(true);

    const { signAccessToken } = await import("@/features/auth/server/oauth/jwt");
    const signSpy = signAccessToken as unknown as Mock;

    const { POST, req } = await buildPostRequest();
    await POST(req);

    expect(signSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Follow-up: real-Postgres concurrency test
// ---------------------------------------------------------------------------
// TRACKED FOLLOW-UP: The concurrency test above models atomic updateMany semantics
// via a mock. A real-Postgres integration test is needed to provide database-level
// proof that two concurrent transactions cannot both claim the same row.
// That test requires a real isolated test database (e.g. via testcontainers or a
// CI-provisioned Neon branch) and is tracked in docs/incidents/INCIDENT_REGISTRY.md
// under INCIDENT-P001. Do NOT treat the mock above as proof of Postgres atomicity.

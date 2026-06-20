import crypto from "crypto";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const NOW = new Date("2024-01-01T00:00:00Z");

vi.mock("@/lib/prisma", () => ({
  prisma: {
    oAuthAuthorizationCode: {
      findUnique: vi.fn(),
      // updateMany is the atomic claim used since TASK-014; update is no longer called.
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

describe("OAuth /oauth/token", () => {
  it("exchanges a valid code for a JWT access token (confidential client with S256 PKCE)", async () => {
    // S256 PKCE is now mandatory even for confidential clients.
    // verifier: dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
    // challenge: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM (SHA-256 base64url of verifier)
    const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { findUnique: Mock; updateMany: Mock };
      user: { findUnique: Mock };
    };
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-456",
      email: "test@example.com",
      emailVerified: new Date(),
      name: "Test User",
      image: null,
    });
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue({
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
    });
    // Atomic claim succeeds (count: 1 → first and only successful claimant).
    prismaMock.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 1 });

    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    const getClientMock = getOAuthClient as unknown as Mock;
    const verifySecretMock = verifyClientSecret as unknown as Mock;
    getClientMock.mockResolvedValue({
      clientId: "client-123",
      clientSecretHash: "hash",
      isActive: true,
    });
    verifySecretMock.mockReturnValue(true);

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

    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      token_type: "Bearer",
      scope: "openid email",
      expires_in: 3600,
    });
    expect(payload.access_token).toEqual(expect.any(String));

    const [, encodedPayload] = payload.access_token.split(".");
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );
    expect(decoded).toMatchObject({
      iss: "http://localhost:3000",
      aud: "client-123",
      sub: "user-456",
      scope: "openid email",
    });
    expect(decoded.exp).toBe(Math.floor(NOW.getTime() / 1000) + 3600);
  });

  it("rejects invalid client secrets", async () => {
    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { findUnique: Mock };
    };
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue({
      id: "code-1",
      code: "auth-code",
      clientId: "client-123",
      userId: "user-456",
      redirectUri: "https://app.example.com/callback",
      scopes: ["openid"],
      codeChallenge: null,
      codeChallengeMethod: null,
      expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
      usedAt: null,
    });

    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    const getClientMock = getOAuthClient as unknown as Mock;
    const verifySecretMock = verifyClientSecret as unknown as Mock;
    getClientMock.mockResolvedValue({
      clientId: "client-123",
      clientSecretHash: "hash",
      isActive: true,
    });
    verifySecretMock.mockReturnValue(false);

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      client_secret: "wrong",
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(401);
    expect(payload).toEqual({
      error: "invalid_client",
      error_description: "Client authentication failed.",
    });
  });

  it("rejects a mismatched S256 verifier for public clients", async () => {
    // S256 PKCE is mandatory. A wrong verifier (valid shape but wrong value) must
    // be rejected with code_verifier mismatch, not accepted.
    // verifier: dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
    // challenge: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM (SHA-256 base64url of verifier)
    const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    const WRONG_VERIFIER = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { findUnique: Mock };
    };
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue({
      id: "code-1",
      code: "auth-code",
      clientId: "client-123",
      userId: "user-456",
      redirectUri: "https://app.example.com/callback",
      scopes: ["openid"],
      codeChallenge: CHALLENGE,
      codeChallengeMethod: "S256",
      expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
      usedAt: null,
    });

    const { getOAuthClient } = await import("@/features/auth/server/oauth/clientRegistry");
    const getClientMock = getOAuthClient as unknown as Mock;
    getClientMock.mockResolvedValue({
      clientId: "client-123",
      clientSecretHash: "hash",
      isActive: true,
    });

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      code_verifier: WRONG_VERIFIER,
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload).toEqual({
      error: "invalid_grant",
      error_description: "code_verifier mismatch.",
    });
  });

  it("rejects a replay (already-used) code via atomic claim returning count: 0", async () => {
    // Since TASK-014, the read-side usedAt guard is removed. A replayed code is
    // detected by the atomic updateMany returning count: 0 (another request already
    // claimed usedAt or the code expired). The code record can have any usedAt value
    // from findUnique — the claim write is the authoritative gate.
    const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { findUnique: Mock; updateMany: Mock };
    };
    // findUnique returns a structurally valid (not yet expired) record;
    // the "already used" reality is reflected in updateMany returning count: 0.
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue({
      id: "code-1",
      code: "auth-code",
      clientId: "client-123",
      userId: "user-456",
      redirectUri: "https://app.example.com/callback",
      scopes: ["openid"],
      codeChallenge: CHALLENGE,
      codeChallengeMethod: "S256",
      expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
      usedAt: null,
      nonce: null,
    });
    // Atomic claim fails — another request already claimed the code.
    prismaMock.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 0 });

    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    const getClientMock = getOAuthClient as unknown as Mock;
    const verifySecretMock = verifyClientSecret as unknown as Mock;
    getClientMock.mockResolvedValue({
      clientId: "client-123",
      clientSecretHash: "hash",
      isActive: true,
    });
    verifySecretMock.mockReturnValue(true);

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
    expect(payload).toEqual({
      error: "invalid_grant",
      error_description: "Authorization code is invalid or already used.",
    });
  });
});

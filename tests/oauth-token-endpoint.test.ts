import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const NOW = new Date("2024-01-01T00:00:00Z");

vi.mock("@/lib/prisma", () => ({
  prisma: {
    oAuthAuthorizationCode: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
  it("exchanges a valid code for a JWT access token (confidential client)", async () => {
    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { findUnique: Mock; update: Mock };
    };
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue({
      id: "code-1",
      code: "auth-code",
      clientId: "client-123",
      userId: "user-456",
      redirectUri: "https://app.example.com/callback",
      scopes: ["openid", "email"],
      codeChallenge: null,
      codeChallengeMethod: null,
      expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
      usedAt: null,
    });
    prismaMock.oAuthAuthorizationCode.update.mockResolvedValue({});

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

  it("rejects missing or invalid PKCE verifier for public clients", async () => {
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
      codeChallenge: "expected",
      codeChallengeMethod: "plain",
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
      code_verifier: "wrong",
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

  it("rejects already used authorization codes", async () => {
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
      usedAt: new Date(NOW.getTime() - 1000),
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
    verifySecretMock.mockReturnValue(true);

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      client_secret: "secret",
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
      error_description: "Authorization code already used.",
    });
  });
});

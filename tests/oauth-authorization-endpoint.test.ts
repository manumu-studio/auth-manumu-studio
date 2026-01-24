import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

const ORIGINAL_ENV = { ...process.env };

vi.mock("@/lib/prisma", () => ({
  prisma: {
    oAuthAuthorizationCode: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/features/auth/server/oauth", () => ({
  assertRedirectUriAllowed: vi.fn(),
  getOAuthClient: vi.fn(),
}));

vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn(() => Buffer.from("a".repeat(32))),
  },
}));

const NOW = new Date("2024-01-01T00:00:00Z");

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://localhost/test";
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "x".repeat(32);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();

  Object.keys(process.env).forEach((key) => {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("OAuth authorization code storage", () => {
  it("creates an authorization code with expiry", async () => {
    const { createAuthorizationCode } = await import(
      "@/features/auth/server/oauth/authorization"
    );
    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { create: Mock };
    };

    await createAuthorizationCode({
      clientId: "client-123",
      userId: "user-456",
      redirectUri: "https://app.example.com/callback",
      scopes: ["openid", "email"],
      codeChallenge: "challenge",
      codeChallengeMethod: "S256",
    });

    const expectedCode = Buffer.from("a".repeat(32)).toString("base64url");
    const expectedExpires = new Date(NOW.getTime() + 10 * 60 * 1000);

    expect(prismaMock.oAuthAuthorizationCode.create).toHaveBeenCalledWith({
      data: {
        code: expectedCode,
        clientId: "client-123",
        userId: "user-456",
        redirectUri: "https://app.example.com/callback",
        scopes: ["openid", "email"],
        codeChallenge: "challenge",
        codeChallengeMethod: "S256",
        expiresAt: expectedExpires,
      },
    });
  });
});

describe("OAuth /authorize validation", () => {
  it("rejects unknown clients", async () => {
    const { getOAuthClient } = await import("@/features/auth/server/oauth");
    const getClientMock = getOAuthClient as unknown as Mock;
    getClientMock.mockResolvedValue(null);

    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "missing",
      response_type: "code",
    });

    expect(result).toEqual({
      ok: false,
      error: "unauthorized_client",
      description: "Client is not authorized.",
    });
  });

  it("rejects invalid redirect URIs", async () => {
    const { getOAuthClient, assertRedirectUriAllowed } = await import(
      "@/features/auth/server/oauth"
    );
    const getClientMock = getOAuthClient as unknown as Mock;
    const assertRedirectMock = assertRedirectUriAllowed as unknown as Mock;

    getClientMock.mockResolvedValue({
      clientId: "client-123",
      isActive: true,
      redirectUris: ["https://app.example.com/callback"],
      scopes: ["openid", "email"],
    });
    assertRedirectMock.mockImplementation(() => {
      throw new Error("Redirect URI is not registered for this client");
    });

    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      redirect_uri: "https://evil.example.com/callback",
      response_type: "code",
    });

    expect(result).toEqual({
      ok: false,
      error: "invalid_request",
      description: "Redirect URI is not registered for this client",
    });
  });

  it("rejects scopes not allowed for the client", async () => {
    const { getOAuthClient, assertRedirectUriAllowed } = await import(
      "@/features/auth/server/oauth"
    );
    const getClientMock = getOAuthClient as unknown as Mock;
    const assertRedirectMock = assertRedirectUriAllowed as unknown as Mock;

    getClientMock.mockResolvedValue({
      clientId: "client-123",
      isActive: true,
      redirectUris: ["https://app.example.com/callback"],
      scopes: ["openid"],
    });
    assertRedirectMock.mockImplementation(() => undefined);

    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      redirect_uri: "https://app.example.com/callback",
      response_type: "code",
      scope: "openid email",
      state: "abc123",
    });

    expect(result).toEqual({
      ok: false,
      error: "invalid_scope",
      description: "Scope email is not allowed for this client.",
      redirectUri: "https://app.example.com/callback",
      state: "abc123",
    });
  });

  it("accepts valid requests and defaults redirect_uri", async () => {
    const { getOAuthClient, assertRedirectUriAllowed } = await import(
      "@/features/auth/server/oauth"
    );
    const getClientMock = getOAuthClient as unknown as Mock;
    const assertRedirectMock = assertRedirectUriAllowed as unknown as Mock;

    getClientMock.mockResolvedValue({
      clientId: "client-123",
      isActive: true,
      redirectUris: ["https://app.example.com/callback"],
      scopes: ["openid", "email", "profile"],
    });
    assertRedirectMock.mockImplementation(() => undefined);

    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      response_type: "code",
      scope: "openid email",
      code_challenge: "challenge",
    });

    expect(result).toEqual({
      ok: true,
      client: expect.objectContaining({ clientId: "client-123" }),
      redirectUri: "https://app.example.com/callback",
      scopes: ["openid", "email"],
      state: undefined,
      codeChallenge: "challenge",
      codeChallengeMethod: "plain",
    });
  });

  it("rejects unsupported code_challenge_method values", async () => {
    const { getOAuthClient, assertRedirectUriAllowed } = await import(
      "@/features/auth/server/oauth"
    );
    const getClientMock = getOAuthClient as unknown as Mock;
    const assertRedirectMock = assertRedirectUriAllowed as unknown as Mock;

    getClientMock.mockResolvedValue({
      clientId: "client-123",
      isActive: true,
      redirectUris: ["https://app.example.com/callback"],
      scopes: ["openid"],
    });
    assertRedirectMock.mockImplementation(() => undefined);

    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      redirect_uri: "https://app.example.com/callback",
      response_type: "code",
      scope: "openid",
      code_challenge: "challenge",
      code_challenge_method: "S512",
      state: "state-1",
    });

    expect(result).toEqual({
      ok: false,
      error: "invalid_request",
      description: "code_challenge_method must be S256 or plain.",
      redirectUri: "https://app.example.com/callback",
      state: "state-1",
    });
  });

  it("defaults scope to openid when omitted", async () => {
    const { getOAuthClient, assertRedirectUriAllowed } = await import(
      "@/features/auth/server/oauth"
    );
    const getClientMock = getOAuthClient as unknown as Mock;
    const assertRedirectMock = assertRedirectUriAllowed as unknown as Mock;

    getClientMock.mockResolvedValue({
      clientId: "client-123",
      isActive: true,
      redirectUris: ["https://app.example.com/callback"],
      scopes: ["openid"],
    });
    assertRedirectMock.mockImplementation(() => undefined);

    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      redirect_uri: "https://app.example.com/callback",
      response_type: "code",
    });

    expect(result).toEqual({
      ok: true,
      client: expect.objectContaining({ clientId: "client-123" }),
      redirectUri: "https://app.example.com/callback",
      scopes: ["openid"],
      state: undefined,
      codeChallenge: undefined,
      codeChallengeMethod: undefined,
    });
  });
});

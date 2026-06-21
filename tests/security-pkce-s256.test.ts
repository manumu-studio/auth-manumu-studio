// Tests for mandatory S256 PKCE enforcement at authorization and token exchange boundaries.
import crypto from "crypto";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// Pre-computed PKCE test fixtures (RFC 7636 compliant)
// verifier: 43 unreserved chars; challenge: SHA-256 then base64url, no padding
// ---------------------------------------------------------------------------
const VALID_VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const VALID_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"; // S256 of VALID_VERIFIER
const WRONG_VERIFIER = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
// WRONG_VERIFIER produces a different challenge, so it won't match VALID_CHALLENGE

const ORIGINAL_ENV = { ...process.env };

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/prisma", () => ({
  prisma: {
    oAuthAuthorizationCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      // updateMany is the atomic claim used since TASK-014; update is no longer called.
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/features/auth/server/oauth", () => ({
  assertRedirectUriAllowed: vi.fn(),
  getOAuthClient: vi.fn(),
}));

vi.mock("@/features/auth/server/oauth/clientRegistry", () => ({
  getOAuthClient: vi.fn(),
  verifyClientSecret: vi.fn(),
  assertRedirectUriAllowed: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const NOW = new Date("2024-01-01T00:00:00Z");

function seedKeys(): void {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env.OAUTH_JWT_PRIVATE_KEY = privateKey;
  process.env.OAUTH_JWT_PUBLIC_KEY = publicKey;
  process.env.OAUTH_JWT_KID = "test-key-pkce";
}

function makeCodeRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "code-1",
    code: "auth-code",
    clientId: "client-123",
    userId: "user-456",
    redirectUri: "https://app.example.com/callback",
    scopes: ["openid", "email"],
    codeChallenge: VALID_CHALLENGE,
    codeChallengeMethod: "S256",
    expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
    usedAt: null,
    nonce: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://localhost/test";
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "x".repeat(32);
  process.env.AUTH_URL = "http://localhost:3000";
  seedKeys();
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
// PKCE utility unit tests
// ---------------------------------------------------------------------------
describe("pkce utilities", () => {
  it("isValidPkceValue accepts min-length (43 chars) valid verifier", async () => {
    const { isValidPkceValue } = await import("@/features/auth/server/oauth/pkce");
    expect(isValidPkceValue(VALID_VERIFIER)).toBe(true);
  });

  it("isValidPkceValue rejects a 42-char string (too short)", async () => {
    const { isValidPkceValue } = await import("@/features/auth/server/oauth/pkce");
    expect(isValidPkceValue("a".repeat(42))).toBe(false);
  });

  it("isValidPkceValue rejects a 129-char string (too long)", async () => {
    const { isValidPkceValue } = await import("@/features/auth/server/oauth/pkce");
    expect(isValidPkceValue("a".repeat(129))).toBe(false);
  });

  it("isValidPkceValue rejects strings with forbidden characters", async () => {
    const { isValidPkceValue } = await import("@/features/auth/server/oauth/pkce");
    // Base64 '+' and '/' are forbidden; only base64url unreserved chars allowed
    const bad = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa+/";
    expect(isValidPkceValue(bad)).toBe(false);
  });

  it("computeS256Challenge produces expected base64url challenge", async () => {
    const { computeS256Challenge } = await import("@/features/auth/server/oauth/pkce");
    expect(computeS256Challenge(VALID_VERIFIER)).toBe(VALID_CHALLENGE);
  });

  it("pkceChallengeMatches returns true for a correct verifier", async () => {
    const { pkceChallengeMatches } = await import("@/features/auth/server/oauth/pkce");
    expect(pkceChallengeMatches(VALID_VERIFIER, VALID_CHALLENGE)).toBe(true);
  });

  it("pkceChallengeMatches returns false for a wrong verifier", async () => {
    const { pkceChallengeMatches } = await import("@/features/auth/server/oauth/pkce");
    expect(pkceChallengeMatches(WRONG_VERIFIER, VALID_CHALLENGE)).toBe(false);
  });

  it("pkceChallengeMatches returns false (not throw) when lengths differ", async () => {
    const { pkceChallengeMatches } = await import("@/features/auth/server/oauth/pkce");
    // A truncated challenge will differ in length from the computed one
    expect(pkceChallengeMatches(VALID_VERIFIER, VALID_CHALLENGE.slice(0, 10))).toBe(false);
  });

  it("pkceChallengeMatches returns false for a malformed verifier", async () => {
    const { pkceChallengeMatches } = await import("@/features/auth/server/oauth/pkce");
    expect(pkceChallengeMatches("too-short", VALID_CHALLENGE)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Authorization boundary — validateAuthorizeRequest
// ---------------------------------------------------------------------------
describe("validateAuthorizeRequest — PKCE enforcement", () => {
  async function setupValidClient(): Promise<void> {
    const { getOAuthClient, assertRedirectUriAllowed } = await import(
      "@/features/auth/server/oauth"
    );
    (getOAuthClient as unknown as Mock).mockResolvedValue({
      clientId: "client-123",
      isActive: true,
      redirectUris: ["https://app.example.com/callback"],
      scopes: ["openid", "email", "profile"],
    });
    (assertRedirectUriAllowed as unknown as Mock).mockImplementation(() => undefined);
  }

  it("rejects when code_challenge is missing", async () => {
    await setupValidClient();
    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      redirect_uri: "https://app.example.com/callback",
      response_type: "code",
      scope: "openid",
    });

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_request",
      description: "code_challenge is required.",
    });
  });

  it("rejects when code_challenge_method is 'plain'", async () => {
    await setupValidClient();
    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      redirect_uri: "https://app.example.com/callback",
      response_type: "code",
      scope: "openid",
      code_challenge: VALID_CHALLENGE,
      code_challenge_method: "plain",
    });

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_request",
      description: "code_challenge_method must be S256.",
    });
  });

  it("rejects when code_challenge_method is an unsupported value", async () => {
    await setupValidClient();
    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      redirect_uri: "https://app.example.com/callback",
      response_type: "code",
      scope: "openid",
      code_challenge: VALID_CHALLENGE,
      code_challenge_method: "S512",
    });

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_request",
      description: "code_challenge_method must be S256.",
    });
  });

  it("rejects when code_challenge_method is omitted (no defaulting)", async () => {
    await setupValidClient();
    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      redirect_uri: "https://app.example.com/callback",
      response_type: "code",
      scope: "openid",
      code_challenge: VALID_CHALLENGE,
      // no code_challenge_method
    });

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_request",
      description: "code_challenge_method must be S256.",
    });
  });

  it("rejects when code_challenge is malformed (fails RFC 7636 pattern)", async () => {
    await setupValidClient();
    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      redirect_uri: "https://app.example.com/callback",
      response_type: "code",
      scope: "openid",
      code_challenge: "too-short!!", // < 43 chars and has '!'
      code_challenge_method: "S256",
    });

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_request",
      description: "code_challenge is malformed.",
    });
  });

  it("accepts a valid S256 request and returns S256 method", async () => {
    await setupValidClient();
    const { validateAuthorizeRequest } = await import(
      "@/features/auth/server/oauth/authorizeRequest"
    );

    const result = await validateAuthorizeRequest({
      client_id: "client-123",
      redirect_uri: "https://app.example.com/callback",
      response_type: "code",
      scope: "openid email",
      code_challenge: VALID_CHALLENGE,
      code_challenge_method: "S256",
      state: "state-xyz",
    });

    expect(result).toMatchObject({
      ok: true,
      codeChallenge: VALID_CHALLENGE,
      codeChallengeMethod: "S256",
      state: "state-xyz",
    });
  });
});

// ---------------------------------------------------------------------------
// Token exchange boundary — exchangeAuthorizationCode (via /oauth/token route)
// ---------------------------------------------------------------------------
describe("token exchange — PKCE enforcement", () => {
  async function setupClient(overrides: Record<string, unknown> = {}): Promise<void> {
    const { getOAuthClient, verifyClientSecret } = await import(
      "@/features/auth/server/oauth/clientRegistry"
    );
    (getOAuthClient as unknown as Mock).mockResolvedValue({
      clientId: "client-123",
      clientSecretHash: "hash",
      isActive: true,
      ...overrides,
    });
    (verifyClientSecret as unknown as Mock).mockReturnValue(true);
  }

  async function setupPrisma(codeRecord: Record<string, unknown>): Promise<void> {
    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as {
      oAuthAuthorizationCode: { findUnique: Mock; updateMany: Mock };
      user: { findUnique: Mock };
    };
    prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(codeRecord);
    // Atomic claim succeeds (count: 1) for all happy-path PKCE tests.
    prismaMock.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-456",
      email: "test@example.com",
      emailVerified: new Date(),
      name: "Test User",
      image: null,
      status: "ACTIVE",
    });
  }

  async function postToken(params: Record<string, string>): Promise<Response> {
    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams(params);
    return POST(
      new Request("http://localhost/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      })
    );
  }

  it("rejects when stored code has no codeChallenge (legacy/challenge-less record)", async () => {
    await setupClient();
    await setupPrisma(makeCodeRecord({ codeChallenge: null, codeChallengeMethod: null }));

    const res = await postToken({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      code_verifier: VALID_VERIFIER,
    });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
  });

  it("rejects when stored codeChallengeMethod is not S256 (e.g. plain)", async () => {
    await setupClient();
    await setupPrisma(
      makeCodeRecord({ codeChallenge: VALID_VERIFIER, codeChallengeMethod: "plain" })
    );

    const res = await postToken({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      code_verifier: VALID_VERIFIER,
    });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
    expect(payload.error_description).toMatch(/S256/);
  });

  it("rejects when code_verifier is missing", async () => {
    await setupClient();
    await setupPrisma(makeCodeRecord());

    const res = await postToken({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
    });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
    expect(payload.error_description).toBe("code_verifier is required.");
  });

  it("rejects when code_verifier is malformed (too short / bad chars)", async () => {
    await setupClient();
    await setupPrisma(makeCodeRecord());

    const res = await postToken({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      code_verifier: "too-short",
    });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
    expect(payload.error_description).toBe("code_verifier is malformed.");
  });

  it("rejects when code_verifier does not match the stored S256 challenge", async () => {
    await setupClient();
    await setupPrisma(makeCodeRecord());

    const res = await postToken({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      code_verifier: WRONG_VERIFIER,
    });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
    expect(payload.error_description).toBe("code_verifier mismatch.");
  });

  it("rejects a confidential client that authenticates but omits PKCE verifier", async () => {
    await setupClient();
    await setupPrisma(makeCodeRecord());

    const res = await postToken({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      client_secret: "correct-secret",
      // no code_verifier
    });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
    expect(payload.error_description).toBe("code_verifier is required.");
  });

  it("rejects a confidential client that sends a wrong verifier even with valid secret", async () => {
    await setupClient();
    await setupPrisma(makeCodeRecord());

    const res = await postToken({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      client_secret: "correct-secret",
      code_verifier: WRONG_VERIFIER,
    });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
    expect(payload.error_description).toBe("code_verifier mismatch.");
  });

  it("succeeds for a valid S256 exchange (public client)", async () => {
    await setupClient();
    await setupPrisma(makeCodeRecord());

    const res = await postToken({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      code_verifier: VALID_VERIFIER,
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      token_type: "Bearer",
      scope: "openid email",
      expires_in: 3600,
    });
    expect(typeof payload.access_token).toBe("string");
  });

  it("succeeds for a valid S256 exchange with a confidential client (secret + PKCE)", async () => {
    await setupClient();
    await setupPrisma(makeCodeRecord());

    const res = await postToken({
      grant_type: "authorization_code",
      code: "auth-code",
      client_id: "client-123",
      client_secret: "correct-secret",
      code_verifier: VALID_VERIFIER,
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      token_type: "Bearer",
      scope: "openid email",
    });
  });
});

// ---------------------------------------------------------------------------
// Discovery metadata
// ---------------------------------------------------------------------------
describe("OIDC discovery — code_challenge_methods_supported", () => {
  it("advertises only S256 (not plain)", async () => {
    const { GET } = await import("@/app/.well-known/openid-configuration/route");
    const res = await GET();
    const payload = await res.json();

    expect(payload.code_challenge_methods_supported).toEqual(["S256"]);
    expect(payload.code_challenge_methods_supported).not.toContain("plain");
  });
});

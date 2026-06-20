// tests/security-oauth-rate-limits.test.ts
// Security tests for OAuth rate limiting: token endpoint (IP + client buckets)
// and userinfo endpoint (IP + token-fingerprint buckets).
import crypto from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

// --- Helpers ---

function makePassResult(_policy: string) {
  return { success: true, limit: 100, remaining: 99, reset: Date.now() + 60_000 };
}

function makeFailResult() {
  return { success: false, limit: 100, remaining: 0, reset: Date.now() + 30_000 };
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

// --- Mocks ---

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(),
  buildRateLimitKey: vi.fn(),
  memoryStore: new Map(),
  memoryLimit: vi.fn(),
}));

vi.mock("@/features/auth/server/oauth/token", () => ({
  exchangeAuthorizationCode: vi.fn(),
}));

vi.mock("@/features/auth/server/oauth/jwt", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/features/auth/server/oauth/claims", () => ({
  getUserClaims: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    oAuthAuthorizationCode: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

// --- Setup ---

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
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
  vi.clearAllMocks();
  Object.keys(process.env).forEach((key) => {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
});

// --- Token endpoint tests ---

describe("/oauth/token rate limiting", () => {

  it("1. IP bucket fires before body is parsed", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("1.2.3.4");
    // IP limit rejects immediately
    (rateLimit as Mock).mockResolvedValueOnce(makeFailResult());

    const { POST } = await import("@/app/oauth/token/route");
    // Send completely malformed body — if rate limit fires first, we never parse it
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "NOT JSON AT ALL",
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    // rateLimit was called exactly once (IP bucket) — body parse never happened
    expect((rateLimit as Mock).mock.calls).toHaveLength(1);
  });

  it("2. Valid Basic auth header is Base64-decoded before use", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("1.2.3.4");
    // Allow both rate limits
    (rateLimit as Mock).mockResolvedValue(makePassResult("any"));

    const { exchangeAuthorizationCode } = await import("@/features/auth/server/oauth/token");
    (exchangeAuthorizationCode as Mock).mockResolvedValue({
      ok: false, error: "invalid_grant", description: "bad code", status: 400,
    });

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "some-code",
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: basicAuthHeader("my-client", "my-secret"),
      },
      body,
    });

    await POST(req);

    // The second rateLimit call (client bucket) must use the decoded client id
    const calls = (rateLimit as Mock).mock.calls;
    expect(calls).toHaveLength(2);
    const clientBucketKey = calls[1]?.[0] as string;
    expect(clientBucketKey).toContain("my-client");
    expect(clientBucketKey).not.toContain("my-secret");
  });

  it("3. Malformed Basic auth header does not throw or 500", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("1.2.3.4");
    (rateLimit as Mock).mockResolvedValue(makePassResult("any"));

    const { exchangeAuthorizationCode } = await import("@/features/auth/server/oauth/token");
    (exchangeAuthorizationCode as Mock).mockResolvedValue({
      ok: false, error: "invalid_client", description: "bad", status: 401,
    });

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "some-code",
      client_id: "fallback-client",
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        // Invalid Base64 in authorization header
        authorization: "Basic !!!not-valid-base64!!!",
      },
      body,
    });

    const res = await POST(req);
    // Must NOT be 500 — malformed Basic auth is silently ignored, fallback to body clientId
    expect(res.status).not.toBe(500);
  });

  it("4. Client secret never appears in any rate-limit key", async () => {
    const SECRET = "super-secret-value-xyz";
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("1.2.3.4");
    (rateLimit as Mock).mockResolvedValue(makePassResult("any"));

    const { exchangeAuthorizationCode } = await import("@/features/auth/server/oauth/token");
    (exchangeAuthorizationCode as Mock).mockResolvedValue({
      ok: false, error: "invalid_grant", description: "bad", status: 400,
    });

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "some-code",
      client_id: "client-abc",
      client_secret: SECRET,
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    await POST(req);

    const allKeys = (rateLimit as Mock).mock.calls.map((call) => String(call[0]));
    for (const key of allKeys) {
      expect(key).not.toContain(SECRET);
    }
  });

  it("5. IP and client buckets are independent — client bucket can reject independently", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("1.2.3.4");
    // IP passes, client rejects
    (rateLimit as Mock)
      .mockResolvedValueOnce(makePassResult("ip"))
      .mockResolvedValueOnce(makeFailResult());

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "some-code",
      client_id: "client-abc",
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    // Both limits were called — they are independent
    expect((rateLimit as Mock).mock.calls).toHaveLength(2);
  });

  it("6. Token response success includes Cache-Control: no-store and Pragma: no-cache", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("1.2.3.4");
    (rateLimit as Mock).mockResolvedValue(makePassResult("any"));

    const { exchangeAuthorizationCode } = await import("@/features/auth/server/oauth/token");
    (exchangeAuthorizationCode as Mock).mockResolvedValue({
      ok: true,
      accessToken: "token.abc.def",
      tokenType: "Bearer",
      expiresIn: 3600,
      scope: "openid",
      idToken: undefined,
    });

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "valid-code",
      client_id: "client-abc",
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("pragma")).toBe("no-cache");
  });

  it("7. Token error response also includes no-store headers", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("1.2.3.4");
    (rateLimit as Mock).mockResolvedValue(makePassResult("any"));

    const { exchangeAuthorizationCode } = await import("@/features/auth/server/oauth/token");
    (exchangeAuthorizationCode as Mock).mockResolvedValue({
      ok: false, error: "invalid_grant", description: "bad code", status: 400,
    });

    const { POST } = await import("@/app/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: "bad-code",
      client_id: "client-abc",
    });
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("pragma")).toBe("no-cache");
  });

  it("8. 429 response includes Retry-After >= 1", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("1.2.3.4");
    (rateLimit as Mock).mockResolvedValueOnce(makeFailResult());

    const { POST } = await import("@/app/oauth/token/route");
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const retryAfter = Number(res.headers.get("retry-after"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("9. Malformed JSON body returns generic invalid_request (not 500)", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("1.2.3.4");
    // IP limit passes
    (rateLimit as Mock).mockResolvedValue(makePassResult("any"));

    const { POST } = await import("@/app/oauth/token/route");
    const req = new Request("http://localhost/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{{{not valid json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const payload = await res.json() as { error: string };
    expect(payload.error).toBe("invalid_request");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

// --- UserInfo endpoint tests ---

describe("/oauth/userinfo rate limiting", () => {

  it("10. Bearer key is SHA-256 fingerprint only — not raw token or prefix", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("2.2.2.2");
    (rateLimit as Mock).mockResolvedValue(makePassResult("any"));

    const { verifyAccessToken } = await import("@/features/auth/server/oauth/jwt");
    const { getUserClaims } = await import("@/features/auth/server/oauth/claims");
    (verifyAccessToken as Mock).mockReturnValue({ sub: "user-1", scope: "openid" });
    (getUserClaims as Mock).mockResolvedValue({ sub: "user-1" });

    const { GET } = await import("@/app/oauth/userinfo/route");
    const TOKEN = "eyJrawToken.that.should.never.appear.in.any.key";
    const req = new Request("http://localhost/oauth/userinfo", {
      headers: { authorization: `Bearer ${TOKEN}`, "x-forwarded-for": "2.2.2.2" },
    });

    await GET(req);

    const calls = (rateLimit as Mock).mock.calls;
    expect(calls).toHaveLength(2);
    const tokenBucketKey = calls[1]?.[0] as string;

    // Must NOT contain the raw token
    expect(tokenBucketKey).not.toContain(TOKEN);
    // Must contain a 64-char hex SHA-256 hash
    const hashMatch = tokenBucketKey.match(/[0-9a-f]{64}/);
    expect(hashMatch).not.toBeNull();

    // Verify hash matches expected
    const expectedHash = crypto.createHash("sha256").update(TOKEN).digest("hex");
    expect(tokenBucketKey).toContain(expectedHash);
  });

  it("11. UserInfo IP and token buckets are independent — token bucket can reject", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("2.2.2.2");
    // IP passes, token rejects
    (rateLimit as Mock)
      .mockResolvedValueOnce(makePassResult("ip"))
      .mockResolvedValueOnce(makeFailResult());

    const { GET } = await import("@/app/oauth/userinfo/route");
    const req = new Request("http://localhost/oauth/userinfo", {
      headers: { authorization: "Bearer valid.token.here" },
    });

    const res = await GET(req);
    expect(res.status).toBe(429);
    expect((rateLimit as Mock).mock.calls).toHaveLength(2);
  });

  it("12. UserInfo 429 has Retry-After >= 1", async () => {
    const { rateLimit, getClientIp } = await import("@/lib/rateLimit");
    (getClientIp as Mock).mockReturnValue("2.2.2.2");
    (rateLimit as Mock).mockResolvedValueOnce(makeFailResult());

    const { GET } = await import("@/app/oauth/userinfo/route");
    const req = new Request("http://localhost/oauth/userinfo", {
      headers: { authorization: "Bearer some.token" },
    });

    const res = await GET(req);
    expect(res.status).toBe(429);
    const retryAfter = Number(res.headers.get("retry-after"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
  });
});

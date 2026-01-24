import crypto from "crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const ISSUER = "http://localhost:3000";

function seedKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env.OAUTH_JWT_PRIVATE_KEY = privateKey;
  process.env.OAUTH_JWT_PUBLIC_KEY = publicKey;
  process.env.OAUTH_JWT_KID = "jwks-test-key";
}

beforeEach(() => {
  vi.resetModules();
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://localhost/test";
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "x".repeat(32);
  process.env.AUTH_URL = ISSUER;
  seedKeys();
});

afterEach(() => {
  vi.clearAllMocks();
  Object.keys(process.env).forEach((key) => {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("JWKS + OIDC discovery", () => {
  it("exposes JWKS that verifies access tokens", async () => {
    const { signAccessToken } = await import("@/features/auth/server/oauth/jwt");
    const { GET } = await import("@/app/jwks.json/route");
    const token = signAccessToken({
      iss: ISSUER,
      aud: "client-123",
      sub: "user-456",
      exp: Math.floor(Date.now() / 1000) + 60,
      scope: "openid email",
    });

    const res = await GET();
    const payload = await res.json();
    const jwk = payload.keys[0];
    const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });

    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedSignature) {
      throw new Error("Missing JWT signature segment");
    }
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const verified = crypto.verify(
      "RSA-SHA256",
      Buffer.from(signingInput),
      publicKey,
      Buffer.from(encodedSignature, "base64url")
    );

    expect(res.status).toBe(200);
    expect(jwk.kid).toBe("jwks-test-key");
    expect(verified).toBe(true);
  });

  it("does not expose private key material in JWKS", async () => {
    const { GET } = await import("@/app/jwks.json/route");
    const res = await GET();
    const payload = await res.json();
    const jwk = payload.keys[0];

    expect(jwk.d).toBeUndefined();
    expect(jwk.p).toBeUndefined();
    expect(jwk.q).toBeUndefined();
  });

  it("returns 500 when public key is missing", async () => {
    process.env.OAUTH_JWT_PUBLIC_KEY = "";
    vi.resetModules();

    const { GET } = await import("@/app/jwks.json/route");
    const res = await GET();
    const payload = await res.json();

    expect(res.status).toBe(500);
    expect(payload).toEqual({ error: "jwks_unavailable" });
  });

  it("returns 500 when public key is invalid", async () => {
    process.env.OAUTH_JWT_PUBLIC_KEY = "invalid-key";
    vi.resetModules();

    const { GET } = await import("@/app/jwks.json/route");
    const res = await GET();
    const payload = await res.json();

    expect(res.status).toBe(500);
    expect(payload).toEqual({ error: "jwks_unavailable" });
  });

  it("serves OIDC discovery metadata with issuer + endpoints", async () => {
    const { GET } = await import("@/app/.well-known/openid-configuration/route");
    const res = await GET();
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      issuer: ISSUER,
      jwks_uri: `${ISSUER}/jwks.json`,
      authorization_endpoint: `${ISSUER}/oauth/authorize`,
      token_endpoint: `${ISSUER}/oauth/token`,
    });
  });
});

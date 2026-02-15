import crypto from "crypto";
import { env } from "@/lib/env";

const JWT_ALG = "RS256";
const JWT_USE = "sig";

type JsonWebKeyWithMeta = JsonWebKey & {
  kid: string;
  alg: string;
  use: string;
};

function toBase64Url(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer.toString("base64url");
}

function requireEnv(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`${label} is not configured`);
  }
  return value;
}

function computeKeyId(publicKeyPem: string): string {
  return crypto.createHash("sha256").update(publicKeyPem).digest("base64url");
}

function resolveKeyId(publicKeyPem: string): string {
  return env.OAUTH_JWT_KID ?? computeKeyId(publicKeyPem);
}

export function getPublicJwk(): JsonWebKeyWithMeta {
  const publicKeyPem = requireEnv(env.OAUTH_JWT_PUBLIC_KEY, "OAUTH_JWT_PUBLIC_KEY");
  const keyObject = crypto.createPublicKey(publicKeyPem);
  const jwk = keyObject.export({ format: "jwk" }) as JsonWebKey;
  const kid = resolveKeyId(publicKeyPem);

  return {
    ...jwk,
    kid,
    alg: JWT_ALG,
    use: JWT_USE,
  };
}

export function getJwks(): { keys: JsonWebKeyWithMeta[] } {
  return { keys: [getPublicJwk()] };
}

export function signAccessToken(payload: Record<string, unknown>): string {
  const privateKeyPem = requireEnv(env.OAUTH_JWT_PRIVATE_KEY, "OAUTH_JWT_PRIVATE_KEY");
  const publicKeyPem = requireEnv(env.OAUTH_JWT_PUBLIC_KEY, "OAUTH_JWT_PUBLIC_KEY");
  const kid = resolveKeyId(publicKeyPem);

  const header = { alg: JWT_ALG, typ: "JWT", kid };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKeyPem);

  return `${signingInput}.${toBase64Url(signature)}`;
}

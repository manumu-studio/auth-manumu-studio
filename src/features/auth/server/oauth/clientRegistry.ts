import crypto from "crypto";
import { prisma } from "@/lib/prisma";

type CreateClientInput = {
  name: string;
  description?: string;
  redirectUris: string[];
  allowedOrigins: string[];
  scopes?: string[];
  createdById?: string;
  clientId?: string;
};

type ClientSecretResult = {
  clientId: string;
  clientSecret: string;
};

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function generateClientSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashClientSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function verifyClientSecret(secret: string, hash: string): boolean {
  const secretHash = hashClientSecret(secret);
  return timingSafeEqualHex(secretHash, hash);
}

export function normalizeUrlList(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function validateRedirectUri(uri: string): void {
  const parsed = new URL(uri);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Redirect URI must use http or https");
  }
  if (parsed.hash) {
    throw new Error("Redirect URI must not include fragments");
  }
  if (parsed.protocol === "http:" && !LOCALHOST_HOSTS.has(parsed.hostname)) {
    throw new Error("Redirect URI must use https outside localhost");
  }
}

export function validateAllowedOrigin(origin: string): void {
  const parsed = new URL(origin);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Allowed origin must use http or https");
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Allowed origin must be a bare origin (no path/query/hash)");
  }
  if (parsed.protocol === "http:" && !LOCALHOST_HOSTS.has(parsed.hostname)) {
    throw new Error("Allowed origin must use https outside localhost");
  }
}

export function assertRedirectUriAllowed(
  redirectUri: string,
  allowedRedirectUris: string[]
): void {
  validateRedirectUri(redirectUri);
  const normalized = normalizeUrlList(allowedRedirectUris);
  if (!normalized.includes(redirectUri)) {
    throw new Error("Redirect URI is not registered for this client");
  }
}

export async function createOAuthClient({
  name,
  description,
  redirectUris,
  allowedOrigins,
  scopes = ["openid", "email", "profile"],
  createdById,
  clientId,
}: CreateClientInput): Promise<ClientSecretResult> {
  const normalizedRedirects = normalizeUrlList(redirectUris);
  if (normalizedRedirects.length === 0) {
    throw new Error("At least one redirect URI is required");
  }
  normalizedRedirects.forEach(validateRedirectUri);

  const normalizedOrigins = normalizeUrlList(allowedOrigins);
  if (normalizedOrigins.length === 0) {
    throw new Error("At least one allowed origin is required");
  }
  normalizedOrigins.forEach(validateAllowedOrigin);

  const newClientSecret = generateClientSecret();
  const secretHash = hashClientSecret(newClientSecret);

  const record = await prisma.oAuthClient.create({
    data: {
      clientId: clientId ?? crypto.randomUUID(),
      clientSecretHash: secretHash,
      name,
      description,
      redirectUris: normalizedRedirects,
      allowedOrigins: normalizedOrigins,
      scopes: normalizeUrlList(scopes),
      createdById,
    },
    select: { clientId: true },
  });

  return { clientId: record.clientId, clientSecret: newClientSecret };
}

export async function rotateOAuthClientSecret(clientId: string): Promise<string> {
  const newSecret = generateClientSecret();
  const secretHash = hashClientSecret(newSecret);

  await prisma.oAuthClient.update({
    where: { clientId },
    data: { clientSecretHash: secretHash },
  });

  return newSecret;
}

export async function getOAuthClient(clientId: string) {
  return prisma.oAuthClient.findUnique({ where: { clientId } });
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getOAuthClient, verifyClientSecret } from "./clientRegistry";
import { resolveIssuer } from "./issuer";
import { signAccessToken } from "./jwt";

const ACCESS_TOKEN_TTL_MINUTES = 60;

type TokenError = {
  ok: false;
  error: "invalid_request" | "invalid_client" | "invalid_grant";
  description: string;
  status: number;
};

type TokenSuccess = {
  ok: true;
  accessToken: string;
  expiresIn: number;
  scope: string;
};

export type AuthorizationCodeExchangeInput = {
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  codeVerifier?: string;
};

export type AuthorizationCodeExchangeResult = TokenSuccess | TokenError;

function toBase64Url(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer.toString("base64url");
}


function computePkceChallenge(verifier: string, method: string | null): string {
  if (method === "S256") {
    const digest = crypto.createHash("sha256").update(verifier).digest();
    return toBase64Url(digest);
  }
  return verifier;
}

function reject(
  error: TokenError["error"],
  description: string,
  status: number
): TokenError {
  return { ok: false, error, description, status };
}

export async function exchangeAuthorizationCode(
  input: AuthorizationCodeExchangeInput
): Promise<AuthorizationCodeExchangeResult> {
  if (!input.clientId) {
    return reject("invalid_request", "client_id is required.", 400);
  }
  if (!input.code) {
    return reject("invalid_request", "code is required.", 400);
  }

  const codeRecord = await prisma.oAuthAuthorizationCode.findUnique({
    where: { code: input.code },
  });
  if (!codeRecord) {
    return reject("invalid_grant", "Authorization code is invalid.", 400);
  }
  if (codeRecord.clientId !== input.clientId) {
    return reject("invalid_grant", "Authorization code does not match client.", 400);
  }

  const client = await getOAuthClient(input.clientId);
  if (!client || !client.isActive) {
    return reject("invalid_client", "Client authentication failed.", 401);
  }

  if (input.clientSecret) {
    const secretOk = verifyClientSecret(input.clientSecret, client.clientSecretHash);
    if (!secretOk) {
      return reject("invalid_client", "Client authentication failed.", 401);
    }
  } else if (!codeRecord.codeChallenge) {
    return reject("invalid_client", "client_secret is required for this client.", 401);
  }

  if (input.redirectUri && input.redirectUri !== codeRecord.redirectUri) {
    return reject("invalid_grant", "redirect_uri does not match authorization code.", 400);
  }

  if (codeRecord.usedAt) {
    return reject("invalid_grant", "Authorization code already used.", 400);
  }
  if (codeRecord.expiresAt <= new Date()) {
    return reject("invalid_grant", "Authorization code expired.", 400);
  }

  if (codeRecord.codeChallenge) {
    if (!input.codeVerifier) {
      return reject("invalid_grant", "code_verifier is required.", 400);
    }
    const expected = computePkceChallenge(
      input.codeVerifier,
      codeRecord.codeChallengeMethod
    );
    if (expected !== codeRecord.codeChallenge) {
      return reject("invalid_grant", "code_verifier mismatch.", 400);
    }
  }

  const now = new Date();
  await prisma.oAuthAuthorizationCode.update({
    where: { id: codeRecord.id },
    data: { usedAt: now },
  });

  const expiresIn = ACCESS_TOKEN_TTL_MINUTES * 60;
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload = {
    iss: resolveIssuer(),
    aud: codeRecord.clientId,
    sub: codeRecord.userId,
    exp: issuedAt + expiresIn,
    iat: issuedAt,
    scope: codeRecord.scopes.join(" "),
  };
  const accessToken = signAccessToken(payload);

  return {
    ok: true,
    accessToken,
    expiresIn,
    scope: codeRecord.scopes.join(" "),
  };
}

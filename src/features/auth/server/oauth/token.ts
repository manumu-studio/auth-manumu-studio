// OAuth authorization-code token exchange; enforces mandatory S256 PKCE regardless of client type.
import { prisma } from "@/lib/prisma";
import { getOAuthClient, verifyClientSecret } from "./clientRegistry";
import { resolveIssuer } from "./issuer";
import { signAccessToken } from "./jwt";
import { getUserClaims } from "./claims";
import { isValidPkceValue, pkceChallengeMatches } from "./pkce";

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
  idToken?: string;
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

  // Client secret auth (confidential clients) — verify independently of PKCE.
  if (input.clientSecret) {
    const secretOk = verifyClientSecret(input.clientSecret, client.clientSecretHash);
    if (!secretOk) {
      return reject("invalid_client", "Client authentication failed.", 401);
    }
  }

  if (input.redirectUri && input.redirectUri !== codeRecord.redirectUri) {
    return reject("invalid_grant", "redirect_uri does not match authorization code.", 400);
  }

  if (codeRecord.expiresAt <= new Date()) {
    return reject("invalid_grant", "Authorization code expired.", 400);
  }

  // PKCE S256 verification — mandatory for all grant types.
  // Condition 1: stored record has no challenge (legacy or misconfigured).
  if (!codeRecord.codeChallenge) {
    return reject(
      "invalid_grant",
      "Authorization code was issued without PKCE; exchange rejected.",
      400
    );
  }

  // Condition 2: stored method is not S256 (downgrade attempt or legacy record).
  if (codeRecord.codeChallengeMethod !== "S256") {
    return reject(
      "invalid_grant",
      "code_challenge_method must be S256.",
      400
    );
  }

  // Condition 3: no verifier provided.
  if (!input.codeVerifier) {
    return reject("invalid_grant", "code_verifier is required.", 400);
  }

  // Condition 4: verifier is malformed (fails RFC 7636 char/length rules).
  if (!isValidPkceValue(input.codeVerifier)) {
    return reject("invalid_grant", "code_verifier is malformed.", 400);
  }

  // Condition 5: verifier does not produce the stored S256 challenge.
  if (!pkceChallengeMatches(input.codeVerifier, codeRecord.codeChallenge)) {
    return reject("invalid_grant", "code_verifier mismatch.", 400);
  }

  // Atomic claim: only the first concurrent request wins. The WHERE clause
  // on usedAt: null and expiresAt: { gt: now } ensures no second writer can
  // claim the same row — the DB evaluates this predicate atomically under its
  // row-level lock. count === 0 means another request already claimed it or
  // the code expired between validation and claim.
  const now = new Date();
  const claimed = await prisma.oAuthAuthorizationCode.updateMany({
    where: { id: codeRecord.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) {
    return reject("invalid_grant", "Authorization code is invalid or already used.", 400);
  }

  const expiresIn = ACCESS_TOKEN_TTL_MINUTES * 60;
  const issuedAt = Math.floor(now.getTime() / 1000);
  const issuer = resolveIssuer();
  const scopeString = codeRecord.scopes.join(" ");

  // Access token
  const accessTokenPayload = {
    iss: issuer,
    aud: codeRecord.clientId,
    sub: codeRecord.userId,
    exp: issuedAt + expiresIn,
    iat: issuedAt,
    scope: scopeString,
  };
  const accessToken = signAccessToken(accessTokenPayload);

  // ID token (OIDC) — only when openid scope is granted
  let idToken: string | undefined;
  if (codeRecord.scopes.includes("openid")) {
    const userClaims = await getUserClaims(codeRecord.userId, codeRecord.scopes);
    const idTokenPayload: Record<string, unknown> = {
      iss: issuer,
      sub: codeRecord.userId,
      aud: codeRecord.clientId,
      exp: issuedAt + 3600,
      iat: issuedAt,
      ...userClaims,
    };
    if (codeRecord.nonce) {
      idTokenPayload["nonce"] = codeRecord.nonce;
    }
    idToken = signAccessToken(idTokenPayload);
  }

  return {
    ok: true,
    accessToken,
    idToken,
    expiresIn,
    scope: scopeString,
  };
}

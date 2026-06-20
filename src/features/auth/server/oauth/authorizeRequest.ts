// Validates incoming OAuth /authorize requests; enforces mandatory S256 PKCE.
import { assertRedirectUriAllowed, getOAuthClient } from "@/features/auth/server/oauth";
import { isValidPkceValue } from "./pkce";

export type AuthorizeRequest = {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  nonce?: string;
};

export type AuthorizationValidationResult =
  | {
      ok: true;
      client: NonNullable<Awaited<ReturnType<typeof getOAuthClient>>>;
      redirectUri: string;
      scopes: string[];
      state?: string;
      codeChallenge: string;
      codeChallengeMethod: "S256";
      nonce?: string;
    }
  | {
      ok: false;
      error: string;
      description: string;
      redirectUri?: string;
      state?: string;
    };

const ALLOWED_SCOPES = new Set(["openid", "email", "profile"]);

function parseScopes(scope?: string): string[] {
  const raw = (scope ?? "").trim();
  if (!raw) return ["openid"];
  const values = raw.split(/\s+/).filter(Boolean);
  return values.length ? values : ["openid"];
}

export async function validateAuthorizeRequest(
  params: AuthorizeRequest
): Promise<AuthorizationValidationResult> {
  if (params.response_type && params.response_type !== "code") {
    return {
      ok: false,
      error: "unsupported_response_type",
      description: "Only response_type=code is supported.",
    };
  }

  const clientId = params.client_id?.trim();
  if (!clientId) {
    return {
      ok: false,
      error: "invalid_request",
      description: "client_id is required.",
    };
  }

  const client = await getOAuthClient(clientId);
  if (!client || !client.isActive) {
    return {
      ok: false,
      error: "unauthorized_client",
      description: "Client is not authorized.",
    };
  }

  const redirectUri =
    params.redirect_uri?.trim() ??
    (client.redirectUris.length === 1 ? client.redirectUris[0] : undefined);
  if (!redirectUri) {
    return {
      ok: false,
      error: "invalid_request",
      description: "redirect_uri is required.",
    };
  }

  try {
    assertRedirectUriAllowed(redirectUri, client.redirectUris);
  } catch (error) {
    return {
      ok: false,
      error: "invalid_request",
      description: (error as Error).message,
    };
  }

  const scopes = parseScopes(params.scope);
  for (const scope of scopes) {
    if (!ALLOWED_SCOPES.has(scope)) {
      return {
        ok: false,
        error: "invalid_scope",
        description: `Scope ${scope} is not supported.`,
        redirectUri,
        state: params.state,
      };
    }
    if (!client.scopes.includes(scope)) {
      return {
        ok: false,
        error: "invalid_scope",
        description: `Scope ${scope} is not allowed for this client.`,
        redirectUri,
        state: params.state,
      };
    }
  }

  // PKCE S256 is mandatory — no defaulting, no plain fallback.
  if (!params.code_challenge) {
    return {
      ok: false,
      error: "invalid_request",
      description: "code_challenge is required.",
      redirectUri,
      state: params.state,
    };
  }

  if (!isValidPkceValue(params.code_challenge)) {
    return {
      ok: false,
      error: "invalid_request",
      description: "code_challenge is malformed.",
      redirectUri,
      state: params.state,
    };
  }

  if (params.code_challenge_method !== "S256") {
    return {
      ok: false,
      error: "invalid_request",
      description: "code_challenge_method must be S256.",
      redirectUri,
      state: params.state,
    };
  }

  return {
    ok: true,
    client,
    redirectUri,
    scopes,
    state: params.state,
    codeChallenge: params.code_challenge,
    codeChallengeMethod: "S256" as const,
    nonce: params.nonce,
  };
}

// src/app/oauth/token/route.ts
// OAuth 2.0 token endpoint — exchanges authorization codes for access tokens.
// Applies per-IP and per-client rate limits before any body parsing.
import { NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/features/auth/server/oauth/token";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { parseTokenRequest } from "@/features/auth/server/oauth/tokenRequestSchema";
import {
  tokenEndpointIpKey,
  tokenEndpointClientKey,
} from "@/features/auth/server/oauth/rateLimitKeys";

// RFC 6749 §5.1 — token responses must not be cached
const TOKEN_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
} as const;

function parseBasicAuth(req: Request): { clientId?: string; clientSecret?: string } {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return {};
  const encoded = header.slice("Basic ".length).trim();
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    // Split on the FIRST colon only — secrets may contain colons
    const colonIdx = decoded.indexOf(":");
    if (colonIdx === -1) return {};
    const clientId = decoded.slice(0, colonIdx);
    const clientSecret = decoded.slice(colonIdx + 1);
    if (!clientId) return {};
    return { clientId, clientSecret };
  } catch {
    return {};
  }
}

function jsonError(error: string, description: string, status: number): NextResponse {
  const extraHeaders: Record<string, string> =
    error === "invalid_client" ? { "WWW-Authenticate": 'Basic realm="oauth"' } : {};
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { ...TOKEN_RESPONSE_HEADERS, ...extraHeaders } }
  );
}

export async function POST(req: Request) {
  // Step 1: derive client IP
  const ip = getClientIp(req.headers);

  // Step 2: per-IP rate limit — before body parsing
  const ipResult = await rateLimit(tokenEndpointIpKey(ip), "oauth-token-ip");
  if (!ipResult.success) {
    const retryAfter = Math.max(1, Math.ceil((ipResult.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "rate_limit_exceeded", error_description: "Too many requests." },
      {
        status: 429,
        headers: {
          ...TOKEN_RESPONSE_HEADERS,
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  // Step 3: parse and validate the request body
  const parsed = await parseTokenRequest(req);
  if (!parsed.ok) {
    return jsonError("invalid_request", parsed.description, 400);
  }
  const body = parsed.body;

  // Step 4: validate grant type
  const grantType = body.grant_type?.trim();
  if (!grantType || grantType !== "authorization_code") {
    return jsonError("unsupported_grant_type", "Only authorization_code is supported.", 400);
  }

  // Step 5: resolve clientId from Basic auth header or validated body
  const basicAuth = parseBasicAuth(req);
  const clientId = basicAuth.clientId ?? body.client_id;
  const clientSecret = basicAuth.clientSecret ?? body.client_secret;

  // Step 6: per-client rate limit — independent of IP bucket
  const clientResult = await rateLimit(tokenEndpointClientKey(clientId), "oauth-token-client");
  if (!clientResult.success) {
    const retryAfter = Math.max(1, Math.ceil((clientResult.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "rate_limit_exceeded", error_description: "Too many requests." },
      {
        status: 429,
        headers: {
          ...TOKEN_RESPONSE_HEADERS,
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  // Step 7: exchange the authorization code
  const result = await exchangeAuthorizationCode({
    code: body.code ?? "",
    clientId: clientId ?? "",
    clientSecret: clientSecret ?? undefined,
    redirectUri: body.redirect_uri,
    codeVerifier: body.code_verifier,
  });

  // Step 8: handle exchange error
  if (!result.ok) {
    return jsonError(result.error, result.description, result.status);
  }

  // Step 9: success — attach no-store headers
  return NextResponse.json(
    {
      access_token: result.accessToken,
      token_type: "Bearer",
      expires_in: result.expiresIn,
      scope: result.scope,
      ...(result.idToken ? { id_token: result.idToken } : {}),
    },
    { headers: TOKEN_RESPONSE_HEADERS }
  );
}

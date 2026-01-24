import { NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/features/auth/server/oauth/token";

type TokenRequestBody = {
  grant_type?: string;
  code?: string;
  redirect_uri?: string;
  client_id?: string;
  client_secret?: string;
  code_verifier?: string;
};

function parseBasicAuth(req: Request): { clientId?: string; clientSecret?: string } {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return {};
  const encoded = header.slice("Basic ".length).trim();
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const [clientId, clientSecret] = decoded.split(":", 2);
    if (!clientId) return {};
    return { clientId, clientSecret };
  } catch {
    return {};
  }
}

async function readTokenRequest(req: Request): Promise<TokenRequestBody> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return body as TokenRequestBody;
  }

  const form = await req.formData().catch(() => new FormData());
  return {
    grant_type: form.get("grant_type")?.toString(),
    code: form.get("code")?.toString(),
    redirect_uri: form.get("redirect_uri")?.toString(),
    client_id: form.get("client_id")?.toString(),
    client_secret: form.get("client_secret")?.toString(),
    code_verifier: form.get("code_verifier")?.toString(),
  };
}

function jsonError(
  error: string,
  description: string,
  status: number
): NextResponse {
  const headers =
    error === "invalid_client"
      ? { "WWW-Authenticate": 'Basic realm="oauth"' }
      : undefined;
  return NextResponse.json(
    { error, error_description: description },
    { status, headers }
  );
}

export async function POST(req: Request) {
  const body = await readTokenRequest(req);
  const grantType = body.grant_type?.trim();
  if (!grantType || grantType !== "authorization_code") {
    return jsonError(
      "unsupported_grant_type",
      "Only authorization_code is supported.",
      400
    );
  }

  const basicAuth = parseBasicAuth(req);
  const clientId = basicAuth.clientId ?? body.client_id;
  const clientSecret = basicAuth.clientSecret ?? body.client_secret;

  const result = await exchangeAuthorizationCode({
    code: body.code ?? "",
    clientId: clientId ?? "",
    clientSecret: clientSecret || undefined,
    redirectUri: body.redirect_uri,
    codeVerifier: body.code_verifier,
  });

  if (!result.ok) {
    return jsonError(result.error, result.description, result.status);
  }

  return NextResponse.json({
    access_token: result.accessToken,
    token_type: "Bearer",
    expires_in: result.expiresIn,
    scope: result.scope,
  });
}

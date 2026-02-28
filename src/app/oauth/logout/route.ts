// OIDC RP-initiated logout endpoint that clears local NextAuth cookies.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOAuthClient } from "@/features/auth/server/oauth/clientRegistry";
import { decodeIdToken } from "@/features/auth/server/oauth/jwt";

function badRequest(error: string, code: string): NextResponse {
  return NextResponse.json({ error, code }, { status: 400 });
}

function clearAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>): void {
  cookieStore.delete("next-auth.session-token");
  cookieStore.delete("__Secure-next-auth.session-token");
  cookieStore.delete("next-auth.csrf-token");
  cookieStore.delete("__Secure-next-auth.csrf-token");
  cookieStore.delete("next-auth.callback-url");
  cookieStore.delete("__Secure-next-auth.callback-url");
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const idTokenHint = requestUrl.searchParams.get("id_token_hint");
  const postLogoutRedirectUri = requestUrl.searchParams.get("post_logout_redirect_uri");
  const requestedClientId = requestUrl.searchParams.get("client_id");
  const state = requestUrl.searchParams.get("state");

  let resolvedClientId: string | null = requestedClientId;

  // Resolve client from a valid id_token_hint when provided.
  if (idTokenHint) {
    const idToken = decodeIdToken(idTokenHint);
    if (!idToken?.aud) {
      console.warn("[oauth.logout] Rejected invalid id_token_hint.");
      return badRequest("Invalid id_token_hint.", "invalid_id_token_hint");
    }
    resolvedClientId = idToken.aud;
  }

  const client = resolvedClientId ? await getOAuthClient(resolvedClientId) : null;
  if (resolvedClientId && !client) {
    console.warn("[oauth.logout] Unknown client attempted logout.", {
      clientId: resolvedClientId,
    });
    return badRequest("Unknown OAuth client.", "invalid_client");
  }

  // Validate post-logout redirect URI against the client registry.
  if (postLogoutRedirectUri) {
    if (!client) {
      console.warn("[oauth.logout] post_logout_redirect_uri without resolvable client.", {
        redirectUri: postLogoutRedirectUri,
      });
      return badRequest(
        "client_id or id_token_hint is required when post_logout_redirect_uri is set.",
        "missing_client"
      );
    }

    if (!client.redirectUris.includes(postLogoutRedirectUri)) {
      console.warn("[oauth.logout] Unregistered post_logout_redirect_uri rejected.", {
        clientId: client.clientId,
        redirectUri: postLogoutRedirectUri,
      });
      return badRequest("post_logout_redirect_uri is not registered for the client.", "invalid_redirect_uri");
    }
  }

  const cookieStore = await cookies();
  clearAuthCookies(cookieStore);

  if (postLogoutRedirectUri) {
    const redirectTarget = new URL(postLogoutRedirectUri);
    if (state) {
      redirectTarget.searchParams.set("state", state);
    }
    return NextResponse.redirect(redirectTarget);
  }

  return NextResponse.redirect(new URL("/", req.url));
}

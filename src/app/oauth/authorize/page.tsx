import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/server/options";
import { createAuthorizationCode } from "@/features/auth/server/oauth/authorization";
import {
  validateAuthorizeRequest,
  type AuthorizeRequest,
} from "@/features/auth/server/oauth/authorizeRequest";

type AuthorizeQueryParams = AuthorizeRequest & {
  error?: string;
  error_description?: string;
};

function pickFirst(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeSearchParams(
  params: Record<string, string | string[] | undefined>
): AuthorizeQueryParams {
  return {
    client_id: pickFirst(params.client_id),
    redirect_uri: pickFirst(params.redirect_uri),
    response_type: pickFirst(params.response_type),
    scope: pickFirst(params.scope),
    state: pickFirst(params.state),
    code_challenge: pickFirst(params.code_challenge),
    code_challenge_method: pickFirst(params.code_challenge_method),
    error: pickFirst(params.error),
    error_description: pickFirst(params.error_description),
  };
}

function buildAuthorizeQuery(params: AuthorizeRequest): string {
  const search = new URLSearchParams();
  if (params.client_id) search.set("client_id", params.client_id);
  if (params.redirect_uri) search.set("redirect_uri", params.redirect_uri);
  if (params.response_type) search.set("response_type", params.response_type);
  if (params.scope) search.set("scope", params.scope);
  if (params.state) search.set("state", params.state);
  if (params.code_challenge) search.set("code_challenge", params.code_challenge);
  if (params.code_challenge_method) {
    search.set("code_challenge_method", params.code_challenge_method);
  }
  return search.toString();
}

function buildRedirectUrl(base: string, params: Record<string, string | undefined>): string {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

async function authorizeAction(formData: FormData) {
  "use server";
  const params: AuthorizeRequest = {
    client_id: formData.get("client_id")?.toString(),
    redirect_uri: formData.get("redirect_uri")?.toString(),
    response_type: formData.get("response_type")?.toString(),
    scope: formData.get("scope")?.toString(),
    state: formData.get("state")?.toString() || undefined,
    code_challenge: formData.get("code_challenge")?.toString() || undefined,
    code_challenge_method:
      formData.get("code_challenge_method")?.toString() || undefined,
  };
  const decision = formData.get("decision")?.toString() ?? "deny";

  const validation = await validateAuthorizeRequest(params);
  if (!validation.ok) {
    if (validation.redirectUri) {
      redirect(
        buildRedirectUrl(validation.redirectUri, {
          error: validation.error,
          error_description: validation.description,
          state: validation.state,
        })
      );
    }
    redirect(
      `/oauth/authorize?error=${encodeURIComponent(validation.error)}&error_description=${encodeURIComponent(
        validation.description
      )}`
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const callbackUrl = `/oauth/authorize?${buildAuthorizeQuery(params)}`;
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (decision !== "approve") {
    redirect(
      buildRedirectUrl(validation.redirectUri, {
        error: "access_denied",
        state: validation.state,
      })
    );
  }

  const { code } = await createAuthorizationCode({
    clientId: validation.client.clientId,
    userId: session.user.id,
    redirectUri: validation.redirectUri,
    scopes: validation.scopes,
    codeChallenge: validation.codeChallenge,
    codeChallengeMethod: validation.codeChallengeMethod,
  });

  redirect(
    buildRedirectUrl(validation.redirectUri, {
      code,
      state: validation.state,
    })
  );
}

export default async function AuthorizePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = normalizeSearchParams(await props.searchParams);

  if (params.error) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Authorization Error</h1>
        <p className="mt-4 text-sm text-neutral-600">
          {params.error_description ?? "Something went wrong during authorization."}
        </p>
      </main>
    );
  }

  const validation = await validateAuthorizeRequest(params);
  if (!validation.ok) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Authorization Error</h1>
        <p className="mt-4 text-sm text-neutral-600">{validation.description}</p>
      </main>
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const callbackUrl = `/oauth/authorize?${buildAuthorizeQuery(params)}`;
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const scopeLabel = validation.scopes.join(" ");

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Authorize {validation.client.name}</h1>
      <p className="mt-3 text-sm text-neutral-600">
        This app is requesting access to:
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-neutral-700">
        {validation.scopes.map((scope) => (
          <li key={scope}>{scope}</li>
        ))}
      </ul>

      <form action={authorizeAction} className="mt-8 flex flex-col gap-3">
        <input type="hidden" name="client_id" value={validation.client.clientId} />
        <input type="hidden" name="redirect_uri" value={validation.redirectUri} />
        <input type="hidden" name="response_type" value="code" />
        <input type="hidden" name="scope" value={scopeLabel} />
        {validation.state ? (
          <input type="hidden" name="state" value={validation.state} />
        ) : null}
        {validation.codeChallenge ? (
          <input
            type="hidden"
            name="code_challenge"
            value={validation.codeChallenge}
          />
        ) : null}
        {validation.codeChallengeMethod ? (
          <input
            type="hidden"
            name="code_challenge_method"
            value={validation.codeChallengeMethod}
          />
        ) : null}

        <div className="flex gap-3">
          <button
            className="rounded bg-black px-4 py-2 text-sm font-semibold text-white"
            type="submit"
            name="decision"
            value="approve"
          >
            Authorize
          </button>
          <button
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700"
            type="submit"
            name="decision"
            value="deny"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}

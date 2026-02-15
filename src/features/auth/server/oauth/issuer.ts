import { env } from "@/lib/env";

export function resolveIssuer(): string {
  return (
    env.AUTH_URL ??
    env.NEXTAUTH_URL ??
    env.APP_URL ??
    "http://localhost:3000"
  );
}

export function resolveIssuerEndpoint(pathname: string): string {
  const issuer = resolveIssuer().replace(/\/$/, "");
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${issuer}${normalizedPath}`;
}

#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# oauth-facebook-scaffold.sh
#
# Idempotent scaffold for Facebook OAuth + multi-provider hub.
# - DRY-RUN by default. Set APPLY=1 to write files.
# - NEVER commits/pushes.
# - Safe patches with .bak backups when editing existing files.
# ============================================================================

APPLY="${APPLY:-0}"
EXPECTED_BRANCH="${EXPECTED_BRANCH:-feature/oauth-facebook}"
ROOT="$(pwd)"

say() { printf "%b\n" "$*"; }
doit() {
  if [ "$APPLY" = "1" ]; then eval "$*"; else printf "[dry-run] %s\n" "$*"; fi
}
ensure_dir() {
  [ -d "$1" ] && say "✓ dir exists: $1" || doit "mkdir -p \"$1\""
}

# Write file if missing; if exists, leave it alone.
write_if_missing() {
  local path="$1"; local label="$2"
  if [ -f "$path" ]; then
    say "✓ exists: $path"
    return 0
  fi
  local dir; dir="$(dirname "$path")"
  [ -d "$dir" ] || doit "mkdir -p \"$dir\""
  if [ "$APPLY" = "1" ]; then
    cat > "$path"
    say "✅ created: $path ($label)"
  else
    cat >/dev/null
    printf "[dry-run] would create: %s (%s)\n" "$path" "$label"
  fi
}

# Append content to file if a marker is not found
append_if_missing_marker() {
  local file="$1"; local marker="$2"; local content="$3"
  if [ ! -f "$file" ]; then
    if [ "$APPLY" = "1" ]; then printf "%s\n" "$content" > "$file"; else printf "[dry-run] would create %s\n" "$file"; fi
    say "✅ created $file (from append_if_missing_marker)"
    return
  fi
  if grep -qF "$marker" "$file" 2>/dev/null; then
    say "✓ marker present in $file: $marker"
  else
    if [ "$APPLY" = "1" ]; then printf "\n%s\n" "$content" >> "$file"; say "✅ appended to $file: $marker"; else printf "[dry-run] would append to %s: %s\n" "$file" "$marker"; fi
  fi
}

backup_and_inplace_sed() {
  # $1 file, $2 sed script (BSD-compatible)
  local file="$1"; local script="$2"
  [ -f "$file" ] || { say "⚠️  file not found for patch: $file"; return 1; }
  if [ "$APPLY" = "1" ]; then
    cp "$file" "$file.bak"
    # BSD sed: -i '' for in-place
    sed -i '' -E "$script" "$file"
    say "✅ patched: $file (backup: $file.bak)"
  else
    printf "[dry-run] would patch: %s\n" "$file"
  fi
}

say "🔍 Preflight checks..."
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
if [ "$branch" != "$EXPECTED_BRANCH" ]; then
  say "⚠️  Expected branch '$EXPECTED_BRANCH', current: '$branch'"
else
  say "✓ On expected branch: $branch"
fi
command -v node >/dev/null && say "✓ node found" || say "⚠️  node not found"
command -v pnpm >/dev/null && say "✓ pnpm found" || say "⚠️  pnpm not found"
say ""

# ----------------------------------------------------------------------------
# 1) Provider factory
# ----------------------------------------------------------------------------
ensure_dir "src/features/auth/server/providers"

write_if_missing "src/features/auth/server/providers/facebook.ts" "facebookProvider" <<'TS'
import FacebookProvider from "next-auth/providers/facebook";

/**
 * Authorized redirect URI to set in Facebook App:
 *   {APP_URL}/api/auth/callback/facebook
 * Local dev:
 *   http://localhost:3000/api/auth/callback/facebook
 */
export function facebookProvider() {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return FacebookProvider({
    clientId,
    clientSecret,
    // Caution: enables account linking by email; acceptable for most apps
    allowDangerousEmailAccountLinking: true,
  });
}
TS

# ----------------------------------------------------------------------------
# 2) Wire into NextAuth options.ts (conditional provider)
# ----------------------------------------------------------------------------
OPTIONS="src/features/auth/server/options.ts"
if [ -f "$OPTIONS" ]; then
  # Import
  if ! grep -q 'from "@/features/auth/server/providers/facebook"' "$OPTIONS"; then
    backup_and_inplace_sed "$OPTIONS" $'s|(from "@/features/auth/server/providers/google";)|\\1\nimport { facebookProvider } from "@/features/auth/server/providers/facebook";|'
  else
    say "✓ facebookProvider import already present"
  fi

  # Providers array spread insertion
  if grep -q 'providers: \[' "$OPTIONS"; then
    if ! grep -q 'facebookProvider' "$OPTIONS"; then
      # Insert a spread after the googleProvider spread if present, otherwise after Credentials
      backup_and_inplace_sed "$OPTIONS" $'s|\.\.\.(googleProvider\(\)\s*\?\s*\[googleProvider\(\)!\]:\s*\[\]\),?|\0\n    ...(facebookProvider() ? [facebookProvider()!] : []),|'
      # If the previous sed didn’t add anything (no google), try after Credentials(…)
      if ! grep -q 'facebookProvider' "$OPTIONS"; then
        backup_and_inplace_sed "$OPTIONS" $'s|(Credentials\\((.|\\n)*?\\)\\s*\\}),?|\\0,\n    ...(facebookProvider() ? [facebookProvider()!] : []),|'
      fi
    else
      say "✓ facebookProvider already in providers[]"
    fi
  else
    say "⚠️  Could not find providers: [] in $OPTIONS; please patch manually."
  fi
else
  say "⚠️  Missing $OPTIONS — skipping patch."
fi

# ----------------------------------------------------------------------------
# 3) UI: FacebookButton + barrel
# ----------------------------------------------------------------------------
ensure_dir "src/features/auth/components/ProviderButtons/FacebookButton"

write_if_missing "src/features/auth/components/ProviderButtons/FacebookButton/FacebookButton.module.scss" "FacebookButton.scss" <<'SCSS'
.root {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  font-weight: 500;
  text-align: center;
}

.root[aria-busy="true"] {
  opacity: 0.8;
  cursor: progress;
}

.root:hover {
  background: #f8fafc;
}

.root:focus-visible {
  outline: 2px solid #1d4ed8;
  outline-offset: 2px;
}
SCSS

write_if_missing "src/features/auth/components/ProviderButtons/FacebookButton/FacebookButton.tsx" "FacebookButton.tsx" <<'TSX'
"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import styles from "./FacebookButton.module.scss";

type Props = {
  label?: string;
  callbackUrl?: string;
  className?: string;
};

export default function FacebookButton({
  label = "Log In With Facebook",
  callbackUrl,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  async function onClick() {
    setLoading(true);
    try {
      const target = callbackUrl || (typeof window !== "undefined" ? window.location.origin : "/");
      await signIn("facebook", { callbackUrl: target });
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className={[styles.root, className].filter(Boolean).join(" ")}
    >
      {/* Simple "f" logo */}
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M22 12.06C22 6.48 17.52 2 11.94 2S2 6.48 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H8.4V12.06h2.04V9.88c0-2.02 1.2-3.14 3.03-3.14.88 0 1.8.16 1.8.16v1.98h-1.02c-1 0-1.32.62-1.32 1.26v1.91h2.25l-.36 2.91h-1.89V22c4.78-.76 8.44-4.92 8.44-9.94Z"/>
      </svg>
      <span>{loading ? "Opening Facebook…" : label}</span>
    </button>
  );
}
TSX

write_if_missing "src/features/auth/components/ProviderButtons/FacebookButton/index.ts" "FacebookButton barrel" <<'TS'
export { default } from "./FacebookButton";
TS

# Barrel export
PB_INDEX="src/features/auth/components/ProviderButtons/index.ts"
append_if_missing_marker "$PB_INDEX" "export { default as FacebookButton }" 'export { default as AuthProvidersGroup } from "./AuthProvidersGroup";
export { default as GoogleButton } from "./GoogleButton";
export { default as FacebookButton } from "./FacebookButton";'

# ----------------------------------------------------------------------------
# 4) Update public page hub: add Facebook alongside Google inside googleSlot
# ----------------------------------------------------------------------------
PAGE="src/app/(public)/page.tsx"
if [ -f "$PAGE" ]; then
  # Ensure import of FacebookButton via barrel or direct
  if ! grep -q 'FacebookButton' "$PAGE"; then
    if grep -q '@\/features\/auth\/components\/ProviderButtons";' "$PAGE"; then
      backup_and_inplace_sed "$PAGE" $'s|(from "@/features/auth/components/ProviderButtons";)|\\1 // + FacebookButton|'
    fi
    if grep -q 'from "@/features/auth/components/ProviderButtons"' "$PAGE"; then
      # Usually already importing { AuthProvidersGroup, GoogleButton } from barrel
      backup_and_inplace_sed "$PAGE" $'s|{([^}]*)}|{\\1, FacebookButton}|'
    else
      # Fallback: add a direct import
      append_if_missing_marker "$PAGE" "FacebookButton from" 'import FacebookButton from "@/features/auth/components/ProviderButtons/FacebookButton";'
    fi
  else
    say "✓ FacebookButton already imported in page.tsx"
  fi

  # Replace single Google slot with both providers
  if grep -q 'googleSlot={<GoogleButton' "$PAGE"; then
    backup_and_inplace_sed "$PAGE" $'s|googleSlot={<GoogleButton([^>]*)/>}|googleSlot={<><GoogleButton\\1/><FacebookButton label="Log In With Facebook" callbackUrl="/" className="darkBtn" /></>}|'
  elif ! grep -q 'FacebookButton' "$PAGE"; then
    say "⚠️  Could not auto-inject both providers into googleSlot. Please review page.tsx manually."
  fi
else
  say "⚠️  $PAGE not found. Skipping UI hub patch."
fi

# ----------------------------------------------------------------------------
# 5) .env.example: add FACEBOOK vars if missing
# ----------------------------------------------------------------------------
append_if_missing_marker ".env.example" "FACEBOOK_CLIENT_ID" "# Facebook OAuth
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET="

# ----------------------------------------------------------------------------
# 6) Docs: journal + PR draft
# ----------------------------------------------------------------------------
DATE_STR="$(date +%Y-%m-%d)"
write_if_missing "docs/journal/ENTRY-5.md" "ENTRY-5" <<EOF
# ENTRY-5 — Facebook OAuth + Multi-Provider Hub

**Date:** $DATE_STR

## Summary
- Added Facebook OAuth provider (conditional)
- UI: FacebookButton added beside Google
- Updated public landing hub to show multiple providers
- .env.example extended with FACEBOOK_* keys

## Files
- src/features/auth/server/providers/facebook.ts
- src/features/auth/server/options.ts (patched)
- src/features/auth/components/ProviderButtons/FacebookButton/*
- src/features/auth/components/ProviderButtons/index.ts
- src/app/(public)/page.tsx
- .env.example

## Notes
- Redirect URI: \`/api/auth/callback/facebook\`
- allowDangerousEmailAccountLinking set at provider-level only.
EOF

write_if_missing "docs/pull-requests/PR-0.5.0.md" "PR draft" <<'MD'
# PR 0.5.0 — Facebook OAuth + Multi-Provider Hub

## Summary
This PR adds Facebook OAuth as a conditional provider and updates the public sign-in hub to display both Google and Facebook buttons.

## Changes
- Provider: `src/features/auth/server/providers/facebook.ts`
- Options patch: `src/features/auth/server/options.ts` (conditional spread)
- UI: `FacebookButton` component + barrel export
- Public hub: pass both providers via `googleSlot` fragment
- Env: Append `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` to `.env.example`

## Setup
- Create a Facebook App → add "Facebook Login"
- Set Valid OAuth Redirect URIs:
  - http://localhost:3000/api/auth/callback/facebook
  - https://YOUR_DOMAIN/api/auth/callback/facebook
- Add envs:
  - FACEBOOK_CLIENT_ID
  - FACEBOOK_CLIENT_SECRET
  - NEXTAUTH_URL
  - NEXTAUTH_SECRET

## Test Plan
- Local: start dev, click "Log In With Facebook", complete OAuth, user + account records created
- Existing Google flow unaffected
- Credentials flow unchanged; email verification still required for credentials

## Risks
- Misconfigured redirect URIs → 400 from Facebook
- Missing envs → provider silently not registered (as intended)
MD

# ----------------------------------------------------------------------------
# 7) Typecheck & summary
# ----------------------------------------------------------------------------
say ""
say "🔎 Typechecking (no emit)..."
if command -v npx >/dev/null; then
  if [ "$APPLY" = "1" ]; then
    npx tsc --noEmit --skipLibCheck || true
  else
    printf "[dry-run] would run: npx tsc --noEmit --skipLibCheck\n"
  fi
fi

say ""
say "📦 Done. Review with:"
say "  git status"
say "  git diff"
say ""
say "How to run locally:"
say "  pnpm dev"
say ""
say "Env needed:"
say "  FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL"
say ""
say "Facebook App steps:"
say "  - Developers > Create App (Facebook Login)"
say "  - Valid OAuth Redirect URIs: http://localhost:3000/api/auth/callback/facebook"
say "  - Copy App ID/Secret into .env.local"
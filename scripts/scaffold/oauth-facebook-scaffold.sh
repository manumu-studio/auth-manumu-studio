#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# oauth-facebook-scaffold.sh
#
# Idempotent script to scaffold Facebook OAuth feature files.
# - DRY-RUN by default: shows what would be created
# - APPLY=1 to actually write files
# - Only creates files if missing OR empty
# - Never overwrites non-empty files
# - Branch name notice is configurable via EXPECTED_BRANCH
# ============================================================================

APPLY="${APPLY:-0}"
EXPECTED_BRANCH="${EXPECTED_BRANCH:-feature/oauth-facebook}"
root="$(pwd)"

log()  { printf "%b\n" "$*"; }
doit() {
  if [ "$APPLY" = "1" ]; then
    eval "$*"
  else
    printf "[dry-run] %s\n" "$*"
  fi
}

ensure_dir() {
  local d="$1"
  if [ -d "$d" ]; then
    log "✓ dir exists: $d"
  else
    doit "mkdir -p \"$d\""
  fi
}

# write_if_empty <path> <label> <<'EOF'
# Reads content from stdin and writes to file only if file is missing or empty
write_if_empty() {
  local path="$1"
  local label="$2"
  shift 2

  local dir
  dir="$(dirname "$path")"
  [ -d "$dir" ] || doit "mkdir -p \"$dir\""

  if [ -f "$path" ] && [ -s "$path" ]; then
    log "✓ non-empty, skipping: $path"
    # Consume stdin to avoid broken pipe
    cat >/dev/null
    return 0
  fi

  if [ "$APPLY" = "1" ]; then
    cat > "$path"
    log "✅ populated: $path ($label)"
  else
    # Dry-run: consume stdin but don't write
    cat >/dev/null
    printf "[dry-run] would populate: %s (%s)\n" "$path" "$label"
  fi
}

# append_to_file_if_missing <file> <marker> <content>
# Appends content to file if marker string is not found
append_to_file_if_missing() {
  local file="$1"
  local marker="$2"
  local content="$3"

  if [ ! -f "$file" ]; then
    if [ "$APPLY" = "1" ]; then
      printf "%s\n" "$content" > "$file"
      log "✅ created $file with content"
    else
      printf "[dry-run] would create %s\n" "$file"
    fi
    return
  fi

  if grep -qF "$marker" "$file" 2>/dev/null; then
    log "✓ already present in $file: $marker"
    return
  fi

  if [ "$APPLY" = "1" ]; then
    printf "\n%s\n" "$content" >> "$file"
    log "✅ appended to $file: $marker"
  else
    printf "[dry-run] would append to %s: %s\n" "$file" "$marker"
  fi
}

# backup_and_inplace_sed <file> <sed_script>
# Creates backup and applies sed script (BSD-compatible)
backup_and_inplace_sed() {
  local file="$1"
  local script="$2"
  [ -f "$file" ] || { log "⚠️  file not found for patch: $file"; return 1; }
  if [ "$APPLY" = "1" ]; then
    cp "$file" "$file.bak"
    # BSD sed: -i '' for in-place
    sed -i '' -E "$script" "$file"
    log "✅ patched: $file (backup: $file.bak)"
  else
    printf "[dry-run] would patch: %s\n" "$file"
  fi
}

# ============================================================================
# PREFLIGHT CHECKS
# ============================================================================

log "🔍 Preflight checks..."
log ""

# Check branch
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
if [ "$branch" != "$EXPECTED_BRANCH" ]; then
  log "⚠️  Expected branch '$EXPECTED_BRANCH', current: '$branch'"
else
  log "✓ On correct branch: $branch"
fi

# Check commands
command -v node  >/dev/null && log "✓ node found"  || log "⚠️  node not found"
command -v pnpm  >/dev/null && log "✓ pnpm found"  || log "⚠️  pnpm not found"

log ""
log "📁 Creating directories..."
log ""

# ============================================================================
# DIRECTORY STRUCTURE
# ============================================================================

ensure_dir "src/features/auth/server/providers"
ensure_dir "src/features/auth/components/ProviderButtons/FacebookButton"
ensure_dir "docs/journal"
ensure_dir "docs/pull-requests"

log ""
log "📄 Populating files..."
log ""

# ============================================================================
# FACEBOOK PROVIDER
# ============================================================================

write_if_empty "src/features/auth/server/providers/facebook.ts" "facebookProvider" <<'TS'
import FacebookProvider from "next-auth/providers/facebook";

/**
 * Facebook App Console → Facebook Login → Settings
 *
 * Authorized redirect URI:
 *   {APP_URL}/api/auth/callback/facebook
 *
 * Local development:
 *   http://localhost:3000/api/auth/callback/facebook
 */
export function facebookProvider() {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return FacebookProvider({
    clientId,
    clientSecret,
    authorization: {
      params: { scope: "public_profile" },
    },
    // Caution: enables account linking by email
    allowDangerousEmailAccountLinking: true,
  });
}
TS

# ============================================================================
# PATCH OPTIONS.TS TO INCLUDE FACEBOOK PROVIDER
# ============================================================================

OPTIONS="src/features/auth/server/options.ts"
if [ -f "$OPTIONS" ]; then
  # Add import if missing
  if ! grep -q 'from "@/features/auth/server/providers/facebook"' "$OPTIONS"; then
    if grep -q 'from "@/features/auth/server/providers/google"' "$OPTIONS"; then
      # Insert after google import
      backup_and_inplace_sed "$OPTIONS" $'s|(from "@/features/auth/server/providers/google";)|\\1\nimport { facebookProvider } from "@/features/auth/server/providers/facebook";|'
    else
      # Insert after credentials import or at top of imports
      backup_and_inplace_sed "$OPTIONS" $'s|(import.*Credentials.*)|\\1\nimport { facebookProvider } from "@/features/auth/server/providers/facebook";|'
    fi
    log "✅ added facebookProvider import"
  else
    log "✓ facebookProvider import already present"
  fi

  # Add to providers array if missing
  if grep -q 'providers: \[' "$OPTIONS"; then
    if ! grep -q 'facebookProvider' "$OPTIONS"; then
      # Insert after googleProvider spread if present, otherwise after Credentials
      if grep -q 'googleProvider()' "$OPTIONS"; then
        backup_and_inplace_sed "$OPTIONS" $'s|(\.\.\.\(googleProvider\(\) \? \[googleProvider\(\)!\] : \[\]\),?)|\\0\n    ...(facebookProvider() ? [facebookProvider()!] : []),|'
      else
        # Insert after Credentials block
        backup_and_inplace_sed "$OPTIONS" $'s|(Credentials\([^}]*\}\)),?|\\0,\n    ...(facebookProvider() ? [facebookProvider()!] : []),|'
      fi
      log "✅ added facebookProvider to providers array"
    else
      log "✓ facebookProvider already in providers[]"
    fi
  else
    log "⚠️  Could not find providers: [] in $OPTIONS; please patch manually."
  fi
else
  log "⚠️  Missing $OPTIONS — skipping patch."
fi

# ============================================================================
# FACEBOOK BUTTON COMPONENT
# ============================================================================

write_if_empty "src/features/auth/components/ProviderButtons/FacebookButton/FacebookButton.tsx" "FacebookButton" <<'TSX'
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
      const target =
        callbackUrl || (typeof window !== "undefined" ? window.location.origin : "/");
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
      className={[styles.btn, className].filter(Boolean).join(" ")}
    >
      {/* Facebook icon */}
      <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M22 12.06C22 6.48 17.52 2 11.94 2S2 6.48 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H8.4V12.06h2.04V9.88c0-2.02 1.2-3.14 3.03-3.14.88 0 1.8.16 1.8.16v1.98h-1.02c-1 0-1.32.62-1.32 1.26v1.91h2.25l-.36 2.91h-1.89V22c4.78-.76 8.44-4.92 8.44-9.94Z"
        />
      </svg>
      <span className={styles.label}>{loading ? "Opening Facebook…" : label}</span>
    </button>
  );
}
TSX

write_if_empty "src/features/auth/components/ProviderButtons/FacebookButton/FacebookButton.module.scss" "FacebookButton.module.scss" <<'SCSS'
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  width: 100%;
  transition: background-color 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #d1d5db;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn:focus-visible {
  outline: 2px solid #1d4ed8;
  outline-offset: 2px;
}

.icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  color: #1877f2;
}

.label {
  line-height: 1;
}
SCSS

write_if_empty "src/features/auth/components/ProviderButtons/FacebookButton/index.ts" "FacebookButton/index" <<'TS'
export { default } from "./FacebookButton";
TS

# ============================================================================
# UPDATE BARREL EXPORTS
# ============================================================================

PB_INDEX="src/features/auth/components/ProviderButtons/index.ts"
if [ -f "$PB_INDEX" ]; then
  if ! grep -q "FacebookButton" "$PB_INDEX"; then
    if grep -q "GoogleButton" "$PB_INDEX"; then
      # Add after GoogleButton
      backup_and_inplace_sed "$PB_INDEX" $'s|(export { default as GoogleButton })|\\1\nexport { default as FacebookButton } from "./FacebookButton";|'
    else
      # Append to end
      append_to_file_if_missing "$PB_INDEX" "FacebookButton" "export { default as FacebookButton } from \"./FacebookButton\";"
    fi
    log "✅ added FacebookButton to barrel exports"
  else
    log "✓ FacebookButton already in barrel exports"
  fi
else
  # Create barrel file if missing
  write_if_empty "$PB_INDEX" "ProviderButtons barrel" <<'TS'
export { default as AuthProvidersGroup } from "./AuthProvidersGroup";
export { default as GoogleButton } from "./GoogleButton";
export { default as FacebookButton } from "./FacebookButton";
TS
fi

# ============================================================================
# UPDATE PUBLIC PAGE (OPTIONAL - USER MAY NEED TO MANUALLY INTEGRATE)
# ============================================================================

PAGE="src/app/(public)/page.tsx"
if [ -f "$PAGE" ]; then
  # Ensure import of FacebookButton
  if ! grep -q "FacebookButton" "$PAGE"; then
    if grep -q 'from "@/features/auth/components/ProviderButtons"' "$PAGE"; then
      # Update import to include FacebookButton - match import statement and add FacebookButton
      # Pattern: { AuthProvidersGroup, GoogleButton } -> { AuthProvidersGroup, GoogleButton, FacebookButton }
      backup_and_inplace_sed "$PAGE" $'s|({[^}]*GoogleButton[^}]*})|{\\1, FacebookButton}|'
      # If that didn't work, try simpler pattern
      if ! grep -q "FacebookButton" "$PAGE"; then
        backup_and_inplace_sed "$PAGE" $'s|(GoogleButton)|\\1, FacebookButton|'
      fi
      log "✅ added FacebookButton to imports"
    else
      log "⚠️  Could not auto-add FacebookButton import. Please add manually to $PAGE"
    fi
  else
    log "✓ FacebookButton already imported in page.tsx"
  fi

  # Note: User should manually add FacebookButton to googleSlot or create separate slot
  if ! grep -q "<FacebookButton" "$PAGE"; then
    log "ℹ️  Remember to add <FacebookButton /> to your UI (e.g., in googleSlot)"
  fi
else
  log "⚠️  $PAGE not found. Skipping UI integration."
fi

# ============================================================================
# ENV FILE UPDATES
# ============================================================================

log ""
log "🔧 Updating .env.example..."
log ""

append_to_file_if_missing ".env.example" "FACEBOOK_CLIENT_ID" "# Facebook OAuth
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET="

# ============================================================================
# DOCUMENTATION
# ============================================================================

DATE_STR="$(date +%Y-%m-%d)"
write_if_empty "docs/journal/ENTRY-5.md" "ENTRY-5" <<EOF
# ENTRY-5 — Facebook OAuth Integration

**Date:** $DATE_STR

## Summary
- Added Facebook OAuth provider (conditional)
- UI: FacebookButton component
- Updated NextAuth options to include Facebook provider
- .env.example extended with FACEBOOK_* keys

## Files
- src/features/auth/server/providers/facebook.ts
- src/features/auth/server/options.ts (patched)
- src/features/auth/components/ProviderButtons/FacebookButton/*
- src/features/auth/components/ProviderButtons/index.ts
- .env.example

## Notes
- Redirect URI: \`/api/auth/callback/facebook\`
- allowDangerousEmailAccountLinking enabled for account linking by email
- Provider only enabled if FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET are set
EOF

write_if_empty "docs/pull-requests/PR-0.5.0.md" "PR draft" <<'MD'
# PR 0.5.0 — Facebook OAuth Integration

## Summary
This PR adds Facebook OAuth as a conditional provider alongside Google and Credentials.

## Changes
- Provider: `src/features/auth/server/providers/facebook.ts`
- Options patch: `src/features/auth/server/options.ts` (conditional spread)
- UI: `FacebookButton` component + barrel export
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

# ============================================================================
# SUMMARY
# ============================================================================

log ""
log "════════════════════════════════════════════════════════════════════════"
log "✅ Done!"
log ""
if [ "$APPLY" = "1" ]; then
  log "Mode: ✍️  APPLY (files were created/modified)"
else
  log "Mode: 👁️  DRY-RUN (no changes made)"
  log ""
  log "To apply changes, run:"
  log "  APPLY=1 ./oauth-facebook-scaffold.sh"
  log ""
  log "Tip: run with a custom expected branch, e.g.:"
  log "  EXPECTED_BRANCH=feature/oauth-facebook ./oauth-facebook-scaffold.sh"
fi
log ""
log "📋 Review changes with:"
log "  git status"
log "  git diff"
log ""
log "🔍 Reminders:"
log "  • Ensure .env has FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET set"
log "  • Ensure .env has NEXTAUTH_URL and NEXTAUTH_SECRET set"
log "  • Facebook App Console → Facebook Login → Settings"
log "  • Set Valid OAuth Redirect URIs: http://localhost:3000/api/auth/callback/facebook"
log "  • Add FacebookButton to your UI (e.g., in googleSlot or separate slot)"
log "  • Run 'pnpm install' if dependencies were added"
log "════════════════════════════════════════════════════════════════════════"
log ""


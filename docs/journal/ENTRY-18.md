# ENTRY-18 — Password Security, Signup UX, and Theme Polish

**Date:** 2026-03-03
**Type:** Feature + UX
**Branch:** `feat/password-security-rules` (or current working branch)
**Version:** `1.7.0`

---

## What I Did

Upgraded password validation to enterprise-grade rules (Microsoft/Google-style), improved signup form UX (password tooltip, country dropdown positioning, autofill handling), fixed auth background fit across environments, added smooth theme transitions, and applied a workaround for the Next.js 15 devtools React Client Manifest bug.

---

## Features

### 1. Password Security Upgrade

- Replaced minimal 8-char rule with full rule set: min 8, max 128, uppercase, lowercase, number, special char, no leading/trailing spaces
- Added `PASSWORD_RULES` array and `passwordSchema` in `fields.ts` for shared validation
- Updated `signup.ts`, `reset.ts`, and `account.ts` to use the new schema (repeatpassword, confirmPassword inherit rules)
- Created `PasswordStrength` component with **subtle tooltip** (info icon) that shows requirements on hover/focus; checklist updates in real time as user types

### 2. Country Dropdown Fixes

- Moved dropdown inside `inputWrapper` so it positions correctly under the Country input
- Added `background-size: cover`, `background-position: center`, `background-repeat: no-repeat` to AuthShell for consistent background fit (local vs production)
- Mitigated browser address autofill: `autocomplete="nope"`, `data-form-type="other"`, `data-lpignore="true"`, `autocomplete="off"` on signup form
- Raised dropdown z-index and ensured width matches input

### 3. Theme Transition

- Added 0.12s transition for `background-color`, `color`, `border-color`, `box-shadow` when system dark/light preference changes
- Uses `cubic-bezier(0.4, 0, 0.2, 1)` for a polished feel
- Applied globally to layout containers, inputs, buttons, labels, cards

### 4. Next.js Dev Workaround

- Set `devIndicators: false` in `next.config.ts` to reduce SegmentViewNode / React Client Manifest errors
- Added `dev:clean` script: `rm -rf .next && next dev` for when the error recurs

---

## Files Touched

| File | Action | Notes |
|------|--------|------|
| `src/lib/validation/fields.ts` | Modify | PASSWORD_RULES, passwordSchema with full rule set |
| `src/lib/validation/signup.ts` | Modify | repeatpassword uses passwordSchema |
| `src/lib/validation/reset.ts` | Modify | confirmPassword uses passwordSchema |
| `src/components/ui/PasswordStrength/` | Create | 4-file component (tooltip-based) |
| `src/features/auth/components/steps/SignupStep/SignupStep.tsx` | Modify | PasswordStrength wrapper, SearchableSelect |
| `src/components/ui/SearchableSelect/SearchableSelect.tsx` | Modify | Dropdown inside inputWrapper, autofill attrs |
| `src/components/ui/SearchableSelect/SearchableSelect.module.scss` | Modify | Dropdown positioning, z-index, min-width |
| `src/components/ui/SearchableSelect/SearchableSelect.types.ts` | Modify | autoComplete prop |
| `src/components/ui/AuthShell/AuthShell.module.scss` | Modify | background-size/position/repeat |
| `src/styles/globals.scss` | Modify | Theme transition variables and rules |
| `next.config.ts` | Modify | devIndicators: false |
| `package.json` | Modify | dev:clean script |

---

## Decisions

- **Tooltip over always-visible checklist** — Keeps signup form compact; requirements appear on demand (hover info icon or focus password input)
- **PasswordStrength as wrapper** — Wraps password input and renders trigger + tooltip; tooltip shows on focus or icon hover
- **Autofill mitigation** — `autocomplete="nope"` and form-level `autocomplete="off"` to reduce Chrome address autofill on Country field
- **Theme transition 0.12s** — Short enough to feel snappy, long enough to avoid jarring flash
- **devIndicators: false** — Workaround for known Next.js 15 devtools bug; dev:clean script for cache reset when needed

---

## Still Open

- Verify Country autofill behavior in Safari/Firefox (Chrome can still show address autofill despite mitigations)
- Consider adding PasswordStrength to Change Password and Reset Password forms for consistency

---

## Validation

```bash
pnpm tsc --noEmit
pnpm build
pnpm lint
```

All passed.

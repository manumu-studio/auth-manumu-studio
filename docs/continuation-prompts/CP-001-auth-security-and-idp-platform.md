# CP-001 — Auth Security Hardening + IdP-Platform Roadmap

**Date:** 2026-06-17
**Branch:** `fix/oauth-signup-redirect` (security/IdP work goes on NEW branches — see below)
**Status:** READY

---

You are resuming work on the **m2-next-auth-prisma-postgres-starter** OIDC + PKCE authorization server (auth.manumustudio.com; Next.js 15, NextAuth v4, Prisma 6, Neon Postgres, Vercel). Three relying parties federate to it: **LSA**, **CareerKit** (ats-career-kit), **FixtureLog** — all proper OIDC RPs that store no password and link by the shared `sub` (= auth `User.id` CUID).

## What was accomplished this session

1. **Deep security audit** → `docs/audits/SECURITY-AUDIT-2026-06-17.md` (5 parallel adversarial reviews). Headline: open registration (C1), rate limiting inactive in prod (C2), vulnerable Next.js + no audit CI gate (C3); plus HIGH/MEDIUM findings.
2. **Two deep-research docs** (run on claude.ai, saved):
   - `docs/research/compass_artifact_wf-a1e2c2dd-...md` — hardening into a serious gated IdP.
   - `docs/research/compass_artifact_wf-aa0ae17e-...md` — "build your own Clerk" feasibility + reference architecture + 5-phase migration + concrete Prisma models.
   - Prompt sources: `docs/research/DEEP-RESEARCH-PROMPT-auth-hardening.md`, `docs/research/DEEP-RESEARCH-PROMPT-distributable-idp.md`.
3. **Two packets scaffolded (NOT yet executed by Cursor):**
   - `docs/build-packets/PACKET-security-hardening-now.md` + tasks `docs/cursor-tasks/PACKET-security-hardening-now/TASK-010..015` (branch `fix/security-hardening-now`).
   - `docs/build-packets/PACKET-gated-registration.md` + tasks `docs/cursor-tasks/PACKET-gated-registration/TASK-016..019` (branch `feat/gated-registration`).

## Key decisions (do not relitigate)
- **Extend the existing server; do NOT fork** SuperTokens/Logto/etc. Borrow from Better Auth only if polished components are later needed.
- **Redirect-based auth, NOT embedded credential collection.** The "login modal" = redirect/popup to auth.manumustudio.com. The `<UserButton/>`-style avatar (settings + sign out) is fine.
- **Normalized data model:** global `User` (credentials once) + `App` registry + `AppMembership(userId, appId, role, metadata)` join + `AppSubject` (resolves token sub → user). NO "email + N columns", NO per-app passwords. (Prisma models are in the IdP research doc, §9.)
- **Pairwise `sub` for NEW clients only;** the 3 live RPs stay `subject_type=public` (preserves their shared-`sub` join key). This is Phase 3 of the migration and the same item as the deferred PPID work.
- Next.js: app is on 15.5.7 → bump to **≥15.5.19** (NOT exposed to CVE-2025-29927, which is fixed in 15.2.3; driver is the RCE/source-exposure CVEs).

## The single next action
**Execute `PACKET-security-hardening-now` first** (point Cursor at `docs/build-packets/PACKET-security-hardening-now.md`), since hardening is the prerequisite. Then `PACKET-gated-registration`. After Cursor completes each, create the build-packet report in `docs/build-packet-reports/` (user creates journal + PR docs).

## Remaining / not yet done
- **Packetize the IdP-platform migration** (Phases 1–5 from the IdP research doc): `AppMembership` schema, promote client registry → `App` table + admin dashboard, pairwise-`sub` for new clients, thin redirect-based `@manumu/auth` SDK + `<SignInButton>`/`<UserButton>`. This comes AFTER hardening + gated registration. Not yet scaffolded.
- ⚠️ **Incident file for C1–C3** (`docs/incidents/INCIDENT-*.md`) — recommended per the Incident Rule (live prod exposure), offered but not created.

## Read these to regain full context
1. `docs/audits/SECURITY-AUDIT-2026-06-17.md`
2. `docs/research/compass_artifact_wf-aa0ae17e-...md` (IdP migration + Prisma models)
3. `docs/build-packets/PACKET-security-hardening-now.md` and `PACKET-gated-registration.md`

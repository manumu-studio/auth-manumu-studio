# Hardening a Self-Built OIDC + PKCE Server into a Production-Grade Private IdP

## TL;DR
- **Harden, don't rebuild — but migrate the framework.** Your custom AS is already ~80% of an RFC-9700-compliant authorization server; the audited weaknesses are implementation gaps fixable in days. Adopt OAuth 2.1 / RFC 9700 as the mandatory baseline, target OWASP ASVS v5.0 Level 2, and treat FAPI 2.0 / DPoP / mTLS as overkill for a private low-volume first-party IdP. The one thing you should *not* keep as-is is NextAuth v4 (end-of-life) on a Next.js version exposed to CVE-2025-29927.
- **Registration gating: default to invite-token + email allowlist, with admin approval as the fallback.** For a closed first-party portfolio, public self-service registration should be eliminated entirely. A signed, single-use invite token stored in Prisma plus Cloudflare Turnstile on the few remaining public endpoints kills the open-signup attack surface at near-zero cost.
- **The NOW list is short and high-impact:** patch Next.js, enforce PKCE S256, make auth-code consumption atomic, wire the Upstash limiter with correct Vercel IP derivation, replace the bare-SHA-256 OTP hash with HMAC, and close open registration. Everything else (Argon2id migration, pairwise sub, Auth.js v5, key rotation automation) is NEXT/LATER.

## Key Findings

**1. The standards baseline is now unambiguous and free.** RFC 9700 (*Best Current Practice for OAuth 2.0 Security*; BCP 240, DOI 10.17487/RFC9700, January 2025, 46 pages; authors T. Lodderstedt (SPRIND), J. Bradley (Yubico), A. Labunets (Independent), D. Fett (Authlete); updates RFCs 6749/6750/6819) is the authoritative security profile, and OAuth 2.1 (draft-ietf-oauth-v2-1) consolidates it. Both require PKCE for all authorization-code flows, exact redirect-URI matching, and ban the implicit and ROPC grants; refresh tokens must be sender-constrained or rotated. OWASP ASVS v5.0.0, "Released LIVE on stage at Global AppSec EU Barcelona 2025" (30 May 2025) — ~350 requirements across 17 chapters, up from 286 across 14 chapters in v4.0.3 — is the right verification yardstick; Level 2 fits a high-value-but-unregulated IdP. FAPI 2.0 (finalized February 2025) self-describes as "suitable for protecting APIs in high-value scenarios" (open banking, e-health, e-government) — overkill here.

**2. Your audited weaknesses map cleanly onto specific, well-documented fixes.** Every weakness corresponds to a named RFC section, OWASP cheat-sheet rule, or CVE. None require a rebuild.

**3. The framework and supply-chain risk is your single most urgent exposure.** CVE-2025-29927 is a trivial middleware-auth-bypass via the `x-middleware-subrequest` header, and NextAuth v4 is end-of-life. These are the items most likely to "easily get attacked."

## Details

### 1. Threat model & standards — MANDATORY vs RECOMMENDED vs OVERKILL

**The authoritative 2025–2026 baseline:**
- **RFC 9700** — *Best Current Practice for OAuth 2.0 Security* (BCP 240, January 2025). Build against this.
- **OAuth 2.1** (draft-ietf-oauth-v2-1) — not yet a final RFC, but the de-facto profile folding RFC 6749 + RFC 7636 (PKCE) + RFC 9700 into one spec. Authoritative *direction*.
- **OWASP ASVS v5.0.0** (May 2025) — the verification standard; Level 2 is your target.
- **OIDC Core** security considerations — ID-token validation, nonce, `sub` handling.
- **FAPI 2.0 Security Profile** — finalized OpenID Final Specification, published 22 February 2025 (approval announced 19 February 2025; vote "Approve – 82 votes, Object – 0 votes, Abstain – 14 votes … Total votes: 96 out of 401 members = 23.9% > 20% quorum"). Authors Fett, Tonge, Heenan.

**MANDATORY for your private IdP (RFC 9700 §2 core practices):**
- Authorization code + PKCE with **S256 enforced**. RFC 9700 §2.1.1: "Authorization servers MUST support PKCE [RFC7636]. If a client sends a valid PKCE code_challenge parameter … the authorization server MUST enforce the correct usage of code_verifier at the token endpoint." RFC 7636 states `plain` "SHOULD NOT be used in new implementations." → *fixes "PKCE plain accepted."*
- **Exact string matching** of redirect URIs (RFC 9700 §2.1: "MUST utilize exact string matching except for port numbers in localhost redirection URIs of native apps").
- One-time, single-use authorization codes, atomically consumed. → *fixes "non-atomic single-use."*
- No implicit grant, no ROPC.
- TLS everywhere; PKCE/`state` for CSRF; `iss` in the authorization response (RFC 9207) to prevent mix-up attacks.
- Refresh tokens (if issued): rotation with reuse detection (RFC 9700 §4.14).
- Publish `code_challenge_methods_supported` in AS metadata (RFC 8414).

**RECOMMENDED (high-value but solo):** Argon2id hashing; HIBP breached-password check; account lockout/throttling; idle + absolute session timeouts; pairwise subject identifiers; JWKS key rotation; audit logging; refresh-token rotation with family revocation.

**OVERKILL for a private, low-volume, first-party IdP (be honest):**
- **Full FAPI 2.0 compliance** — *mandates* sender-constrained tokens via mTLS (RFC 8705) **or** DPoP (RFC 9449), mandatory PAR (RFC 9126), non-secret client auth (mTLS or `private_key_jwt`), and excludes public clients entirely. FAPI itself notes some mitigations "may not be necessary for many ecosystems" and target "a powerful attacker."
- **DPoP / mTLS sender-constrained tokens** — RFC 9700 lists sender-constraining as SHOULD (not MUST) for access tokens; for first-party apps over TLS, short-lived bearer tokens + rotation suffice.
- **PAR (RFC 9126), JAR, JARM, Rich Authorization Requests** — multi-party/financial value only.

### 2. Gated registration (TOP PRIORITY) — eliminate open self-service signup

Your highest-leverage fix and the audit's headline weakness.

| Pattern | Security properties | UX cost | Abuse resistance | Prisma/Next.js sketch |
|---|---|---|---|---|
| **Invite token / allowlist** | Closed by default; nothing created without a server-issued secret | Low | High — no token, no account | `InviteToken { id, tokenHash, email?, expiresAt, usedAt, createdBy }`; issue 256-bit random token, store only its SHA-256, email link to `/register?token=…`; Server Action validates hash + expiry + unused and atomically sets `usedAt` |
| **Admin approval / waitlist** | Human gate; zero automated creation | High (delay) | Very high | `User.status = PENDING\|APPROVED`; signups queue; admin flips status |
| **Email-domain restriction** | Restricts to known orgs | Very low | Medium | Zod `.refine()` vs allowed-domains table before OTP send |
| **Social/SSO-only + allowlist** | Delegates auth; you store only allowlist | Low | High | Match federated email/sub vs allowlist; reject otherwise |
| **Entitlement/payment-gated** | Account requires verified entitlement | Medium | Very high | Create user only on verified payment/entitlement webhook |
| **Referral codes** | Network-gated, rate-limited per referrer | Low | Medium (codes leak) | `ReferralCode { code, ownerId, maxUses, uses }` |

**DECISIVE RECOMMENDATION:** Use **invite-token + email allowlist as the default, with admin-approval as the catch-all, and Cloudflare Turnstile + a disposable-email block on any endpoint that remains publicly reachable (OTP-send, invite-redemption).** Defense-in-depth: the invite token closes automated signup; the allowlist closes invite leakage; admin approval handles exceptions; Turnstile + rate limiting protect the rest. Concretely: delete the open `register` path, and gate the registration Server Action on a valid, unused, unexpired invite token consumed atomically in the same `prisma.$transaction` that creates the user. → *fixes "open self-service registration with no gating."*

### 3. Bot & abuse defense

| Option | Integration effort | Privacy | Effectiveness | Cost |
|---|---|---|---|---|
| **Cloudflare Turnstile** | Minutes; widget + server verify; no Cloudflare hosting required | No cookies, no cross-site tracking; GDPR-friendly | Strong, invisible; backed by Cloudflare network signals | Free, unlimited |
| **hCaptcha** | Minutes; near-identical reCAPTCHA API | Privacy-focused; visible challenges | Strong behavioral/risk scoring; better for high-risk | Free tier; revenue-share at high volume |
| **Proof-of-work (ALTCHA / Friendly Captcha)** | Low; self-hostable | Best — no third party | Moderate; drains CPU/battery on old mobiles | Free/OSS |
| **Device attestation / fingerprinting** | High | Worst (collects many signals) | High but heavyweight | Paid |

**RECOMMENDATION: Cloudflare Turnstile** — free, invisible, no cookies, minutes to integrate, no requirement to move DNS to Cloudflare. Apply to OTP-send, invite-redemption, and password-login.

**Disposable/temporary email blocking:** Reject signups from disposable domains using a continuously updated blocklist (e.g. the open VegaStack `disposable-emails-detector` list of 100,000+ domains updated daily, or a paid API such as IPQualityScore that updates "multiple times per hour"). Check `email.split('@')[1]` before sending OTP; pair with MX-record verification.

**Email/OTP-bombing prevention:** Rate-limit OTP-send per-email AND per-IP (e.g. 3/15 min per email + a global per-IP cap), require Turnstile before send, enforce a minimum resend interval, and cap OTP verification attempts per code (lock after 5). *This is what the "declared-but-unimplemented account lockout" should actually do.*

**Distributed (botnet) resilience where per-IP fails:** Per-IP limits collapse under distributed attacks, so layer: (1) per-account/per-email keys (an attacker can't distribute across the victim's single email), (2) Turnstile as a cost-imposer, (3) global circuit-breaker limits on expensive endpoints (total OTP-sends/min across all IPs), and (4) the invite-gate itself — no valid token means the request dies before touching email/DB.

### 4. Rate limiting & edge — correct distributed limiting on Vercel

**Why in-memory silently fails:** Each serverless/edge invocation may run in a fresh isolate with its own memory; an in-process `Map` counter resets per cold start and is never shared across concurrent invocations, so the limiter "works" locally and does nothing in production. *This is exactly your audited "silent in-memory fallback."* The fix is a shared store: **Upstash Redis over HTTP/REST** (the only Redis transport that works in the Edge runtime, where Node TCP is unavailable).

**Deriving a trustworthy client IP on Vercel:** Vercel **overwrites `x-forwarded-for` and does not forward external IPs, specifically to prevent IP spoofing**; it also sets `x-vercel-forwarded-for` and `x-real-ip`. Because Vercel terminates and rewrites these at its edge, the platform-set value is trustworthy. **Naive XFF parsing is exploitable on infrastructure that appends rather than overwrites** — MDN warns that "if the server can be directly connected to from the internet … no part of the X-Forwarded-For IP list can be considered trustworthy," and you must use only the value added by your trusted proxy. On Vercel, read the platform header (`x-forwarded-for`, which Vercel controls, or `ipAddress()` from `@vercel/edge`) and never trust a client-supplied XFF. (Trusting a custom XFF requires Vercel's Enterprise "trusted proxy" feature.)

**Algorithms (@upstash/ratelimit):**
- **Sliding window** — smoothest, prevents the fixed-window "burst at boundary" problem; best default for auth endpoints.
- **Fixed window** — cheapest, allows ~2× burst at the boundary.
- **Token bucket** — tolerates bursts while capping sustained rate.

**Concrete endpoint protection:**
- `/token` — strict sliding window per client_id + per IP (e.g. 10/min); 429 on failure.
- `/userinfo` — moderate per-access-token/per-IP window.
- **OTP-send** — strict per-email AND per-IP sliding window + Turnstile + global circuit breaker.
- Instantiate the `Ratelimit` object at module scope (outside the handler) so the optional `ephemeralCache` Map can short-circuit repeated calls while the function is hot, reducing Redis round-trips. → *fixes "rate limiting inactive in serverless."*

### 5. Credential & token modernization

**Password storage (OWASP Password Storage Cheat Sheet, 2025):**
- **Argon2id** with **m=19456 (19 MiB), t=2, p=1** (minimum) or **m=47104 (46 MiB), t=1, p=1** (alternative). *Migrate off bcrypt cost-10.*
- **Pepper:** a secret shared across hashes, stored *separately* from the DB (Vercel env var / secret manager), applied via HMAC before hashing. OWASP: "alone, it provides no additional secure characteristics" but adds defense-in-depth against DB-only compromise.
- **Migration path:** hash-on-next-login — verify against the existing bcrypt hash, then re-hash with Argon2id and update; or wrap existing bcrypt hashes in Argon2id. → *fixes "bcrypt cost 10, no pepper."*
- **HIBP Pwned Passwords k-anonymity:** SHA-1 the candidate password, send only the first 5 hex chars to `https://api.pwnedpasswords.com/range/{prefix}`, compare returned suffixes locally. The full password/hash never leaves your server. → *wires up the "declared-but-unimplemented HIBP check."*

**OTP / low-entropy secret storage:** A bare SHA-256 over a 6-digit code is brute-forceable offline in microseconds (only 10⁶ candidates; SHA-256 is a fast hash). Two correct options: **(a) HMAC-SHA-256 with a server-side secret key** (cheap; the secret defeats offline brute force even if the DB leaks), or **(b) a slow KDF** (Argon2id/bcrypt) over the code. For a short-lived 6-digit OTP, **HMAC with a server secret is the pragmatic right answer** — combined with a strict verification-attempt cap and short expiry. Always compare with `crypto.timingSafeEqual`. → *fixes "OTP stored as bare SHA-256."*

**Session lifecycle (ASVS v5.0 / NIST SP 800-63B aligned):** Implement an **idle timeout** and an **absolute maximum lifetime**, both enforced server-side, with re-authentication on privilege change (and offer "terminate all other sessions" after password/MFA change). ASVS v4 reference values: L1 ≈ 30 days; L2 ≈ 12 hours or 30 min idle. ASVS v5 reframes these as documented, risk-justified decisions against NIST 800-63B. → *wires up "declared-but-unimplemented idle session timeout."*

**Token security — WARRANTED vs OVER-ENGINEERING at your scale:**
- **Refresh-token rotation with reuse detection** — WARRANTED (RFC 9700 §4.14): a stolen old token is invalidated; reuse triggers family revocation. Cheap with Prisma (token family ID + revoked flag).
- **`jti` tracking / token revocation list** — WARRANTED-lite. Keep RS256 access/ID tokens short-lived; maintain a small revocation/`jti` table only for refresh tokens and forced logout. A full per-access-token revocation store reintroduces the statefulness JWTs avoid — keep access tokens short instead.
- **DPoP (RFC 9449) / mTLS (RFC 8705)** — OVER-ENGINEERING for first-party apps over TLS. Revisit only if you ever expose high-value third-party APIs.

### 6. Privacy / subject identifiers

**The risk of a shared `sub`:** Sending the same `sub` to every RP lets any two RPs (CareerKit, FixtureLog, LSA) — or anyone who compromises one — correlate the same user across all apps, and if the `sub` is or embeds the email/user-id it leaks PII. OIDC Core §8 defines **pairwise** subject identifiers (PPIDs): the OP "MUST calculate a unique sub value for each Sector Identifier" and the value "MUST NOT be reversible by any party other than the OpenID Provider."

**Implementation:** Compute `sub = HMAC/SHA-256(sector_identifier + local_account_id + secret_salt)`. The **sector identifier** is the host of the client's `redirect_uri`, or — when a client has multiple redirect hosts or you want several clients to share an ID — the host of a registered **`sector_identifier_uri`** (a JSON file listing the client's redirect URIs). Per-client config: `subject_type = public | pairwise`.

**Migration without breaking CareerKit/FixtureLog/LSA (decisive plan):**
1. Add to the Prisma client registry: `subjectType` (`public`/`pairwise`), optional `sectorIdentifierUri`, and a per-client salt.
2. **Set all three existing clients to `subject_type = public`** so their current shared `sub` is unchanged — zero breakage.
3. Default **new** clients to `subject_type = pairwise`.
4. Add a `ClientSubjectIdentifier { userId, clientId, ppid }` table (or compute deterministically from a stored per-user salt) so PPIDs are stable and idempotent.
5. Token-issuance logic: `if client.subjectType === 'pairwise' → emit PPID; else → emit shared sub`.
This is purely additive; existing RPs keyed on the shared `sub` never see a change. → *fixes "no pairwise / per-app subject identifiers."*

### 7. Framework & supply chain

**NextAuth v4 → Auth.js v5:** v5 is a rewrite around `@auth/core` with stricter OAuth/OIDC spec-compliance (which "might break some existing OAuth providers"). Breaking changes: config moves to a root `auth.ts` exporting `{ handlers, auth, signIn, signOut }`; the universal `auth()` replaces `getServerSession`/`getToken`/`withAuth`; `next-auth/middleware` and `next-auth/next` imports are replaced; minimum Next.js 14; `@next-auth/prisma-adapter` → `@auth/prisma-adapter`; **session-cookie prefix changes from `next-auth.session-token` to `authjs.session-token`** (forces re-login unless you bridge the cookie in middleware); env var `NEXTAUTH_SECRET` → `AUTH_SECRET`. No breaking DB-schema changes. Realistic effort for a custom AS: ~1 week (1 day planning, 2–3 days code, 2–3 days testing, 1 day staged deploy). **Security implication:** v4 is EOL and won't receive security patches — staying on it is the real risk. A credible alternative is **Better Auth** (markets a direct migration path), but for minimal churn, Auth.js v5 is the conservative choice.

**Next.js patching (CVE-2025-29927):** Per GitHub Advisory GHSA-f82v-jwr5-mffw / NVD, this is **CVSS 3.1 base 9.1 Critical (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N), CWE-285; EPSS exploitation probability 92.955% (100th percentile)**, reported by Rachid Allam ("cold-try"), published Mar 21, 2025. An attacker sets the internal `x-middleware-subrequest` header to skip middleware entirely (for 15.x, repeating the value to hit `MAX_RECURSION_DEPTH` of 5). **Fixed in 12.3.5 / 13.5.9 / 14.2.25 / 15.2.3.** **Remediate immediately:** upgrade Next.js, and as defense-in-depth strip `x-middleware-subrequest` at the edge. Vercel-hosted apps received platform-level firewall mitigation, but you must still patch. Crucially: **never rely on middleware alone for authorization** — enforce authz in the route/Server Action too. → *fixes "critical Next.js CVE present."*

**CI security gate (GitHub Actions) — block merges on:**
- `pnpm audit --audit-level=high` (or `npm audit`). → *fixes "no npm audit CI gate."*
- **Secret scanning** — gitleaks or trufflehog.
- **SAST** — CodeQL (free for public repos) or Semgrep.
- **Dependency review** — GitHub `dependency-review-action` on PRs.
- **SBOM** — CycloneDX generation as a release artifact.
- Pin/auto-update with Dependabot or Renovate.

### 8. Build vs Buy — decisive recommendation

| Option | Security posture | Gated-reg OOTB | OIDC compliance | Self-host | Cost (2026) | Migration effort | Lock-in |
|---|---|---|---|---|---|---|---|
| **Harden current self-build** | You own it; can hit RFC 9700 | You build it (already are) | Already implemented | N/A (Vercel) | ~$0 + your time | None | None |
| **Keycloak** | Battle-tested; Argon2 default; DPoP support | Yes | Full OIDC/SAML | Heavy (JVM/Quarkus) | Free + infra/ops | High | Low |
| **Zitadel** | Modern, event-sourced, Go | Yes | OIDC/OAuth/SAML | Single binary; needs HTTP/2 | Free OSS / cloud; AGPL-3.0 since 2025 | High | Low–med |
| **Authentik** | Flexible flows; proxy mode; MIT | Yes | OIDC/OAuth/SAML/LDAP | Python+Go+Postgres | Free OSS; enterprise add-on | High | Med |
| **Ory (Hydra/Kratos)** | API-first; OIDF-certified Hydra | Kratos flows | Full | Modular, complex to wire | Free OSS / Ory Network | High | Low |
| **Logto / SuperTokens** | Modern, developer-first | Yes | OIDC | Yes | Free OSS tiers | Med–high | Low–med |
| **Auth0** | Mature, certified | Yes | Full | No (managed) | 25k MAU free; ~$35–150/mo base, $0.07/MAU overage; migration off painful (no hash export) | Med | High |
| **Clerk** | Best Next.js DX | Yes (waitlist/allowlist/invite built-in) | OIDC | No | Reported 10k→~50k MAU free (early 2026), then $25/mo + $0.02/MAU | Med | High |
| **WorkOS (AuthKit)** | Enterprise-grade | Yes | OIDC/SAML | No | Per workos.com/pricing: free up to 1M MAU, then $2,500/mo per additional 1M MAU; Enterprise SSO $125/connection/month | Med | Med |
| **Stytch** | Passwordless-first | Yes | OIDC | No | 10k MAU free, then per-MAU | Med | Med |

**DECISIVE RECOMMENDATION: HARDEN the current self-build, migrate the framework to Auth.js v5, and do NOT adopt a managed IdP or re-platform to open source — yet.** Rationale:
1. You already have a working, RFC-9700-shaped AS with OIDC, PKCE, JWKS, RP-initiated logout, and a client registry. The audited gaps are *implementation* gaps, not architectural ones — fixable in days, not a rebuild.
2. Re-platforming to Keycloak/Zitadel/Authentik is high effort (re-host a JVM/Go service, migrate users, re-integrate three RPs) and trades your control for operational burden — the opposite of what a solo, budget-conscious dev wants.
3. Managed (Clerk/WorkOS/Auth0) would solve gating and DPoP instantly and is the strongest *fallback*, but it introduces per-MAU lock-in, a migration that breaks your existing shared-`sub` keying, and recurring cost — and it removes the "I run my own serious auth" goal you stated.
4. **Tripwire to revisit:** if you ever (a) onboard third-party (non-first-party) RPs, (b) need SAML/SCIM/enterprise SSO, (c) face a regulatory compliance requirement, or (d) spend more than a few hours/month on auth ops — adopt **WorkOS AuthKit** (free up to 1M MAU) or **Clerk** (best Next.js DX). Until then, hardening wins on cost, control, and effort.

### 9. Operations — minimum viable security ops for a solo dev

**JWKS signing-key rotation:** Use overlapping keys with a grace period. Sequence: (1) generate a new keypair with a new `kid` and publish its public key in the JWKS *before* signing with it (let clients cache it; respect `Cache-Control` max-age, e.g. 10 min); (2) after an announcement window (commonly 24–48 h), switch signing to the new key; (3) keep the old public key in the JWKS for a retirement period ≥ the longest token TTL + cache delay; (4) remove it once no old-key tokens can still be valid. Always publish ≥2 keys during rotation and select by `kid`. Cadence: rotate periodically (e.g. quarterly) plus emergency rotation on suspected compromise (pull the key immediately and force re-auth). Store keys in Postgres so all serverless instances share them.

**Secret management:** Vercel env vars are acceptable at this scale for the pepper, OTP HMAC key, and DB creds — keep production/preview separated and rotate on staff change or suspected leak. Graduate to a dedicated secrets manager only if you add collaborators or compliance needs.

**Audit logging & lightweight SIEM:** Log (with no secrets/tokens): logins (success/fail), OTP sends/verifies, password changes/resets, invite issuance/redemption, client-registry changes, token issuance/refresh/revocation, admin actions, and rate-limit/Turnstile rejections. Ship structured logs to a low-cost sink (Vercel Log Drains → an aggregator, or a Postgres `AuditLog` table). Alert on spikes in failed logins, OTP sends, and 429s.

**Anomaly/breach detection & IR basics:** Watch for credential-stuffing patterns (many accounts, few attempts each), OTP-bombing, and reuse of revoked refresh tokens (auto-revoke the family + alert). IR basics: a documented runbook (rotate keys/secrets, revoke sessions, force re-auth, disable affected clients) and `git`-tracked deploys for fast rollback.

**Pragmatic compliance posture:** **Worth pursuing solo:** ASVS v5.0 Level 2 as a self-assessment checklist (a large share of requirements are automatable in CI), and the OWASP cheat sheets as your operational bar. **Theater at this scale:** a formal SOC 2 audit, full FAPI 2.0 certification, and DPoP/mTLS infrastructure — buyer-driven enterprise signals, not security wins for a private first-party IdP.

## Recommendations — Prioritized Hardening Roadmap

### NOW (critical — this week; each maps to an audited weakness)
1. **Patch Next.js to ≥15.2.3** and add edge stripping of `x-middleware-subrequest`; never authorize in middleware alone. → *fixes critical CVE-2025-29927 (CVSS 9.1, EPSS 92.955%).*
2. **Add the `pnpm audit` CI gate** (block on high/critical) plus gitleaks. → *fixes "no npm audit CI gate."*
3. **Enforce PKCE S256; reject `plain`;** advertise `code_challenge_methods_supported: ["S256"]`. → *fixes "PKCE plain accepted."*
4. **Make authorization-code consumption atomic** — single Prisma transaction that checks-and-marks the code used (conditional update on `usedAt IS NULL`); reject reuse. → *fixes "non-atomic single-use / replay."*
5. **Wire the Upstash sliding-window limiter** on `/token`, `/userinfo`, OTP-send, and login, keyed on Vercel's platform IP header + per-account; remove the in-memory fallback. → *fixes "rate limiting inactive in serverless."*
6. **Replace the bare-SHA-256 OTP hash with HMAC-SHA-256** (server secret) + attempt cap + short expiry + timing-safe compare. → *fixes "OTP brute-forceable."*
7. **Close open registration:** delete self-service signup; require an atomically-consumed invite token + email allowlist; add Turnstile + disposable-email block on remaining public endpoints. → *fixes "open self-service registration."*

### NEXT (important — weeks)
8. **Migrate NextAuth v4 → Auth.js v5** (bridge session cookies to avoid mass logout). → *fixes "NextAuth EOL."*
9. **Migrate password hashing to Argon2id** (m=19456, t=2, p=1) with a pepper, hash-on-next-login. → *fixes "bcrypt-10, no pepper."*
10. **Wire the declared-but-unimplemented configs:** HIBP k-anonymity check on password set, account lockout/throttling, idle + absolute session timeouts. → *fixes "declared-but-unimplemented security config."*
11. **Refresh-token rotation with reuse detection** (token family + auto-revoke + alert).
12. **CAPTCHA (Turnstile)** on login/OTP; OTP-bombing circuit breakers.

### LATER (hardening — months)
13. **Pairwise subject identifiers for new clients only** (existing three stay `public`); additive Prisma schema + per-client `subject_type`. → *fixes "no pairwise sub / shared-sub correlation."*
14. **Automate JWKS key rotation** with overlap/grace period and Postgres-backed multi-key publishing. → *fixes "no key rotation."*
15. **Full CI suite:** CodeQL/Semgrep SAST, dependency-review, SBOM (CycloneDX), Renovate/Dependabot.
16. **Audit logging → log drain + alerting**; ASVS v5 L2 self-assessment.
17. **Token revocation `jti` table** for refresh tokens / forced logout (keep access tokens short-lived rather than building a full access-token blocklist).

**Benchmarks that change the plan:** onboarding any non-first-party RP, needing SAML/SCIM, hitting a compliance requirement, or spending >a few hours/month on auth ops → migrate to **WorkOS AuthKit** (free up to 1M MAU) or **Clerk**.

## Caveats
- **OAuth 2.1 is still an Internet-Draft**, not a final RFC; treat it as authoritative *direction*, but cite RFC 9700 (a published BCP) for anything load-bearing.
- **ASVS session-timeout numbers shifted between v4 and v5.** v4 gave concrete values (L2 ≈ 12h / 30 min idle); v5 reframes them as documented, risk-justified decisions aligned to NIST 800-63B. Pick values and document the rationale rather than treating any single number as mandated.
- **Managed-IdP pricing and free tiers change frequently** (e.g., reports of Clerk raising its free MAU tier in early 2026); verify live pricing before committing.
- **Vercel's IP-header trustworthiness depends on you not putting another proxy in front of Vercel.** If you add an external WAF/proxy, re-derive which header is trustworthy; the default guidance assumes traffic terminates at Vercel's edge.
- **The FAPI 2.0 publication date** appears as both 19 Feb 2025 (approval announcement) and 22 Feb 2025 (spec header) in OIDF's own materials — both are correct for their respective events.
- Some sourcing (managed pricing, CAPTCHA market data, disposable-email lists) comes from vendor/comparison blogs rather than primary specs; treat exact figures as indicative and verify before purchase decisions.

## Sources / Citations
- **RFC 9700** — Best Current Practice for OAuth 2.0 Security (BCP 240, DOI 10.17487/RFC9700, Jan 2025; Lodderstedt/Bradley/Labunets/Fett). §2.1, §2.1.1, §4.5, §4.14, §4.10.1. datatracker.ietf.org/doc/rfc9700/ ; rfc-editor.org/rfc/rfc9700
- **OAuth 2.1** — draft-ietf-oauth-v2-1; oauth.net/2.1/
- **RFC 7636** — PKCE ("plain SHOULD NOT be used in new implementations"). datatracker.ietf.org/doc/html/rfc7636
- **RFC 9207** — OAuth 2.0 Authorization Server Issuer Identification (mix-up defense).
- **RFC 9449** — DPoP; **RFC 8705** — mTLS; **RFC 9126** — PAR; **RFC 8414** — AS Metadata; **RFC 4226** — HOTP/HMAC-OTP.
- **OWASP ASVS v5.0.0** (30 May 2025, Global AppSec EU Barcelona) — github.com/OWASP/ASVS ; V3 Session Management (idle/absolute timeout, NIST 800-63B alignment).
- **OWASP Password Storage Cheat Sheet** (2025) — Argon2id m=19456/t=2/p=1 (and m=47104/t=1/p=1); pepper guidance. cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- **OWASP OAuth2 Cheat Sheet** & **Session Management Cheat Sheet** — sender-constrained tokens, rotation, idle/absolute timeout.
- **OIDC Core §8** — pairwise subject identifiers / `sector_identifier_uri` (PPID "MUST NOT be reversible"). openid.net ; Curity & Connect2id PPID docs.
- **FAPI 2.0 Security Profile** (Final, published 22 Feb 2025; approval announced 19 Feb 2025, vote 82–0–14) — openid.net/specs/fapi-security-profile-2_0-final.html ; openid.net/fapi-2-security-profile-attacker-model-final-specifications-approved/
- **CVE-2025-29927** — GitHub Advisory GHSA-f82v-jwr5-mffw / NVD: CVSS 3.1 9.1 Critical (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N), CWE-285, EPSS 92.955%; reported Rachid Allam, published 21 Mar 2025; fixed 12.3.5/13.5.9/14.2.25/15.2.3. github.com/advisories/GHSA-f82v-jwr5-mffw ; ProjectDiscovery, Datadog, JFrog analyses.
- **Vercel request headers** — `x-forwarded-for` overwritten to prevent spoofing; `x-vercel-forwarded-for`, `x-real-ip`. vercel.com/docs/headers/request-headers ; vercel.com/docs/security/reverse-proxy
- **MDN X-Forwarded-For** — security/spoofing guidance. developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For
- **Upstash @upstash/ratelimit** — sliding/fixed/token-bucket, edge/HTTP, ephemeralCache. github.com/upstash/ratelimit-js ; upstash.com/blog/edge-rate-limiting
- **HIBP Pwned Passwords k-anonymity** — range API. haveibeenpwned.com/API/v3 ; Cloudflare k-anonymity write-up.
- **Auth.js v5 migration guide** — authjs.dev/getting-started/migrating-to-v5 (cookie-prefix change, `auth()`, adapter rename, AUTH_SECRET).
- **JWKS rotation** — Duende, Curity, Zalando Engineering, WorkOS guides (overlap + grace period, publish-before-sign).
- **Managed/OSS IdP pricing & posture** — WorkOS pricing (free ≤1M MAU, then $2,500/mo per +1M; SSO $125/connection), Auth0/Clerk pricing comparisons (buildmvpfast, toolradar), Keycloak/Zitadel/Authentik/Ory/Logto comparisons (skycloak, houseoffoss, cerbos, wz-it).
- **Disposable email** — VegaStack/eramitgupta open blocklists; IPQualityScore/DeBounce APIs.
- **Cloudflare Turnstile vs hCaptcha** — Turnstile free/no-cookie/invisible; hCaptcha stronger for high-risk (merginit, nexterwp, websyro comparisons).
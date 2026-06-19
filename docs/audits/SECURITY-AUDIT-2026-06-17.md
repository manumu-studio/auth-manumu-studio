# Security Audit — m2-next-auth-prisma-postgres-starter

**Date:** 2026-06-17
**Scope:** Full adversarial security review of the OIDC + PKCE authorization server (auth.manumustudio.com)
**Method:** 5 parallel domain audits (OAuth/OIDC protocol · credentials/OTP/sessions · abuse/rate-limit/signup-gating · config/infra/secrets/headers · validation/dependencies/CI)
**Stack:** Next.js 15.5.7 · NextAuth v4.24.11 · Prisma 6 · Neon Postgres · Zod 4 · Upstash Redis · Resend · RS256 JWT · Vercel

---

## Executive summary

The cryptographic core is solid (RS256 enforced in signing, CSPRNG for codes/OTP, timing-safe secret comparison, exact redirect-URI matching, strict scope validation, security headers present). The serious problems are **operational and architectural**, not crypto:

1. **Registration is fully open** — anyone with any email can self-register. This directly contradicts the owner's intent (no public sign-up without a reason).
2. **Rate limiting is effectively OFF in production** — Upstash is unconfigured, so the code silently falls back to a per-process in-memory map that is worthless on Vercel serverless.
3. **The dependency tree ships a critical Next.js RCE** and 11 other prod vulnerabilities, with **no `npm audit` gate in CI** to catch them.

Until these three are closed, the rest is secondary.

---

## CRITICAL

### C1 — Open self-service registration, zero gating
**Evidence:** `src/features/auth/server/actions/signup.ts` (`origin: "FIRST_PARTY"` hardcoded); `prisma/schema.prisma` User (`role @default(USER)`, `origin @default(FIRST_PARTY)`).
No invite code, domain allowlist, admin approval, waitlist, CAPTCHA, disposable-email check, or MX validation. `origin`/`role` are after-the-fact labels that gate nothing.
**Impact:** Any actor can create unlimited accounts. Violates the stated "not a public sign-up service" requirement.
**Fix:** Add a gating mechanism at the signup boundary — invite-token consumption and/or email-domain allowlist (env-driven), evaluated before account creation. (Research question #2 will pick the model.)

### C2 — Rate limiting inactive in production (silent in-memory fallback)
**Evidence:** `src/lib/rateLimit.ts` — `useUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)`; both vars `.optional()` in `src/lib/env.ts:28`. When unset → `new Map()` per process.
**Impact:** On serverless, each cold start / worker has its own map, so every limit (OTP, login, reset, signup) is trivially bypassed. Misconfiguration is silent — no boot error.
**Fix:** Make both Upstash vars **required when `NODE_ENV === "production"`**; hard-fail at boot if absent. Configure them in Vercel now.

### C3 — Critical dependency CVEs shipped; no `npm audit` CI gate
**Evidence:** `npm audit` → 12 prod vulns (1 critical, 6 high). `next@15.5.7` carries RCE (GHSA-9qr9-h5gf-34mp) + Server-Actions source-code exposure (GHSA-w37m-7fhw-fmv9) + multiple DoS CVEs. `.github/workflows/ci.yml` has no audit step.
**Impact:** RCE + source exposure on a production auth server.
**Fix:** `next@≥15.5.19` immediately; add a `pnpm audit --audit-level=high` job that blocks merges; `npm audit fix` for `defu`, `effect`/Prisma, `esbuild`/tsx, `minimatch`, `cookie`.

---

## HIGH

### H1 — No rate limit on `/oauth/token` (and `/oauth/userinfo`)
`src/app/oauth/token/route.ts`, `src/app/oauth/userinfo/route.ts` — no `rateLimit()`. Enables code/secret grinding, userinfo enumeration, and invocation-cost DoS. **Fix:** per-IP + per-client limits on both, before code lookup.

### H2 — PKCE `plain` accepted; S256 not enforced; PKCE not required
`src/features/auth/server/oauth/authorizeRequest.ts:47-48` (defaults to and accepts `plain`); advertised in `.well-known/openid-configuration`. A confidential client can also skip PKCE entirely (`token.ts:87-88`). **Fix:** require `S256` for all clients; remove `plain` from code + discovery.

### H3 — Authorization-code single-use is non-atomic (TOCTOU race)
`src/features/auth/server/oauth/token.ts:95-119` — reads `usedAt`, then updates separately. Two concurrent requests can both pass the check → double token issuance. **Fix:** atomic `updateMany({ where: { id, usedAt: null }, data: { usedAt: now } })`, reject if count 0; or partial-unique index.

### H4 — OTP stored as bare SHA-256 over a 6-digit code
`src/features/auth/server/verify/createToken.ts:17`. A leaked `verification_tokens` row → 10^6 candidates cracked in microseconds; the 5-attempt lockout only helps online. **Fix:** HMAC-SHA256 keyed by a server secret (uncrackable without the key) or bcrypt the code.

### H5 — bcrypt cost factor 10, no pepper
`signup.ts:94`, `reset/consumeResetToken.ts:40`. Underpowered for 2026 GPU/ASIC cracking. **Fix:** raise to ≥12, rehash-on-login migration; add an HMAC pepper before bcrypt.

### H6 — Dead security config creates false confidence
`src/lib/env.ts:30-34` declares `HIBP_ENABLED`, `ACCOUNT_LOCKOUT_THRESHOLD/MINUTES`, `SESSION_IDLE_TIMEOUT_MINUTES` — **none are consumed anywhere** in `src/`. Operators believe breach-check, lockout, and idle-timeout are on; they are not. **Fix:** implement them, or delete the vars and add a startup WARN.

### H7 — NextAuth v4 is EOL
`next-auth@4.24.11` is the final v4; superseded by Auth.js v5. v4 pulls a vulnerable `@auth/core`→`cookie` (GHSA-pxg6-pf52-xh8x). **Fix:** plan the v5 migration (breaking API).

### H8 — Hardcoded admin/user passwords committed
`prisma/seed.ts:10-11` — `admin123` / `user123`. Permanently in git history; trivially guessable if seeded against any shared DB. **Fix:** generate random seed passwords or load from env; never run seed against prod; rotate if ever used.

### H9 — `X-Forwarded-For` trusted unvalidated → per-IP limits spoofable
`src/lib/rateLimit.ts:41-55` takes the first XFF value. Attacker spoofs arbitrary IPs to neutralize per-IP limits. **Fix:** on Vercel use the platform-injected IP (`x-real-ip` / `x-vercel-forwarded-for`), not the user-controlled first XFF entry.

### H10 — No CAPTCHA / bot defense on any public endpoint
No Turnstile/hCaptcha/PoW anywhere. Fully scriptable account creation, stuffing, OTP brute-force. **Fix:** Cloudflare Turnstile on signup + signin, verified server-side before the rate-limit check.

### H11 — `SKIP_ENV_VALIDATION=true` in the production build
`vercel.json:3` (`SKIP_ENV_VALIDATION=true pnpm build`) and both CI build jobs. Defeats the only boot-time safety gate — a deploy missing `NEXTAUTH_SECRET`/`DATABASE_URL` ships anyway. **Fix:** remove it; set real env in Vercel; use non-secret stubs only where a build genuinely needs them.

### H12 — Signup limit keyed `IP:email`; no per-IP account cap
`src/lib/rateLimit.ts` `buildRateLimitKey` = `scope:ip:email`. Rotating the email resets the counter → unlimited accounts per IP. **Fix:** add a parallel `signup:ip`-only cap (e.g., N/day).

### H13 — No secret scanning in CI
No gitleaks/trufflehog/GH secret-scanning in `ci.yml`. **Fix:** add `gitleaks detect` or enable GitHub secret scanning.

### H14 — Email / OTP bombing (victim harassment + Resend cost)
`verify/resend` and password-reset limits include the victim's email in the key, so N IPs each get a quota against one victim. **Fix:** add a per-email-only cap layered with the composite key.

---

## MEDIUM (condensed)

| ID | Finding | Evidence | Fix |
|----|---------|----------|-----|
| M1 | JWT payload cast `as Type` after verify; `alg` header never checked | `oauth/jwt.ts:114,143,120-151` | Zod-parse payload; assert `header.alg === "RS256"` |
| M2 | `aud` not verified at `/oauth/userinfo` → cross-client token replay | `userinfo/route.ts:23-24` | Verify intended audience |
| M3 | `callbackUrl` open redirect after auth | `(public)/page.tsx:231`, `useOtpVerificationForm.ts:76` | Allowlist relative/known-origin only; use `router.push` |
| M4 | Enumeration via resend (`not-found`/`already-verified`/`cooldown`) and verify (`user-not-found` 404) | `verify/resend.ts:13-24`, `api/auth/verify/route.ts:41` | Return uniform generic responses |
| M5 | OTP attempts counter TOCTOU race | `verify/consumeToken.ts:19-37` | Atomic `UPDATE ... WHERE attempts < 5 RETURNING` |
| M6 | `PasswordResetToken` has no attempts/lockout | `schema.prisma:84-92` | Add `attempts`, enforce lockout |
| M7 | `resetPassword` rate-limit keyed IP-only | `actions/resetPassword.ts:43` | Add email to key |
| M8 | `signinAction` doesn't check `emailVerified` (latent) | `actions/signin.ts:34-74` | Guard before success |
| M9 | No session idle/absolute timeout (30-day default) | `options.ts`, `api/auth/verify/route.ts:51` | Set `maxAge`; implement idle timeout |
| M10 | `client_secret` SHA-256, not a KDF | `clientRegistry.ts:26-27` | scrypt/argon2 (breaking) |
| M11 | `post_logout_redirect_uri` validated vs `redirectUris` | `logout/route.ts:70` | Dedicated `postLogoutRedirectUris` |
| M12 | No CSRF token on authorize consent form | `oauth/authorize/page.tsx:179` | Per-session HMAC consent token |
| M13 | Token response missing `Cache-Control: no-store` | `oauth/token/route.ts` | Add per RFC 6749 §5.1 |
| M14 | `Permissions-Policy` absent; `X-Powered-By` not suppressed | `middleware.ts`, `next.config.ts` | Add header; `poweredByHeader:false` |
| M15 | `OAUTH_JWT_*` keys optional in env (no boot fail-fast) | `env.ts:9-10` | Make required / startup health check |
| M16 | Expired `id_token_hint` accepted at logout (forced-logout replay) | `oauth/logout/route.ts:43-46`, `jwt.ts:88-90` | Cap max age of accepted hint |
| M17 | CI not parallelized; no coverage threshold; no bundle budget | `ci.yml` | Split jobs; enforce coverage/budget |

## LOW / INFO (noted, low priority)
Disposable-email blocking absent · no `jti`/token revocation endpoint · session cookie `domain` unset on Vercel previews · dev-only OTP logging · log injection via unsanitised `client_id`/`redirect_uri` in logout warns · `error_description` rendered raw (JSX-escaped) · `req.json().catch(()=>({}))` masks malformed bodies · `.env.example` `NEXTAUTH_SECRET` placeholder is 30 chars · JWKS `immutable` cache vs key rotation (purge CDN on rotate).

---

## Strengths (do NOT over-fix)
RS256 hard-coded in signing (not header-derived) · `timingSafeEqual` for client-secret compare · exact redirect-URI match, HTTPS-required, fragments banned · scopes validated against global + per-client allowlist · `crypto.randomInt`/`randomBytes` for OTP/codes/secrets · auth codes expire 10 min, bound to client/redirect/challenge/nonce · JWKS exposes public key only, `kid` present · security headers (CSP, HSTS+preload, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, nosniff, Referrer-Policy) · password-reset flow enumeration-safe · signup duplicate-email generic message · no raw SQL, no mass-assignment · Zod at most API boundaries · `debug-session` prod-gated · only `.env.example` committed · runtime client secrets never committed.

---

## Remediation priority

**Now (this week):** C1 gating · C2 Upstash required-in-prod · C3 Next.js patch + `npm audit` CI gate · H1 token/userinfo rate limits · H8 seed creds · H11 remove `SKIP_ENV_VALIDATION` · H9 trusted client IP.

**Next (this month):** H2 enforce S256 · H3 atomic code use · H4 HMAC OTP · H5 bcrypt 12 + pepper · H6 implement/remove dead config · H10 Turnstile · H13 secret scanning · H14/M7/M12/M4 abuse & enumeration hardening.

**Later (architecture):** H7 Auth.js v5 migration · M1/M2 token validation hardening · pairwise PPID for new clients · token revocation/`jti` · session lifecycle · build-vs-buy decision (see deep-research brief).

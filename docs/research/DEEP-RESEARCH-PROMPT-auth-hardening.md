# Deep-Research Prompt — Hardening the Auth Server into a Serious, Gated IdP

> Paste the block below as the argument to `/deep-research` (or any deep-research tool).
> It is self-contained: current-state context + the audit-confirmed gaps + the questions to answer.

---

Research how to harden a self-built **OIDC + PKCE authorization server** into a production-grade, attack-resistant, **private** identity provider for a small portfolio of first-party apps — explicitly **NOT** an open public sign-up service. Prefer authoritative 2024–2026 sources (RFCs, OWASP, OpenID Foundation, vendor security docs) and cite them.

**Current system (as-built, June 2026):**
- Stack: Next.js 15 (App Router, Server Actions), NextAuth v4, Prisma 6 + Neon Postgres, Zod 4, Upstash Redis (rate limiting), Resend (email/OTP), bcryptjs, RS256 JWT; deployed on Vercel at auth.manumustudio.com.
- Implements: OAuth 2.0 authorization-code + PKCE, OIDC ID tokens (RS256, JWKS), OTP email verification, password login, RP-initiated logout, a client registry (relying parties: CareerKit, FixtureLog), and **public/shared subject identifiers** (same `sub` to every app).
- Audit-confirmed weaknesses to design around: **open self-service registration with no gating**; rate limiting inactive in serverless (silent in-memory fallback); PKCE `plain` accepted / S256 not enforced; non-atomic auth-code single-use; OTP stored as bare SHA-256 over a 6-digit code; bcrypt cost 10, no pepper; declared-but-unimplemented security config (HIBP, account lockout, idle timeout); NextAuth v4 (EOL); a critical Next.js RCE CVE with no `npm audit` CI gate; no CAPTCHA/bot defense; no token revocation/`jti`; no pairwise/per-app subject identifiers.

**Answer these, with citations and concrete guidance for this stack:**

1. **Threat model & standards.** What is the authoritative 2025–2026 security baseline for a self-hosted OAuth/OIDC AS? Cover OAuth 2.1, RFC 9700 (Security BCP), FAPI 2.0 Security Profile, OWASP ASVS v5 (L2), and OIDC security considerations. Which controls are mandatory vs recommended for a private, low-volume, high-value IdP?

2. **Gated registration (top priority).** Survey proven patterns to eliminate open public sign-up on a private multi-app IdP — invite-token/allowlist, admin approval/waitlist, email-domain restriction, social/SSO-only with allowlist, entitlement/payment-gated, referral. For each: security properties, UX cost, abuse resistance, and an implementation sketch on Next.js + Prisma. Recommend a default plus a defense-in-depth combination.

3. **Bot & abuse defense.** Compare Cloudflare Turnstile vs hCaptcha vs proof-of-work vs device attestation for a Next.js/Vercel auth server. Include disposable-email blocking, email/OTP-bombing prevention, and distributed (botnet) resilience.

4. **Rate limiting & edge.** Best-practice distributed rate-limiting on Vercel serverless/edge with Upstash Redis — per-IP vs per-account keys, trustworthy client-IP derivation (avoiding X-Forwarded-For spoofing), sliding windows, and how to protect the `token`/`userinfo` endpoints specifically.

5. **Credential & token modernization.** Current standards for: password storage (Argon2id parameters, pepper, HIBP k-anonymity breach check), OTP/secret storage (HMAC vs KDF), session lifecycle (idle + absolute timeout, rotation), and token security — refresh-token rotation, revocation, `jti`, and sender-constrained tokens (DPoP / mTLS). Which are warranted at this scale and which are over-engineering?

6. **Privacy / subject identifiers.** Trade-offs of public vs pairwise (PPID) subject identifiers and cross-RP email exposure; how to implement pairwise `sub` via `sector_identifier`, and how to roll it out **new-clients-only** without breaking existing relying parties keyed on the current shared `sub`.

7. **Framework & supply chain.** Security implications and a migration path NextAuth v4 → Auth.js v5; a Next.js patching strategy; and the CI security-gate set that should block merges (npm/pnpm audit, secret scanning, SAST/dependency review, SBOM).

8. **Build vs buy.** For a serious, attack-resistant IdP at this scale, objectively compare continuing to self-build vs adopting a hardened open-source IdP (Ory Hydra/Kratos, Keycloak, Zitadel, Authentik, SuperTokens, Logto) vs managed (Auth0, Clerk, WorkOS, Stytch). Criteria: security posture, gated-registration support, federation, self-host control, total cost, migration effort, lock-in. Give a reasoned recommendation for a **solo developer** running a small first-party app portfolio.

9. **Operations.** Minimum viable security ops for this context: JWKS key rotation, secret management, audit logging / SIEM-lite, anomaly & breach detection, incident response, and a pragmatic compliance posture (what subset of SOC2 / ASVS is worth it solo).

**Deliverable:** a prioritized hardening roadmap (**Now / Next / Later**) that takes *this specific codebase* from its current state to "a serious cybersecurity auth that won't easily get attacked," with explicit recommendations on (a) the registration-gating model and (b) build-vs-buy. Anchor every major claim to a primary source.

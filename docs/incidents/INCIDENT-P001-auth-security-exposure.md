---
id: INCIDENT-P001
date: 2026-06-17
severity: SEV-2
status: INVESTIGATING
packet: PACKET-security-hardening-now
branch: fix/oauth-signup-redirect
environment: production
detected_by: developer
related_incidents: []
fix_pr: null
---

# INCIDENT-P001 - Auth Security Exposure

## Problem

### Symptoms

- Security audit found production-facing auth weaknesses on the OIDC authorization server.
- Self-service registration is currently open to any valid email address.
- Production rate limiting can silently fall back to process-local memory when Upstash is not configured.
- Dependency audit identified vulnerable production dependencies, including the pinned Next.js version.

### Impact

- **Users affected:** all users of the central auth server could be affected by abuse or platform compromise.
- **Features broken:** no confirmed outage; registration, OTP, OAuth token, and UserInfo endpoints are exposed to abuse paths.
- **Data at risk:** yes, if vulnerable dependencies or auth-abuse paths are exploited.
- **Workaround exists:** partial; manually restrict production configuration and avoid public invite links until fixes land.

### Reproduction Steps

1. Review `docs/audits/SECURITY-AUDIT-2026-06-17.md`.
2. Confirm `src/features/auth/server/actions/signup.ts` creates users without invite, allowlist, approval, or bot gate.
3. Confirm `src/lib/env.ts` keeps Upstash variables optional and `src/lib/rateLimit.ts` allows a memory fallback.
4. Confirm `package.json` pins `next@15.5.7`.

### Evidence

```text
Audit C1: open self-service registration.
Audit C2: production rate limiting inactive when Upstash env vars are missing.
Audit C3: vulnerable dependency tree and no blocking audit CI gate.
Local check on 2026-06-17:
- pnpm audit --audit-level=high failed with 53 total vulnerabilities (1 critical, 26 high).
- pnpm audit --prod --audit-level=high failed with 29 production vulnerabilities (15 high).
- npm view next@15 version --json showed 15.5.19 as the latest Next 15 release.
```

### Files Suspected

| File | Why suspected |
|------|--------------|
| `src/features/auth/server/actions/signup.ts` | Creates accounts without a registration gate. |
| `src/lib/env.ts` | Treats Upstash rate-limit credentials as optional. |
| `src/lib/rateLimit.ts` | Falls back to process-local memory and trusts forwarded IP headers too broadly. |
| `src/app/oauth/token/route.ts` | OAuth token endpoint currently has no limiter. |
| `src/app/oauth/userinfo/route.ts` | UserInfo endpoint currently has no limiter. |
| `src/features/auth/server/oauth/authorizeRequest.ts` | Accepts PKCE `plain` and allows missing PKCE. |
| `src/features/auth/server/oauth/token.ts` | Authorization code consumption is read-then-update, not atomic. |
| `src/features/auth/server/verify/createToken.ts` | Stores OTP code hashes with bare SHA-256. |
| `package.json` | Pins vulnerable framework dependencies. |
| `vercel.json` | Build command bypasses env validation. |

### Root Cause Hypothesis

> The auth server grew from a starter into a central IdP before production-grade security gates, distributed rate limiting, dependency audit blocking, and OAuth hardening were fully enforced.

### What's Blocked

- Clerk-style / IdP-platform work should not start until `PACKET-security-hardening-now` is complete.
- Gated registration should follow immediately after the hardening packet.

## Resolution

### Contributing Factors

1. **Factor:** Security controls existed as plans or optional configuration, not mandatory production gates.
   - **How it contributed:** Missing production env vars could leave rate limiting inactive without a deploy failure.
   - **Why it was not caught earlier:** CI did not include a production-like security audit gate.

2. **Factor:** Registration flow optimized for onboarding convenience.
   - **How it contributed:** The server remained publicly sign-up capable despite the desired private IdP posture.
   - **Why it was not caught earlier:** `User.origin` and role labels existed, but they did not enforce access at account creation.

### Was the Hypothesis Correct?

> Pending implementation and verification.

### Files Changed

| File | Change | Why |
|------|--------|-----|
| `docs/incidents/INCIDENT-P001-auth-security-exposure.md` | Created incident record. | Track the production-facing security exposure before fixes. |
| `docs/incidents/INCIDENT_REGISTRY.md` | Added active incident row. | Keep incident status visible. |

### Fix Approach

> Execute `PACKET-security-hardening-now` first, then `PACKET-gated-registration`. After both are deployed and production verified, update this incident with exact files changed, tests run, and deployment evidence.

### Regression Risk

- Medium. Tightening OAuth, env validation, rate limiting, and registration gates can break relying parties or local development if rolled out without staged verification.

### Testing Done

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual verification in target environment
- [ ] Edge cases tested

### Timeline

| Time (UTC) | Event |
|------------|-------|
| 21:47 | Incident opened after reviewing the security audit and active continuation prompt. |

### Lessons Learned

**What went well:**
- The security audit already grouped the problem into executable packets.

**What could be better:**
- Production security gates should block deploys before a starter project becomes a central auth service.

### Action Items

| Action | Owner | Deadline | Status | Tracking |
|--------|-------|----------|--------|----------|
| Execute `PACKET-security-hardening-now` | Manu / Codex | ASAP | TODO | `docs/build-packets/PACKET-security-hardening-now.md` |
| Execute `PACKET-gated-registration` | Manu / Codex | ASAP after hardening | TODO | `docs/build-packets/PACKET-gated-registration.md` |
| Verify production auth golden paths after deploy | Manu / Codex | After merge/deploy | TODO | this incident |

## Conclusion

The central auth server has no confirmed outage, but it does have production-facing security exposure from open registration, weak production rate-limit guarantees, vulnerable dependencies, and several OAuth/OTP hardening gaps. The immediate path is to complete the existing hardening packet, then close public registration with invite-based gating, and only then begin Clerk-style productization.

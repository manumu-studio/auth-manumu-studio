# Deep-Research Prompt — Distributable Multi-Tenant IdP with Drop-In Auth SDK ("our own Clerk")

> Paste the block below into your deep-research tool. It is self-contained: the vision, the current system, the proposed data model (to validate/refute), and the questions.

---

Investigate the feasibility and reference architecture for turning an existing custom OIDC + PKCE authorization server into a **distributable, multi-tenant identity platform** with a client SDK and embeddable drop-in UI — i.e., "build our own Clerk/Auth0" for a small portfolio of first-party apps, by a solo developer. Show how the leading providers architect this, and give a build-vs-fork-vs-buy recommendation. Prefer authoritative 2024–2026 sources (official docs, RFCs, engineering blogs) and cite them.

**The vision (what we want to ship):**
- A developer installs our auth package into their app (`npm install`), defines the page body, and drops in a prebuilt **login modal component**. On valid credentials, an **avatar/user button** appears offering "settings" and "sign out" (the Clerk `<SignIn/>` + `<UserButton/>` pattern).
- A central identity service owns credentials and issues identity to every app that integrates. Each app stores only its own per-user profile/data, linked back to the central identity.
- New apps can onboard ("every time a new app uses the auth system") with their own app identity/config.

**Current system (as-built, June 2026):**
- Central auth server: Next.js 15, NextAuth v4, Prisma 6 + Neon Postgres, Zod 4, Upstash, Resend, bcrypt, RS256 JWT, on Vercel at auth.manumustudio.com. Implements OAuth 2.0 auth-code + PKCE, OIDC (RS256, JWKS), OTP email verification, password login, RP-initiated logout, a client registry, and **public/shared subject identifiers** (same `sub` to every app).
- Three relying parties already federate correctly: LSA and FixtureLog are NextAuth OIDC clients that store only a local shadow (`externalId = sub`, optional email) via JIT provisioning; CareerKit is stateless (uses `sub` as `user_id`). **No RP stores a password** — credentials live only in the central server. The cross-app join key today is the `sub`.

**Proposed data model to VALIDATE OR REFUTE (we suspect it's flawed):**
- A naive sketch proposed a single table keyed by email with **one column per integrated app** (N columns = N apps), and a **per-app password** stored per app. Critique this against normalization and SSO principles. Confirm or refute that the correct design is instead: a normalized **many-to-many** (`User` ↔ `AppMembership(userId, appId, role, profile, createdAt)`), **central credentials stored once**, per-app tables holding only profile/metadata + the federated `sub`, and that per-app passwords defeat the purpose of centralized auth.

**Research questions (cite primary sources):**

1. **Multi-tenant identity data model.** How do Clerk, Auth0, WorkOS, Stytch, SuperTokens, Logto, Ory (Kratos), and Zitadel model the relationship between a global user identity and per-application (and/or per-organization) membership and profile data? What is the canonical normalized schema (users, organizations/apps, memberships, per-app metadata)? Explicitly evaluate the "email + N columns" and "per-app password" sketch above and state the correct alternative.

2. **Distributable client SDK + embeddable UI.** How do these providers package drop-in components (`<SignIn/>`, `<SignUp/>`, `<UserButton/>`, modals)? Cover: npm packaging, React component model, **headless vs prebuilt-themable** components, a session/context provider, theming/customization ("define your page body, drop in the modal"), and **embedded-modal vs hosted-redirect** flows (and the security/UX tradeoffs of each). How does Clerk's `<UserButton/>` / Auth0 Universal Login & Lock / Supabase Auth UI / SuperTokens pre-built UI actually work?

3. **Session & SSO propagation across apps.** How is a session established at the central IdP shared or consumed across multiple apps on **different domains** (third-party cookies deprecation, cross-domain SSO, token exchange, silent auth, the SDK's session lifecycle)? How do Clerk/WorkOS/Auth0 achieve "log in once, recognized across apps"?

4. **App onboarding / tenancy.** How does a new app self-register with the platform — dynamic client registration (RFC 7591), an admin dashboard, API keys, allowed-origins/redirect config, per-app branding? What does the "install → configure → go live" developer flow look like end to end?

5. **Security of a distributable SDK.** Secrets handling in a client-side package (public vs secret keys, publishable keys), CORS, **PKCE for SPA/public clients**, clickjacking risk on embedded login modals (vs hosted pages), CSRF, and how providers keep embedded components safe. Reference OAuth 2.1 / RFC 9700 where relevant.

6. **Build vs fork vs buy for a solo dev.** Realistically, can one developer ship this? Compare three paths: (a) extend the existing custom Next.js/NextAuth server, (b) **fork an open-source platform that already provides SDK + components** (SuperTokens, Logto, Ory, Better Auth, Zitadel), (c) wrap/resell a managed provider (Clerk, WorkOS, Stytch). Criteria: time-to-first-working-component, drop-in UI maturity, multi-tenant support, self-host control, maintenance burden, cost, lock-in. Give a reasoned recommendation.

7. **Migration path from the current custom server.** A phased plan to evolve the existing federated OIDC server toward this vision without breaking the three live RPs (which key on the shared `sub`): what to add (membership table, app registry/dashboard, an SDK package, embeddable components), and in what order.

8. **(Optional) Productization.** If this were offered to other developers, how would it position against Clerk/WorkOS/Auth0 (pricing, DX, self-host)? Is "open-source Clerk alternative" a viable niche, and who already occupies it?

**Deliverable:** a clear feasibility verdict for a solo developer, a reference architecture (normalized multi-tenant data model + SDK/component packaging + cross-app session model), an explicit correction of the "N-columns / per-app-password" sketch, and a build-vs-fork-vs-buy recommendation with a phased path from the current codebase. Anchor every major claim to a primary source.

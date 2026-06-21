# Build Your Own Clerk/Auth0: Feasibility, Reference Architecture, and a Migration Path for a Solo Developer

## TL;DR
- **It is feasible for a solo developer to ship the "drop-in login modal + UserButton" vision on top of the existing OIDC/PKCE server — but only by adopting the proven normalized data model (global User + AppMembership join table, credentials stored once centrally) and by packaging a thin client SDK around hosted-redirect auth, not embedded credential collection. The proposed "email + one column per app + per-app password" sketch is wrong on both database-normalization and SSO grounds and must be discarded.**
- **Build-vs-fork-vs-buy verdict: EXTEND the existing server (path A) for the data model, app registry, and session APIs, but DO NOT hand-build polished prebuilt UI from scratch — that is where every provider says the multi-month cost lives. The decisive recommendation is a hybrid: keep your IdP, add the AppMembership model and an admin/registry, and ship a lightweight SDK that wraps your existing authorization-code+PKCE flow with a redirect-based `<SignIn/>`-style component.**
- **The three live RPs (LSA, FixtureLog, CareerKit) keep working unchanged: preserve the shared public `sub` as their join key, and introduce pairwise subject identifiers (PPID) only for newly registered clients, exactly as OIDC Core §8 contemplates. Nothing in the migration breaks them.**

## Key Findings

### 1. The proposed data model is refuted — decisively
The "single table keyed by email, with N columns (one per integrated app) and a per-app password" sketch fails two independent tests:

- **Database normalization (First Normal Form).** "One column per app" is a textbook *repeating group* — the same anti-pattern as `Author1, Author2` or `Color1, Color2`. 1NF requires atomic values and forbids repeating groups; the correct fix is always to move the repeating attribute into a child table with one row per (parent, value) pair. A schema that must be altered (`ALTER TABLE ADD COLUMN`) every time a new app onboards is structurally broken; it caps apps at the number of columns, wastes space, and makes "which apps does this user belong to?" an awkward column-scan instead of an indexed row lookup.
- **SSO principle (single source of credentials).** A *per-app password* defeats the entire purpose of a central identity provider. The whole point of your IdP is that "NO RP stores a password — credentials live only in the central server." Per-app passwords re-fragment the credential store, multiply phishing/leak surface, and make "log in once, recognized everywhere" impossible. Every provider studied stores credentials exactly once at the center and links apps via a membership/grant relationship.

**Correct design (validated against all eight providers):** a normalized many-to-many model — a global `User` (credentials once), an `App`/client registry, and an `AppMembership(userId, appId, role, publicMetadata, privateMetadata, createdAt)` join table — with per-app tables holding only profile/metadata plus the federated `sub`. This is precisely what the developer suspected, and it is correct.

### 2. How the leading providers model global identity vs. per-app/per-org membership
Every mature platform separates a **global identity** from a **scoped membership** object, and splits metadata into **public** (frontend-readable) vs. **private/admin** (backend-only):

- **Clerk** — `Organization` ← `OrganizationMembership(role, publicMetadata, privateMetadata, publicUserData, createdAt, updatedAt)` → `User`. The membership object "describes the relationship between users and organizations." Public metadata is "read from the Frontend API and Backend API and can be set only from the Backend API"; private metadata is backend-only. Prebuilt `<OrganizationSwitcher/>`, `<OrganizationProfile/>`, `<OrganizationList/>` components drive it.
- **Auth0** — global user profile + `app_metadata` (security-impacting, user-cannot-modify) vs. `user_metadata` (user-editable), plus an Organizations/roles model and `GET /api/v2/organizations/{id}/members/{user_id}/roles`.
- **WorkOS** — Organizations *are* the tenant boundary; `Organization` + `OrganizationMembership` + roles; organizations carry `externalId` (to map to your own DB) and arbitrary key-value `metadata`. WorkOS explicitly warns that bolting org IDs on later "often requires database redesigns."
- **Zitadel** — `Organization` (tenant) → `Project` (shared security context for apps) → `Application`; roles defined at the project, assigned via grants; **project grants** let one org delegate a subset of roles to another org for self-management.
- **Ory Kratos** — an `Identity` with JSON-Schema-validated `traits`, plus `metadata_public` and `metadata_admin`; identity schema declares which trait is the login identifier and which addresses are verifiable/recoverable.
- **SuperTokens** — App → Tenant → user pools; roles/permissions exist at the app level but are mapped to users at the tenant level; `UserMetadata` recipe stores arbitrary JSON per user.
- **Logto** — Organizations with an "organization template" (org-level RBAC), JIT provisioning, and a single consolidated identity pool where one user holds different roles in different orgs.

The universal pattern: **one user, many memberships, role + metadata on the membership edge, public/private metadata split.** Your `AppMembership` table is the direct analog.

### 3. Distributable SDK + embeddable UI: how the drop-in components actually work
- **The Clerk pattern you're copying.** A single context provider (`<ClerkProvider>`) wraps the app and is initialized with a **publishable key**. Declarative gates `<SignedIn>`/`<SignedOut>` (or `<Show when=…>`) render `<UserButton/>` vs. `<SignInButton/>`. `<UserButton/>` "renders the familiar user button UI popularized by Google… opens a dropdown menu with options to manage account settings and sign out," and "Manage account" launches `<UserProfile/>`. There is both a React component model and an imperative `clerk.mountUserButton(node)` for non-React hosts. This is exactly the "define your page body, drop in the modal, avatar appears on success" experience the developer wants.
- **Headless vs. prebuilt-themable.** Providers ship two layers: prebuilt themable components (Clerk components, Auth0 Universal Login, Supabase Auth UI, SuperTokens prebuilt UI, Hanko Elements) *and* headless hooks/APIs (`useClerk()`, `useSignIn()`, Better Auth, Stack Auth headless mode) for full control. Clerk themes via an `appearance` prop on `<ClerkProvider>` (baseTheme, variables, layout, elements) — "match to your brand with any CSS library."
- **What the publishable key encodes (primary source).** Per Clerk's "How Clerk works" docs (updated May 29, 2026), the publishable key "consists of your FAPI URL encoded in base64, prefixed with an environment identifier (e.g. `pk_test_`…), and suffixed with a `$` delimiter." Decoding `pk_test_ZXhhbXBsZS5hY2NvdW50cy5kZXYk` yields `example.accounts.dev$`. It is "expected to be exposed in frontend environments," whereas secret keys "must remain confidential" and be "inaccessible to your users or the browser." This is the key insight for a safe distributable package: **ship a public key that only names your Frontend API host; never ship the secret key.**
- **Building/publishing a React component library (Next.js App Router reality).** The hard parts: (a) mark client entry points with the `"use client"` directive — "If you're building a component library, add the 'use client' directive to entry points that rely on client-only features," because client components cannot be imported by server components without a boundary; (b) declare `react`/`react-dom` (and `next`) as **peerDependencies** to avoid duplicate React copies; (c) ship ESM with `sideEffects:false` and per-component entry points for treeshaking; (d) pick a CSS strategy that survives bundling (Clerk-style injected styles, CSS-in-JS, or shipped stylesheet) — and ideally encapsulate to avoid host CSS collisions (the open-source "Authon" project uses ShadowDOM isolation specifically so "the login modal is encapsulated, zero CSS conflicts").

### 4. Embedded modal vs. hosted redirect — the central security tradeoff
This is the most important architectural decision, and the primary sources are unambiguous:

- **Hosted/redirect login is more secure.** Auth0 states plainly: "Universal Login is more secure than embedded login. Authentication takes place over the same domain, eliminating cross-origin requests… Embedded user agents are unsafe for third parties, including the authorization server itself. If an embedded login is used, the app has access to both the authorization grant and the user's authentication credentials… vulnerable to recording or malicious use." The credentials never touch the RP origin.
- **Why embedded is risky.** Embedded login on the web uses cross-origin authentication that historically depended on third-party cookies; it also exposes the login form to clickjacking and lets the host origin observe credentials.
- **How Clerk squares the circle (primary source).** Clerk's embedded `<SignIn/>` is a *UI abstraction over its Frontend API (FAPI)*: "Clerk's frontend SDK makes a direct request to FAPI," sign-in is a form-based (`application/x-www-form-urlencoded`) POST to FAPI endpoints, and session cookies are set on the *FAPI domain*, not the app origin. In production FAPI is hosted at `clerk.<your-domain>.com` via a customer-configured CNAME, so it is **same-site/first-party** to the app — which is how Clerk gets the UX of an embedded component while keeping credentials on a Clerk-controlled origin and using same-site cookies. Clerk also recommends restricting FAPI's cross-origin access via a subdomain allowlist.
- **Clickjacking defense for any embedded surface.** Set `Content-Security-Policy: frame-ancestors 'none'` (or a narrow allowlist) plus `X-Frame-Options: DENY` as a legacy fallback, delivered as HTTP response headers (not meta tags); set session cookies `SameSite=Lax/Strict`. Auth0 ships exactly these headers as opt-in clickjacking protection for Universal Login.

**Recommendation for the solo dev:** default to **hosted-redirect** auth (authorization-code + PKCE to `auth.manumustudio.com`), and make the "modal" a redirect-or-popup that returns to the RP. This is more secure, sidesteps third-party-cookie problems, and is dramatically less work than safely replicating Clerk's FAPI-on-a-CNAME embedded model.

### 5. Session & SSO propagation across different domains (post-third-party-cookie)
The death of third-party cookies has reshaped cross-domain SSO:

- **Silent-auth-via-iframe is dead.** Microsoft's Entra developer guidance ("SPA developers: Migrate to auth code flow with PKCE") states: "When a SPA is run in a browser that blocks third-party cookies, silent Single Sign-On (SSO) calls fail since the hidden iframe used to silently acquire new tokens cannot access the session cookies as the cookies are considered third-party." Implicit flow in SPAs is no longer recommended; the replacement is **authorization code + PKCE**, with the SPA redeeming a code for access + refresh tokens, and **refresh token rotation** as the renewal mechanism. SPA refresh tokens are deliberately short-lived — Microsoft Learn ("How to handle third-party cookie blocking in browsers") notes "SPAs are issued tokens valid for 24 hours only," after which the app must acquire a new authorization code via a top-level frame visit to the login page.
- **How the providers achieve "log in once, recognized across apps":**
  - **Clerk satellite domains** — one **primary** domain owns auth state; **satellite** domains "securely read that state from the primary domain." Sign-in/sign-up must happen on the primary; satellites sync via a **handshake** (a 307 redirect to `fapi/v1/client/handshake`) rather than a background iframe. The session cookie is scoped strictly to the app domain (not shared across subdomains); to cross subdomain boundaries Clerk recommends putting the token in a request header.
  - **Auth0** — relies on a **Custom Domain** so the authorization endpoint is first-party; refresh tokens are the fallback "where third-party cookies are blocked."
  - **General pattern (oidc-spa, Keycloak)** — host the IdP under the *same registrable parent domain* as the apps so it is "same-site"; otherwise fall back to full-page redirects.
- **Consequence for your architecture.** Because LSA/FixtureLog/CareerKit are on different domains from `auth.manumustudio.com`, you cannot rely on silent iframe SSO. Use full-page redirect (or popup) to the IdP, which always carries the IdP's first-party session cookie, and return an auth code. This is already how your authorization-code+PKCE setup works — so SSO across apps is achieved by the IdP's own session cookie at `auth.manumustudio.com`, not by sharing cookies across RP domains.

### 6. App onboarding / tenancy
- **Standards.** OAuth 2.0 **Dynamic Client Registration (RFC 7591)** lets a new app POST its metadata (`redirect_uris`, `client_name`, `grant_types`, `scope`, `jwks_uri`, `subject_type`, etc.) to a registration endpoint and receive a `client_id` (and optional `client_secret`). **RFC 7592** adds self-service management (read/update/delete) via a `registration_access_token` + `registration_client_uri`. RFC 7591 notes the endpoint "MAY be rate-limited" and, when restricted, requires an **initial access token** to gate who can register.
- **What the managed providers actually do.** In practice they use an **admin dashboard** to create an app, which issues **publishable + secret keys**, and configure **allowed origins / redirect URIs** (WorkOS: "Multi-tenant apps will typically have a single redirect URI"; exact-string redirect matching is mandated by the OAuth security BCP), plus per-app branding. Zitadel/Logto expose a built-in self-service org/app registration form.
- **For the solo dev:** a small admin dashboard on the IdP that creates an `App` row and mints a publishable key (encoding the IdP issuer URL) + a confidential secret is sufficient. Full RFC 7591 DCR is optional polish; you can add the `/register` endpoint later for "open ecosystem" onboarding, but with only first-party apps an admin-create flow is simpler and safer.

### 7. Security of a distributable SDK (RFCs)
- **PKCE is mandatory.** RFC 9700 (OAuth 2.0 Security BCP, Jan 2025) and OAuth 2.1 require authorization-code + **PKCE (RFC 7636)** for *all* clients, especially public SPA/mobile clients; the implicit grant and ROPC grant are deprecated. Your server already does authorization-code + PKCE + RS256/JWKS — fully BCP-aligned.
- **Key handling in a client-side package.** Ship only the **publishable/public key** (names the issuer/FAPI host; safe in the browser). The **secret key** stays server-side. This is the Clerk pattern and is the single most important rule for a distributable SDK.
- **CORS.** RFC 9700 §2.1: token, metadata, JWKS, and DCR endpoints MAY support CORS, but "CORS MUST NOT be supported at the authorization endpoint" (the browser is redirected there, not scripted against it).
- **Redirect URI validation.** Exact string matching (except localhost ports for native apps) — RFC 9700 §2.1.
- **Refresh token rotation** for SPAs/public clients, with short-lived access tokens.

### 8. Build vs. fork vs. buy — for a solo dev who already has a working federated OIDC server + 3 live RPs

| Path | Time-to-first-component | Drop-in UI maturity | Multi-tenant/orgs | Self-host control | Maintenance burden | Cost | Lock-in |
|---|---|---|---|---|---|---|---|
| **(A) Extend your custom server + hand-built SDK** | Slow for *polished* UI; fast for redirect SDK | Low (you build it) | You build it (AppMembership) | Total | High (you own all of it forever) | Infra only | None |
| **(B) Fork OSS (SuperTokens / Logto / Zitadel / Ory / Better Auth / Keycloak)** | Fast (UI + orgs already exist) | High | Built-in | Total | Medium (track upstream, migrate your 3 RPs) | Infra + license tiers | Low–medium |
| **(C) Wrap/resell managed (Clerk / WorkOS / Stytch)** | Fastest | Highest | Built-in | None | Lowest | Per-MAU/per-connection; scales painfully | High |

- **Buying (C)** contradicts the developer's premise: they already *own* a working IdP with three federated RPs and explicitly want self-host control. Clerk is cloud-only (no self-host); its cost scales painfully (Clerk Pro is $25/mo + $0.02 per MAU above the free tier, ≈ $2,025/month at 100K MAU per a 2026 community comparison), and migrating off it later "means rewriting most of your application." WorkOS is free up to 1 million MAUs but charges per SSO/SCIM connection (from $125/connection/month). Reject as the primary path.
- **Forking (B)** is the strongest option *if* the goal is the fastest path to mature drop-in UI + orgs, because UI is the multi-month cost everyone warns about. But it means re-homing three live RPs and your credential store onto a new core, and learning that core's model — non-trivial, and it discards a working asset.
- **Extending (A)** preserves the working IdP and the three RPs, keeps the shared-`sub` join key intact, and lets you add the AppMembership model and admin registry incrementally. Its only real weakness is prebuilt UI maturity.

**Decisive recommendation — a hybrid anchored on (A):** Extend your own server for the data model, app registry, and session/SSO APIs (you already have the hard parts: OIDC, PKCE, JWKS, OTP, RP-initiated logout, client registry, JIT provisioning). Ship a **thin redirect-based SDK** (`<AuthProvider>` + `<SignInButton>`/`<UserButton>` that redirect to `auth.manumustudio.com` and back) rather than re-implementing Clerk's embedded FAPI model. If, after shipping, you find you genuinely need polished embedded components and org management UI faster than you can build them, **selectively borrow from Better Auth** (MIT, self-hosted, same-database, Next.js-native — the Auth.js team joined Better Auth in September 2025, making it the de-facto successor) rather than forking a whole new core — it is the lowest-friction way to add components without abandoning your IdP. Do **not** attempt to build Clerk-grade embedded credential-collection UI from scratch solo; the security model (FAPI-on-CNAME, same-site cookies, handshake) is exactly the kind of thing that takes a team months and is easy to get dangerously wrong.

### 9. Migration path from the current server (preserves the 3 live RPs)
Phased, non-breaking, in order:

**Phase 0 — Freeze the contract for existing RPs.** LSA, FixtureLog, CareerKit continue to receive the **shared public `sub`**. Pin `subject_type=public` for these three `client_id`s. Nothing changes for them in any later phase.

**Phase 1 — Add the membership model (additive schema).** Introduce `AppMembership` without touching existing RP behavior. Backfill memberships for the three RPs from their existing shadow records (externalId = sub).

**Phase 2 — App registry + admin dashboard.** Promote the existing client registry into a first-class `App` table with publishable keys, redirect URIs (exact-match), allowed origins, and per-app branding. This is the "new app onboards with its own identity/config" capability.

**Phase 3 — Pairwise sub for NEW clients only.** New clients register with `subject_type=pairwise` (OIDC Core §8): `sub = hash(sector_identifier + local_user_id + salt)`. Existing three RPs remain on `public`. This reconciles the prior security-hardening recommendation (PPID for new clients) with the requirement to preserve the shared `sub` join key. Store both the canonical internal user id and any issued pairwise subs so you can always resolve a token back to the global user. (Note: a pairwise client by design cannot correlate users with another client; if you ever want two new apps to *share* identity, register them under a common `sector_identifier_uri` so they receive the same pairwise `sub`.)

**Phase 4 — Ship the SDK + redirect components.** Publish `@manumu/auth` (publishable-key-initialized provider + redirect `<SignInButton>`/`<UserButton>`). Treeshakeable ESM, `"use client"` on client entry points, React/Next as peer deps.

**Phase 5 (optional) — RFC 7591/7592 DCR** for self-service onboarding, gated by an initial access token + rate limiting; and selectively richer embedded components only if justified.

**Concrete Prisma additions (consistent with Prisma 6 + Neon Postgres):**
```prisma
model User {
  id            String          @id @default(cuid())
  email         String          @unique
  passwordHash  String?         // credentials live ONCE, here
  emailVerified DateTime?
  createdAt     DateTime        @default(now())
  memberships   AppMembership[]
  subjects      AppSubject[]
}

model App {                      // promoted client registry
  id            String          @id @default(cuid())
  clientId      String          @unique
  name          String
  publishableKey String         @unique
  secretHash    String          // confidential clients only
  redirectUris  String[]
  allowedOrigins String[]
  subjectType   SubjectType     @default(PAIRWISE) // existing 3 seeded as PUBLIC
  sectorIdentifier String?
  branding      Json?
  createdAt     DateTime        @default(now())
  memberships   AppMembership[]
  subjects      AppSubject[]
}

enum SubjectType { PUBLIC PAIRWISE }

model AppMembership {            // the normalized join table
  id              String   @id @default(cuid())
  userId          String
  appId           String
  role            String   @default("member")
  publicMetadata  Json?    // frontend-readable
  privateMetadata Json?    // backend-only
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  app             App      @relation(fields: [appId], references: [id], onDelete: Cascade)
  @@unique([userId, appId])
  @@index([appId])
}

model AppSubject {               // resolves token sub -> global user
  id        String  @id @default(cuid())
  userId    String
  appId     String
  sub       String  @unique      // shared public sub for the 3 RPs; pairwise for new
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  app       App     @relation(fields: [appId], references: [id], onDelete: Cascade)
  @@unique([userId, appId])
}
```
Per-app profile/data stays in each RP's own database (as today), keyed by the `sub` it receives — unchanged for the three live RPs.

### 10. Productization (optional)
- **The niche is real but crowded.** "Open-source Clerk alternative" is already occupied by **SuperTokens, Logto, Better Auth, Ory, Stack Auth, Zitadel, Hanko, authentik**, plus new entrants. Better Auth in particular (MIT, self-hosted, same-database, Next.js-native) has strong momentum as the recommended successor to Auth.js (the Auth.js team joined Better Auth in September 2025). Differentiators that remain open: same-database simplicity, predictable non-per-MAU pricing, EU/data-residency self-host, and first-party-portfolio ergonomics.
- **Pricing context (for positioning):** Clerk's free tier rose to 50,000 monthly active/retained users in 2025 (up from 10,000), with Pro from $20–25/mo plus per-MAU and paid SSO add-ons; WorkOS is free up to 1 million MAUs but charges per SSO/SCIM connection (from $125/connection/month); Logto uses token-based pricing (≈50K free tokens, then $0.08/100); Better Auth's core is free/MIT. Competing on price against these is hard.
- **The honest maintenance reality of a public auth SDK run solo:** auth is security-critical and adversarial. You inherit responsibility for CVE response, dependency patching, framework churn (every Next.js/React major), browser cookie-policy changes, support load, and breaking-change management across every consumer of your SDK. The community "migrate at month nine" pattern and Clerk's own "would take months to implement in-house" framing both point the same way: maintaining public auth UI solo is a significant, indefinite commitment. Recommendation: keep it **internal/first-party** first; only open-source if you find a genuinely differentiated niche and can commit to security maintenance.

## Recommendations (staged)
1. **Now — kill the bad schema.** Replace "email + N columns + per-app password" with the `User` / `App` / `AppMembership` / `AppSubject` model above. Credentials stay once, centrally. *Threshold to revisit:* none — this is non-negotiable.
2. **Phase 1–2 (weeks).** Add `AppMembership` + promote the client registry to an `App` table with publishable keys and exact-match redirect URIs + an admin dashboard. Backfill the three RPs.
3. **Phase 3.** Turn on `subject_type=pairwise` for new clients only; keep the three RPs on `public`. *Threshold:* if a future RP needs cross-app correlation, deliberately grant it `public` (or a shared sector identifier) rather than defaulting it.
4. **Phase 4.** Ship a thin **redirect-based** SDK and components (publishable key only; secret key server-side). *Threshold to consider embedded components:* only if conversion/UX data shows the redirect hurts materially AND you can host an FAPI-equivalent on a same-site CNAME with `frame-ancestors` + same-site cookies.
5. **Defer.** RFC 7591/7592 DCR; productization/open-sourcing. *Threshold:* only pursue open-source if you can commit to ongoing security maintenance and have a clear differentiator vs. Better Auth/Logto/SuperTokens.

## Caveats
- **"More secure" for hosted vs. embedded is the provider consensus (Auth0 explicit; Stytch markets embedded but acknowledges the tradeoff), not an absolute** — Clerk demonstrably ships safe embedded components, but only by means (FAPI on a customer CNAME, same-site cookies, handshake, subdomain CORS allowlist) that are substantial engineering. A solo dev should not assume they can replicate that safely quickly.
- **Some comparison/pricing figures come from vendor blogs and third-party comparison sites** (buildmvpfast, supastarter, Descope, SuperTokens' own "alternatives" posts, DEV community comparisons) and reflect marketing incentives; treat specific MAU/price numbers as directional and verify against the provider's current pricing page before relying on them. (There is also a minor reconciliation point: Clerk's free tier is quoted as 50K by its pricing page while some per-MAU formulas cite an older 10K threshold — confirm current terms before budgeting.)
- **Subagent note on embedded credentials:** Clerk's docs do not contain a single literal sentence "credentials typed into `<SignIn/>` are POSTed to FAPI"; that conclusion is assembled from multiple authoritative Clerk statements (the component is a UI abstraction over FAPI; the SDK "makes a direct request to FAPI"; FAPI is a form-based API; cookies are set on the FAPI domain). It is well-supported but inferred, not a verbatim claim.
- **Third-party-cookie timeline is fluid.** Chrome's exact rollout has shifted repeatedly; the architectural guidance (don't depend on third-party cookies; use redirect + refresh-token rotation) holds regardless of the calendar.

## Sources / Citations (primary first)
**RFCs & specs**
- RFC 7591 — OAuth 2.0 Dynamic Client Registration (rfc-editor.org/rfc/rfc7591)
- RFC 7592 — Dynamic Client Registration Management
- RFC 7636 — PKCE
- RFC 9700 — Best Current Practice for OAuth 2.0 Security, Jan 2025 (datatracker.ietf.org/doc/rfc9700); §2.1 CORS/redirect rules
- OpenID Connect Core 1.0 §8 — Public vs. Pairwise Subject Identifiers; `sector_identifier_uri`

**Official provider docs / engineering**
- Clerk — "How Clerk works" (clerk.com/docs/guides/how-clerk-works/overview, updated May 29 2026); publishable-key/FAPI; satellite domains; handshake; `<UserButton/>`/`<SignIn/>`/`<ClerkProvider>` component references; API-Key glossary; production deployment (CORS allowlist); "refactoring our API keys" blog
- Auth0 — Hosted (Universal) vs. Embedded Login; Centralized vs. Embedded ("Universal Login is more secure"); Clickjacking Protection for Universal Login; metadata (app_metadata/user_metadata); auth0-spa-js options (refresh-token fallback)
- WorkOS — Modeling Your App; "What is multitenant authentication"; developer's guide to multi-tenant architecture; SSO redirect-URI docs; "OAuth best practices: we read RFC 9700"
- Zitadel — Organizations / Projects / Project Grants docs
- Ory — Kratos identity schema/traits, metadata_public/admin (ory.com/docs; ory/kratos GitHub)
- SuperTokens — Multi-tenancy architecture; users-and-tenants; user metadata recipe
- Logto — Organizations; pricing/billing
- Microsoft Entra/Learn — "How to handle third-party cookie blocking in browsers"; "SPA developers: migrate to auth code flow with PKCE"
- React — `"use client"` directive; Next.js — Server/Client Components (component-library guidance)
- MDN, PortSwigger, web.dev — Clickjacking / CSP `frame-ancestors` / `X-Frame-Options`
- Curity, connect2id — PPID / pairwise subject identifier implementation guides

**Secondary / comparative (directional, vendor-influenced)**
- buildmvpfast, supastarter, freeCodeCamp, Descope, OpenAlternative, DEV Community — Clerk vs Better Auth vs Auth0 comparisons and pricing snapshots
- Red-gate / DigitalOcean / freeCodeCamp / Brian Davison — First Normal Form & repeating-group anti-pattern
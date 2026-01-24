# Phase 2: Handoff & Interop (External Apps)

**Testing policy:** Every new `feature/*` or `fix/*` branch should include tests for the new work. These tests are recommended for confidence but are not required to merge into `main` unless explicitly called out.

## 14). `feature/external-redirect-handoff`
   - Token handoff or code exchange for SPA clients
   ## 11) `feature/oauth-authorization-endpoint`

**Goal:** Implement `/oauth/authorize` with consent + redirect validation.

**Scope:**
- Authorization Code flow entry point
- Consent screen for scopes (`openid`, `email`, `profile`)
- PKCE challenge storage

**Tasks:**
- Build `/oauth/authorize` route
- Validate `client_id`, `redirect_uri`, `scope`, `state`
- Store auth codes with expiry and PKCE challenge

**Acceptance Criteria:**
- Invalid client/redirect rejected
- Consent required for new scopes
- Auth code expires and is one‑time use

After completing the feature scope for this branch/PR:

a) Add proof tests for the feature (mandatory)

Create/extend automated tests under tests/ that prove the feature works and prove the main failure modes are handled safely.

Minimum requirements:

Happy path: a test that demonstrates the feature succeeds with valid inputs.

Negative paths: tests that demonstrate invalid inputs are rejected correctly (at least 2–4 key failure cases).

Security/abuse guard (if the feature touches auth/security):

rate limit behavior OR

anti-enumeration response behavior OR

token/secret misuse rejection (depending on the feature).

Regression assertion: at least one test that ensures an existing critical flow remains intact (or explicitly prove it’s unaffected).

Constraints:

Tests must be repeatable, non-flaky, and CI-friendly.

Prefer integration tests at the route/service boundary, but avoid real external dependencies (use mocks).

b) Run quality gates locally in this exact order (fix failures)

Run and pass all of these before considering the feature complete:

pnpm lint

pnpm typecheck

pnpm test

pnpm build

If any step fails:

fix the root cause,

re-run the full sequence.

c) Run the repo’s Husky hooks as a release-safety gate

Run the same checks enforced by Husky (pre-commit/pre-push equivalent).
No skipping. If hooks fail, fix and re-run.

d) Run RepoAuditAgent as the “documentation + readiness gate”

Execute the RepoAuditAgent .sh script and ensure:

The audit output reflects the new feature truth (code + docs).

The report explicitly includes:

updated readiness/checklist status for this feature,

whether the new tests should be permanent in pnpm test,

any doc drift created by the change.

If RepoAuditAgent says tests are:

too coupled, too flaky, or wrong layer, refactor them until they qualify as stable permanent tests.

e) Completion definition (non-negotiable)

A feature is considered done only when all of these are true:

Feature scope implemented

Proof tests added and passing

Lint/typecheck/test/build all passing

Husky checks pass

RepoAuditAgent report updates correctly and approves the test placement

f) Evidence requirement (so deployments never “silently break”)

In the PR description (or PR doc), include:

the list of commands run,

a short summary of results,

the test file(s) added/changed.     

If the everything goes green, create the new documentation in pull-requets and journal folder. take a look to `SECURITY.md` `ARCHITECTURE.md` `DEVELOPMENT_JOURNAL.md` ADN `README.md` MUST NEED UPDATED

## 15). `feature/session-to-token-exchange`
   - Convert first-party session to OIDC tokens
   ## 11) `feature/oauth-authorization-endpoint`

**Goal:** Implement `/oauth/authorize` with consent + redirect validation.

**Scope:**
- Authorization Code flow entry point
- Consent screen for scopes (`openid`, `email`, `profile`)
- PKCE challenge storage

**Tasks:**
- Build `/oauth/authorize` route
- Validate `client_id`, `redirect_uri`, `scope`, `state`
- Store auth codes with expiry and PKCE challenge

**Acceptance Criteria:**
- Invalid client/redirect rejected
- Consent required for new scopes
- Auth code expires and is one‑time use

After completing the feature scope for this branch/PR:

a) Add proof tests for the feature (mandatory)

Create/extend automated tests under tests/ that prove the feature works and prove the main failure modes are handled safely.

Minimum requirements:

Happy path: a test that demonstrates the feature succeeds with valid inputs.

Negative paths: tests that demonstrate invalid inputs are rejected correctly (at least 2–4 key failure cases).

Security/abuse guard (if the feature touches auth/security):

rate limit behavior OR

anti-enumeration response behavior OR

token/secret misuse rejection (depending on the feature).

Regression assertion: at least one test that ensures an existing critical flow remains intact (or explicitly prove it’s unaffected).

Constraints:

Tests must be repeatable, non-flaky, and CI-friendly.

Prefer integration tests at the route/service boundary, but avoid real external dependencies (use mocks).

b) Run quality gates locally in this exact order (fix failures)

Run and pass all of these before considering the feature complete:

pnpm lint

pnpm typecheck

pnpm test

pnpm build

If any step fails:

fix the root cause,

re-run the full sequence.

c) Run the repo’s Husky hooks as a release-safety gate

Run the same checks enforced by Husky (pre-commit/pre-push equivalent).
No skipping. If hooks fail, fix and re-run.

d) Run RepoAuditAgent as the “documentation + readiness gate”

Execute the RepoAuditAgent .sh script and ensure:

The audit output reflects the new feature truth (code + docs).

The report explicitly includes:

updated readiness/checklist status for this feature,

whether the new tests should be permanent in pnpm test,

any doc drift created by the change.

If RepoAuditAgent says tests are:

too coupled, too flaky, or wrong layer, refactor them until they qualify as stable permanent tests.

e) Completion definition (non-negotiable)

A feature is considered done only when all of these are true:

Feature scope implemented

Proof tests added and passing

Lint/typecheck/test/build all passing

Husky checks pass

RepoAuditAgent report updates correctly and approves the test placement

f) Evidence requirement (so deployments never “silently break”)

In the PR description (or PR doc), include:

the list of commands run,

a short summary of results,

the test file(s) added/changed.     

If the everything goes green, create the new documentation in pull-requets and journal folder. take a look to `SECURITY.md` `ARCHITECTURE.md` `DEVELOPMENT_JOURNAL.md` ADN `README.md` MUST NEED UPDATED

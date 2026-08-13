# End-to-end tests (Playwright) — TICK-334

The Playwright harness (`playwright.config.ts`, specs in this dir) is committed,
`@playwright/test` is pinned in `package.json`, and CI runs the browser smoke
after the release gate.

## One-time setup
```bash
pnpm test:e2e:install
```

## Running
```bash
# against a local dev server (auto-started by the config):
pnpm test:e2e

# against a deployed preview / staging:
PLAYWRIGHT_BASE_URL="https://<preview>.vercel.app" pnpm test:e2e
```

## Strict seeded checkout

The public smoke and anonymous privilege-boundary probes run on every target.
The checkout/payment leg is intentionally gated until a disposable seeded
staging target exists.

```bash
E2E_STRICT=1 \
E2E_TEST_EVENT_SLUG="seeded-event-slug" \
E2E_TEST_BUYER_EMAIL="buyer@example.test" \
E2E_PAYSTACK_TEST_KEY="pk_test_..." \
PLAYWRIGHT_BASE_URL="https://<seeded-staging>.vercel.app" \
pnpm test:e2e
```

`E2E_STRICT=1` fails fast when any seeded prerequisite is missing. Leave it off
for advisory public-surface smoke runs.

## Authenticated shared-UAT journeys

The authenticated role, attendee and established-organizer journeys use the
fixed `da7a…` UAT fixture personas. For each fixed persona, the server-only
Supabase Admin client assigns a fresh high-entropy password that exists only in
the Playwright worker's memory, confirms the fixture email, then drives
Ticketiv's **real `/login` email/password form**. No password is committed,
stored in CI variables or printed into output. Teardown deletes the fixture
users at the end of the run.

The organizer-onboarding journey is deliberately independent from the fixed
fixture: it creates one ephemeral `@uat.ticketiv.invalid` verified account and
one uniquely named organization, exercises the real onboarding flow, then
removes only those exact synthetic records plus their exact rate-limit bucket.

Because Ticketiv still shares one Supabase project across environments, these
suites are **explicitly opt-in** and run only on the desktop Playwright project
to avoid accidental shared-environment writes and fixture races.

```bash
E2E_STRICT=1 \
E2E_ALLOW_SHARED_UAT=1 \
TEST_SUPABASE_URL="https://<project-ref>.supabase.co" \
TEST_SUPABASE_SERVICE_ROLE_KEY="<server-only key>" \
TEST_SUPABASE_ALLOW_PROJECT_REF="<project-ref>" \
PLAYWRIGHT_BASE_URL="https://<deployed-test-target>" \
pnpm test:e2e \
  e2e/authenticated-org-boundaries.spec.ts \
  e2e/refunded-ticket-propagation.spec.ts \
  e2e/organizer-draft-publish-guard.spec.ts \
  e2e/workspace-deletion-safety.spec.ts \
  e2e/organizer-onboarding.spec.ts \
  --project=desktop-chromium \
  --workers=1
```

The same serial suite and the database money/scanner lifecycle can be launched
from the manual **Shared Supabase UAT** GitHub Actions workflow on `main`. It
requires the exact `RUN_TICKETIV_SHARED_UAT` confirmation plus repository
secrets `TEST_SUPABASE_URL` and `TEST_SUPABASE_SERVICE_ROLE_KEY`. The workflow
pins both `https://ticketiv.app` and the allow-listed Supabase project ref,
retains Playwright failure artifacts, and always requests deterministic fixture
teardown.

Safety properties:

- the project ref in `TEST_SUPABASE_URL` must exactly match the explicit
  `TEST_SUPABASE_ALLOW_PROJECT_REF` value;
- `E2E_ALLOW_SHARED_UAT=1` is required in addition to `E2E_STRICT=1`;
- shared fixture writers must run with one Playwright worker because they reuse
  deterministic persona and organization IDs;
- fixed-fixture suites seed only the service-role-only UAT fixture and tear it
  down in `afterAll`;
- persona passwords are randomly generated per test session, kept in memory and
  replaced each time that persona is exercised;
- the browser signs in through Ticketiv's normal password login path, so the
  session/cookie behavior under test is the production behavior rather than a
  test-only auth route;
- refund propagation consumes the fixture's already-processed refund and never
  requests a provider refund or moves real money;
- organizer creation uses a unique event name, creates only a draft, proves the
  UI and server both block incomplete publication, verifies the event never
  becomes public, then deletes that exact draft before fixture teardown;
- workspace deletion uses the fixed non-empty Alpha workspace only as a blocked
  negative case, then creates one uniquely named empty workspace for the fixed
  owner and deletes only that exact id through the real settings/server-action
  path; `afterAll` removes that id explicitly if the browser leg is interrupted;
- organizer onboarding creates a fresh verified `.invalid` account, selects ZAR
  explicitly for the current Paystack launch path, verifies `organizer_owner`
  membership and organizer-context routing, then deletes that exact workspace,
  user/profile/notifications and `org_create:<user-id>` rate-limit bucket;
- if a worker is interrupted before teardown, run `pnpm seed:uat:teardown`
  before launch or finance/reconciliation review. Any temporary password left on
  a fixture is random and unknown. A uniquely named organizer E2E draft, empty
  workspace or onboarding workspace may also need targeted manual removal if
  interruption happens before its cleanup runs.

## Coverage status
- ✅ Public happy path (no auth): discover → event detail on desktop and mobile.
  Skips the event-detail leg automatically when the target has no seeded
  public events.
- ✅ Anonymous privilege boundaries: `/super-admin` and `/account` cannot render
  protected workspaces without authentication; scanner-session creation and
  payout-request APIs return `401` before any resource validation or write.
- ✅ Strict-mode preflight: missing seeded checkout env fails when
  `E2E_STRICT=1`.
- ✅ Authenticated cross-org browser harness: Alpha owner/admin/finance/scanner/
  cashier have a positive control in Alpha and are refused from Beta; Beta owner
  has the inverse control. Runs only with the explicit shared-UAT gate above.
- ✅ Refunded-ticket propagation: the buyer sees the refunded state in My
  Tickets and ticket detail, the QR and transfer/resale actions are suppressed,
  and gate validation cannot admit the refunded ticket or change it to checked
  in. Uses the already-processed fixture refund, not a provider refund.
- ✅ Organizer draft + publication guard: the Alpha owner creates a draft through
  the real organizer UI, reaches the event editor, and both the Publish button
  and authenticated publish API refuse to make an incomplete event public. The
  exact draft is deleted afterwards.
- ✅ Workspace deletion safety: the non-empty Alpha workspace exposes dependency
  protection instead of a destructive control; a uniquely named empty
  synthetic workspace requires exact-name confirmation, is deleted through the
  real owner settings/server-action path, and is independently verified absent.
- ✅ Organizer onboarding completion: a fresh verified Ticketiv account signs in
  through the real login page, creates a ZAR organization through the real
  onboarding form, becomes `organizer_owner`, lands on first-event creation and
  resolves `/organizer` to its new workspace dashboard. Exact synthetic records
  are removed afterwards.
- ⏳ Seeded guest checkout → hosted payment handoff: runs only with
  `E2E_TEST_EVENT_SLUG`, `E2E_TEST_BUYER_EMAIL` and `E2E_PAYSTACK_TEST_KEY`.
- ⏳ Payment completion → issued ticket → scan/retry still needs the seeded
  staging fixture and provider return automation.
- ⏳ Successful organizer publication needs a disposable target where a fully
  configured test event can safely become public and be removed afterwards;
  the shared production-backed UAT target intentionally tests the blocking path
  only. Resale/waitlist remains outside the v1 launch path while that product
  surface is paused.

## Related
- Unit suites (`pnpm test`, vitest): money-path math + webhook idempotency
  (`lib/__tests__/payments-math.test.ts`), pricing, rate-limit.
- Database money lifecycle (`tests/money-path-lifecycle.test.ts`) uses the same
  explicit `TEST_SUPABASE_*` project-ref allow-list and shared-UAT
  acknowledgement, creates its own synthetic buyer, and proves payment, ledger,
  ticket and scanner invariants below the UI.
- RLS cross-tenant isolation (`tests/rls-isolation.test.ts`): runs in
  `pnpm test`, skips without `TEST_SUPABASE_*` env.

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

## Authenticated cross-org UAT

The authenticated role matrix uses the fixed `da7a…` UAT fixture personas. For
each persona, the server-only Supabase Admin client assigns a fresh high-entropy
password that exists only in the Playwright worker's memory, confirms the
fixture email, then drives Ticketiv's **real `/login` email/password form**. No
password is committed, stored in CI variables or printed into output. Teardown
deletes the fixture users at the end of the run.

Because Ticketiv still shares one Supabase project across environments, this
suite is **explicitly opt-in** and runs only on the desktop Playwright project to
avoid two workers racing the same seed/reset function.

```bash
E2E_STRICT=1 \
E2E_ALLOW_SHARED_UAT=1 \
TEST_SUPABASE_URL="https://<project-ref>.supabase.co" \
TEST_SUPABASE_SERVICE_ROLE_KEY="<server-only key>" \
TEST_SUPABASE_ALLOW_PROJECT_REF="<project-ref>" \
PLAYWRIGHT_BASE_URL="https://<deployed-test-target>" \
pnpm test:e2e e2e/authenticated-org-boundaries.spec.ts --project=desktop-chromium
```

Safety properties:

- the project ref in `TEST_SUPABASE_URL` must exactly match the explicit
  `TEST_SUPABASE_ALLOW_PROJECT_REF` value;
- `E2E_ALLOW_SHARED_UAT=1` is required in addition to `E2E_STRICT=1`;
- the suite seeds only the fixed service-role-only UAT fixture and tears it down
  in `afterAll`;
- persona passwords are randomly generated per test session, kept in memory and
  replaced each time that persona is exercised;
- the browser signs in through Ticketiv's normal password login path, so the
  session/cookie behavior under test is the production behavior rather than a
  test-only auth route;
- if a worker is interrupted before teardown, run `pnpm seed:uat:teardown`
  before launch or finance/reconciliation review. Any temporary password left on
  a fixture is random and unknown, but the transactional fixture rows still need
  cleanup.

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
- ⏳ Seeded guest checkout → hosted payment handoff: runs only with
  `E2E_TEST_EVENT_SLUG`, `E2E_TEST_BUYER_EMAIL` and `E2E_PAYSTACK_TEST_KEY`.
- ⏳ Payment completion → issued ticket → scan/retry still needs the seeded
  staging fixture and provider return automation.
- ⏳ Organizer onboarding/event creation, refund propagation, org deletion and
  resale/waitlist browser journeys still need deterministic fixture drivers.

## Related
- Unit suites (`pnpm test`, vitest): money-path math + webhook idempotency
  (`lib/__tests__/payments-math.test.ts`), pricing, rate-limit.
- Database money lifecycle (`tests/money-path-lifecycle.test.ts`) uses the same
  explicit `TEST_SUPABASE_*` project-ref allow-list and proves payment, ledger,
  ticket and scanner invariants below the UI.
- RLS cross-tenant isolation (`tests/rls-isolation.test.ts`): runs in
  `pnpm test`, skips without `TEST_SUPABASE_*` env.

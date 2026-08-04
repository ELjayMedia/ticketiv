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

The public smoke runs on every target. The checkout/payment leg is intentionally
gated until a disposable seeded staging target exists.

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

## Coverage status
- ✅ Public happy path (no auth): discover → event detail on desktop and mobile.
  Skips the event-detail leg automatically when the target has no seeded
  public events.
- ✅ Strict-mode preflight: missing seeded checkout env fails when
  `E2E_STRICT=1`.
- ⏳ Seeded guest checkout → hosted payment handoff: runs only with
  `E2E_TEST_EVENT_SLUG`, `E2E_TEST_BUYER_EMAIL` and `E2E_PAYSTACK_TEST_KEY`.
- ⏳ Payment completion → issued ticket → scan/retry still needs the seeded
  staging fixture and provider return automation.

## Related
- Unit suites (`pnpm test`, vitest): money-path math + webhook idempotency
  (`lib/__tests__/payments-math.test.ts`), pricing, rate-limit.
- RLS cross-tenant isolation (`tests/rls-isolation.test.ts`): runs in
  `pnpm test`, skips without `TEST_SUPABASE_*` env (needs a test project/branch).

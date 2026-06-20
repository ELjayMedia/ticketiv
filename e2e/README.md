# End-to-end tests (Playwright) — TICK-174

The Playwright harness (`playwright.config.ts`, specs in this dir) is committed
and ready, but `@playwright/test` is **not** added to `package.json` yet — that
requires regenerating `pnpm-lock.yaml`, which must be done where pnpm can reach
the registry (not in the offline session that authored this).

## One-time setup
```bash
pnpm add -D @playwright/test     # updates package.json + pnpm-lock.yaml
pnpm test:e2e:install            # installs the Chromium browser (+ deps)
```

## Running
```bash
# against a local dev server (auto-started by the config):
pnpm test:e2e

# against a deployed preview / staging:
PLAYWRIGHT_BASE_URL="https://<preview>.vercel.app" pnpm test:e2e
```

## Coverage status
- ✅ Public happy path (no auth): discover → event detail → checkout CTA.
  Skips the event-detail leg automatically when the target has no seeded
  public events.
- ⏳ Authenticated checkout → ticket → scan: written but `test.skip`-gated on
  `E2E_TEST_BUYER_EMAIL` + `E2E_PAYSTACK_TEST_KEY`. Enable once the TICK-181
  staging environment (seeded DB + test-mode Paystack) exists.

## Related
- Unit suites (`pnpm test`, vitest): money-path math + webhook idempotency
  (`lib/__tests__/payments-math.test.ts`), pricing, rate-limit.
- RLS cross-tenant isolation (`tests/rls-isolation.test.ts`): runs in
  `pnpm test`, skips without `TEST_SUPABASE_*` env (needs a test project/branch).

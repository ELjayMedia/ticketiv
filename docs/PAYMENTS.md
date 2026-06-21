# Payment rails (TICK-179)

Money is integer cents end-to-end. Every provider converges on the same
completion path so the ledger + ticket delivery behave identically:

```
provider success (verified)
  → completeVerifiedPayment()            (lib/payments.ts)
      → writePaymentLedger()             (buildLedgerEntries — double entry)
      → completePaidOrder()              (issues order_items / tickets)
      → notify + deliverTicketsForOrder  (best-effort, never blocks)
```

The settlement *decision* for each provider is a pure, unit-tested function so
idempotency is provable without a DB:
- Paystack: `evaluatePaystackWebhookOutcome` (`lib/payments-math.ts`)
- MoMo: `evaluateMomoOutcome` (`lib/payments/momo-status.ts`)

## Provider status

| Provider | State | Notes |
|---|---|---|
| **Paystack** | ✅ Production | Card/bank. Webhook → ledger → delivery, amount-verified, idempotent. |
| **MTN MoMo** | 🟡 Sandbox-complete | Full create → poll/callback → ledger → delivery, idempotent. Needs production credentials + the `swaziland` target environment to go live. |
| **deltapay** | ⚠️ Decision pending | Routes (`/api/payments/deltapay/*`) + `lib/deltapay.ts` exist and are referenced by the admin routing screen, but the rail is **not production-verified**. See decision below. |
| **PayPal** | ⛔ Not integrated | Out of scope for the Eswatini-first launch. See decision below. |

## MTN MoMo — production go-live checklist

MoMo Collections is implemented end-to-end and works on sandbox today
(`MOMO_ENVIRONMENT=sandbox`). To promote to production:

1. **Provision production access** in the MTN MoMo developer portal for the
   Eswatini (`swaziland`) target environment: subscribe the Collections
   product, create an **API user** + **API key**, and obtain the production
   **subscription key**.
2. **Set env** (see `.env.example`):
   - `MOMO_BASE_URL=https://proxy.momoapi.mtn.com`
   - `MOMO_ENVIRONMENT=swaziland`
   - `MOMO_COLLECTIONS_PRIMARY_KEY`, `MOMO_API_USER`, `MOMO_API_KEY`
   - `MOMO_CALLBACK_URL=https://<app>/api/payments/momo/callback`
3. **Currency:** Collections amounts are whole **SZL** units — the create route
   already converts `total_cents / 100` (rounded). Confirm rounding policy with
   finance for sub-unit prices (currently `Math.round`).
4. **Completion model:** two paths, both idempotent and converging on
   `completeVerifiedPayment`:
   - **Poll** — client calls `GET /api/payments/momo/status?referenceId=…`.
   - **Callback (preferred for prod)** — MTN POSTs `…/momo/callback`; the route
     re-checks the authoritative status via `checkMomoStatus` (never trusts the
     callback body) before crediting. Configure MTN's `X-Callback-Url`.
5. **Idempotency:** `evaluateMomoOutcome` short-circuits already-settled
   attempts/orders, so a poll and a callback racing each other settle once. The
   `payment_attempts.ext_ref` (MoMo `referenceId`) is the dedupe key.
6. **Verify on sandbox first:** complete a request-to-pay, confirm one
   `payments` row, the four `ledger_entries` (gross / fees / net), the issued
   `order_items`, and a delivered ticket. Acceptance for this ticket is met on
   sandbox; flip env for production.

### Phone numbers
`normaliseMsisdn` accepts 8-digit local or `268XXXXXXXX` and rejects anything
else — keep MoMo gated to Eswatini MSISDNs.

## Routing (`payment_routing_rules`)

Provider selection runs through `payment_routing_rules` (priority,
country_code, currency, provider, fallback_provider, is_active) via
`lib/payments/routing.ts`:

- `matchRoutingRule(rules, { currency, countryCode })` — pure, unit-tested:
  active rules only, NULL currency/country = wildcard, lowest `priority` wins.
- `resolvePaymentProvider({ currency, countryCode, requested })` — used by
  `createPaymentAttempt`. **Policy:** an explicit, *known* client choice wins
  (a buyer who picked MoMo vs Card gets it); otherwise the matching rule, then
  its fallback, then `paystack`. Any lookup error degrades to `paystack` so
  checkout never breaks on an unreadable rules table.

`/api/payments/attempt` now accepts an optional `provider` (+ `countryCode`);
omit `provider` to let the rules decide. Configure SZ/SZL → `momo` primary,
`paystack` fallback in the super-admin routing screen.

## Event-level provider lock

Organizers can restrict an event to specific payment platforms (e.g. MoMo-only,
or MoMo + Paystack). Stored in `events.payment_providers text[]` — **empty = no
lock** (accept every enabled provider), so existing events are unaffected.

- **Migration (NOT applied — needs sign-off):**
  `supabase/migrations/20260621090000_event_payment_providers.sql` adds the
  column + a `<@ ARRAY['paystack','flutterwave','manual','momo']` check. The
  feature is inert until this is applied.
- **Organizer UI:** Policies step of the event editor — multi-select chips of
  the available providers; none selected = "all available". Persisted via
  `PUT /api/events/[eventId]/policies` (which also returns `availableProviders`
  = enabled `payment_provider_settings` rows + MoMo).
- **Enforcement (authoritative, server-side):** `createPaymentAttempt` computes
  the order's effective lock (`getOrderAllowedProviders` — intersection of the
  non-empty locks across the order's events) and passes it to
  `resolvePaymentProvider`. An explicit client choice that the lock forbids is a
  hard error (`ProviderNotAllowedError`); the default resolution is constrained
  to the allowed set.
- **Follow-up (buyer UI):** the checkout screen is Paystack-centric with a
  separate MoMo route. Surface `events.payment_providers` to the checkout so the
  buyer is only offered allowed rails (and a MoMo-locked event renders the MoMo
  flow directly). Until then the lock is enforced server-side (a forbidden
  attempt is rejected) but the buyer UI doesn't yet pre-filter the options.

## Decisions

- **deltapay — REMOVED.** No production contract or verified settlement flow.
  Deleted `lib/deltapay.ts`, `app/api/payments/deltapay/*`, dropped from the
  `PaymentProvider` union + `assertProvider`, and the routing-admin placeholder
  copy. **DB follow-up (needs sign-off):** remove any `deltapay` row from
  `payment_provider_settings` and drop `'deltapay'` from its
  `payment_provider_settings_provider_check` constraint — a migration, not
  applied here.
- **PayPal — DEFER.** Not required for the Eswatini-first launch (MoMo +
  Paystack cover the market). Revisit only if diaspora/USD card demand is
  confirmed; it would slot in as another provider on the same
  `completeVerifiedPayment` path.

## Status vs acceptance
- ✅ MoMo completes end-to-end on sandbox with full ledger + delivery +
  idempotency; production config documented here.
- ✅ deltapay decision documented (remove, pending sign-off).
- ✅ PayPal scope decision documented (defer).
- ⏳ Routing-rules-driven provider selection + production MoMo credential
  cutover remain (need MTN production access).

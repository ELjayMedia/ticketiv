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

Provider selection should run through the existing `payment_routing_rules`
table (priority, country_code, currency, provider, fallback_provider) rather
than hardcoding. Today the checkout picks the provider directly; wiring the
rules engine into provider selection is the remaining integration step (define
SZL/SZ → `momo` primary, `paystack` fallback). Tracked under this ticket.

## Decisions

- **deltapay — recommend REMOVE (needs sign-off).** No production contract or
  verified flow; it adds payment surface area and shows up in the admin routing
  UI as a selectable rail that cannot actually settle. Removal touches
  `lib/deltapay.ts`, `app/api/payments/deltapay/*`, the `PaymentProvider` union
  in `lib/payments.ts`, and the routing admin screen. Left in place pending
  sign-off rather than deleting a referenced rail unilaterally.
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

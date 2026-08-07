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
| **MTN MoMo** | 🟡 Sandbox-complete | Full create → poll/callback → ledger → delivery, idempotent. Needs production credentials + the `swaziland` target environment to go live — `evaluateMomoConfig` now refuses to present MoMo until `MOMO_ENVIRONMENT` and `MOMO_BASE_URL` are both set and neither points at the sandbox in production. |
| **deltapay** | ⚠️ Decision pending | Routes (`/api/payments/deltapay/*`) + `lib/deltapay.ts` exist and are referenced by the admin routing screen, but the rail is **not production-verified**. See decision below. |
| **PayPal** | ⛔ Not integrated | Out of scope for the Eswatini-first launch. See decision below. |

## MTN MoMo — where the sandbox credentials come from

`MOMO_COLLECTIONS_PRIMARY_KEY` is issued by the portal (Collections product →
**Primary Key**). `MOMO_API_USER` and `MOMO_API_KEY` are **not** issued to you —
in the sandbox you create them yourself against the provisioning API, using the
subscription key you already have. There is nothing to find in the portal UI,
which is the usual reason this step stalls.

```bash
export MOMO_SUB_KEY='<Collections primary key>'
export MOMO_API_USER="$(uuidgen | tr 'A-Z' 'a-z')"   # you choose this; it IS the user id

# 1. Create the API user. providerCallbackHost is a bare host, no scheme.
curl -i -X POST https://sandbox.momodeveloper.mtn.com/v1_0/apiuser \
  -H "X-Reference-Id: $MOMO_API_USER" \
  -H "Ocp-Apim-Subscription-Key: $MOMO_SUB_KEY" \
  -H "Content-Type: application/json" \
  -d '{"providerCallbackHost":"ticketiv.app"}'      # expect 201 Created, empty body

# 2. Mint its API key.
curl -s -X POST "https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/$MOMO_API_USER/apikey" \
  -H "Ocp-Apim-Subscription-Key: $MOMO_SUB_KEY"     # -> {"apiKey":"..."}  = MOMO_API_KEY

# 3. Confirm it exists.
curl -s "https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/$MOMO_API_USER" \
  -H "Ocp-Apim-Subscription-Key: $MOMO_SUB_KEY"     # -> {"providerCallbackHost":"...","targetEnvironment":"sandbox"}
```

`MOMO_API_USER` is the UUID from step 1; `MOMO_API_KEY` is the `apiKey` from
step 2. Both are sandbox-only and are invalidated if you regenerate the
subscription key.

**These endpoints do not exist in production.** For the `swaziland` target
environment MTN provisions the API user during commercial onboarding and issues
the key to you — you cannot self-serve it, so do not expect this flow to work
once `MOMO_ENVIRONMENT=swaziland`.

**Sandbox belongs on preview, not production.** `evaluateMomoConfig` refuses to
present MoMo when a production deployment points at the sandbox host, so sandbox
credentials on the production project will (correctly) leave MoMo hidden at
checkout. Test the rail on a Vercel **preview** deployment, where `VERCEL_ENV`
is not `production` and a coherent sandbox configuration is allowed.

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
3. **Currency:** Collections amounts are whole **SZL** units. The create route
   **refuses** an order whose total is not a whole Lilangeni amount rather than
   rounding it (`momoAcceptsAmountCents`). Rounding was the previous behaviour
   and it is a money bug: `fn_compute_order_money` adds a rounded basis-point
   platform fee, so a SZL 99.00 ticket with a 6.5% buyer-paid fee bills 10,544
   cents — `Math.round(10544/100)` charges SZL 105 against an order recording
   SZL 105.44, and no provider settlement can ever reconcile against it. If
   buyer-paid percentage fees are enabled for an SZL event, price the tickets so
   the **buyer total** lands on whole Lilangeni, or MoMo will decline the order
   at the point of payment.
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

## Completion contract (TICK-339)

Nothing may move an order, ticket or ledger row on the strength of a client
saying a payment succeeded. Every path proves provider authenticity first, and
the completion step itself always runs under `service_role`.

**Primary checkout.** `POST /api/payments/paystack/webhook` verifies the HMAC
over the *raw* body before parsing (`verifyTrustedPaystackSignature`), dedupes
on `webhooks.provider_event_id`, then grades the event with
`evaluatePaystackWebhookOutcome`: a settled order is an idempotent duplicate
(ack with 200 so Paystack stops retrying), a mismatched amount is rejected
without touching state, and only `success + pending + matching amount`
proceeds. MoMo reaches the same `completeVerifiedPayment` path from its
callback and status-poll routes, which are service-role and idempotent on the
payment id.

**Resale and waitlist.** These create their `payments` row up front tagged with
`payload.kind`, so they settle through
`fn_complete_{resale,waitlist}_after_payment_webhook` instead of
`completePaidOrder`. Both are granted to `service_role` alone. Two callers
reach them, and `lib/payments/special-checkout.ts` is the only module that
does:

| Caller | How authenticity is proven |
|---|---|
| Paystack webhook | HMAC over the raw body, then amount vs `orders.total_cents` |
| Buyer "complete" action | Session owns the order, then Paystack `transaction/verify` matched on reference, amount **and** currency (`evaluateProviderVerification`) |

The buyer path exists because a buyer can return from the hosted payment page
before the webhook lands. It fails closed: with no provider reference to verify
against it refuses and waits for the signed webhook, and a reference, amount or
currency mismatch is reported to Sentry rather than read as "still pending".
When the webhook has already settled the payment, the buyer's click just
re-runs the idempotent RPC — no second provider round-trip.

`fn_complete_resale_after_payment` / `fn_complete_waitlist_after_payment` (the
two-argument variants that derived the buyer from `auth.uid()`) had EXECUTE
granted to `authenticated`, which meant PostgREST published them to any signed-in
session — including an anonymous guest session, which carries the same database
role. `20260725160000_lock_client_callable_completion_rpcs.sql` revokes those
grants and asserts, in the migration itself, that no completion RPC is left
reachable from `anon`, `authenticated` or `PUBLIC`. The functions remain
callable by `service_role` as a manual support path for a stuck checkout.

Credentials come from one reader, `lib/payments/paystack-config.ts`; the
`secret_key`/`webhook_secret` columns are `server-only` and must never be
selected into a browser bundle.

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

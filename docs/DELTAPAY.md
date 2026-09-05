# DeltaPay Hosted Checkout

Tracking: TICK-378, TICK-379, TICK-380, TICK-381, TICK-382, TICK-383.
Production activation is controlled by the provider-onboarding gate in TICK-400.

TICK-255 is a closed regulatory-perimeter decision record. Under the approved provider-led merchant/platform architecture, a separate Ticketiv CBE PSP licence is not a DeltaPay production-activation dependency. Reopen the regulatory review only if Ticketiv later introduces stored value, customer-funds custody, independent payment execution, or independent settlement/redistribution.

## Scope

Ticketiv integrates DeltaPay through Hosted Checkout for native SZL ticket purchases. Ticketiv never accepts the browser redirect or callback body as proof that money moved. Both paths trigger a server-side `verify-return` request to DeltaPay; only an authoritative `succeeded` result is allowed to reach `fn_complete_order_payment`.

Native DeltaPay refund automation remains out of scope until DeltaPay confirms the supported merchant refund contract. Provider-neutral/manual refund handling is governed separately by the Ticketiv refund workflow.

## Required environment variables

Development / preview:

```env
DELTAPAY_API_KEY=<development Hosted Checkout API key>
DELTAPAY_BASE_URL=https://api.dev.deltacrypt.net
DELTAPAY_PRODUCTION_ENABLED=false
```

Production, only after TICK-400 readiness and DeltaPay production provisioning are cleared:

```env
DELTAPAY_API_KEY=<production Hosted Checkout API key>
DELTAPAY_BASE_URL=https://api.prod.deltacrypt.net
DELTAPAY_PRODUCTION_ENABLED=true
```

The application fails closed in production unless all three values agree. A production deployment cannot use the development host, and the production host is not considered operational without the explicit activation switch.

## Provider URLs

Ticketiv supplies these URLs when it creates a Hosted Checkout session:

- Return: `https://ticketiv.app/api/payments/deltapay/return`
- Session callback: `https://ticketiv.app/api/payments/deltapay/callback`

The return route includes server-generated `order_id` and `merchant_reference` query parameters so Ticketiv can locate the intended payment attempt. The DeltaPay checkout session ID itself is persisted as `payment_attempts.ext_ref`.

## Payment flow

1. Buyer chooses DeltaPay on an eligible SZL checkout.
2. Ticketiv creates the pending order and payment attempt server-side.
3. Ticketiv calls DeltaPay `POST /v1/hosted-checkout/sessions` with the exact order amount in SZL major units, a unique merchant reference, Ticketiv order ID, return URL and callback URL.
4. Ticketiv redirects only to the `checkout_url` returned by DeltaPay.
5. Buyer completes payment on DeltaPay Hosted Checkout.
6. Browser return and/or DeltaPay callback reaches Ticketiv.
7. Ticketiv calls DeltaPay `GET /v1/hosted-checkout/sessions/{checkout_session_id}/verify-return`.
8. Ticketiv verifies checkout session ID, merchant reference, platform order ID and exact amount against the stored pending attempt/order.
9. Only `succeeded` calls `completeVerifiedPayment()` and the existing atomic `fn_complete_order_payment` path.
10. `pending` / `processing` never issue tickets. `failed` / `expired` / `cancelled` fail the pending attempt.
11. Duplicate terminal callbacks are idempotent and do not mint duplicate tickets or ledger entries.

## Money handling

Ticketiv stores money as integer cents. DeltaPay Hosted Checkout accepts SZL major units, including decimal values.

Examples:

- `25_000` Ticketiv cents -> `250.00` SZL
- `10_544` Ticketiv cents -> `105.44` SZL

The verified DeltaPay amount is converted back to exact integer cents and must equal `orders.total_cents` before completion. No rounding-to-whole-lilangeni behavior is permitted.

## Database migration

Apply `supabase/migrations/20260818182500_add_deltapay_payment_provider.sql` through the normal deployment/migration process. It adds `deltapay` to the allowed values for:

- `payment_provider_settings.provider`
- `events.payment_providers`

It does not enable the rail by itself. Runtime configuration remains fail-closed.

## UAT checklist

Use a DeltaPay development Hosted Checkout API key and the development host.

- [ ] Migration applies cleanly in a non-production environment.
- [ ] An SZL event with DeltaPay allowed shows DeltaPay at mobile and desktop checkout.
- [ ] A ZAR event does not show DeltaPay.
- [ ] Selecting DeltaPay creates exactly one pending `payment_attempts` row with provider `deltapay` and checkout session ID in `ext_ref`.
- [ ] Hosted checkout receives the exact Ticketiv total including cents.
- [ ] Successful payment returns to Ticketiv and the order becomes `paid` only after `verify-return` reports `succeeded`.
- [ ] Ticket(s), ledger entries and delivery outbox records are produced exactly once.
- [ ] Closing the browser after paying still allows the callback path to complete the order.
- [ ] A callback received while the session is `pending` or `processing` does not mark the webhook audit row terminal and a later successful callback can complete it.
- [ ] Replaying the same successful callback does not create a second payment or duplicate ticket.
- [ ] Refreshing/replaying the browser return does not create a second payment or duplicate ticket.
- [ ] A failed session does not issue a ticket.
- [ ] An expired session does not issue a ticket.
- [ ] A cancelled session does not issue a ticket.
- [ ] A mismatched amount is rejected and captured in Sentry.
- [ ] A mismatched merchant reference is rejected and captured in Sentry.
- [ ] A mismatched platform order ID is rejected and captured in Sentry.
- [ ] Missing DeltaPay API key removes DeltaPay from the operational payment methods.
- [ ] Production deployment with the dev host is fail-closed.
- [ ] Production host without `DELTAPAY_PRODUCTION_ENABLED=true` is fail-closed.

## Production activation checklist

Do not switch `DELTAPAY_PRODUCTION_ENABLED` to `true` until TICK-400 records the provider as ready. At minimum:

- [ ] Signed DeltaPay merchant/provider arrangement is retained.
- [ ] Merchant/KYB onboarding is complete.
- [ ] DeltaPay provisions Ticketiv Hosted Checkout for production and confirms the approved `ticketiv.app` domain/URLs.
- [ ] Production API key is stored server-side in Vercel and is not exposed through any `NEXT_PUBLIC_` variable.
- [ ] Callback/return configuration is verified.
- [ ] Development technical and operational UAT above passes.
- [ ] Ticketiv data-protection/privacy treatment for DeltaPay is documented.
- [ ] Applicable card merchant validation is complete where the provider/rail requires it.
- [ ] Settlement, refund and chargeback operating procedures are documented.
- [ ] A controlled production transaction is reconciled against the Ticketiv payment, ledger and ticket-delivery records.

TICK-255 is not part of this checklist; it remains the closed record of the approved CBE/PSP regulatory boundary.

## Operational notes

- DeltaPay Hosted Checkout sessions are short-lived; Ticketiv seat/cart holds must not expire before the hosted checkout can reasonably complete.
- The callback is treated as a notification to re-verify, not as a trusted payment event.
- Do not log the DeltaPay API key. Sentry context should contain order/session identifiers and verification status only.

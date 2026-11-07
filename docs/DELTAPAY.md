# DeltaPay Hosted Checkout

Tracking: TICK-378, TICK-379, TICK-380, TICK-381, TICK-382, TICK-383.
Production activation is controlled by the provider-onboarding gate in TICK-400.

TICK-255 is a closed regulatory-perimeter decision record. Under the approved provider-led merchant/platform architecture, a separate Ticketiv CBE PSP licence is not a DeltaPay production-activation dependency. Reopen the regulatory review only if Ticketiv later introduces stored value, customer-funds custody, independent payment execution, or independent settlement/redistribution.

**Wallet collection and organizer payouts (decision, 5 Nov 2026).** Ticket money may be collected into a DeltaPay wallet owned by EljayMedia and redistributed from it to organizers. DeltaPay is the licensed provider for these flows, so Ticketiv does not need its own licence. Condition: the collect-then-redistribute model must be disclosed to DeltaPay when the EljayMedia account is registered. This satisfies the TICK-255 trigger for "settlement/redistribution". It does not extend to stored value or holding funds beyond normal payout timing.

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


---

# DeltaPay wallet payouts (organizer settlement)

Ticketiv pays organizers from the EljayMedia DeltaPay wallet, over the **Eswatini Payment Switch (EPS)**, to the organizer's primary payout account. That account can be a bank account (FNB, Standard Bank, Nedbank, Eswatini Bank, SBS, Unayo) or a mobile-money wallet (MTN MoMo, Eswatini Mobile, Instacash, DeltaPay). Banks that aren't on the switch (e.g. ABSA, "Other") are still paid manually.

Code:
- `lib/payouts/eps-directory.ts`: EPS institution codes and account-number formats, from DeltaPay's EPS participant table.
- `lib/payments/deltapay-wallet-core.ts` (pure) and `lib/payments/deltapay-wallet.ts` (HTTP).
- `lib/payouts/deltapay-payouts.ts`: send and settle.
- `app/api/payments/deltapay/wallet/transaction/ipn/route.ts`: signed callback.

## Flow

1. The organizer requests a payout (`fn_request_payout`, unchanged).
2. Finance opens **Payout queue** and clicks **Send via DeltaPay**. This requires `super_admin` or `finance_admin`, and post-event reconciliation must be clear for the org.
3. Ticketiv decrypts the primary payout account server-side and validates it against the EPS format for its institution.
4. `GET /transaction/eps-withdrawal-preview`: balance, limits and recipient checks. A rejected preview stops here and is audited.
5. The payout is **claimed** (`requested`/`failed` → `processing`, a conditional update) before anything is sent.
6. `POST /transaction/eps-withdrawal` with the exact amount in SZL major units. Ticketiv sends `metadata = "ticketiv-payout:<payout id>"` and a note shown to the recipient. DeltaPay signs the transfer with the wallet private key and returns a blockchain `tracking_id`.
7. DeltaPay's signed IPN arrives at `/api/payments/deltapay/wallet/transaction/ipn`. Only `succeeded` for the **exact payout amount** marks the payout `paid`; `failed` and `reversed` mark it `failed`. Finance can also click **Check DeltaPay status** (`GET /full-transaction/from-metadata`).

## Safety

- **Fail-closed:** nothing is sent unless every variable below is set and consistent. Production also requires the production host and `DELTAPAY_PRODUCTION_ENABLED=true`.
- **No double-send:**
  - A payout is claimed before it is sent.
  - A failed DeltaPay payout is looked up by its reference before any resend; if DeltaPay already has the transfer, Ticketiv refreshes its status instead of resending.
  - A network error after submission leaves the payout `processing` (outcome unknown) rather than inviting a retry.
- **Only DeltaPay settles a DeltaPay payout:** manual **Mark paid** is refused for it.
- **Callbacks are verified:** each one is checked with RSA-PSS/SHA-256 against the public key DeltaPay returns at callback registration, over Python `json.dumps(sort_keys=True)` of the body without `signature`. Unsigned or tampered callbacks get 401 and change nothing. Duplicates are expected and idempotent.
- **The wallet private key** is a server-only secret: never `NEXT_PUBLIC_`, never logged, and never echoed in errors. DeltaPay uses it to sign in memory and does not store it. If policy later forbids sending the key, switch to DeltaPay's raw-transaction flow (`initiate-transfer` → sign locally → `blockchain/signed-transaction`).
- **Every send, rejection, settlement and mismatch** is written to `audit_log`.

## Environment variables

```env
# Shared with Hosted Checkout
DELTAPAY_API_KEY=<API key with lookup permissions on the wallet account>
DELTAPAY_BASE_URL=https://api.dev.deltacrypt.net
DELTAPAY_PRODUCTION_ENABLED=false

# Wallet payouts
DELTAPAY_PAYOUTS_ENABLED=true
DELTAPAY_WALLET_ADDRESS=0x…          # EljayMedia wallet (sender_wallet_address)
DELTAPAY_WALLET_PRIVATE_KEY=…        # server-only secret
DELTAPAY_CALLBACK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----"
```

Register the callback once per wallet account: `POST /account/callback-url/register` with `callback_url = https://<host>/api/payments/deltapay/wallet`, the wallet's `account_id` and EljayMedia's `manager_entity_id`. DeltaPay appends `/transaction/ipn`. Store the returned `signing_key` as `DELTAPAY_CALLBACK_PUBLIC_KEY`.

## Database

Migration `20261105200000_payout_provider_tracking.sql` adds these columns to `payouts`:
- `provider_rail`
- `provider_reference` (unique)
- `provider_tracking_id`
- `provider_transaction_id` (unique per rail)
- `provider_status`
- `provider_fee_cents`
- `failure_reason`
- `submitted_at`

Manual payouts leave them null.

## Development UAT (fake money)

- [ ] The migration applies cleanly.
- [ ] The organizer can add an FNB account; a malformed FNB number is rejected with the example format. An MTN number is accepted with or without `+268`.
- [ ] **Send via DeltaPay** is hidden until all variables are set; the queue header says DeltaPay payouts are off.
- [ ] Reconciliation-blocked orgs can't be sent.
- [ ] Preview rejects when the wallet balance is too low (the reason is shown and audited).
- [ ] A successful send moves the payout to `processing` with a tracking ID. The IPN marks it `paid` exactly once, and replaying the IPN changes nothing.
- [ ] A tampered IPN (e.g. edited amount or status) gets 401 and changes nothing.
- [ ] An IPN with the wrong amount does not mark the payout paid (it is flagged and audited).
- [ ] **Check DeltaPay status** settles a payout when no IPN arrived.
- [ ] A failed or reversed transfer marks the payout `failed`, and **Resend via DeltaPay** first checks DeltaPay for an existing transfer.
- [ ] Manual **Mark paid** is refused for a DeltaPay payout.

## Open questions for DeltaPay

1. **Lookup shape:** confirm the response shape of `GET /full-transaction/from-metadata`, and whether metadata from `eps-withdrawal` is returned on the IPN for the sender's account.
2. **Fees:** EPS withdrawal fees and who bears them. Ticketiv currently sends the full payout amount and records the previewed fee.
3. **Limits:** per-transaction, daily and monthly limits on a business wallet, and whether large payouts need approval (`approved` status).
4. **Refunds:**
   - Does `POST /transaction/reverse-transfer` work on Hosted Checkout payments received by the wallet?
   - Within what window?
   - Does it support partial amounts? Otherwise partial refunds would be a `send-transfer` back to the payer.

   Until confirmed, DeltaPay refunds stay manual (see `docs/REFUNDS.md`).
5. **Retries:** callback retry behaviour (the docs say retries are not yet implemented), so status checks remain the fallback.

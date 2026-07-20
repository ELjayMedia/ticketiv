# Ticketiv UAT Test Plan — release certification

Run the safe smoke path on **production** (`https://ticketiv.app`) with real
consumer devices. Run payment failures, webhook replay, concurrency, RLS and
destructive cases on a seeded **staging** environment that mirrors production
migrations and configuration. Record pass/fail, deployment commit SHA, tester,
device/browser, timestamp and evidence for every case.

## Prerequisites

- Live Paystack keys (TICK-61) for final production money-path evidence.
- Seeded staging with Paystack test mode and controlled webhook replay.
- Two attendee accounts, two organizations and at least four staff roles.
- Two Android scanning phones; at least one Huawei/no-GMS device before store sign-off.
- Clean browser profiles/incognito for guest flows.
- A seeded settled balance older than the four-day settlement hold for payout tests.
- Working `support@ticketiv.app` forwarding.

## Test data map

Do not reuse one ticket across mutually incompatible journeys. Create and label:

| Fixture | Purpose |
|---|---|
| `TICKET_SCAN` | Valid and duplicate gate scans only |
| `TICKET_TRANSFER` | Transfer and acceptance only |
| `TICKET_RESALE` | Resale only; never scan it first |
| `TICKET_DELETE_BLOCKER` | Upcoming paid-ticket deletion guard |
| `TICKET_OFFLINE_A` | Offline scan on device A |
| `TICKET_OFFLINE_RACE` | Same ticket presented to two offline devices |
| `ORDER_REFUND` | Refund and dispute tests |
| `ORDER_PROMO` | Promo accounting and redemption limits |

---

## A. Organizer — first-run journey

| # | Test | Steps | Pass when |
|---|---|---|---|
| A1 | Self-serve org creation | Profile → “Organize your own event” → name org, pick SZL → submit | Lands directly on **Create event** |
| A2 | First event draft | Enter event name → Continue | Event editor opens at **basics** |
| A3 | Wizard completion | Fill basics, dates, venue; add free and paid ticket types | Every step persists after reload |
| A4 | Go-live checklist | Open readiness controls | Checklist reflects data; publish remains blocked until requirements pass |
| A5 | Publish | Publish event | Event appears on discovery and detail while logged out |
| A6 | Dashboard truth | Return to dashboard | First-event item is complete; zero-revenue state has no errors |
| A7 | Promo rule | Create `UAT10`, 10% off, active | Rule saves and lists as active |
| A8 | Team invite | Invite second account and accept | Correct org/role assigned; staff cannot access finance |
| A9 | Returning profile | Open `/me` as owner | Org card shown; onboarding CTA absent |
| A10 | Role removal | Remove invited staff while their session is active | Next privileged action is denied; navigation updates after refresh |
| A11 | Cross-org isolation | Copy event/order/admin URLs into unrelated-org session | No data leaks; response is 403/404 or safe empty state |

## B. Attendee — discovery to ticket

| # | Test | Steps | Pass when |
|---|---|---|---|
| B1 | Public discovery | Logged out: home, category, search | Event found through browse and search; labels are populated |
| B2 | Event detail | Open event | Correct SZL prices; paid type never says Free; tabs work |
| B3 | Guest free checkout | Incognito, email-only free order | Confirmation and `/t/[token]` QR work without login |
| B4 | Guest paid checkout | Incognito, Paystack payment | Return polls to paid; QR appears without manual refresh |
| B5 | Promo code | Apply `UAT10`; also try invalid code | Correct preview, charged total and adjustment line |
| B6 | Hold expiry | Allow hold timer to expire | Redirect with expiry message; inventory restored |
| B7 | Signed-in buyer | Magic-link sign-in and paid purchase | Ticket appears in My Tickets |
| B8 | Guest claim | Claim B4 guest order | Order attaches once; no duplicate ticket |
| B9 | Ticket utilities | Download/save, calendar and share | Correct artifacts and `ticketiv.app` links |
| B10 | Transfer | Use `TICKET_TRANSFER`; accept on second account | Sender QR dies; recipient gains QR; states reconcile |
| B11 | Refund request | Use `ORDER_REFUND` refund/dispute CTA | Mail composer includes support address and order reference |
| B12 | Account deletion | Throwaway account, no blockers | User is signed out and cannot sign in; public deletion page works |
| B13 | Deletion blocker | Use `TICKET_DELETE_BLOCKER` | Deletion blocked with clear resolution options |

## C. Payments, inventory and failure recovery — staging first

### C0. Money-path smoke with a Paystack test card (run before C1–C12)

The DB-layer trigger stack that previously blocked order creation, ticket
issuance and marking an order paid is fixed
(`supabase/migrations/20260720120000_fix_order_completion_trigger_stack.sql`).
Confirm the money path end-to-end before running the failure matrix.

**Step 0 — DB pre-check (no app, no browser, no cost).** Run
`scripts/verify-money-path.sql` (psql or the Supabase SQL editor) against the
target environment with a real org/buyer/pricing-plan/ticket-type. It seeds and
completes a throwaway order inside a rolled-back transaction and asserts:
`ledger_rows_before_payment = 0`, `order_status = paid`, all items `issued`,
attempt `succeeded` and linked, exactly one `succeeded` payment, settlement
`gross == total` and `gross + fee = net`, and idempotent replay
(`reuses_same_payment = t`, still 1 payment / 4 settlement rows). Nothing
persists.

**Step 1 — live browser checkout (human + browser required; the agent proxy
cannot reach `ticketiv.app`).** In a clean incognito profile, open a published
event → **Get tickets** → pick a ticket type → checkout as guest. Pay with a
Paystack **test-mode** success card:

- Card `4084 0840 8408 4081`, any future expiry, any CVV, OTP `123456`
  (use Paystack's current test cards/PINs if these rotate).

**Pass when:** the return screen polls to **paid** and the QR appears without a
manual refresh, and in the DB the order is `paid`, its `order_items` are
`issued`, there is one `succeeded` `payments` row, the `payment_attempts` row is
`succeeded` with `payment_id` set, and `ledger_entries` for that payment are the
four settlement rows only (`order_gross = total`, two negative `fee` rows,
`payment_net`; no `payment_id IS NULL` composition rows). Record the SHA,
Paystack reference and screenshots.

| # | Test | Steps | Pass when |
|---|---|---|---|
| C1 | Cancelled payment | Abandon/cancel Paystack checkout | Order remains unpaid; retry is offered; stock eventually releases |
| C2 | Failed then successful retry | Fail first attempt, pay second attempt | One paid order, one ticket set, attempts show failed + succeeded |
| C3 | Delayed webhook | Hold webhook, return buyer, then deliver | Confirmation waits safely then flips paid when webhook arrives |
| C4 | Duplicate webhook | Replay identical successful event twice | Second delivery is 200/no-op; no duplicate payment, ledger or ticket |
| C5 | Retry after processing error | Force completion failure after audit insert, replay event | Existing unprocessed row is reused and completion succeeds |
| C6 | Amount mismatch | Replay signed event with wrong minor-unit amount | Rejected; order not credited; alert/audit retained |
| C7 | Malformed signature | Send missing, short and non-hex signatures | Controlled 401; no unhandled 500 |
| C8 | Double-submit | Double-click pay/submit or send concurrent requests | One logical order/payment attempt chain; no duplicate charge |
| C9 | Last-ticket race | Two buyers purchase final unit simultaneously | At most one succeeds; loser gets safe sold-out response/refund path |
| C10 | Promo limit race | Two buyers redeem final allowed `UAT10` use | Redemption cap enforced transactionally |
| C11 | Ledger invariant | Reconcile gross, fees and net for normal and discounted orders | `gross + negative fees = net`; finance UI matches DB |
| C12 | Partial completion replay | Simulate payment row written before later failure | Replay finishes once without duplicate ledger/tickets |

## D. Organizer — sales, finance and payouts

| # | Test | Steps | Pass when |
|---|---|---|---|
| D1 | Orders view | Open event orders after purchases | Totals, search and pagination are correct |
| D2 | Attendees + comp | Issue one complimentary ticket | QR appears with zero revenue impact |
| D3 | Finance summary | Compare UI to ledger | Gross/fees/net and pending/settled split reconcile |
| D4 | Payout above settled | Request more than settled balance | Friendly “funds pending settlement” rejection |
| D5 | Valid payout | Use pre-seeded settled balance and request within it | Request succeeds and enters admin queue |
| D6 | Payout retry | Simulate provider/admin rejection then retry | No double reservation or double payout |
| D7 | Refund accounting | Complete full and partial refund where supported | Order, payment, refund, ledger and available balance reconcile |

## E. Gate — scanning

Before offline cases, pair each phone online, download the manifest, record its
version/timestamp and confirm the expected ticket count.

| # | Test | Steps | Pass when |
|---|---|---|---|
| E1 | Device pairing | Generate code and pair phone | Device/session/event assignment visible |
| E2 | Valid scan | Scan `TICKET_SCAN` | Green validation and attendee check-in |
| E3 | Duplicate scan | Scan `TICKET_SCAN` again | Already scanned; never second green |
| E4 | Invalid/wrong event | Random QR and other-event ticket | Correct outcomes; all attempts logged |
| E5 | Offline validation | Airplane mode, scan `TICKET_OFFLINE_A` | Validates, queues and syncs after reconnect |
| E6 | Two-device offline race | Both offline devices scan `TICKET_OFFLINE_RACE` | Sync detects conflict; reporting identifies duplicate admission risk |
| E7 | Revoked while offline | Download manifest, revoke ticket, remain offline and scan | Behaviour matches documented stale-manifest policy and is audited |
| E8 | Remote session end | End device session from organizer side | Online device stops immediately; offline behaviour is documented and bounded |
| E9 | Camera/network interruption | Deny camera, kill app during sync, reconnect | Recoverable UI; no lost or duplicated scan records |

## F. Waitlist, resale and notifications

| # | Test | Steps | Pass when |
|---|---|---|---|
| F1 | Waitlist | Sell out, join, restore stock | Position and offer flow work |
| F2 | Waitlist payment webhook | Pay accepted offer; replay webhook | Tickets issue once; duplicate is no-op |
| F3 | Resale | List `TICKET_RESALE`, buy from second account | Buyer QR works; original dies; seller accounting is correct |
| F4 | Resale webhook retry | Force first completion failure, replay | Ownership completes once and notifications reconcile |
| F5 | Notifications | Purchase, transfer, waitlist/resale | Bell items appear once; mark-read works |
| F6 | Email delivery | Test purchase/transfer/waitlist emails | Links resolve, retries do not duplicate entitlements |

## G. Compliance, compatibility and native apps

| # | Test | Steps | Pass when |
|---|---|---|---|
| G1 | Public compliance URLs | `/privacy`, `/terms`, `/refund-policy`, `/data-deletion`, `/support` | Public 200 responses |
| G2 | Domain hygiene | Copy all invite/share/email links | All use `ticketiv.app` and resolve |
| G3 | Accessibility | Keyboard, screen reader, zoom and focus tests | Checkout and ticket display remain operable |
| G4 | Browser/device matrix | Safari/iPhone, Chrome/Android, Huawei Browser, slow 3G | Core journey works without layout/data loss |
| G5 | Consumer app build | Install signed Play/Huawei/iOS build when available | Native discovery, checkout handoff, deep links and offline ticket work |
| G6 | Access app build | Install signed Play/Huawei build when available | Pairing, camera, encrypted manifest, offline scan and sync work without GMS |
| G7 | Upgrade | Upgrade from prior release with stored tickets/manifest | Data and sessions migrate safely |

---

## Release gates

### Before paid UAT

- Trusted webhook processing uses service-role or narrowly scoped definer RPCs.
- Duplicate and failed webhook replay tests pass.
- Ledger invariant and finance reconciliation pass.
- Staging and Paystack test mode are configured.

### Before public web launch

- Cross-tenant/RLS suite runs rather than skips.
- Last-ticket and promo concurrency pass.
- Two-device offline scan test is signed off.
- Refund, transfer, waitlist and resale failure cases pass.

### Before app-store submission

- Installable signed builds exist for the target store.
- Huawei build runs without GMS.
- Native deep links, secure offline storage, push, permissions and upgrades pass.

## Known dependencies

- B11 depends on `support@ticketiv.app` forwarding.
- Production B4/D3/D4/D5 require live Paystack keys and real settlement evidence.
- TapBand remains outside launch certification while TICK-311 is parked.

# Minimum safe commercial scope — first Ticketiv launch

**Status:** proposed for sign-off · 25 July 2026 · TICK-346

This is the answer to "what does launch actually include?" — the question that
86 open tickets do not answer on their own. Everything below is either **in**
(must work on day one, and is gated as such) or **out** (deliberately
unreachable until someone turns it on).

## The audit that prompted this

`public.feature_flags` has existed since the phase-2 work, the super-admin
console can edit it, and three flags were already set to `false`:

| Flag | Value | Reality before TICK-346 |
|---|---|---|
| `pos_enabled` | `false` | Box-office page and `posCharge` fully reachable |
| `resale_enabled` | `false` | 3 pages and 3 server actions fully reachable |
| `waitlist_enabled` | `false` | 2 pages, 3 actions and a public API route fully reachable |
| `guestlist_enabled` | `true` | not enforced anywhere |
| `notifications_enabled` | `true` | not enforced anywhere |
| `series_enabled` | `true` | not enforced anywhere |

**No code outside the super-admin console read any flag.** They described an
intent that nothing enforced, which is worse than having no flags at all: the
console reported resale as off while a buyer could complete a resale purchase.

`lib/feature-flags.ts` is that enforcement, and it fails closed — if the flag
table cannot be read, gated features stay shut. An unlaunched feature that is
down is a broken page; an unlaunched feature that opens on a transient database
error is real money moving through a path nobody signed off.

## In scope for launch

These must work end to end, and are covered by the money-path and scanner
tickets:

- **Discovery** — public event, artist, venue and search pages; event series
  grouping (`series_enabled`).
- **Primary checkout** — browse → hold → order → Paystack → paid order →
  issued tickets. One transactional RPC with a post-commit outbox (TICK-333).
- **Ticket delivery** — email; in-app notifications (`notifications_enabled`).
- **Gate scanning** — device pairing, QR check-in, duplicate and wrong-event
  handling, offline queue.
- **Organizer workspace** — event creation and publish, ticket types, orders,
  staff and devices, finance summary, payout request.
- **Guestlist** (`guestlist_enabled`) — comp tickets and fulfilment.
- **Refunds** — organiser-initiated, now that the path actually executes
  (TICK-259).
- **Platform admin** — command centre, audit log, exports, payment
  investigation, payout queue.

## Out of scope for launch

Gated off, at both the page and the mutation. Turning any of these on is a
deliberate act with its own testing:

- **Resale marketplace** (`resale_enabled`) — peer-to-peer settlement, resale
  caps and seller payouts have never been exercised against a real payment.
- **Waitlist** (`waitlist_enabled`) — offer expiry and fulfilment ordering are
  untested, and the public join endpoint is unauthenticated.
- **Point of sale** (`pos_enabled`) — cash reconciliation and shift attribution
  are still being built (TICK-347, TICK-348).
- **TapBand** — 27 open tickets, hardware not yet procured. No flag needed: the
  scanner NFC path is inert without provisioned credentials.
- **Mobile apps** — 19 open tickets. Store accounts not yet created; the web
  app is the launch surface.

## What is still open inside the launch scope

Being in scope does not mean it is finished. These remain blockers:

- **TICK-335 / TICK-66** — no payment has ever completed end to end. `payments`
  has zero rows. Everything else in the money path is verified structurally but
  not against a real transaction.
- **TICK-61** — Paystack stays on test keys until the above passes.
- **TICK-67** — scanner has not been tested against a live paid ticket.
- **TICK-263** — platform fee schedule is not finalised, so the commission
  applied at launch is not yet a decision anyone has signed.
- **Legal** (TICK-254/255/257) — Eswatini Data Protection Act, CBE
  payment-aggregation assessment and merchant KYB are not complete.

## How to change this list

Turning a flag on is not a deploy — it is a row update in the super-admin
console, which takes effect on the next request. That is deliberate: it means
switching a feature off during an incident does not require a release. It also
means the flag value is the source of truth, and this document describes intent
rather than enforcing it. If you enable something here, update this file in the
same change.

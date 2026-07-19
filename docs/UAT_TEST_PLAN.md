# Ticketiv UAT Test Plan — core journeys

Run on **production** (`https://ticketiv.app`) with real devices. Every test
lists its pass condition — record pass/fail + a screenshot for launch
evidence. Ordered so each section feeds the next (the organizer tests create
the event the attendee tests buy from).

Prerequisites: live Paystack keys (TICK-61) for the money paths; a test
card/mobile-money account; two phones (one Android for scanning); a clean
browser profile or incognito for guest flows.

---

## A. Organizer — first-run journey (do this first)

| # | Test | Steps | Pass when |
|---|---|---|---|
| A1 | Self-serve org creation | Profile → "Organize your own event" → name org, pick SZL → submit | You land directly on **Create event** (not the dashboard) |
| A2 | First event draft | Enter event name → Continue | Event editor opens at the **basics** step |
| A3 | Wizard completion | Fill basics, dates, venue; add 2 ticket types (one free, one paid, integer SZL prices); save each step | Each step persists after reload; no step traps you |
| A4 | Go-live checklist | Open the event's readiness/go-live controls | Checklist reflects reality; publish only possible when required items are done |
| A5 | Publish | Publish the event | Event appears on public discovery + `/events/[id]` while logged out |
| A6 | Dashboard truth | Back to org dashboard | Setup checklist leads with "Create your first event" ticked; stats row shows 0 revenue without errors |
| A7 | Promo rule | Create a price rule with a code (e.g. `UAT10`, 10% off, active, no window) | Rule saves and lists as active |
| A8 | Team invite | Team → Invite member (second email) → accept from that account | Invitee lands in the org with the assigned role; role gating holds (e.g. staff can't see finance) |
| A9 | Returning organizer profile | Open `/me` as the org owner | Org dashboard card shows (name + role), **no** "Organize your own event" CTA |

## B. Attendee — discovery → ticket in hand

| # | Test | Steps | Pass when |
|---|---|---|---|
| B1 | Public discovery | Logged out: browse home, category chips, search for the A5 event | Event found via browse **and** search; card shows price + real signals (no blank labels) |
| B2 | Event detail | Open the event | Ticket picker shows both ticket types with correct SZL prices (paid type never shows "Free"); tabs (About/Lineup/Venue) switch |
| B3 | Guest checkout — free ticket | Incognito: select free ticket → checkout as guest (email only) → complete | Confirmation shows; ticket delivered via email link (`/t/[token]`) opens the QR without login |
| B4 | Guest checkout — paid | Incognito: paid ticket → guest checkout → pay via Paystack (live) | Redirect returns to confirmation; status flips to paid without manual refresh; QR ticket visible |
| B5 | **Promo code** | Start checkout for the paid ticket, enter `UAT10` (from A7) | Preview shows "Code applied — 10% off"; order total after payment reflects the discount; a wrong code shows "Invalid or expired promo code" |
| B6 | Hold expiry | Start checkout, wait out the seat-hold timer | Redirected to the event page with the "hold expired" banner; ticket stock not leaked |
| B7 | Signed-up buyer | Create account (magic link), buy paid ticket | Round-trip returns into the app; ticket appears in **My Tickets** with QR |
| B8 | Guest claim | From B4's guest email, "Save my tickets" claim flow | Guest order attaches to the new account; ticket in My Tickets |
| B9 | Ticket utilities | On a ticket: download/save, add to calendar, share | Each action produces the expected artifact; links use `ticketiv.app` |
| B10 | Transfer | Transfer a ticket to a second account; accept it | Sender loses the QR, recipient gains it; pending state visible both sides |
| B11 | Refund request path | Ticket detail → refund/dispute CTA | Mail composer opens to `support@ticketiv.app` with order reference (requires mail forwarding to be live) |
| B12 | Account deletion | Throwaway account with no upcoming tickets: Account settings → delete (`DELETE` confirmation) | Signed out; sign-in fails afterwards; `/data-deletion` page is public |
| B13 | Deletion blocker | Account holding an upcoming paid ticket attempts deletion | Blocked with the "use, refund, or transfer" explanation — not deleted |

## C. Organizer — sales visibility & money

| # | Test | Steps | Pass when |
|---|---|---|---|
| C1 | Orders view | After B4/B7, open org → event → orders | Both orders listed with correct totals; search/pagination works |
| C2 | Attendees + comp | Attendees list; issue one comp ticket | Comp appears with a QR and 0 revenue impact |
| C3 | Finance summary | Org → Finance | Gross/fees/net match the ledger for the two sales; **settled vs pending-settlement** split shows (4-day hold); date filter works |
| C4 | Payout guardrail | Add payout account, request payout > settled balance | Rejected with "funds pending settlement" (not a raw error); request ≤ settled succeeds and shows in admin payout queue |
| C5 | Promo accounting | Check the discounted order (B5) in orders/finance | Order shows the adjustment line; totals reconcile |

## D. Gate — scanning (Android phone)

| # | Test | Steps | Pass when |
|---|---|---|---|
| D1 | Device pairing | Org → event → staff/devices → generate setup code → `/scan/setup` on the phone → enter code | Device registers, session starts, event assigned |
| D2 | Valid scan | Scan B7's QR at the gate screen | Green "validated"; attendee shows checked-in in org view |
| D3 | Duplicate scan | Scan the same QR again | "Already scanned" — never a second green |
| D4 | Wrong/invalid codes | Scan a random QR and a ticket for a different event | "Not found" / "wrong event" outcomes; every attempt logged in scan history |
| D5 | Offline validation | Airplane mode → scan a valid unscanned ticket | Validates offline; syncs after reconnect; duplicate protection still holds |
| D6 | Session end | End the device session from the org side | Phone can no longer scan until re-paired |

## E. Cross-cutting

| # | Test | Steps | Pass when |
|---|---|---|---|
| E1 | Public compliance URLs | Logged out: `/privacy`, `/terms`, `/refund-policy`, `/data-deletion`, `/support` | All return 200, no login redirect |
| E2 | Domain hygiene | Copy profile invite link + friends invite link | Both read `ticketiv.app/...` and resolve |
| E3 | Notifications | After purchase + transfer: bell icon | Order + transfer notifications present; mark-read works |
| E4 | Waitlist | Set a ticket type to sold out; join waitlist from a second account | Position shown; offer flow triggers when stock returns |
| E5 | Resale | List B7's ticket for resale; buy it from another account | Seller paid out per resale rules; buyer gets a working QR; original QR dies |

---

## Known-broken-until (check before filing bugs)

- **B11 depends on** `support@ticketiv.app` mail forwarding being provisioned.
- **B4/C3/C4 depend on** live Paystack keys (TICK-61); until then run in test mode and re-run for evidence after go-live.
- TapBand sections are intentionally dormant (TICK-311 parked) — an empty TapBand card on the profile is expected, not a bug.

## Bug-sweep log (2026-07-19)

Verified mechanically against live Supabase before this plan was written:
- All 38 RPCs called by app code exist live ✓
- All referenced tables/views exist live ✓ except `promo_codes` (fixed — preview
  now uses `fn_preview_promo_code` over `price_rules`) and `credential_entitlements`
  (TapBand, guarded, parked)
- No route-level client hooks depend on unmounted providers (the
  `usePermissions`/event-creation bug was fixed in PR #279)

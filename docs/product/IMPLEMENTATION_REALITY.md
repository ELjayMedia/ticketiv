# Implementation reality

Audit date: **2026-11-24**, against branch `uat` @ `09a465b0`, the isolated database built from `supabase/migrations`, and read-only checks on UAT and production. Jira children of TICK-477/478/479/480 were retrieved on the same day (40 issues).

**Classification key:**

1. Not implemented
2. Partially implemented
3. Implemented but untested
4. Implemented and tested
5. Production verified
6. Blocked
7. Superseded or duplicated

A Jira status of *Done* or *In Progress* is not evidence. Each line below cites code.

## Production-impacting findings

| Finding | Evidence | Fix |
|---|---|---|
| **Notifications for 13 feature types are silently rejected.** These include follower alerts, companion updates and reminders, feedback requests, resale, waitlist and refund requests. | `check_notifications_type_channel` only lists 18 types, and the writer triggers swallow errors. Production has zero rows of those types. | PR #585 |
| Resale price cap is not enforced on the server. Also, every listing currently fails, because its notification type is rejected. | `fn_publish_resale_listing_unchecked` only checks `> 0`, and `app/(consumer)/resale/actions.ts` doesn't call `isListingPriceAllowed`. | PR #586, plus #585 |
| `/api/venues` always returns 500. | Selects `address_line1, state, country`, which don't exist. Nothing calls it. | Planned |
| Public artist tour dates likely never load. | `app/(public)/artists/[id]/page.tsx` selects `event_artists.display_order`, which doesn't exist; it also reads `banner_url`. | Planned (TICK-485) |
| Series follower count is always 0 or 1. | `getSeriesFollowState` counts under select-own RLS. | Planned (TICK-452) |
| Ticket "List for" resale button does nothing. | `components/quiet/screens/tickets/resale.tsx` has no handler. | Planned (TICK-448) |

## Ticketiv Venue — TICK-477

| Issue | Status | Evidence | Gaps |
|---|---|---|---|
| TICK-481 Onboarding, verification, workspace | 4 (on branch, PR #587) | `20261124120000_tick481_venue_ownership.sql`, `supabase/tests/venue_ownership.sql` (46 checks), `/onboarding/venue`, `/manage/venues/[id]`, `/super-admin/venue-claims` | Merge and apply to UAT, then browser-verify |
| TICK-482 Spaces, facilities, packages | 1 | Only `venues.capacity` | Everything |
| TICK-460 Marketplace, availability, enquiry-to-booking | 1 | `/venues` read-only list; broken `/api/venues` | Profile page, availability, enquiries, bookings, conflict control |
| TICK-483 Calendar and utilisation | 1 | — | Everything |

## Ticketiv Artists — TICK-478

| Issue | Status | Evidence | Gaps |
|---|---|---|---|
| TICK-353 Claim existing profiles | 2 | `fn_create_talent_profile` (self-create only); `/onboarding/talent` | Claim flow for lineup-created artists, evidence and admin review, de-duplication |
| TICK-484 Workspace, managers, press kit | 1 | Talent context links to the public page only | Workspace, `artist_members`, press-kit fields |
| TICK-461 Booking enquiries | 1 | Lineup links by name, with no consent from the artist | Enquiry model |
| TICK-485 Performance calendar | 2 | `lib/events/artist-tour-dates.ts` (tested); page query broken | Private calendar, booking management |
| TICK-486 Fan engagement, audience insights | 2 | `artist_follows`, `fn_set_artist_follow`, new-event trigger (alerts dropped until #585) | No follow button on the artist page; no aggregate counts or insights |

## Ticketiv Organizer — TICK-479

| Issue | Status | Evidence | Gaps |
|---|---|---|---|
| TICK-166 Scanner equipment | 6 (physical) | `docs/SCANNER_HARDWARE_READINESS.md`; device registration in software | Procurement and sign-off |
| TICK-167 Gate staff training | 6 (operational) | `docs/GATE_STAFF_TRAINING.md` | Completed training log |
| TICK-350 Withdrawals | 2 | `lib/payouts/deltapay-payouts.ts`, `fn_request_payout`, statements page, 27 tests | No flat fee; admin-initiated; DeltaPay UAT checklist unticked |
| TICK-394 Provider controls | 4 (org level partial) | `fn_get_effective_payment_providers`, `lib/payments/availability-core.ts`, tests | `organizations.payment_providers` is never read or set by the app |
| TICK-433 Marketing consent | 1 | Global channel switches only | Per-organiser consent, checkout opt-in, preference centre |
| TICK-435 Audience view | 1 | Per-event attendee CSV | Audience page, segments, consented export |
| TICK-436 Campaign composer | 2 | Per-event "Email attendees" (`fn_claim_email_broadcast`) | Campaigns, scheduling, consent |
| TICK-437 Automated triggers | 1 | — | — |
| TICK-438 Campaign analytics | 1 | — | — |
| TICK-439 Promoter/affiliate links | 1 | — | — |
| TICK-440 Embeddable checkout | 1 | — | — |
| TICK-441 Agent/outlet float | 6 (regulatory) | — | Legal and provider approval |
| TICK-442 Ticket add-ons | 1 | — | — |
| TICK-453 Instant MoMo payouts | 6 (provider) | DeltaPay EPS rail exists | Production sign-off; fast-payout terms |
| TICK-454 Tax invoices and statements | 2 | Statements list, CSV export | Invoice model, numbering, PDF |
| TICK-455 Post-event report | 4 (first slice) | `event-performance-panel.tsx`, `lib/events/performance.ts` (#582) | Export, check-in curve, channel mix |
| TICK-456 Sponsor report | 1 | — | — |
| TICK-457 Sales advances | 6 (regulated lending) | — | Legal, commercial and provider approval |
| TICK-459 Self-serve webhooks | 2 | `webhook_endpoints` (RLS `is_org_admin_of`), admin console | Organiser UI, signing secrets, dispatcher |

## Ticketiv Attendees — TICK-480

| Issue | Status | Evidence | Gaps |
|---|---|---|---|
| TICK-434 Follow organizers | 2 | `org_follows`, `fn_set_org_follow`, follow UI on event pages | Alerts dropped until #585; no follow button on the organiser page; no counts; followers aren't an audience source |
| TICK-443 WhatsApp-first sharing | 2 | `wa.me`/`navigator.share`, ticket image, Android App Links | No Open Graph images or rich previews; no iOS association file |
| TICK-444 Split pay | 1 | — | Needs provider support |
| TICK-445 Lay-by | 1 / 6 | — | Regulatory and provider review |
| TICK-446 Gift tickets | 3 | `transfers` + `fn_request_transfer_*` | Gift wording and message; no tests |
| TICK-447 Saved MoMo number | 1 | Saved methods intentionally hidden | Product decision plus privacy review |
| TICK-448 Verified resale | 2 | `resale_listings`, `events.resale_cap_bps`, `lib/resale-cap.ts` | Cap not enforced on the server; dead button; no badge; no tests |
| TICK-449 Ticketiv Pass loyalty | 1 | — | — |
| TICK-450 Presales | 1 | — | — |
| TICK-451 Reviews and gallery | 2 | `event_feedback` (private), `event_highlights` | No public verified reviews or gallery page |
| TICK-452 Follow artists and venues | 2 | `artist_follows`, `series_follows` | No venue follows; series follows never alert |
| TICK-468 Event Companion | 4 | Guides, updates, reminders, memory, Web Push, app screens, tests | Update and reminder notifications dropped until #585; native push needs FCM |

## Shared foundations

| Foundation | Status |
|---|---|
| One identity, many resource-scoped roles | 4. Effective-roles RPC and context switcher; venue source added on the TICK-481 branch |
| Workspace switching | 4 for Personal/Org/Talent/Scan/Admin; Venue on branch; Artist workspace missing |
| Public profiles | Organiser yes; artist (legacy page, broken query); venue list only |
| Following and notifications | Model exists; delivery broken until #585 |
| Audit | `audit_log` used by venue RPCs; admin console audit exists |
| CI | GitHub Actions has no runners (minutes or billing). The gate is run locally for every PR |

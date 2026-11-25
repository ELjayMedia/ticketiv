# Execution ledger

The living record for the Four Pillars programme. **Read this first when resuming.** Update it at the end of every batch.

How each batch is verified:
- GitHub Actions (the repo is public, so runners are available): Release gate, which runs every `supabase/tests/*.sql` harness via `scripts/ci/run-sql-harnesses.sh` except those in `.gate-exclude`; Release policy; reconstruct-production-history
- before pushing: the SQL harnesses on an isolated `supabase db start` database (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`), vitest, tsc and lint

Nothing here has been applied to production. Deployment status means "merged to `uat`" or "applied to the UAT database" only when stated.

## Batch 1: 2026-11-24

| Jira | Pillar | Status | Branch | PR | Tests run | Result | DB change | Deployed | Next action |
|---|---|---|---|---|---|---|---|---|---|
| TICK-434, TICK-452, TICK-468, TICK-451 | Attendee | Fix ready | `fix/notification-type-constraint` | #585 | `notification_types.sql` before/after; vitest | Before: alert dropped. After: stored | Widen `check_notifications_type_channel` (additive) | No | Review, merge, apply to UAT then prod |
| TICK-448 | Attendee | Server cap done; button and badge remain | `fix/TICK-448-resale-cap-server` | #586 (stacked on #585) | `resale_cap.sql` before/after; vitest; tsc; lint | 5/5 after (3 failed before) | Re-create `fn_publish_resale_listing_unchecked` | No | Review; then the "List for" button and verified badge |
| TICK-481 | Venue | Implemented and tested on branch | `feat/TICK-481-venue-workspace` | #587 (stacked on #585) | `venue_ownership.sql` (46); full release gate; cross-org 41/41; Docker build | All pass | `venue_members`, `venue_claims`, 10 RPCs, venue columns, effective roles | No | Review; apply to UAT; browser-verify the 3 personas |
| — | Platform | Dependency upgrade | `fix/security-deps` | #583 | Gate; `next build` on 16.4.6 | Audit 88 → 5 (0 critical) | — | No | Review |
| — | Attendee | Checkout picker layout | `fix/desktop-checkout-payment-picker` | #584 | Placement tests; Playwright on a UAT-backed preview | Picker in the form column | — | No | Review |
| #581, #582 | Attendee, Organizer | Merged to `uat` before CI ran | — | #581, #582 | Full gate on `uat` @ `09a465b0`; Docker build | All pass (the CI failure was "no runner") | — | Merged to `uat` | None |

### Rollback notes
- **#585:** drop and re-add the 18-type constraint after deleting rows of the new types.
- **#586:** re-apply `fn_publish_resale_listing_unchecked` from the baseline.
- **#587:** drop the venue RPCs and helpers; drop `venue_claims` and `venue_members`; restore `fn_get_ticketiv_effective_roles` from the baseline; drop the `venues_select_venue_member` policy. The new `venues` columns can stay (nullable or defaulted).

## Batch 2: 2026-11-24

Batch 1 PRs (#583 to #588) are all merged to `uat`.

| Jira | Pillar | Status | PR | Tests | DB change | Deployed |
|---|---|---|---|---|---|---|
| Wave 1 fixes | Artist, Venue | Merged | #589 | `artist_public_read.sql` | Authenticated line-up read policies | `uat` |
| TICK-448 | Attendee | Merged | #590, #593 | `resale_cap.sql`, `transfer_reissues_code.sql`, vitest | Reissue `ticket_code` on transfer and resale; audit cap changes | `uat` |
| TICK-452, TICK-434 | Attendee | Merged | #591 | `follows.sql` | `venue_follows`, `fn_follower_count`, venue alerts | `uat` |
| TICK-353, TICK-484 | Artist | Merged, Done | #592, #594 | `artist_ownership.sql` (32), `artist_claim_safeguards.sql` | `artist_members`, `artist_claims`, profile columns, merge and reset RPCs, `artist_redirects` | `uat` |
| TICK-434, TICK-452 | Attendee, Organizer | Merged | #595 | `follow_completion.sql`, `tests/follow-completion.test.ts` | Series alerts; one alert per event (org > series > artist > venue); `v_organizer_public.follower_count` (threshold 50); `fn_org_follower_trend`; `fn_my_follows` | No |

| TICK-482, TICK-460 | Venue, Organizer | Merged, Done | #596 | `venue_marketplace.sql` (55), `tests/venue-marketplace.test.ts` | `venue_spaces`, `venue_blocks`, `venue_enquiries`, `venue_enquiry_messages`, `venue_bookings` (exclusion constraint), `venues.venue_type`, 12 RPCs | No |
| TICK-483 | Venue | PR open | #597 | `venue_utilisation.sql`, `tests/venue-utilisation.test.ts` | `fn_venue_utilisation` (read-only) | No |
| TICK-461, TICK-485, TICK-486 | Artist, Organizer | Merged | #598 | `artist_bookings.sql` (44), `tests/artist-bookings.test.ts` | `artist_booking_requests`, `artist_booking_messages`, `artist_announcements`, 7 RPCs | `uat` |
| TICK-394 | Organizer | Merged | #599 | `org_payment_providers.sql` | Organisation payment defaults | `uat` |
| TICK-451 | Attendee, Organizer | Implemented on feature branch | feat/TICK-451-reviews-gallery | `event_reviews.sql` | Verified reviews, reports, replies and public ratings | Pending UAT schema rollout |

### Rollback notes (batch 2)
- **#593:** restore the three completion functions and the guard trigger from `20261124170000`'s predecessors. Codes already reissued stay valid; the code is just a unique string.
- **#594:** drop the `limit_claims` triggers, `artist_redirects`, `fn_admin_merge_artists` and `fn_admin_reset_artist_owner`; re-create `fn_get_or_create_artist` from `20261124160000`.
- **Follow completion:** see the header of `20261124190000_tick434_452_follow_completion.sql`.
- **Venue marketplace:** see the header of `20261124200000_tick482_460_venue_marketplace.sql`.
- **Artist bookings:** see the header of `20261124220000_tick461_485_486_artist_bookings.sql`.

## Queue (dependency order)

Items 1 to 4 (Wave 1 fixes, TICK-448, TICK-353 / TICK-484, follows) are done.

5. ~~TICK-482, TICK-460~~ (#596), ~~TICK-483~~ venue utilisation (PR open)
6. ~~TICK-461 / TICK-485 / TICK-486~~ artist bookings, calendar, audience (PR open)
7. Wave 4 organiser integration (event wizard picks booked venue and accepted artist; consent model TICK-433 first)
8. Wave 6 ecosystem acceptance scenario

## Blocked or needs a human

| Item | Needs |
|---|---|
| UAT pipeline | Cloudflare Access service token `ticketiv-uat-ci` (owner action) |
| Production migrations | Review and approval before applying the batch 1 and batch 2 migrations to production |
| TICK-166 / TICK-167 | Physical procurement; staff training records |
| TICK-441, TICK-457, TICK-445 | Legal and regulatory approval (stored value, lending, instalments) |
| TICK-453 | DeltaPay production sign-off |
| TICK-468 native push | Firebase/FCM project |
| TICK-434 inline channel consent | TICK-433 consent model first |
| TICK-435+ | Data-protection review before any audience export |

## Product maturity (verified criteria only)

| Pillar | Verified in production | On branch, isolated DB | Not started |
|---|---|---|---|
| Attendees | Discover, buy, ticket, companion screens | Follow-alert delivery (#585) | Venue follows, public reviews, presales, loyalty |
| Organizer | Full event lifecycle to settlement | — | Venue/artist association, consent, campaigns |
| Venue | — | Ownership, claims, verification, team, profile (#587) | Spaces, availability, bookings, public page, analytics |
| Artists | Lineups, follows from event pages | — | Claims, workspace, bookings, calendar, insights |

# Execution ledger

The living record for the Four Pillars programme. **Read this first when resuming.** Update it at the end of every batch.

How each batch is verified while GitHub Actions has no runners:
- the release gate, run locally (`pnpm check:release` steps)
- the SQL harnesses on an isolated `supabase db start` database (`TICKETIV_CROSS_ORG_TEST_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`)
- a production Docker build

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

## Queue (dependency order)

1. Fix `/api/venues` 500 and the artist page query (`display_order`, `banner_url`) (Wave 1)
2. TICK-448: wire the "List for" button; verified badge
3. TICK-353 / TICK-484: `artist_members` + `artist_claims`, reusing the venue claim pattern; generalise the admin queue
4. Follower-count aggregates; series count fix; `venue_follows` (TICK-452)
5. TICK-482 venue spaces, then TICK-460 public venue page, availability, enquiries and bookings (exclusion constraint), then TICK-483
6. TICK-461 / TICK-485 / TICK-486 artist bookings, calendar, audience
7. Wave 4 organiser integration (event wizard picks booked venue and accepted artist; consent model TICK-433 first)
8. Wave 6 ecosystem acceptance scenario

## Blocked or needs a human

| Item | Needs |
|---|---|
| CI runners | Owner: GitHub Actions billing/minutes or a self-hosted runner |
| UAT pipeline | Cloudflare Access service token `ticketiv-uat-ci` (owner action) |
| Production migrations | Review and approval before applying #585/#586/#587 to production |
| TICK-166 / TICK-167 | Physical procurement; staff training records |
| TICK-441, TICK-457, TICK-445 | Legal and regulatory approval (stored value, lending, instalments) |
| TICK-453 | DeltaPay production sign-off |
| TICK-468 native push | Firebase/FCM project |
| TICK-435+ | Data-protection review before any audience export |

## Product maturity (verified criteria only)

| Pillar | Verified in production | On branch, isolated DB | Not started |
|---|---|---|---|
| Attendees | Discover, buy, ticket, companion screens | Follow-alert delivery (#585) | Venue follows, public reviews, presales, loyalty |
| Organizer | Full event lifecycle to settlement | — | Venue/artist association, consent, campaigns |
| Venue | — | Ownership, claims, verification, team, profile (#587) | Spaces, availability, bookings, public page, analytics |
| Artists | Lineups, follows from event pages | — | Claims, workspace, bookings, calendar, insights |

# Delivery roadmap

Work runs in dependency order, not by Jira number. Each batch is one reviewable PR against `uat`, verified locally with the release gate while GitHub Actions has no runners.

## Wave 1: platform integrity and production blockers

| # | Item | Status |
|---|---|---|
| 1.1 | Notification type constraint silently drops 13 feature notification types | PR #585 |
| 1.2 | Next.js 16.4.6 and dependency advisories (88 → 5 audit findings) | PR #583 |
| 1.3 | Desktop checkout payment picker rendered above the page | PR #584 |
| 1.4 | Enforce the resale price cap on the server (TICK-448) | PR #586 (stacked on #585) |
| 1.5 | Fix `/api/venues` (500) and the artist page query (`display_order`, `banner_url`) | Next |
| 1.6 | Restore CI runners (owner: Actions billing or a self-hosted runner) | Blocked: owner |

## Wave 2: shared four-pillar foundations

| # | Item | Status |
|---|---|---|
| 2.1 | Venue memberships, claims, admin verification, Venue context (TICK-481) | PR #587 (stacked on #585) |
| 2.2 | Artist memberships and claims (`artist_members`, `artist_claims`, with the same review queue). Generalise the admin queue to "Resource claims" (TICK-353, TICK-484) | Next |
| 2.3 | Follower counts via SECURITY DEFINER aggregates (org, artist, series); fix the series count | Planned |
| 2.4 | `venue_follows` plus a new-event alert (TICK-452) | Planned |

## Wave 3: Venue and Artist MVPs

- **Venue:**
  - TICK-482: `venue_spaces` (capacity by layout, facilities, technical specs, packages, indicative pricing)
  - TICK-460: public `/venues/[slug]` profile; `venue_availability`; `venue_booking_enquiries` with the full lifecycle; `venue_bookings` with an exclusion constraint against overlapping confirmed bookings per space
  - TICK-483: calendar and utilisation from bookings and public events
- **Artist:**
  - TICK-484: `/manage/artists/[id]` workspace and press kit
  - TICK-461: booking enquiries
  - TICK-485: performance calendar
  - TICK-486: follow button on the artist page, aggregate audience

## Wave 4: Organizer integration

- Event wizard: pick a venue with a confirmed booking, and an artist with an accepted enquiry.
- Consent model (TICK-433), then audience (TICK-435), then campaigns (TICK-436 to TICK-438).
- Promoter links (TICK-439), add-ons (TICK-442), webhooks UI (TICK-459), statements (TICK-454), post-event report export (TICK-455), sponsor report (TICK-456).
- **Gated and kept off:** TICK-441, TICK-453 (instant), TICK-457.

## Wave 5: Attendee experience

- Rich link previews (TICK-443)
- Gift wording on transfers (TICK-446)
- Public verified reviews and gallery (TICK-451)
- Presales (TICK-450)
- Loyalty (TICK-449)
- **Provider-dependent:** split pay and lay-by (TICK-444, TICK-445) and saved MoMo (TICK-447)

## Wave 6: integrated validation

A deterministic "EljayTunes Live gospel concert" scenario (`supabase/tests/ecosystem_acceptance.sql`, plus a Playwright run on UAT) covering:

- the venue manager, artist, organiser, attendee and admin personas
- sandbox payment
- check-in
- a review
- the audit trail
- negative authorisation checks

See `ACCEPTANCE_MATRIX.md`.

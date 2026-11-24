# Ticketiv — four product pillars

**One platform. One identity. Four product experiences. Shared infrastructure.**

| Pillar | Jira epic | Who | Core promise |
|---|---|---|---|
| Ticketiv Attendees | TICK-480 | People who go to events | Find events through the organisers, artists and venues they follow; buy, hold and use a ticket; keep engaging afterwards. |
| Ticketiv Organizer | TICK-479 | Promoters, event companies | Run the whole event lifecycle, from venue and artist enquiries to settlement and the post-event report. |
| Ticketiv Venue | TICK-477 | Venue owners and managers | Manage the venue as a commercial participant: profile, spaces, availability, booking enquiries, hosted events. |
| Ticketiv Artists | TICK-478 | Performers and their managers | Own a public presence, receive booking enquiries, manage performances, grow an audience. |

Shared-infrastructure epics stay separate: TICK-59 (Production Launch), TICK-170 (Production Readiness), TICK-253 (Compliance & Payments), TICK-312 (App Store Distribution), TICK-417 (Cashless Commerce), TICK-423 (Partner Ecosystem).

## Architecture decisions

These follow the existing code. They are not a redesign.

1. **One account, many roles, all resource-scoped.** There is no global "venue user" or "artist user". A person holds any mix of:
   - `org_members` (organiser roles per org)
   - `event_staff` (door/scanner per event)
   - `artists.primary_user_id` (talent)
   - `venue_members` (owner/manager/staff per venue, added in TICK-481)
   - `admin_users` (platform staff)

   `fn_get_ticketiv_effective_roles` unions them. It is the single source for the context switcher (`lib/data/identity/contexts.ts`).
2. **Workspaces are routes, not apps.**

   | Workspace | Route |
   |---|---|
   | Personal | `/me` and the consumer site |
   | Organizer | `/orgs/[orgId]` |
   | Venue | `/manage/venues/[venueId]` (new) |
   | Artist | `/manage/artists/[artistId]` (planned, TICK-484) |
   | Scanner | `/scan` |
   | Admin | `/super-admin` |

   Switching is navigation plus a remembered context cookie. There is no re-login and no second session. `/manage/...` was chosen for the venue and artist workspaces so that public profile routes (`/venues`, `/artists/[id]`) stay public and management stays behind auth by default in the middleware.
3. **Venues and artists are global records.** Organisers already create them through `fn_get_or_create_venue` / `fn_get_or_create_artist`, which are unique by name (and city for venues). Ownership is layered on top by claims. Nothing is duplicated.
4. **Writes go through SECURITY DEFINER RPCs that re-check the role.** Tables expose read-only RLS. Pages mirror the checks only to avoid offering actions the database would refuse (`lib/venues/core.ts`).
5. **Claims are verified by people.** Claiming an existing venue or artist creates a pending claim, and access starts only when a platform admin approves it. Someone who creates a new venue manages it immediately, but it shows as *unverified* until approved, and rejection removes their access. A second owner claim is a dispute that needs an explicit "replace owner" decision. The previous owner is kept as a manager, and every step is audited.
6. **No attendee personal data crosses pillars.** Venues and artists see aggregates and public events. They never see buyer lists.
7. **Regulated money features stay gated.** Sales advances, instant payouts and agent float need legal, commercial and provider approval. Until then they are feature-flagged off and documented as blocked.

## Ecosystem relationships

| Relationship | Connective tissue | Status |
|---|---|---|
| Attendee ↔ Organizer | `org_follows`, orders, consent (TICK-433) | Follows exist; alerts were silently dropped until #585 |
| Attendee ↔ Artist | `artist_follows`, `event_artists` | Follows exist; same alert bug, fixed by #585 |
| Attendee ↔ Venue | `events.venue_id`; venue follows (TICK-452) | No venue follows yet |
| Organizer ↔ Venue | `events.venue_id`; booking enquiries (TICK-460) | Ownership built (TICK-481); bookings next |
| Organizer ↔ Artist | `event_artists`; booking enquiries (TICK-461) | Not started |
| Venue ↔ Artist | Confirmed performances via shared events | Not started |

See `IMPLEMENTATION_REALITY.md` for what is actually built and `EXECUTION_LEDGER.md` for progress.

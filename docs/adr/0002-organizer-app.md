# ADR 0002 — Two apps: attendee and organizer (staff and scanner included)

- **Status**: Accepted (2026-11-02)
- **Supersedes**: the product table in [ADR 0001](0001-mobile-packaging.md) (the React Native monorepo decision stands)

## Context

ADR 0001 planned three products: the **Ticketiv** attendee app, a scan-only
**Ticketiv Access** staff app, and organizers on the responsive web only. In
practice organizers, door staff and scanners work the same events from the
same workspace, and running gate tools in a separate product from the event
they belong to split one job across two places. On the web this showed up as
two scanners (`/scan` and the workspace check-in page) and door staff being
pushed out of the organizer workspace.

## Decision

**Two apps, each mirrored on the web.**

| App | Who | Mobile | Web |
| --- | --- | --- | --- |
| **Ticketiv** | Attendees and ticket buyers | `com.ticketiv.app` | `ticketiv.app` |
| **Ticketiv Organizer** | Organizers, finance, door staff and scanners | `com.ticketiv.access` (published identifier kept; renamed to Ticketiv Organizer) | `organizer.ticketiv.app` |

One account works in both. Scanning never moves into the attendee app, so the
ADR 0001 rule that a consumer release must not destabilise check-in still holds.

### Roles inside the organizer app

One mapping, `packages/shared/src/organizer-roles.ts`, drives both the web
workspace and the mobile app:

| Organizer role | Stored roles | Sees |
| --- | --- | --- |
| Manager | `organizer_owner`, `organizer_admin` (legacy `admin`, `organizer`) | Everything. Team: owner and admin. Settings: owner. |
| Finance | `finance` | Dashboard, Finance, Payouts |
| Door staff | `organizer_staff`, `staff`, `pos` | Their events, Scan, Guestlist, Box office |
| Scanner | `scanner`, `organizer_scanner`, `device` | Scan |

A person's role is the broadest across their org membership and their
per-event assignments (`event_staff`). Shared gate devices keep working
without a personal login through setup-code pairing.

**`organizer_staff` changes meaning.** It was a manager (could create and edit
events); it is now door staff. The database enforces the same split
(migration `20261102090000_organizer_staff_door_role`):

- `app.is_org_manager` — owner and admin: every write path.
- `app.is_org_operator` — owner, admin and `organizer_staff`: door operations
  (scan, guestlist, box office, device sessions) and the reads they need.

## Consequences

- The web organizer workspace shows each role only its sections and starts it
  where its work is (dashboard, its events, or the scanner). Every workspace
  page checks the role, not just org membership.
- `/scan` stays the single scanner (offline, device pairing); the workspace
  links to it instead of hosting a second one.
- `organizer.ticketiv.app` needs a DNS record and a Vercel domain, and the
  login cookie must be shared across `.ticketiv.app`.
- The Access app is renamed in place (display name and store listings) and
  grows from scan-only to the role-based organizer shell. Its package ID does
  not change because it is already published.
- Existing `organizer_staff` members lose event editing. Promote anyone who
  should keep it to `organizer_admin`.

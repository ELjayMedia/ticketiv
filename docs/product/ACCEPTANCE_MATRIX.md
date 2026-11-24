# Acceptance matrix

Maturity is scored against **verified** acceptance criteria only.

| Mark | Meaning |
|---|---|
| ✅ | Verified with persisted state |
| 🟡 | On a branch, verified on the isolated database |
| ⬜ | Not met |

## Venue MVP (TICK-477)

| Criterion | State | Evidence |
|---|---|---|
| An authorised manager can create a venue | 🟡 | `venue_ownership.sql`: "create: creator is owner" |
| …or claim an existing one, verified by an admin | 🟡 | "admin: approve first owner claim", "approve: venue verified" |
| Unauthorised and duplicate ownership is prevented | 🟡 | "duplicate venue is refused", "duplicate pending claim refused", "second owner claim is a dispute", stranger denials (8 checks) |
| Multiple managers | 🟡 | "owner: add manager by email"; "manager: cannot add another manager" |
| Admin verification and dispute process | 🟡 | `/super-admin/venue-claims`; "dispute resolved with replace_owner", "previous owner kept as manager" |
| Configure spaces | ⬜ | TICK-482 |
| Manage availability | ⬜ | TICK-460 |
| Receive an organiser enquiry and confirm a booking | ⬜ | TICK-460 |
| Associate the booking with an event | ⬜ | TICK-460 |
| An attendee discovers the venue and its events | ⬜ | Public venue page pending |

## Artist MVP (TICK-478)

| Criterion | State |
|---|---|
| Claim an existing profile | ⬜ (self-create only) |
| Update public presence | ⬜ |
| Receive and respond to a booking enquiry | ⬜ |
| Confirmed performance appears in the public calendar | ⬜ (public tour-dates query broken) |
| Attendees discover and follow artists | 🟡 Follows exist (event lineup only); alerts need #585 |

## Organizer (TICK-479)

| Criterion | State |
|---|---|
| Create, publish, sell, scan, settle | ✅ Existing product, in production |
| Associate a confirmed venue or artist | ⬜ |
| Post-event report | 🟡 First slice (#582) |
| Consented audience and campaigns | ⬜ |

## Attendee (TICK-480)

| Criterion | State |
|---|---|
| Discover, buy, hold and use a ticket | ✅ Production; Paystack test checkout verified on UAT |
| Follow organiser, artist and venue | 🟡 Organiser and artist only |
| New-event alerts from follows | ⬜ Dropped by the DB constraint; fixed by #585, not yet deployed |
| Event Companion stages | ✅ Tested; update and reminder notifications need #585 |
| Verified review after attending | ⬜ Private feedback only |

## Ecosystem scenario: "EljayTunes Live gospel concert"

Not built yet (Wave 6). It will run as `supabase/tests/ecosystem_acceptance.sql` on the isolated database, plus a Playwright run on UAT with Paystack test mode.

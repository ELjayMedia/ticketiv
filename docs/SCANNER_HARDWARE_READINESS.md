# Scanner hardware readiness

Use this checklist before every live ticketed event. It turns the "two scanners
per gate" requirement into a concrete device, power, connectivity, and manual
fallback plan that the event supervisor can sign off.

## Minimum gate kit

Each active gate needs:

- 2 registered scanner devices assigned to the live event.
- 1 spare registered scanner device for every 2 gates, rounded up.
- 1 power bank per scanner for events 3 hours or longer.
- 1 spare charging cable per gate.
- Primary connectivity plus backup mobile data.
- A printed/exported valid-ticket fallback list sealed for supervisor use.

Do not open a gate with only one working scanner unless the event supervisor
and organizer representative accept the queue/admission risk in the event log.

## Device registration checklist

Complete this before doors open.

1. Register each device through `/scan/setup`.
2. Assign each device to the correct live published event.
3. Label the physical device with gate, lane, and role.
4. Confirm the device appears in the organizer or super-admin device view.
5. Open the scanner screen and confirm the event name/date shown to staff.
6. Perform one dry-run scan or manifest refresh check per device.
7. Mark a device as spare only after it has also passed setup.

### Device register template

```text
Event:
Gate:
Lane:

Primary scanner device:
Device label:
Assigned event:
Battery at doors open:
Connectivity:
Dry-run scan/manifest check:

Backup scanner device:
Device label:
Assigned event:
Battery at doors open:
Connectivity:
Dry-run scan/manifest check:

Spare scanner location:
Spare scanner owner:
Open gaps:
```

## Power plan

For events under 3 hours:

- Start each scanner at 90% battery or higher.
- Keep one charger and outlet/power bank available per gate.
- Gate captain checks battery at doors open and every hour.

For events 3 hours or longer:

- Start each scanner at 100% battery.
- Attach or stage one power bank per scanner.
- Keep power banks labeled to the scanner/gate they support.
- Gate captain checks battery every 45 minutes.
- Replace any scanner below 25% battery before the rush window.

If the venue has unstable power, treat every event as a 3+ hour event and rely
on power banks from doors open.

## Connectivity plan

Each gate needs a primary and backup path.

| Connectivity state | Required plan |
|---|---|
| Venue WiFi reliable | Connect scanners to venue WiFi and keep mobile data ready as backup. |
| Venue WiFi unknown | Use mobile data as primary and venue WiFi only as backup. |
| Venue WiFi unreliable | Disable auto-join if it causes drops; use mobile data primary. |
| Mobile signal weak | Refresh scanner manifests before doors open and prepare manual fallback. |
| Complete outage | Follow the manual fallback process below and the event escalation path. |

Before doors open, the scanner lead should stand at each gate and confirm the
actual signal, not just the venue's plan.

## Manual fallback process

Manual fallback is only for a scanner outage, stale/missing offline manifest, or
full connectivity failure. It is not a shortcut for a disputed `already_used`,
`invalid`, refunded, revoked, or transferred ticket.

### Prepare fallback list

1. Export or print the valid issued ticket list as close to doors-open as
   practical.
2. Include only fields needed for admission: event, order/ticket reference,
   holder/buyer name if available, ticket type, and ticket code suffix.
3. Store the list with the event supervisor in a sealed envelope or protected
   file.
4. Record who generated it, when it was generated, and which event/date it
   covers.
5. Destroy or archive the list according to the event's data-handling process
   after reconciliation.

### Use fallback list

1. Incident lead or event supervisor declares scanner fallback active.
2. Gate staff checks the buyer against the fallback list.
3. Staff marks the row as admitted with time, gate, and initials.
4. Disputed, duplicate, or missing buyers move to supervisor lookup.
5. When scanning returns, scanner lead reconciles fallback admissions against
   Ticketiv records and records any exceptions.

### Fallback admission log

```text
Event:
Fallback started:
Approved by:
Reason:

Ticket/order:
Buyer/holder:
Ticket type:
Gate:
Admitted at:
Staff initials:
Notes:
```

## Readiness sign-off

Use this before doors open.

```text
Event:
Date:
Event supervisor:
Scanner lead:
Organizer representative:

Gates open:
Total scanner devices required:
Total scanner devices ready:
Spare scanners ready:

Power banks required:
Power banks ready:
Charging cables ready:

Primary connectivity:
Backup connectivity:
Offline manifest checked:

Fallback list generated:
Fallback list owner:
Manual admission log location:

Launch blockers:
Signed off by:
```

## Links

- Live event escalation path: `docs/LIVE_EVENT_ESCALATION.md`
- Scanner access model: `docs/permission-model.md`
- Scanner API/staff contracts: `docs/contracts/frontend-db-contract.md`

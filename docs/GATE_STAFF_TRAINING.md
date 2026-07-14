# Gate staff scanner training

Use this guide before every live event to train scanner staff, gate captains,
and the designated support lookup owner. The goal is simple: staff should know
what each scanner outcome means, who can look up an order or ticket, who can
approve a manual admission, and how disputes are logged.

## Roles for each event

| Role | Required access | Responsibility |
|---|---|---|
| Trainer | Scanner app plus event dashboard | Runs the pre-event walkthrough and records attendance. |
| Gate captain | Scanner app plus radio/phone to event supervisor | Manages the lane, queue, and staff rotation. |
| Scanner staff | Scanner app for assigned event | Scans tickets and follows the outcome script. |
| Support lookup owner | Event orders/tickets dashboard access | Looks up disputed orders or tickets on the spot. |
| Event supervisor | Dashboard access plus organizer authority | Approves manual admission or denies override requests. |

Do not open a gate unless the support lookup owner and event supervisor are
named. If one person covers both roles, write that in the training log.

## 10-minute pre-event run-through

1. Confirm every scanner is assigned to the correct event.
2. Confirm staff can open `/scan/setup`, select the event, and reach the scan
   screen.
3. Scan one known valid test ticket or dry-run ticket.
4. Explain every outcome in the table below.
5. Show staff where disputed buyers stand while the main queue keeps moving.
6. Name the support lookup owner and event supervisor.
7. Rehearse one duplicate-scan dispute and one buyer-without-visible-ticket
   dispute.
8. Record attendance and unresolved gaps.

## Scanner outcome meanings

| Outcome | Meaning | Gate action |
|---|---|---|
| `valid` | Ticket is issued for this event and the scan/check-in was recorded. | Admit the buyer. |
| `already_used` | Ticket was previously checked in or locally marked as used. | Do not admit from the scanner lane; send to support lookup. |
| `invalid` or `unknown_ticket` | Code is not recognized or cannot be verified. | Do not admit; send to support lookup if the buyer claims purchase. |
| `wrong_event` | Ticket exists but is for another event. | Do not admit; direct buyer to support lookup. |
| `revoked`, `refunded`, or `transferred` | Ticket is no longer valid for this buyer. | Do not admit without event supervisor approval. |
| `not_issued` | Order/ticket exists but was not issued. | Send to support lookup; check payment/order status. |
| `offline` or queued scan | Device cannot reach the API but has accepted the scan for later sync. | Follow offline queue instructions; do not clear browser storage. |
| `error` | Scanner cannot complete the validation. | Retry once, then move to support lookup or spare scanner. |

Scanner staff must not debate a dispute in the main lane. Keep valid-ticket
buyers moving and route disputes to the support lookup owner.

## Support lookup flow

The support lookup owner should have access to the event orders/tickets dashboard
before doors open. When a buyer disputes a scan:

1. Capture buyer name, buyer email or phone, order number if available, ticket
   code if visible, gate, scanner device, and scan time.
2. Search the event orders/tickets dashboard for the buyer or order.
3. Compare ticket status, event, transfer/refund state, and latest scan result.
4. Decide whether this is a valid support issue, duplicate-use attempt, wrong
   event, payment/ticket issuance issue, or unclear case.
5. Escalate unclear or high-pressure cases to the event supervisor.

For payment-related issues, follow `docs/SUPPORT_PROCESS.md`. Do not create a
new ticket, payment, or refund directly from the gate unless the approved admin
workflow supports it.

## Manual admission authority

| Situation | Who can decide | Required log |
|---|---|---|
| Scanner shows `valid` | Scanner staff | Normal scan record is enough. |
| Buyer has no visible ticket but dashboard shows an unused issued ticket | Event supervisor | Manual admission log with order/ticket reference and reason. |
| Scanner shows `already_used` but buyer disputes it | Event supervisor after support lookup | Previous scan time/device, buyer claim, decision, and staff initials. |
| Scanner shows `invalid`, `wrong_event`, `revoked`, `refunded`, or `transferred` | Organizer representative plus event supervisor | Manual exception reason and business approval. |
| All scanners fail or offline manifest is unavailable | Incident lead/event supervisor | Use the event escalation procedure or manual admission fallback. |

Manual admission is an exception. It must never reset `checked_in_at`, delete a
scan, issue a duplicate ticket, or bypass refund/transfer state without an
explicit logged approval.

## Dispute scripts

### Duplicate scan

1. Move the buyer out of the main queue.
2. Ask for order number, buyer email, and where they first scanned.
3. Support lookup owner checks the latest scan time/device.
4. Event supervisor decides: admit manually, deny, or hold for organizer review.
5. Log the decision.

### Buyer cannot find ticket

1. Ask the buyer to open Tickets or search their email.
2. Support lookup owner searches by buyer email/order number.
3. If the order is paid and unused, supervisor may admit manually or help the
   buyer open the ticket.
4. If payment is pending/failed, route to buyer support and do not admit unless
   organizer representative approves a manual exception.

### Invalid or wrong event

1. Check the event name/date on the buyer's ticket screen or email.
2. If the ticket is for another event, direct the buyer to the correct event.
3. If the code appears altered or untrusted, deny admission and log the attempt.
4. Escalate aggressive or repeated attempts to venue security.

## Training log template

Copy this into event prep notes after the run-through.

```text
Event:
Date/time:
Trainer:
Gate captain:
Support lookup owner:
Event supervisor:
Organizer representative:

Scanner devices checked:
Staff trained:

Outcome walkthrough completed:
- valid:
- already_used:
- invalid/unknown_ticket:
- wrong_event:
- revoked/refunded/transferred:
- not_issued:
- offline/error:

Dispute rehearsal completed:
- duplicate scan:
- buyer without visible ticket:

Manual admission authority confirmed:
Logging location:
Open gaps:
```

## Links

- Buyer duplicate-scan support process: `docs/SUPPORT_PROCESS.md`
- Scanner access model: `docs/permission-model.md`
- Scanner/staff contracts: `docs/contracts/frontend-db-contract.md`

# Live event escalation path

Use this runbook when payments, ticket delivery, scanning, or gate connectivity
degrade during an on-sale window or live event. The goal is to keep a single
incident owner, clear buyer/gate communication, and a safe fallback that does
not corrupt orders, tickets, scans, or ledger state.

## Escalation roles

| Role | Primary responsibility | Channel |
|---|---|---|
| Incident lead | Owns the decision log, severity, and next action. | Kaya or Telegram incident room |
| Event supervisor | Makes on-site gate decisions and coordinates staff. | Phone plus Telegram |
| Payment operator | Checks Paystack/MoMo dashboards, failed attempts, webhooks, and order/payment inconsistencies. | Kaya or Telegram |
| Scanner lead | Checks scanner devices, offline state, manifest freshness, and gate queues. | Telegram plus phone |
| Support comms owner | Sends buyer-facing updates and monitors `support@ticketiv.com`. | Kaya, email, or WhatsApp |
| Organizer representative | Approves pause-sales, manual admission, or public event messaging decisions. | Phone plus Telegram |

Before doors open, the event supervisor must confirm the named person for each
role. If a role is unassigned, the incident lead owns it until explicitly
delegated.

## Severity levels

| Severity | Trigger | Decision owner |
|---|---|---|
| SEV1 | Paid buyers cannot receive/use tickets, all gates blocked, or all payment rails down during an active on-sale. | Incident lead plus organizer representative |
| SEV2 | One payment rail degraded, a gate has no working scanner, or support volume indicates repeated buyer-impacting failures. | Incident lead |
| SEV3 | Single buyer/order/scanner issue with no broad pattern. | Support comms owner or scanner lead |

Escalate to SEV1 if a SEV2 remains unresolved for 15 minutes during doors-open
traffic or if there is uncertainty about whether valid buyers can enter.

## Payment outage during sales

### First five minutes

1. Incident lead opens the incident room and starts the decision log.
2. Payment operator checks `/super-admin/payments`, Paystack/MoMo dashboards,
   Sentry, and `webhooks` for a common error.
3. Support comms owner watches `support@ticketiv.com` for "money debited, no
   ticket" reports and links each report to the relevant order/payment reference.
4. Organizer representative confirms whether sales should continue, switch rail,
   pause, or move to a manual box-office path.

### Escalation chain

1. Buyer reports failed checkout or debited money with no ticket.
2. Support comms owner captures order number, buyer email, provider reference,
   amount, and event name.
3. Payment operator checks whether the order is pending, paid, failed, or has a
   succeeded payment without paid order state.
4. If the provider confirms success but Ticketiv has no settled payment, follow
   `docs/RUNBOOK.md` section 3 to replay the provider webhook.
5. If provider status is unknown or all rails are failing, incident lead decides
   whether to pause sales.

### Payment fallback decision tree

| Condition | Action | Buyer communication |
|---|---|---|
| Paystack down, MoMo configured and healthy | Route buyers to MoMo if the event allows it; keep Paystack incident open. | "Card payments are degraded. Use mobile money while we restore card checkout." |
| One provider failing for a single buyer | Keep sales open; handle as support case. | "We are checking the payment reference and will either issue the ticket or confirm reversal." |
| All online payment rails down | Pause paid sales for the affected event. | "Ticket sales are temporarily paused while payment providers recover." |
| Money captured, tickets not issued | Do not manually insert payment/ticket rows. Replay verified webhook or escalate payment completion through the documented path. | "Your payment is being reconciled. We will issue tickets or confirm refund status." |
| On-site walk-up demand while online payments are down | Use an approved POS/manual order process only if it writes an order/payment record; otherwise pause sales. | "On-site sales are temporarily manual and may take longer." |

## Scanner/check-in outage at the gate

### First five minutes

1. Scanner lead identifies whether the failure is device-specific, network/API,
   event assignment, manifest freshness, or invalid/duplicate ticket related.
2. Event supervisor keeps one staff member managing the queue and one staff
   member troubleshooting so gate staff do not improvise contradictory rules.
3. Incident lead opens or updates the incident room if the outage affects more
   than one scanner, more than one gate, or more than five buyers.
4. Support comms owner monitors buyer messages and sends queue/gate guidance if
   needed.

### Escalation chain

1. Scanner staff reports the exact outcome shown by the app: `valid`,
   `already_used`, `invalid`, offline queue, auth failure, or no response.
2. Scanner lead checks device assignment, event selection, network, battery, and
   manifest sync.
3. Event supervisor decides whether to move the queue to a spare scanner/gate.
4. If the API or all scanners are unavailable, incident lead approves manual
   admission fallback.
5. Every manual admission must be logged with buyer name/email when available,
   ticket code or order number, gate, staff member, and reason.

### Scanner fallback decision tree

| Condition | Action | Gate instruction |
|---|---|---|
| One scanner device fails | Move to spare device registered for the same event; keep scanning. | "Use spare scanner for this lane." |
| Venue network fails but offline manifest is fresh | Continue offline scanning and sync when reconnected. | "Stay in offline mode; do not clear browser storage." |
| Scanner API unavailable and offline manifest is unavailable/stale | Switch to supervised manual admission only after incident lead approval. | "Admit against printed/exported valid ticket list and log every override." |
| Ticket shows `already_used` | Do not admit by default; send buyer to supervisor lookup. | "Supervisor checks order/ticket history before any override." |
| Ticket shows `invalid` | Do not admit unless organizer representative approves a manual exception. | "Invalid tickets require supervisor review." |
| Queue safety risk | Pause scanning and open an additional manual review lane with event supervisor approval. | "Separate buyers with disputes from buyers with valid scannable tickets." |

## Buyer and staff messaging

Keep messages factual and short. Do not promise refunds, entry, or delivery
until the incident owner confirms the path.

### Buyer payment message

> We are investigating a payment issue for this event. If money left your
> account but no ticket arrived, email support@ticketiv.com with your order
> number, buyer email, amount, and provider reference.

### Gate queue message

> We are switching scanners for this gate. Keep your ticket QR ready. Buyers
> with duplicate or invalid scans should move to the supervisor line for review.

### Pause-sales message

> Sales for this event are temporarily paused while payment processing recovers.
> Existing issued tickets remain valid.

## Dry-run requirement

Run this before the first live ticketed event and repeat it for any event with a
new venue, payment rail, or scanning team.

1. Name every escalation role and verify the actual channel invite/phone number.
2. Simulate a payment provider outage during active sales.
3. Simulate a buyer with money debited and no ticket.
4. Simulate one scanner device failure at the gate.
5. Simulate all scanners unavailable with a queue forming.
6. Confirm who can approve pause-sales, manual admission, buyer notification,
   and provider webhook replay.
7. Record gaps and do not open doors until SEV1 gaps are assigned.

### Dry-run log template

Copy this into the event prep notes after each run.

```text
Event:
Date/time:
Participants:
Incident lead:
Event supervisor:
Payment operator:
Scanner lead:
Support comms owner:
Organizer representative:

Scenario A - payment outage during sales:
Expected decision:
Actual decision:
Gaps:

Scenario B - money debited, no ticket:
Expected decision:
Actual decision:
Gaps:

Scenario C - scanner device failure:
Expected decision:
Actual decision:
Gaps:

Scenario D - all scanners unavailable:
Expected decision:
Actual decision:
Gaps:

SEV1 launch blockers:
Follow-up owners:
```

## Links

- Payment/webhook recovery: `docs/RUNBOOK.md`
- Scanner hardware readiness: `docs/SCANNER_HARDWARE_READINESS.md`
- Payment rail status: `docs/PAYMENTS.md`
- Notification channel status: `docs/NOTIFICATIONS.md`

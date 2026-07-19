# Buyer support process

Ticketiv's buyer support channel is `support@ticketiv.app`. It is linked from checkout,
order confirmation, ticket recovery, and the public support page.

## SLA

- Reply to buyer support emails within one business day.
- Triage event-day access issues first while doors are active.
- Keep payment and refund investigations open until the gateway, organiser, or Ticketiv
  resolves the case.

## Intake fields

Every support case should capture:

- Order number, when the buyer has it.
- Buyer email used at checkout.
- Event name.
- A short description of what happened.

## Failed payment with money debited

1. Ask for the order number, buyer email, payment reference, and debited amount.
2. Check the order status and payment provider status.
3. If the gateway confirms payment and the order is unpaid, escalate to payments support
   to reconcile and issue tickets.
4. If the payment failed or reversed, explain the expected bank or wallet reversal path.
5. If the event is imminent, keep the buyer updated until the case is resolved.

## Lost or undelivered ticket email

1. Ask for the order number, buyer email, and event name.
2. Confirm whether the buyer can see the order under My Tickets.
3. Check delivery records for the buyer email.
4. Help the buyer recover tickets from the buyer account or resend delivery where available.
5. Escalate mismatched email or ownership questions to a support admin.

## Duplicate scan dispute

1. Ask for the ticket code, gate or scanner lane, and arrival time.
2. Ask gate staff to record the scanner device and scan timestamp.
3. Review the ticket status and latest scan result.
4. If the buyer appears valid, escalate to event operations for on-site resolution.
   Gate staff should follow `docs/GATE_STAFF_TRAINING.md` for lane handling,
   supervisor lookup, override authority, and manual admission logging.
5. If the ticket was already used, explain the finding and keep an audit trail for organiser
   review.

## Kaya / n8n triage

Manual email support is sufficient for launch volume. Kaya or n8n should be considered
when support volume regularly creates a queue or when event-day messages need first-line
classification.

The first automation should:

- Collect the intake fields above.
- Classify the case as payment debited, missing ticket, duplicate scan, refund, or other.
- Mark event-day access cases as urgent.
- Escalate unresolved or identity-sensitive cases to a human support admin.

# Ticketiv launch incident tabletop

**Status:** exercise pack ready; **not yet executed**  
**Evidence owner:** Incident Lead  
**Related:** TICK-343

This document is the facilitation script and evidence record for the production-readiness tabletop required before TICK-343 can close. A written scenario is not evidence that the exercise happened; complete the record only with the actual participants and decisions from a live session.

## 1. Exercise objective

Prove that the team can detect, contain, communicate, recover and verify a combined operational incident without improvising dangerous database/payment actions.

The exercise should confirm:

- one named Incident Lead takes control;
- payment, scanner, infrastructure and support roles know their boundaries;
- the team knows when to pause sales, hold payouts or switch to a fallback;
- responders use reconciliation/verified replay rather than manual money-state edits;
- alert delivery reaches the expected responder;
- a bad deployment can be stopped/rolled back;
- the restore procedure and escalation path are understood even though the isolated restore drill is tracked separately;
- follow-up gaps become Jira work rather than being lost in meeting notes.

## 2. Participants — complete before starting

| Role | Name | Contact/channel verified? |
|---|---|---|
| Incident Lead | **PENDING** | **PENDING** |
| Technical Operator | **PENDING** | **PENDING** |
| Payment/Finance Operator | **PENDING** | **PENDING** |
| Scanner/Event Supervisor | **PENDING** | **PENDING** |
| Support/Comms Owner | **PENDING** | **PENDING** |
| Organizer representative | **PENDING** | **PENDING** |
| Observer/scribe | **PENDING** | **PENDING** |

Do not count this exercise as complete if the incident lead or support/escalation route is unnamed.

## 3. Ground rules

1. This is a decision exercise, not permission to manipulate production data.
2. No secret values, bank details, ticket capability tokens or customer PII are pasted into the exercise record.
3. Use current runbooks and interfaces as they exist; if a step depends on unavailable tooling, record the gap.
4. Facilitator reveals each inject in order. Participants state what they would do, who owns it, and what evidence proves success.
5. Any answer that requires “someone should probably...” is a gap until a specific role/owner is named.

## 4. Scenario

Ticketiv is in an active on-sale period for an event due to open the same evening. A new production deployment has just completed.

### Inject A — bad deployment signal

Five minutes after deploy, the production smoke reports an application/health failure. Some public pages still load from cache.

**Ask the team:**

- Who becomes Incident Lead?
- Do we keep deploying, roll back, or fix forward?
- Which exact checks distinguish Vercel application failure from Supabase failure?
- Who owns buyer/organizer communication if checkout is affected?
- What is the stop condition before another deployment is attempted?

**Expected control points:**

- promotion stops;
- unrelated deploys/migrations freeze;
- last known-good deployment and runtime evidence are identified;
- smoke/health is rerun after recovery;
- no database migration is used as a speculative fix for an app-only failure.

### Inject B — payment success with pending order

During the outage window, support receives a report: money was debited but the buyer has no ticket. The provider indicates success while Ticketiv still shows the order pending.

**Ask the team:**

- What data can support safely capture?
- Who checks provider/payment/webhook state?
- Do we manually mark the order paid or issue a ticket?
- When do we pause the payment rail?
- What proves recovery and idempotency?

**Expected control points:**

- no manual payment/ledger/ticket insert;
- underlying callback/completion fault is diagnosed first;
- only a stored verified webhook can be replayed through the trusted path;
- reconciliation confirms no duplicate payment/ticket issuance;
- buyer messaging does not promise an outcome before state is confirmed.

### Inject C — scanner degradation at doors

Doors open while the incident is being stabilized. One scanner works, two devices show stale/offline state, and a queue is forming.

**Ask the team:**

- Who owns the gate decision?
- When is offline scanning safe?
- When is manual admission permitted?
- What must be recorded for each manual override?
- How do we reconcile offline/manual admissions after service recovers?

**Expected control points:**

- a scanner lead/event supervisor owns gate operations;
- spare/fresh offline path is preferred to improvisation;
- manual admission is supervised and logged;
- duplicate/invalid cases are separated for review;
- post-recovery sync/check-in state is verified.

### Inject D — payout risk discovered

The next morning, finance sees a payout-integrity discrepancy involving the organizer from the affected event.

**Ask the team:**

- What is the immediate containment action?
- Who is authorized to retry or release funds?
- What evidence is required before movement resumes?
- How are bank details protected during investigation?

**Expected control points:**

- affected payout is held;
- no blind retry of provider movement;
- internal ledger/order/payment state is reconciled against provider fact;
- sensitive payout details do not enter the incident log;
- any payout-encryption/storage concern escalates into the security path.

### Inject E — monitoring delivery failure

The alert detector correctly identifies a critical condition, but the named responder does not receive a notification.

**Ask the team:**

- How do we distinguish detection from delivery?
- Which system monitors a total Vercel outage independently?
- What config/evidence is required before claiming alerts are operational?
- What fallback channel is used while delivery is repaired?

**Expected control points:**

- `/api/health/ops-alerting`/delivery evidence is checked separately from detector state;
- independent Supabase watchdog is used only once its delivery URL and controlled test are proven;
- no “HTTP 200 from cron” is treated as proof a human received a page;
- a named temporary escalation channel/phone tree is declared until automated delivery is restored.

### Inject F — suspected privileged-secret exposure

A screenshot from troubleshooting may have exposed a privileged credential.

**Ask the team:**

- Who classifies the credential and blast radius?
- What is revoked first?
- How do we rotate without copying the secret into the incident record?
- What changes for encryption/signing secrets?

**Expected control points:**

- use `docs/SECRET_ROTATION.md`;
- record secret name/class, never value;
- prioritize money-moving/RLS-bypass credentials;
- preserve backward decryption where persistent ciphertext is involved;
- validate replacement before retiring rollback access when overlap is supported.

## 5. Exercise evidence — complete during the session

### Timeline

| Time | Inject/event | Decision | Owner | Evidence/result |
|---|---|---|---|---|
| **PENDING** | Exercise started |  |  |  |
| **PENDING** | Inject A |  |  |  |
| **PENDING** | Inject B |  |  |  |
| **PENDING** | Inject C |  |  |  |
| **PENDING** | Inject D |  |  |  |
| **PENDING** | Inject E |  |  |  |
| **PENDING** | Inject F |  |  |  |
| **PENDING** | Exercise closed |  |  |  |

### Scores

Mark each **Pass**, **Gap**, or **Not exercised**.

| Control | Result | Evidence/note |
|---|---|---|
| Incident Lead named quickly | **PENDING** | |
| Severity/customer impact classified | **PENDING** | |
| Bad deployment promotion stopped | **PENDING** | |
| Payment ambiguity handled without manual money edits | **PENDING** | |
| Webhook replay boundary understood | **PENDING** | |
| Reconciliation used as recovery proof | **PENDING** | |
| Scanner fallback ownership clear | **PENDING** | |
| Payout hold/escalation understood | **PENDING** | |
| Alert detection vs delivery distinguished | **PENDING** | |
| Independent outage monitor understood | **PENDING** | |
| Secret-rotation procedure followed | **PENDING** | |
| Support/public update owner identified | **PENDING** | |
| Recovery verification defined before closure | **PENDING** | |

## 6. Follow-up log

Every material gap must become Jira work before the exercise is considered closed.

| Gap | Severity | Jira issue | Owner | Due/launch disposition |
|---|---|---|---|---|
| **PENDING** |  |  |  |  |

SEV1 launch blockers must either be fixed and re-tested or explicitly block launch. Do not mark a blocker “accepted risk” only because the exercise is complete.

## 7. Completion statement

Complete this only after the real session:

```text
Exercise date/time:
Launch/test commit or release reference:
Participants:
Incident Lead:
Scenarios completed:
Alert channel actually tested during/adjacent to exercise: yes/no + evidence reference
SEV1 gaps found:
Jira follow-ups created:
Facilitator:
Reviewer:
Result: PASS / PASS WITH FOLLOW-UPS / FAIL — LAUNCH BLOCKED
```

A PASS here does not replace the separate isolated backup/restore drill. TICK-343 requires both incident-response evidence and recovery proof.

# Ticketiv data protection controls (TICK-254)

**Status:** launch-gate working document; not legal sign-off  
**Last verified:** 2026-08-18  
**Regulator:** Eswatini Data Protection Authority (EDPA)

This document turns TICK-254 into an operable control set for Ticketiv. It records what is already implemented, what must happen when a data subject makes a request or a personal-data incident occurs, and what evidence must exist before this launch gate can close.

Do not mark TICK-254 complete solely because this document exists. The legal, registration and processor-contract evidence listed in the launch checklist still has to be obtained and retained.

## 1. Verified regulatory baseline

The following points were checked against the official EDPA site and the Data Protection Act, 2022 on 2026-08-18:

- The Act applies to data controllers and data processors and requires a valid legal reason for processing personal information.
- Section 9 permits processing on specified grounds including explicit consent, performance of a contract, compliance with a legal obligation, protection of the data subject's legitimate interests, performance of a public-law duty, and legitimate interests of the controller or a third party.
- Sections 15-16 require processors acting for a controller to process under the controller's knowledge/authorisation, preserve confidentiality, maintain appropriate security, and be governed by a written controller-processor contract.
- EDPA's current registration service says all persons processing personal information must register as a controller and/or processor unless otherwise directed by the Authority. Ticketiv must therefore treat EDPA registration as a launch blocker unless EDPA provides written contrary direction for the actual launch entity and role.
- EDPA states that controllers must report personal-data breaches within 72 hours of becoming aware of the breach. The Act also requires notification of the Commission and affected data subjects where there are reasonable grounds to believe personal information was accessed or acquired by an unauthorised person, subject to the Act's notification rules.
- EDPA's rights guidance gives individuals rights including access, erasure, rectification, objection, restriction and data portability. Its published guidance says access and erasure requests should receive a response within 30 days and describes portability as providing data in a commonly used machine-readable form.

Official sources:

- Data Protection Act, 2022: https://www.edpa.org.sz/assets/documents/DATA%20PROTECTION%20ACT.pdf
- EDPA regulatory framework and data-subject rights: https://www.edpa.org.sz/RegulatoryFrameworks.html
- EDPA controller/processor registration: https://www.edpa.org.sz/register.php
- EDPA personal-data breach form: https://www.edpa.org.sz/databreach.php
- EDPA publications and current guidelines/notices: https://www.edpa.org.sz/publications.php

### Legal confirmation still required

Local counsel must confirm, against Ticketiv's actual launch entity and production flows:

1. the final controller/processor role allocation between Ticketiv, event organisers and each service provider;
2. the final lawful basis for each processing purpose below;
3. any Data Protection Officer appointment requirement and the correct internal accountable person;
4. the treatment of trans-border transfers and any notifications/authorisations required for providers outside Eswatini;
5. the final retention periods for accounting, tax, fraud, chargeback, settlement and legal-claim records;
6. the final customer-facing privacy wording and any circumstances in which a data-subject right may lawfully be limited.

## 2. Working lawful-basis register

This is the engineering/operations mapping to take to counsel. **The proposed basis column is not legal sign-off.** Where more than one basis appears plausible, counsel must select the correct basis and document why.

| Processing purpose | Typical Ticketiv data | Proposed basis for counsel confirmation | Required evidence/control |
|---|---|---|---|
| Create and secure an attendee account | Name, email, phone, profile, Auth/session/device data | Contract; legitimate interests for proportionate security controls | Privacy notice; access controls; session/security logs |
| Create and administer an organiser account/workspace | Identity/contact data, organisation membership and roles | Contract; legitimate interests for workspace security | Role/RBAC controls; audit trail; privacy notice |
| Sell, issue and manage tickets | Buyer/contact data, ticket holder data, order/ticket identifiers | Contract | Order/ticket records; minimised attendee disclosure |
| Process payments, refunds and settlement | Order/payment/refund references, amount/currency, payer/contact data required by the rail | Contract; legal obligation where record retention is required | Provider contract/DPA; reconciliation; retention schedule |
| Admit attendees and prevent ticket reuse | Ticket code, event, scan/check-in status, device/session evidence | Contract; legitimate interests for fraud/entry security | Scanner access control; audit/scan logs; retention limit |
| Ticket transfer/resale/guestlist workflows | Sender/recipient or holder identifiers and contact data | Contract | User-visible workflow; audit evidence; deletion/anonymisation rules |
| Service communications | Receipt, ticket, transfer, refund, security and operational messages | Contract; legal obligation where applicable | Transactional-message classification; delivery-provider agreement |
| Optional reminders and marketing | Contact details, channel preferences, campaign/event context | Explicit consent for marketing; counsel to confirm reminder treatment | Granular opt-in/opt-out; consent evidence; honour objections/withdrawal |
| Fraud, abuse, security and incident response | Device/log/security events, limited account/order identifiers | Legitimate interests; legal obligation where applicable | Data minimisation; access controls; incident/audit records |
| Legal, tax, accounting and dispute handling | Required transaction/audit records | Legal obligation; legitimate interests for legal claims where applicable | Approved retention schedule; de-identify where identity is no longer needed |
| Product analytics and reliability monitoring | Usage, device and error telemetry; potentially account/event identifiers depending on configuration | Consent or legitimate interests depending on implementation; counsel to confirm | Analytics configuration review; minimise/disable unnecessary PII; processor evidence |

Any new feature that introduces a new category of personal or sensitive data must update this register before production enablement.

## 3. Processor and third-party evidence register

The codebase currently supports or references the services below. Inclusion here does **not** mean each provider is enabled in production or that a DPA has been signed. Before launch, operations must record which providers are actually enabled and obtain the required written contract/data-processing terms and transfer evidence for every provider that processes Ticketiv personal data on Ticketiv's behalf.

| Provider / category | Ticketiv purpose | Pre-launch evidence status |
|---|---|---|
| Supabase | Auth, database, storage and supporting backend services | **BLOCKER:** record executed/current DPA or equivalent written processor terms; hosting region; subprocessor/transfer evidence |
| Paystack | Card/online payment processing where enabled | **BLOCKER:** confirm controller/processor role; retain executed/current contractual privacy/DPA evidence and transfer details |
| MTN MoMo | Mobile-money payment rail where enabled | **CONDITIONAL BLOCKER:** required if production MoMo receives personal data |
| Resend | Transactional email where enabled | **BLOCKER if enabled:** written processor terms/DPA and transfer/subprocessor evidence |
| Selected SMS provider | SMS delivery; code supports Twilio, Africa's Talking or Clickatell | **CONDITIONAL BLOCKER:** choose the actual provider, remove unused production credentials, retain processor/transfer evidence |
| Selected WhatsApp provider | WhatsApp delivery; code supports Meta Cloud, Twilio or 360dialog | **CONDITIONAL BLOCKER:** choose the actual provider, remove unused production credentials, retain processor/transfer evidence |
| Vercel | Application hosting and platform telemetry | **BLOCKER if personal data is processed:** record role, DPA/terms, location/subprocessor/transfer evidence |
| Sentry | Error and performance monitoring | **BLOCKER if enabled:** record DPA/terms and verify PII-scrubbing/configuration |
| PostHog | Product analytics where enabled | **BLOCKER if enabled:** record DPA/terms, hosting/transfer evidence and capture configuration |
| Upstash | Rate limiting where enabled | **CONDITIONAL BLOCKER:** verify whether stored identifiers constitute personal data; retain processor evidence if they do |
| Other externally hosted maps, push or messaging services | Feature-dependent | **CONDITIONAL BLOCKER:** add the provider before enablement and complete the same review |

For each active provider, retain at minimum:

- legal provider name and service;
- controller/processor role determination;
- signed/current contract, DPA or incorporated data-processing terms;
- categories of Ticketiv data sent;
- purpose and lawful basis;
- hosting/processing locations and trans-border route;
- subprocessors where material;
- security/confidentiality commitments;
- breach-notification contact and contractual notification timing;
- retention/deletion terms;
- effective date and owner of the evidence.

Do not store contracts or personal-data evidence in a public repository. Keep the durable evidence in the approved private legal/operations record and reference only a non-sensitive evidence ID from Jira.

## 4. Data-subject request (DSR) process

### 4.1 Intake channels

- **Privacy requests:** `privacy@ticketiv.app`
- **Account deletion when signed in:** Account settings → Security → Delete account
- **Deletion when the user cannot sign in:** public `/data-deletion` instructions and support verification path

A request may also arrive through another support channel. Staff must route it to the privacy process rather than requiring the person to use specific legal terminology.

### 4.2 Case record

Create a private DSR case record containing only what is needed to manage the request:

- internal case ID;
- received timestamp and channel;
- request type: access/export, correction, deletion, restriction, objection/marketing opt-out, or other;
- identity-verification state;
- accountable owner;
- response due date;
- systems/providers searched;
- decision and any lawful retention/limitation reason;
- completion timestamp and delivery method.

**Do not paste the requester's personal data, identity documents, raw database exports, ticket codes, payment payloads or other sensitive evidence into Jira.** Jira may carry the case ID, status, owner and non-sensitive operational notes only.

### 4.3 Identity verification

Verify that the requester is the data subject or an authorised representative before disclosing, correcting or deleting account-linked information. Use the least intrusive verification that is sufficient for the risk. Do not collect a national ID merely because it is available if account/email authentication can establish the request safely.

If identity cannot be established, record the reason and do not disclose personal data.

### 4.4 Access and export

Until a self-service export feature is shipped, access/export is an assisted DSR handled through `privacy@ticketiv.app`.

For a verified request:

1. Record the request and target response date. Use **30 days from receipt as the operational deadline** for access/export unless counsel or EDPA confirms a different rule applies to the specific request.
2. Query the production systems for data attributable to that subject. Depending on the user's activity, this can include profile/contact data, account preferences, orders, ticket ownership/holder data, transfers/resales, refunds/payment status and references, guestlist/waitlist data, notifications, check-in/scan data attributable to the person, and relevant account audit/security information.
3. Review the result before release. Exclude secrets, authentication credentials, service-role data, internal security material that would create a security risk, and personal data belonging to other people unless disclosure is authorised.
4. Provide the data in a clear format. Where portability applies, use a commonly used machine-readable format such as JSON and/or CSV in addition to a human-readable explanation where useful.
5. State the categories/purposes of processing and, where required, recipients or categories of recipients that have had access to the information.
6. If any part of the request is refused, limited or retained, record and communicate the reason required by law/counsel rather than silently omitting it.
7. Record completion and delete any temporary export artefact from working storage after confirmed delivery according to the approved secure-transfer procedure.

### 4.5 Correction and objection

- Profile fields that Ticketiv already exposes should be corrected through the account UI where practical.
- Assisted corrections must update the authoritative record, not only a cached/display copy.
- Marketing objection/withdrawal must be actioned promptly and reflected in notification/marketing preferences; do not make essential transactional ticket or security messages dependent on marketing consent.

### 4.6 Account deletion

Deletion is already implemented for eligible signed-in users. The application:

1. requires the signed-in user to type `DELETE`;
2. checks for deletion blockers before proceeding;
3. signs out active sessions globally;
4. invokes a service-role-only database deletion routine;
5. anonymises retained paid order/ticket contact data and removes or de-links other user-linked operational data;
6. writes non-personal audit evidence of the deletion operation; and
7. deletes the Supabase Auth user.

The live production database routine and its EXECUTE grants were reviewed on 2026-08-18. The privileged deletion and internal status functions were limited to `service_role`/database administration roles; the self-service status function was available to authenticated users.

Current blockers intentionally prevent deletion while responsibilities/data states that must first be resolved remain active (for example eligible upcoming tickets, active resale/transfer state or organisation ownership as defined by the database status routine).

**Retention is not permission to keep identifying data indefinitely.** Paid transaction records that must be retained for accounting, tax, fraud, settlement or legal purposes should be de-identified as soon as the identity is no longer authorised/necessary, consistent with counsel-approved retention rules and the Act.

## 5. Personal-data breach process

This section overlays `docs/INCIDENT_RESPONSE.md`. Use both runbooks when an incident may involve personal information.

### 5.1 Ownership

- **Incident Lead:** assigned for each incident under `docs/INCIDENT_RESPONSE.md`.
- **Privacy Owner / DSR Owner:** **MUST BE NAMED BEFORE LAUNCH.** Do not invent a name in documentation. This person owns the regulatory clock, EDPA submission and data-subject communication decision with counsel/leadership.
- **Technical Operator:** owns containment, evidence preservation and system recovery.
- **Support/Comms Owner:** owns approved affected-user communication when required.

The absence of a named Privacy Owner is a TICK-254 launch blocker.

### 5.2 When to trigger

Trigger the privacy overlay immediately when there are reasonable grounds to suspect personal information was lost, disclosed, accessed, acquired, altered or destroyed without authorisation, or when a processor tells Ticketiv of such an event.

Do not wait for full root-cause proof before starting the regulatory clock and assessment.

### 5.3 Timeline

**At awareness / first response**

1. Open one incident record and record the awareness timestamp in Eswatini time and UTC.
2. Assign the Incident Lead and Privacy Owner.
3. Contain ongoing access/loss without destroying evidence.
4. Preserve request IDs, affected record categories/counts, system/provider logs and deployment/configuration references. Avoid copying raw personal data into Jira/chat.
5. Determine whether personal data is involved, which categories of data subjects are affected, approximate counts, likely consequences and whether a processor/subprocessor is involved.
6. If a provider is involved, invoke its contractual breach-notification/escalation channel and preserve the provider case/reference.

**Within the first 24 hours where practical**

1. Establish the known facts needed for EDPA's breach form: discovery/occurrence times, nature of breach, affected subjects/data categories, security controls, cause if known, mitigation, investigation and intended subject communication.
2. Decide containment/recovery actions separately from regulatory notification; do not delay a regulator report simply to wait for a perfect root-cause report.
3. Engage local counsel for notification wording or unusual legal questions without stopping the 72-hour operational clock.

**Before 72 hours from awareness**

The Privacy Owner must ensure that a personal-data breach is reported to EDPA within EDPA's stated 72-hour requirement. Submit the known facts even if the investigation is still developing, then preserve the submission/reference and supplement it as appropriate. The official EDPA breach form is at https://www.edpa.org.sz/databreach.php.

The Act also provides for notification of affected data subjects where its security-compromise threshold is met, subject to its rules and any direction from Police/EDPA. The Privacy Owner/counsel must make and record that decision; do not omit affected-user communication merely because EDPA has been notified.

### 5.4 Notification content and evidence

Prepare, at minimum:

- date/time Ticketiv became aware;
- date/time of occurrence if known;
- nature and cause of the incident;
- categories and approximate number of affected data subjects;
- categories of personal/sensitive data involved;
- systems/processors involved;
- security controls that were in place;
- likely consequences;
- containment and mitigation taken;
- corrective/preventive actions;
- whether/when/how data subjects were notified;
- EDPA submission date/time and reference;
- provider/counsel references without embedding confidential attachments in Jira.

### 5.5 Closure

Do not close a privacy incident until:

1. unauthorised access/loss is contained;
2. affected data/system integrity is restored and verified;
3. EDPA notification evidence is retained where required;
4. affected-data-subject notification decision/evidence is retained;
5. processor/provider follow-up is complete;
6. temporary incident exports/log bundles are secured or destroyed according to policy;
7. every remediation item has an owner and Jira issue; and
8. the lawful-basis, processor, security or retention register is updated if the incident exposed a control gap.

## 6. Data map for DSR and compliance review

Ticketiv's current schema means personal information can exist outside `profiles`. DSRs, retention reviews and data mapping must consider at least these domains where applicable to a data subject:

- Supabase Auth users, identities, sessions and MFA/auth records;
- public profile and private profile/contact information;
- notification preferences, notifications and push subscriptions;
- orders and order items/ticket-holder data;
- payments, refunds, adjustments and financial ledger references;
- transfers, resale and price-rule redemption records;
- guestlist, waitlist and fulfilment records;
- scans/check-in and registered device/session records where attributable to a person;
- seats, holds and reservations;
- organiser membership/staff and audit records;
- support/webhook/job/log evidence where it contains personal data;
- Storage objects such as avatars or user-supplied media;
- external processors that retain a copy or event related to the data subject.

This list is a starting point, not an assertion that every table contains personal data for every user. Data mapping must be refreshed whenever the schema or external provider set materially changes.

## 7. Launch evidence checklist

TICK-254 may close only when the following evidence exists:

- [ ] Ticketiv launch legal entity and controller/processor roles confirmed by local counsel.
- [ ] Lawful-basis register reviewed and signed off by local counsel; customer-facing privacy copy aligned.
- [ ] EDPA registration completed for the required role(s), with registration number/certificate or other durable evidence recorded.
- [ ] Named Privacy Owner / DSR Owner recorded and trained.
- [ ] Active processor inventory confirmed against production configuration.
- [ ] Required written processor contracts/DPAs are current and evidenced for every active processor.
- [ ] Cross-border processing/transfer review completed and required notices/authorisations evidenced.
- [ ] Retention schedule approved for user, ticket, payment, refund, audit, security and settlement data.
- [ ] Account deletion smoke-tested in a safe non-production/controlled test account, including blocker and retained-anonymised-record behaviour.
- [ ] Assisted access/export DSR dry-run completed end-to-end and machine-readable output reviewed for third-party data/secrets.
- [ ] Marketing opt-out/consent evidence flow verified.
- [ ] Personal-data breach tabletop completed, including a simulated 72-hour EDPA clock and processor escalation.
- [ ] Privacy/DSR mailbox ownership and escalation coverage confirmed.

## 8. Known engineering state and follow-ups

### Implemented/verified

- Account settings include a Security deletion flow.
- A public `/data-deletion` route explains the signed-in deletion and support fallback.
- The live deletion routine anonymises retained paid order/ticket contact data, removes/de-links several user-linked records, records a deletion audit event and deletes the Auth user.
- Privileged deletion helpers are not executable by ordinary authenticated/anonymous callers.

### Still to improve

- Self-service account data export is **not** implemented. The launch-safe path is an assisted, verified DSR export through `privacy@ticketiv.app` until a separate engineering task delivers self-service export.
- Build a repeatable internal export tool/query set so staff do not assemble DSR exports ad hoc in production.
- Add automated retention/deletion jobs only after counsel approves exact retention periods and exceptions.
- Keep the provider inventory in this document synchronized with production configuration; optional providers must not be treated as approved merely because the code supports them.

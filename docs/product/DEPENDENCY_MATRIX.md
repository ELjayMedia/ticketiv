# Dependency matrix

"→" means *needs*. **Ext** marks a dependency outside code: legal, commercial, provider, physical or owner.

| Item | Depends on | Ext |
|---|---|---|
| TICK-481 Venue ownership | #585 (notification types) | — |
| TICK-482 Venue spaces | TICK-481 | — |
| TICK-460 Venue booking | TICK-481, TICK-482 | Contract templates are out of scope (no binding agreements are generated) |
| TICK-483 Venue calendar | TICK-460 | — |
| TICK-353 Artist claims | Shared claim pattern from TICK-481 | — |
| TICK-484 Artist workspace | TICK-353 | — |
| TICK-461 Artist booking | TICK-484 | — |
| TICK-485 Performance calendar | TICK-461; fix of the artist page query | — |
| TICK-486 Audience insights | TICK-484; #585; follower aggregates | — |
| TICK-452 Follow venues | TICK-481 (public venue page) | — |
| TICK-434 Follow organisers | #585 | — |
| TICK-435 Audience view | TICK-433 consent | POPIA / Eswatini Data Protection Act review |
| TICK-436–438 Campaigns | TICK-435 | Email/SMS/WhatsApp provider accounts |
| TICK-439 Promoter links | Order attribution column | — |
| TICK-440 Embeddable checkout | CSP / frame-ancestors decision | Security sign-off |
| TICK-441 Agent float | — | **Regulatory (stored value)** |
| TICK-444 Split pay | Provider support for payment links | **Provider** |
| TICK-445 Lay-by | — | **Regulatory and provider** |
| TICK-447 Saved MoMo | Product reversal of the "no saved methods" decision | Privacy review |
| TICK-448 Verified resale | Server-side cap | — |
| TICK-450 Presales | TICK-434/452 (followers) | — |
| TICK-453 Instant payouts | TICK-350 | **DeltaPay production sign-off** |
| TICK-457 Sales advances | — | **Regulated lending** |
| TICK-166 / TICK-167 | — | **Physical and operational** |
| TICK-468 native push | — | **Firebase/FCM project** |
| CI on PRs | — | **Owner: GitHub Actions minutes or a self-hosted runner** |

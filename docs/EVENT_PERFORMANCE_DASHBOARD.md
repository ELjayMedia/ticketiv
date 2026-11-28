# Event Performance Dashboard — implementation plan

## Purpose

Give organizers a true view of how an event is performing commercially and operationally, without confusing payment volume, payout balances and event profit.

## Delivered in first UI slice

Route: `/orgs/[orgId]/events/[eventId]?tab=performance`

The Performance tab reads the same RLS-scoped `event_live_stats` subscription as the existing Overview. No new backend write path, permission or migration is needed.

| Metric | Source | Formula / caveat |
| --- | --- | --- |
| Gross ticket sales | `event_live_stats.gross_sales_cents` | Gross, not net organizer proceeds or event profit |
| Tickets sold | `event_live_stats.tickets_sold` | Ticketing sales, not attendance |
| Ticket sell-through | `tickets_sold`, `tickets_available` | sold / (sold + currently available); this is **not** venue capacity utilization |
| Gross per sold ticket | gross sales / tickets sold | Not identical to face-value average; may include buyer-paid fees |
| Check-ins | `event_live_stats.checked_in_count` | Count only; rate needs issued + guestlist denominator |
| Recorded payment success | successful / (successful + failed) | Not visitor-to-purchase checkout conversion |

Missing values display an em dash. Profit, net proceeds, expense and sponsor values must NOT silently default to zero.

The P&L section is currently an honest readiness panel, not a working profit report. It makes missing inputs explicit.

## Financial reporting (next release)

Add organization-authorized records for event economics, separately from Ticketiv's settlement ledger:

1. `event_budget_lines`: `org_id`, `event_id`, category, `planned_cents`, currency, timestamps, editor.
2. `event_actual_costs`: `org_id`, `event_id`, category, supplier/reference, `amount_cents`, payment/verification status, currency, date, editor. Do not store confidential invoice attachments in publicly readable storage.
3. `event_sponsorships`: `org_id`, `event_id`, sponsor reference, contracted cash amount, received amount, in-kind value tracked separately, status, dates.
4. `event_other_income`: `org_id`, `event_id`, income category, amount, received status, currency.

For the actual schema, first check whether an equivalent cost/accounting structure already exists; choose a small normalized model and guard every write with a purpose-built authorized RPC. Use RLS with org membership and explicit rights, not `TO authenticated` alone. Finance, organizer owner and authorized managers may see cost information; gate staff and scanner-only users may not. Service-role secrets must never leave the server.

Use `orders`, `payments`, `refunds`, `ledger_entries` and the existing organizer finance RPC to reconcile net ticket revenue without double-counting fees or treating a payout as a new sale. Fees paid by the buyer versus organizer must be handled distinctly. Avoid mixing budget with cash realized.

Proposed formulas:

- Net ticket contribution = gross ticket revenue - refunds - organizer-borne ticketing/payment fees.
- Event direct contribution = net ticket contribution + cash sponsorship earned + other earned event revenue - actual direct event costs.
- Event operating profit = direct contribution - allocated overhead.
- Direct margin = direct contribution / total earned event revenue.
- Break-even paid tickets = max(0, fixed costs - committed non-ticket cash contribution) / weighted-average net contribution per incremental paid ticket; show **not calculable** if denominator is zero or mix is unknown.
- Event ROI = operating profit / invested event capital; define investment basis in the UI before displaying a number.
- Budget variance = actual vs approved budget, separately for revenue and expenses.

Track committed and realized sponsorship separately; never count in-kind sponsorship as cash revenue.

## Additional analytics after money-path reconciliation

- Daily sales velocity and 30/14/7-day before-event curves.
- Ticket sell-through by tier, channel and price rule.
- Accurate attendance rate using unique admitted tickets (paid and complimentary) divided by all valid issued/admitted-eligible tickets, with check-in scans deduplicated.
- Repeat paying buyers across events / series, with guest checkout deduplication and appropriate privacy controls.
- Marketing acquisition cost and measured return only once reliable campaign source and spend data exist.
- Sponsor deliverables, satisfaction and renewals.
- Operational incidents, queue times and start-time adherence.

**Data freshness warning:** On 2026-11-24, `event_metrics_daily` contained 27 rows across 8 events and its newest `day` was 2026-11-02. Do not present it as a current daily trend without restoring/validating the refresh job and backfill, and distinguishing event-timezone from UTC reporting.

## Organization / series dashboard

The existing `/orgs/[orgId]/dashboard` already aggregates event sales. Evolve it to report event margin, profitable event count, contribution per show, repeat attendee rate and event-series trends, using the `events.series_id` relationship and a consistent date filter. Do not simply sum revenue and call it profit.

## Acceptance criteria

- Every metric has a documented source, formula, grain and freshness indicator.
- An event manager can access their permitted event only; unauthorized users cannot read financial costs or sponsorships.
- Missing finance data shows 'Not available' rather than E0 profit.
- Refunds, cancellations, complimentary tickets, payouts and fees do not inflate the numerator or denominator.
- Sales and ledger reports reconcile before event net revenue is shown.
- Event P&L supports budget, forecast, actual and post-event close-out.
- No shared data leakage across organizations.
- Works on mobile organizer dashboard; charts and text are usable at narrow widths.
- Unit tests cover nulls, zero denominators and calculations; cross-org authorization tested for any future endpoint/RPC.
- Tests and CI pass before merge.

## Explicitly out of scope for the first pull request

No production Supabase schema changes, no expense editing, no historical backfill, no 'estimated profit', and no automatic sponsor records. The existing Payouts tab has hardcoded zero placeholders and needs its own finance-path repair; do not infer event profitability from them.

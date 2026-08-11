# Ticketiv production smoke gate

This is the non-destructive check to run after a Vercel deployment and before treating that deployment as promotable.

## Run the baseline

```bash
scripts/smoke-deployment.sh https://ticketiv.app
```

The required baseline fails unless all of the following are true:

- the homepage returns `200 text/html`;
- the login entry point returns `200 text/html`;
- `/api/health` returns JSON with `ok: true` and `service: ticketiv`;
- `/api/health/supabase` returns JSON confirming the public and admin Supabase configuration is present and the database is reachable.

The script uses bounded connect/request timeouts, prints per-probe latency, and exits non-zero on any failed required check. A failure is a stop signal: do not promote the deployment. Inspect the Vercel build/runtime logs and use the bad-deployment rollback procedure in `docs/OPERATIONS.md` before retrying.

## Fixture-backed release probes

Stable UAT fixtures can extend the same smoke without creating an order or modifying inventory:

```bash
SMOKE_EVENT_SLUG="uat-event-slug" \
SMOKE_TICKET_TOKEN="uat-capability-token" \
scripts/smoke-deployment.sh https://ticketiv.app
```

`SMOKE_EVENT_SLUG` enables the event-detail and checkout-page GET probes. `SMOKE_TICKET_TOKEN` enables the ticket-retrieval GET probe. If a fixture is not configured, the script reports that probe as `SKIP`; it must never invent production data simply to make the smoke green.

Treat capability tokens as operational test credentials. Use a dedicated UAT ticket, do not put the token in source control, PR bodies, screenshots, or public logs, and rotate/replace the fixture if it is exposed.

## What this gate does not prove

A GET-only deployment smoke deliberately does not charge a card, create an order, replay a webhook, scan a ticket, mutate admin state, or test a payout. Those flows have separate seeded E2E/UAT gates. This smoke answers the narrower release question: did this deployment come up on the expected origin with authentication entry, application health, database connectivity and any configured read-only release fixtures intact?

For launch sign-off, combine it with the money-path, scanner, reconciliation, alert-delivery and backup/restore evidence tracked by the production-readiness tickets.

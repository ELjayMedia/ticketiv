# Ticketiv uptime alerting — TICK-262

Ticketiv uses **two different failure domains** for production monitoring:

1. `ticketiv-ops-alerts` runs in Supabase pg_cron every five minutes and calls
   `https://ticketiv.app/api/cron/ops-alerts`. The Next.js endpoint checks health
   URLs, payment success rate, webhook lag, reconciliation, payout integrity,
   stuck async work and provider settlement.
2. `ticketiv-ops-uptime-watchdog` runs in Supabase two minutes after those
   checks. It reads the real `pg_net` response and posts outage/recovery events
   **directly** to the external operations webhook.

The second monitor is intentional. If Vercel is completely unavailable, code in
Vercel cannot be responsible for paging the human about the Vercel outage.

## Production configuration

The app-side monitor already uses these values:

- Vercel `CRON_SECRET`
- Vercel `OPS_ALERT_WEBHOOK_URL`
- Supabase Vault `ops_alert_cron_url`
- Supabase Vault `ops_alert_cron_secret`

The independent watchdog adds one Vault value:

- `ops_alert_delivery_url` — the external operations webhook destination. Use
  the same independent n8n / Telegram / Kaya destination configured as
  `OPS_ALERT_WEBHOOK_URL` in Vercel.

Do **not** store the destination URL in source control or Jira. A webhook URL can
contain a capability token.

Configure it through an approved operator session:

```sql
select vault.create_secret('<external ops webhook URL>', 'ops_alert_delivery_url');
```

If the destination is missing when an alert or controlled test needs to be sent,
`fn_ops_uptime_watchdog` fails loudly with `P0001` rather than silently dropping
an outage notification.

## What counts as down

The watchdog evaluates the newest `public.ops_cron_runs` row for `job =
'ops-alerts'` and joins `net._http_response` when the outcome has not yet been
persisted by the next tick.

A production outage is declared when any of these is true:

- no app-monitor run exists;
- the newest app-monitor request is more than 10 minutes old;
- the HTTP request returned a non-2xx result or network error; or
- the request has produced no response after the three-minute grace period.

A newly queued request inside the grace period is not treated as down.

The state table `public.ops_uptime_state` records only `unknown`, `healthy` or
`degraded`. Alerts are emitted on transitions, not on every cron run:

- initial healthy observation: no notification;
- healthy/unknown → degraded: **critical outage** notification;
- degraded → healthy: **recovery** notification;
- steady healthy/degraded: no repeat notification.

The tables and function are service-only; browser roles have no table access and
cannot execute the watchdog RPC.

## Controlled delivery proof

After the migration is applied and `ops_alert_delivery_url` is configured, run:

```sql
select public.fn_ops_uptime_watchdog(true);
```

This sends a clearly labelled **`[TEST] Ticketiv independent uptime alert`** and
does not insert fake orders, payments, webhooks, outages or other production
fixtures. It also does not change the current healthy/degraded state.

Confirm the message appears in the named operations/escalation channel. Then
check the durable request log after pg_net has completed:

```sql
select r.requested_at,
       coalesce(r.status_code, resp.status_code) as status_code,
       coalesce(r.ok, resp.status_code between 200 and 299) as ok,
       coalesce(r.error, resp.error_msg) as error
from public.ops_cron_runs r
left join net._http_response resp on resp.id = r.request_id
where r.job = 'ops-uptime-alert-delivery'
order by r.requested_at desc
limit 10;
```

The acceptance evidence for TICK-262 should record the test timestamp, HTTP
result and confirmation that a human-visible message arrived. Never paste the
webhook URL or secret into the evidence.

## Routine verification

```sql
-- Is the five-minute app monitor running?
select requested_at, status_code, ok, error, resolved_at
from public.ops_cron_runs
where job = 'ops-alerts'
order by requested_at desc
limit 20;

-- What state does the independent watchdog currently believe?
select monitor, state, last_observed_at, last_transition_at, last_message
from public.ops_uptime_state;

-- Are both pg_cron jobs active?
select jobname, schedule, active
from cron.job
where jobname in ('ticketiv-ops-alerts', 'ticketiv-ops-uptime-watchdog')
order by jobname;
```

During incident response, use `docs/LIVE_EVENT_ESCALATION.md` for ownership and
customer/organizer communication. The watchdog is a trigger; it does not replace
the escalation procedure.

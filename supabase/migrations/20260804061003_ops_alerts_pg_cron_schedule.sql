-- Move the 5-minute ops-alerts schedule from GitHub Actions to pg_cron.
--
-- Why it moved
-- ------------
-- .github/workflows/ops-alerts.yml curled the secured cron endpoint every five
-- minutes on a GitHub-hosted runner. Actions bills per *started* minute, so
-- ~8,640 runs/month consumed ~8,640 minutes against the 2,000-minute monthly
-- allowance for private repositories. That single schedule was four times the
-- whole free budget, and it crowded out CI for every other workflow.
--
-- Why not Vercel Cron
-- -------------------
-- The Vercel account is on the Hobby plan, which triggers cron jobs at most
-- once per day. A five-minute cadence is not expressible there at any setting,
-- which is exactly why lib/__tests__/ops-alert-schedule.test.ts has guarded
-- vercel.json against that cadence since TICK-262.
--
-- Why pg_cron works
-- -----------------
-- The database already runs `expire-stale-checkout-holds` at */5, so the cadence
-- is proven on this project, and pg_cron costs nothing beyond the Supabase
-- project already being paid for. pg_net makes the HTTPS call. The endpoint,
-- its Bearer-token contract and every check it performs are unchanged — only
-- the thing holding the stopwatch is different.
--
-- Configuration lives in Vault, not in this migration
-- ---------------------------------------------------
-- The endpoint URL and CRON_SECRET are read from vault.secrets at call time, so
-- rotating either is a one-line UPDATE rather than a migration, and the secret
-- never enters version control:
--
--   select vault.create_secret('https://ticketiv.app/api/cron/ops-alerts', 'ops_alert_cron_url');
--   select vault.create_secret('<the CRON_SECRET set in Vercel>',          'ops_alert_cron_secret');
--
-- Until both exist the job fails loudly on every tick (visible in
-- cron.job_run_details). That is deliberate: alerting that is silently not
-- running is the failure mode this control exists to prevent.

-- Delivery log. pg_net is fire-and-forget — net.http_get() returns as soon as
-- the request is *queued*, so the surrounding SQL succeeds even when the
-- endpoint is down, and cron.job_run_details cannot tell you the difference.
-- Each tick therefore resolves the previous tick against net._http_response,
-- which is the only place the real outcome is recorded (and only briefly).
create table if not exists public.ops_cron_runs (
  id           bigint generated always as identity primary key,
  job          text        not null,
  request_id   bigint,
  requested_at timestamptz not null default now(),
  status_code  integer,
  ok           boolean,
  error        text,
  resolved_at  timestamptz
);

comment on table public.ops_cron_runs is
  'HTTP delivery log for pg_cron-driven jobs. Written by fn_ops_alerts_tick(); each tick resolves the prior request against net._http_response before firing the next one.';

alter table public.ops_cron_runs enable row level security;
revoke all on public.ops_cron_runs from anon, authenticated;

create index if not exists ix_ops_cron_runs_job_requested
  on public.ops_cron_runs (job, requested_at desc);

create or replace function public.fn_ops_alerts_tick()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_url          text;
  v_secret       text;
  v_request_id   bigint;
  v_resolved     integer := 0;
  v_prev_failure text;
begin
  -- 1. Resolve outstanding requests first. pg_net prunes _http_response on its
  --    own schedule, so an outcome not captured here on the next pass is lost.
  with resolved as (
    update public.ops_cron_runs r
       set status_code = resp.status_code,
           ok          = (resp.status_code between 200 and 299),
           error       = nullif(resp.error_msg, ''),
           resolved_at = now()
      from net._http_response resp
     where resp.id = r.request_id
       and r.resolved_at is null
    returning r.ok, r.status_code, r.error
  )
  select count(*),
         max(case
               when coalesce(ok, false) then null
               else coalesce(error, 'HTTP ' || coalesce(status_code::text, 'no response'))
             end)
    from resolved
    into v_resolved, v_prev_failure;

  -- 2. Read configuration. Missing config is a hard error rather than a no-op:
  --    a scheduler that quietly stops alerting is worse than one that is red.
  select decrypted_secret into v_url
    from vault.decrypted_secrets
   where name = 'ops_alert_cron_url';

  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'ops_alert_cron_secret';

  if v_url is null or v_secret is null then
    raise exception 'ops alerts cron is not configured: missing vault secret(s) %',
      concat_ws(', ',
        case when v_url is null then 'ops_alert_cron_url' end,
        case when v_secret is null then 'ops_alert_cron_secret' end)
      using errcode = 'P0001',
            hint = 'Seed them with vault.create_secret(<value>, <name>).';
  end if;

  -- 3. Fire the request. Same Authorization header the retired workflow sent,
  --    so /api/cron/ops-alerts needs no change to accept it.
  select net.http_get(
           url                  => v_url,
           headers              => jsonb_build_object(
                                     'Authorization', 'Bearer ' || v_secret,
                                     'User-Agent',    'ticketiv-pg-cron/1'
                                   ),
           timeout_milliseconds => 30000
         )
    into v_request_id;

  insert into public.ops_cron_runs (job, request_id)
  values ('ops-alerts', v_request_id);

  -- 4. Keep the log bounded. 30 days is long enough to answer "was alerting
  --    actually running when X happened?" during an incident review.
  delete from public.ops_cron_runs
   where requested_at < now() - interval '30 days';

  return jsonb_build_object(
    'job',               'ops-alerts',
    'request_id',        v_request_id,
    'resolved_previous', v_resolved,
    'previous_failure',  v_prev_failure
  );
end;
$function$;

comment on function public.fn_ops_alerts_tick() is
  'pg_cron entry point for the ops-alerts endpoint (every 5 min). Resolves the previous delivery, reads URL/secret from Vault, calls the endpoint via pg_net, and logs the request to ops_cron_runs. Also the manual trigger that replaced the workflow_dispatch button.';

-- Supabase grants EXECUTE to anon/authenticated directly on function creation,
-- so revoking from PUBLIC alone would leave the browser roles holding it.
revoke execute on function public.fn_ops_alerts_tick() from public, anon, authenticated;
grant execute on function public.fn_ops_alerts_tick() to service_role;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'ticketiv-ops-alerts',
      '*/5 * * * *',
      $cron$select public.fn_ops_alerts_tick();$cron$
    );
  end if;
end;
$do$;


-- Run provider-settlement ingestion from Supabase pg_cron instead of a
-- scheduled GitHub Actions runner. The endpoint remains CRON_SECRET-protected;
-- only the scheduler changes.
--
-- Configuration:
--   settlement_cron_url      -> https://ticketiv.app/api/cron/settlements
--   ops_alert_cron_secret    -> same CRON_SECRET already used by ops alerts
--
-- The URL and secret live in Vault so rotations do not require a migration.

-- The existing resolver predated multiple HTTP cron jobs and could resolve any
-- outstanding job. Scope it to ops-alerts so one job cannot consume or
-- misattribute another job's HTTP response.
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
  with resolved as (
    update public.ops_cron_runs r
       set status_code = resp.status_code,
           ok          = (resp.status_code between 200 and 299),
           error       = nullif(resp.error_msg, ''),
           resolved_at = now()
      from net._http_response resp
     where resp.id = r.request_id
       and r.job = 'ops-alerts'
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

revoke execute on function public.fn_ops_alerts_tick() from public, anon, authenticated;
grant execute on function public.fn_ops_alerts_tick() to service_role;

create or replace function public.fn_settlement_ingest_tick()
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
  -- Resolve the prior settlement delivery before queuing another. pg_net's
  -- response table is short-lived, so preserving the result here is the
  -- durable proof that the job actually reached the endpoint.
  with resolved as (
    update public.ops_cron_runs r
       set status_code = resp.status_code,
           ok          = (resp.status_code between 200 and 299),
           error       = nullif(resp.error_msg, ''),
           resolved_at = now()
      from net._http_response resp
     where resp.id = r.request_id
       and r.job = 'settlement-ingest'
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

  select decrypted_secret into v_url
    from vault.decrypted_secrets
   where name = 'settlement_cron_url';

  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'ops_alert_cron_secret';

  if v_url is null or v_secret is null then
    raise exception 'settlement ingest cron is not configured: missing vault secret(s) %',
      concat_ws(', ',
        case when v_url is null then 'settlement_cron_url' end,
        case when v_secret is null then 'ops_alert_cron_secret' end)
      using errcode = 'P0001',
            hint = 'Seed them with vault.create_secret(<value>, <name>).';
  end if;

  select net.http_get(
           url                  => v_url,
           headers              => jsonb_build_object(
                                     'Authorization', 'Bearer ' || v_secret,
                                     'User-Agent',    'ticketiv-pg-cron/1'
                                   ),
           timeout_milliseconds => 120000
         )
    into v_request_id;

  insert into public.ops_cron_runs (job, request_id)
  values ('settlement-ingest', v_request_id);

  delete from public.ops_cron_runs
   where requested_at < now() - interval '30 days';

  return jsonb_build_object(
    'job',               'settlement-ingest',
    'request_id',        v_request_id,
    'resolved_previous', v_resolved,
    'previous_failure',  v_prev_failure
  );
end;
$function$;

comment on function public.fn_settlement_ingest_tick() is
  'Daily pg_cron entry point for provider settlement ingestion. Resolves the previous delivery, reads URL/secret from Vault, calls the secured endpoint via pg_net, and logs the request.';

revoke execute on function public.fn_settlement_ingest_tick() from public, anon, authenticated;
grant execute on function public.fn_settlement_ingest_tick() to service_role;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'ticketiv-settlement-ingest',
      '20 4 * * *',
      $cron$select public.fn_settlement_ingest_tick();$cron$
    );
  end if;
end;
$do$;
;

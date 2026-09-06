-- TICK-262 / TICK-334 — restore the independent production uptime watchdog
-- omitted by the 5 September 2026 production-baseline compaction.
--
-- The primary `ticketiv-ops-alerts` pg_cron job calls the Next.js endpoint every
-- five minutes. If Vercel itself is unavailable, app-side code cannot also own
-- the notification path. This watchdog stays in Supabase, reads the actual
-- pg_net result, and sends outage/recovery transitions directly to the external
-- operations webhook stored in Vault as `ops_alert_delivery_url`.

create table if not exists public.ops_uptime_state (
  monitor              text primary key,
  state                text not null default 'unknown'
                         check (state in ('unknown', 'healthy', 'degraded')),
  last_observed_at     timestamptz,
  last_transition_at   timestamptz,
  last_message         text,
  updated_at           timestamptz not null default now()
);

comment on table public.ops_uptime_state is
  'Service-only state for independent uptime transition alerting. Prevents repeated outage/recovery spam.';

alter table public.ops_uptime_state enable row level security;
revoke all on public.ops_uptime_state from public, anon, authenticated;
grant select, insert, update on public.ops_uptime_state to service_role;

insert into public.ops_uptime_state (monitor, state)
values ('ticketiv-production', 'unknown')
on conflict (monitor) do nothing;

create or replace function public.fn_ops_uptime_watchdog(p_force_test boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_monitor              constant text := 'ticketiv-production';
  v_previous_state       text;
  v_observed_state       text;
  v_latest_requested_at  timestamptz;
  v_status_code          integer;
  v_response_observed    boolean := false;
  v_error                text;
  v_reason               text;
  v_delivery_url         text;
  v_alert_request_id     bigint;
  v_should_alert         boolean := false;
  v_event_kind           text;
  v_payload              jsonb;
  v_pending_grace        constant interval := interval '3 minutes';
  v_stale_after          constant interval := interval '10 minutes';
begin
  update public.ops_cron_runs r
     set status_code = resp.status_code,
         ok          = (resp.status_code between 200 and 299),
         error       = nullif(resp.error_msg, ''),
         resolved_at = now()
    from net._http_response resp
   where resp.id = r.request_id
     and r.job = 'ops-uptime-alert-delivery'
     and r.resolved_at is null;

  select s.state
    into v_previous_state
    from public.ops_uptime_state s
   where s.monitor = v_monitor
   for update;

  if v_previous_state is null then
    insert into public.ops_uptime_state (monitor, state)
    values (v_monitor, 'unknown')
    on conflict (monitor) do nothing;
    v_previous_state := 'unknown';
  end if;

  if p_force_test then
    v_should_alert := true;
    v_event_kind := 'test';
    v_observed_state := v_previous_state;
    v_reason := 'Controlled TICK-262 delivery test. No outage is being reported.';
  else
    select r.requested_at,
           coalesce(r.status_code, resp.status_code),
           (r.resolved_at is not null or resp.id is not null),
           coalesce(r.error, nullif(resp.error_msg, ''))
      into v_latest_requested_at,
           v_status_code,
           v_response_observed,
           v_error
      from public.ops_cron_runs r
      left join net._http_response resp on resp.id = r.request_id
     where r.job = 'ops-alerts'
     order by r.requested_at desc
     limit 1;

    if v_latest_requested_at is null then
      v_observed_state := 'degraded';
      v_reason := 'No production ops-alert check has ever been recorded.';
    elsif v_latest_requested_at < now() - v_stale_after then
      v_observed_state := 'degraded';
      v_reason := format(
        'Production monitoring is stale: last app check was %s minutes ago.',
        floor(extract(epoch from (now() - v_latest_requested_at)) / 60)::integer
      );
    elsif v_status_code between 200 and 299 then
      v_observed_state := 'healthy';
      v_reason := format('Production ops-alert endpoint responded HTTP %s.', v_status_code);
    elsif v_response_observed then
      v_observed_state := 'degraded';
      v_reason := coalesce(
        v_error,
        format('Production ops-alert endpoint responded HTTP %s.', coalesce(v_status_code::text, 'unknown'))
      );
    elsif v_latest_requested_at < now() - v_pending_grace then
      v_observed_state := 'degraded';
      v_reason := format(
        'Production ops-alert endpoint has not produced a response after %s minutes.',
        floor(extract(epoch from (now() - v_latest_requested_at)) / 60)::integer
      );
    else
      update public.ops_uptime_state
         set last_observed_at = now(),
             last_message = 'Latest production check is still pending inside the response grace period.',
             updated_at = now()
       where monitor = v_monitor;

      return jsonb_build_object(
        'monitor', v_monitor,
        'state', v_previous_state,
        'pending', true,
        'latest_requested_at', v_latest_requested_at,
        'alert_sent', false
      );
    end if;

    if v_previous_state = 'unknown' then
      v_should_alert := (v_observed_state = 'degraded');
      v_event_kind := case when v_should_alert then 'outage' else 'initialised' end;
    elsif v_previous_state <> v_observed_state then
      v_should_alert := true;
      v_event_kind := case when v_observed_state = 'degraded' then 'outage' else 'recovery' end;
    else
      v_event_kind := 'steady';
    end if;

    update public.ops_uptime_state
       set state = v_observed_state,
           last_observed_at = now(),
           last_transition_at = case
             when state is distinct from v_observed_state then now()
             else last_transition_at
           end,
           last_message = v_reason,
           updated_at = now()
     where monitor = v_monitor;
  end if;

  if v_should_alert then
    select decrypted_secret
      into v_delivery_url
      from vault.decrypted_secrets
     where name = 'ops_alert_delivery_url';

    if v_delivery_url is null or btrim(v_delivery_url) = '' then
      raise exception 'independent uptime alert delivery is not configured: missing ops_alert_delivery_url'
        using errcode = 'P0001',
              hint = 'Store the external ops webhook URL with vault.create_secret(<value>, ''ops_alert_delivery_url'').';
    end if;

    if v_event_kind = 'test' then
      v_payload := jsonb_build_object(
        'source', 'ticketiv',
        'sourceUrl', 'https://ticketiv.app',
        'severity', 'warning',
        'title', '[TEST] Ticketiv independent uptime alert',
        'timestamp', now(),
        'alerts', jsonb_build_array(jsonb_build_object(
          'key', 'independent-uptime-watchdog-test',
          'severity', 'warning',
          'title', '[TEST] Ticketiv independent uptime alert',
          'message', v_reason,
          'details', jsonb_build_object('test', true, 'monitor', v_monitor)
        ))
      );
    elsif v_event_kind = 'outage' then
      v_payload := jsonb_build_object(
        'source', 'ticketiv',
        'sourceUrl', 'https://ticketiv.app',
        'severity', 'critical',
        'title', 'Ticketiv production is unreachable',
        'timestamp', now(),
        'alerts', jsonb_build_array(jsonb_build_object(
          'key', 'independent-uptime-watchdog',
          'severity', 'critical',
          'title', 'Ticketiv production is unreachable',
          'message', v_reason,
          'details', jsonb_build_object(
            'lastCheckAt', v_latest_requested_at,
            'statusCode', v_status_code,
            'monitor', v_monitor
          )
        ))
      );
    else
      v_payload := jsonb_build_object(
        'source', 'ticketiv',
        'sourceUrl', 'https://ticketiv.app',
        'severity', 'info',
        'title', 'Ticketiv production recovered',
        'timestamp', now(),
        'alerts', jsonb_build_array(jsonb_build_object(
          'key', 'independent-uptime-watchdog-recovery',
          'severity', 'info',
          'title', 'Ticketiv production recovered',
          'message', v_reason,
          'details', jsonb_build_object(
            'lastCheckAt', v_latest_requested_at,
            'statusCode', v_status_code,
            'monitor', v_monitor
          )
        ))
      );
    end if;

    select net.http_post(
             url                  => v_delivery_url,
             body                 => v_payload,
             headers              => jsonb_build_object('Content-Type', 'application/json'),
             timeout_milliseconds => 15000
           )
      into v_alert_request_id;

    insert into public.ops_cron_runs (job, request_id)
    values ('ops-uptime-alert-delivery', v_alert_request_id);
  end if;

  return jsonb_build_object(
    'monitor', v_monitor,
    'previous_state', v_previous_state,
    'observed_state', v_observed_state,
    'event', v_event_kind,
    'reason', v_reason,
    'latest_requested_at', v_latest_requested_at,
    'status_code', v_status_code,
    'alert_sent', v_should_alert,
    'alert_request_id', v_alert_request_id,
    'test', p_force_test
  );
end;
$function$;

comment on function public.fn_ops_uptime_watchdog(boolean) is
  'Independent Supabase-side production uptime watchdog. Reads the actual pg_net result of the Vercel ops check, emits transition-only outage/recovery alerts directly to the external ops webhook, and supports an operator-only controlled delivery test.';

revoke execute on function public.fn_ops_uptime_watchdog(boolean) from public, anon, authenticated;
grant execute on function public.fn_ops_uptime_watchdog(boolean) to service_role;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'ticketiv-ops-uptime-watchdog') then
      perform cron.unschedule('ticketiv-ops-uptime-watchdog');
    end if;

    perform cron.schedule(
      'ticketiv-ops-uptime-watchdog',
      '2-59/5 * * * *',
      $cron$select public.fn_ops_uptime_watchdog(false);$cron$
    );
  end if;
end;
$do$;

-- TICK-352: preserve the real HTTP outcome of refund reconciliation runs.
-- pg_net responses are short-lived, so each tick resolves its prior delivery
-- before queuing the next request, matching the settlement scheduler contract.

create or replace function public.fn_refund_reconciliation_tick()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
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
       and r.job = 'refund-reconciliation'
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

  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'ops_alert_cron_secret';

  if v_secret is null then
    raise exception 'refund reconciliation cron is not configured: missing ops_alert_cron_secret'
      using errcode = 'P0001';
  end if;

  select net.http_get(
           url                  => 'https://ticketiv.app/api/cron/refunds',
           headers              => jsonb_build_object(
                                     'Authorization', 'Bearer ' || v_secret,
                                     'User-Agent',    'ticketiv-pg-cron/1'
                                   ),
           timeout_milliseconds => 30000
         )
    into v_request_id;

  insert into public.ops_cron_runs (job, request_id)
  values ('refund-reconciliation', v_request_id);

  delete from public.ops_cron_runs
   where requested_at < now() - interval '30 days';

  return jsonb_build_object(
    'job',               'refund-reconciliation',
    'request_id',        v_request_id,
    'resolved_previous', v_resolved,
    'previous_failure',  v_prev_failure
  );
end;
$function$;

comment on function public.fn_refund_reconciliation_tick() is
  '15-minute refund reconciliation scheduler. Resolves the previous pg_net delivery, calls the secured endpoint, and records the next request.';

revoke execute on function public.fn_refund_reconciliation_tick() from public, anon, authenticated;
grant execute on function public.fn_refund_reconciliation_tick() to service_role;
;

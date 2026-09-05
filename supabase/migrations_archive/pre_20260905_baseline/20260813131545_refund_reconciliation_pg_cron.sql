-- TICK-352
-- Poll processing Paystack refunds every 15 minutes as a fallback for delayed
-- or missing provider webhooks. This does not replace webhook processing: both
-- paths end in the same fn_transition_refund contract.
--
-- IMPORTANT: apply this migration only after /api/cron/refunds is deployed on
-- ticketiv.app. The existing ops_alert_cron_secret is the same CRON_SECRET used
-- by secured Ticketiv cron routes, so no new secret is introduced.

create or replace function public.fn_refund_reconciliation_tick()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_secret text;
  v_request_id bigint;
begin
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

  return jsonb_build_object(
    'job', 'refund-reconciliation',
    'request_id', v_request_id
  );
end;
$function$;

revoke execute on function public.fn_refund_reconciliation_tick() from public, anon, authenticated;
grant execute on function public.fn_refund_reconciliation_tick() to service_role;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
      from cron.job
     where jobname = 'ticketiv-refund-reconciliation';

    perform cron.schedule(
      'ticketiv-refund-reconciliation',
      '*/15 * * * *',
      $cron$select public.fn_refund_reconciliation_tick();$cron$
    );
  end if;
end;
$do$;
;

-- Install pg_net so cron can POST to the edge function for retry sweeps.
-- The actual cron.schedule is left to the operator because it embeds an
-- anon JWT; running it inline here would commit the secret into version
-- control. See lib/data/admin/webhooks.ts for the schedule snippet.

create extension if not exists pg_net schema extensions;

-- Lock search_path on the function we added in this phase.
alter function public.fn_enqueue_webhook(text, jsonb, uuid) set search_path = public;
alter function public.fn_db_slow_queries(int, numeric) set search_path = public, extensions;

-- Convenience: an idempotent function that schedules webhook-dispatch
-- against the given URL + Bearer token. Operators call this once after
-- deploying the function. Errors are returned instead of raised so the
-- caller can see the result.
create or replace function public.fn_admin_schedule_webhook_dispatch(
  p_function_url text,
  p_anon_jwt text,
  p_schedule text default '* * * * *'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job_id bigint;
  v_command text;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  v_command := format(
    $cmd$ select net.http_post(url := %L, headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'), body := '{}'::jsonb) $cmd$,
    p_function_url,
    'Bearer ' || p_anon_jwt
  );

  -- Replace any existing schedule with the same name so this is idempotent.
  perform cron.unschedule('webhook-dispatch') from cron.job where jobname = 'webhook-dispatch';
  select cron.schedule('webhook-dispatch', p_schedule, v_command) into v_job_id;

  return jsonb_build_object('job_id', v_job_id, 'schedule', p_schedule);
end
$$;

revoke execute on function public.fn_admin_schedule_webhook_dispatch(text, text, text) from public, anon;
grant execute on function public.fn_admin_schedule_webhook_dispatch(text, text, text) to authenticated;

comment on function public.fn_admin_schedule_webhook_dispatch is
  'One-time setup helper: schedules pg_cron to POST the webhook-dispatch edge function every minute. Super-admin only.';
;

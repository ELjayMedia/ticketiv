-- ============================================================
-- TICK-79  Anonymous-user hygiene cleanup — Phase 1 Ops
-- ============================================================
-- Retention policy (operational follow-up to TICK-76/78):
--   • Anon user with no orders          → delete after  7 days
--   • Anon user with only failed/pending orders → delete after 30 days
--   • Anon user with any paid/refunded order    → keep indefinitely
-- ============================================================

-- -----------------------------------------------------------------
-- Cleanup function
-- -----------------------------------------------------------------
create or replace function public.fn_cleanup_anonymous_users(
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_no_order_ids  uuid[];
  v_stale_ids     uuid[];
  v_deleted_no_orders  int := 0;
  v_deleted_stale      int := 0;
  v_skipped_paid       int := 0;
begin
  -- ── Tier 1: anon users with zero orders, created > 7 days ago ───
  select array_agg(u.id)
  into v_no_order_ids
  from auth.users u
  where u.is_anonymous = true
    and u.created_at < now() - interval '7 days'
    and not exists (
      select 1 from public.orders o where o.buyer_id = u.id
    );

  v_deleted_no_orders := coalesce(array_length(v_no_order_ids, 1), 0);

  if not p_dry_run and v_deleted_no_orders > 0 then
    delete from auth.users where id = any(v_no_order_ids);
  end if;

  -- ── Tier 2: anon users with only failed/pending orders, > 30 days ─
  -- Never touches users who have any paid or refunded order.
  select array_agg(u.id)
  into v_stale_ids
  from auth.users u
  where u.is_anonymous = true
    and u.created_at < now() - interval '30 days'
    and exists (
      select 1 from public.orders o where o.buyer_id = u.id
    )
    and not exists (
      select 1 from public.orders o
      where o.buyer_id = u.id
        and o.status in ('paid', 'refunded')
    );

  v_deleted_stale := coalesce(array_length(v_stale_ids, 1), 0);

  if not p_dry_run and v_deleted_stale > 0 then
    delete from auth.users where id = any(v_stale_ids);
  end if;

  -- ── Skipped: anon users with at least one paid/refunded order ───
  select count(*)::int
  into v_skipped_paid
  from auth.users u
  where u.is_anonymous = true
    and exists (
      select 1 from public.orders o
      where o.buyer_id = u.id
        and o.status in ('paid', 'refunded')
    );

  -- ── Audit entry (always written, even on dry run) ───────────────
  insert into public.audit_log
    (org_id, actor_id, table_name, record_id, action, changes)
  values (
    null, null, 'auth.users', null, 'delete',
    jsonb_build_object(
      'job',                   'anon_user_hygiene',
      'dry_run',               p_dry_run,
      'deleted_no_orders',     v_deleted_no_orders,
      'deleted_stale_orders',  v_deleted_stale,
      'skipped_paid',          v_skipped_paid,
      'ran_at',                now()
    )
  );

  return jsonb_build_object(
    'dry_run',               p_dry_run,
    'deleted_no_orders',     v_deleted_no_orders,
    'deleted_stale_orders',  v_deleted_stale,
    'skipped_paid',          v_skipped_paid,
    'ran_at',                now()
  );
end;
$$;

-- Only service_role (cron / admin scripts) may invoke this.
revoke execute on function public.fn_cleanup_anonymous_users(boolean)
  from public, anon, authenticated;

-- -----------------------------------------------------------------
-- Daily pg_cron schedule — 01:00 UTC
-- Idempotent: drops the old job first if it exists.
-- -----------------------------------------------------------------
select cron.unschedule(jobid)
from cron.job
where jobname = 'anon-user-hygiene-daily';

select cron.schedule(
  'anon-user-hygiene-daily',
  '0 1 * * *',
  $cron$select public.fn_cleanup_anonymous_users(false)$cron$
);

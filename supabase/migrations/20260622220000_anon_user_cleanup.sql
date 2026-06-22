-- ============================================================
-- TICK-79  Anonymous-user hygiene cleanup job — Phase 2
-- ============================================================
-- Retention policy:
--   • Anon user with no orders                       → delete after  7 days
--   • Anon user with only non-paid orders (failed/abandoned) → delete after 30 days
--   • Anon user with any paid order                  → keep forever
--   • Non-anonymous users                            → never touched
--
-- Schema notes (confirmed from migrations):
--   auth.users.is_anonymous  — boolean flag for anon users
--   auth.users.created_at    — creation timestamp
--   public.orders.buyer_id   — FK to auth.users.id
--   public.orders.status     — 'paid' | 'refunded' | 'pending' | 'failed' | etc.
--   public.audit_log         — columns: org_id, actor_id, table_name, record_id, action, changes
-- ============================================================

-- -----------------------------------------------------------------
-- Helper: enumerate users eligible for deletion (used by the main fn)
-- -----------------------------------------------------------------
create or replace function public.fn_anon_users_to_delete()
returns table(user_id uuid, reason text)
language sql
security definer
set search_path = public
as $$
  -- Tier 1: no orders at all, created more than 7 days ago
  select u.id as user_id,
         'no_orders_7d' as reason
  from auth.users u
  where u.is_anonymous = true
    and u.created_at < now() - interval '7 days'
    and not exists (
      select 1 from public.orders o where o.buyer_id = u.id
    )

  union all

  -- Tier 2: has orders but none are paid/refunded, created more than 30 days ago
  select u.id as user_id,
         'unpaid_orders_30d' as reason
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
    )
;
$$;

-- Only service_role may enumerate deletion candidates
revoke execute on function public.fn_anon_users_to_delete()
  from public, anon, authenticated;

-- -----------------------------------------------------------------
-- Main cleanup function
-- -----------------------------------------------------------------
create or replace function public.fn_cleanup_anon_users(p_dry_run boolean default false)
returns json
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
  -- ── Tier 1: anon users with zero orders, created > 7 days ago ────────
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

  -- ── Tier 2: anon users with only unpaid orders, created > 30 days ago ─
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

  -- ── Count: anon users with paid orders (always kept) ──────────────────
  select count(*)::int
  into v_skipped_paid
  from auth.users u
  where u.is_anonymous = true
    and exists (
      select 1 from public.orders o
      where o.buyer_id = u.id
        and o.status in ('paid', 'refunded')
    );

  -- ── Audit log entry (written on dry-run too for observability) ────────
  insert into public.audit_log
    (org_id, actor_id, table_name, record_id, action, changes)
  values (
    null, null, 'auth.users', null, 'delete',
    jsonb_build_object(
      'job',                   'anon_user_cleanup',
      'dry_run',               p_dry_run,
      'deleted_no_orders',     v_deleted_no_orders,
      'deleted_stale_orders',  v_deleted_stale,
      'skipped_paid',          v_skipped_paid,
      'ran_at',                now()
    )
  );

  return row_to_json(
    row(
      p_dry_run,
      v_deleted_no_orders,
      v_deleted_stale,
      v_skipped_paid,
      now()
    )
  );
end;
$$;

-- Only service_role (cron / admin scripts) may invoke this function.
revoke execute on function public.fn_cleanup_anon_users(boolean)
  from public, anon, authenticated;

-- -----------------------------------------------------------------
-- Daily pg_cron schedule at 02:00 UTC
-- Wrapped in an exception-catching DO block so the migration
-- succeeds even when pg_cron is not enabled on the project.
-- Idempotent: unschedule any previous job with the same name first.
-- -----------------------------------------------------------------
do $cron_setup$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Remove old job if it exists (ignore if not found)
    begin
      perform cron.unschedule('anon-user-cleanup');
    exception when others then null;
    end;

    -- Also remove the earlier Phase 1 job name to avoid duplicate runs
    begin
      perform cron.unschedule('anon-user-hygiene-daily');
    exception when others then null;
    end;

    perform cron.schedule(
      'anon-user-cleanup',
      '0 2 * * *',
      $job$select public.fn_cleanup_anon_users(false)$job$
    );
  end if;
exception when others then null;
end;
$cron_setup$;

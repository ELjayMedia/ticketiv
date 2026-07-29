-- Audit retention (operational control #6): archive + prune audit_log.
--
-- audit_log (financial + admin actions) grows unbounded. Policy: keep the hot
-- table to a rolling window (default 24 months) and move older rows to a cold
-- archive table rather than hard-deleting them, so the legal retention minimum
-- for financial records is preserved while the hot table stays small.
--
-- audit_log has no triggers and no inbound FKs, so archiving is a clean
-- copy-then-delete. (scans also grows unbounded but carries delete-sensitive
-- triggers — a live-stats recalc — so its retention is deferred pending a
-- trigger-interaction review; see docs/OPERATIONS.md #6.)

-- Cold archive: same shape as audit_log (LIKE copies defaults/constraints and
-- the primary key via INCLUDING INDEXES; it does NOT copy FKs or triggers), plus
-- an archived_at stamp. Admin-only: RLS on, no client grants — reached solely
-- through the SECURITY DEFINER archive function (owner) or service_role.
create table if not exists public.audit_log_archive (
  like public.audit_log including defaults including constraints including indexes
);
alter table public.audit_log_archive
  add column if not exists archived_at timestamptz not null default now();

alter table public.audit_log_archive enable row level security;
revoke all on public.audit_log_archive from anon, authenticated;

-- Archive one batch of rows older than the retention window and prune them from
-- the hot table, in a single snapshot (the INSERT sees pre-delete rows), so a
-- crash never deletes without archiving. Returns the batch's counts.
create or replace function public.fn_archive_audit_log(
  p_retention interval default interval '24 months',
  p_batch_limit integer default 10000
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_cutoff timestamptz := now() - coalesce(p_retention, interval '24 months');
  v_batch integer := greatest(1, coalesce(p_batch_limit, 10000));
  v_pruned integer := 0;
begin
  with victims as (
    select id from public.audit_log
    where created_at < v_cutoff
    order by created_at
    limit v_batch
  ),
  archived as (
    insert into public.audit_log_archive (
      id, org_id, actor_id, table_name, record_id, action, changes, ip, user_agent, created_at
    )
    select a.id, a.org_id, a.actor_id, a.table_name, a.record_id, a.action, a.changes, a.ip, a.user_agent, a.created_at
    from public.audit_log a
    join victims v on v.id = a.id
    on conflict (id) do nothing
  ),
  pruned as (
    delete from public.audit_log a using victims v where a.id = v.id
    returning a.id
  )
  select count(*) from pruned into v_pruned;

  return jsonb_build_object('cutoff', v_cutoff, 'batch_limit', v_batch, 'pruned', v_pruned);
end;
$function$;

-- Admin/cron only.
revoke execute on function public.fn_archive_audit_log(interval, integer) from public, anon, authenticated;
grant execute on function public.fn_archive_audit_log(interval, integer) to service_role;

-- Schedule a daily prune via pg_cron when it is available (Supabase prod has it;
-- a fresh replay without pg_cron simply skips scheduling). cron.schedule by name
-- is an upsert, so this is idempotent.
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'ticketiv-audit-log-retention',
      '30 3 * * *',
      $cron$select public.fn_archive_audit_log();$cron$
    );
  end if;
end;
$do$;

-- Feature flags: per-organisation and per-event exclusions.
--
-- A platform flag (feature_flags, org_id is null) switches a feature on or off
-- for everyone. The command centre can now also keep a feature OFF for one
-- organisation or one event while it stays on for everyone else:
--
--   feature_flag_exclusions   one row per (flag, organisation) or (flag, event)
--   fn_admin_set_platform_flag      the card's on/off switch
--   fn_admin_add_flag_exclusion     exclude an organisation or event
--   fn_admin_remove_flag_exclusion  lift an exclusion
--
-- An exclusion only ever turns a feature off; it can never turn on a feature
-- that is off platform-wide. Excluding an organisation covers all its events.
-- The app reads exclusions with the service role (lib/feature-flags.ts) and
-- fails closed if they can't be read.
--
-- Writes: any active platform admin except read_only_admin
-- (app.can_platform_mutate), as for the flags themselves. Every change is in
-- the audit log with the admin's reason.
--
-- Additive only. Rollback: drop the three functions and the table.

create table if not exists public.feature_flag_exclusions (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null,
  org_id uuid references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint feature_flag_exclusions_one_target check (num_nonnulls(org_id, event_id) = 1),
  constraint feature_flag_exclusions_reason_len check (reason is null or char_length(reason) <= 500)
);

create unique index if not exists ux_feature_flag_exclusions_org
  on public.feature_flag_exclusions (flag_key, org_id) where org_id is not null;
create unique index if not exists ux_feature_flag_exclusions_event
  on public.feature_flag_exclusions (flag_key, event_id) where event_id is not null;
create index if not exists idx_feature_flag_exclusions_event on public.feature_flag_exclusions (event_id);
create index if not exists idx_feature_flag_exclusions_org on public.feature_flag_exclusions (org_id);
create index if not exists idx_feature_flag_exclusions_created_by on public.feature_flag_exclusions (created_by);

alter table public.feature_flag_exclusions enable row level security;
-- No policies: only the service role (server code) and the RPCs below touch it.
revoke all on public.feature_flag_exclusions from anon, authenticated;
grant select, insert, update, delete on public.feature_flag_exclusions to service_role;

comment on table public.feature_flag_exclusions is
  'Keeps a platform feature flag OFF for one organisation (all its events) or one event. Never turns a feature on.';

-- ── the card switch ────────────────────────────────────────────────────────
create or replace function public.fn_admin_set_platform_flag(p_key text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
begin
  if not app.can_platform_mutate() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_enabled is null then raise exception 'enabled_required' using errcode = 'P0001'; end if;

  update public.feature_flags
     set enabled = p_enabled, last_changed_by = (select auth.uid()), last_changed_at = now()
   where key = p_key and org_id is null
  returning id into v_id;
  if v_id is null then raise exception 'unknown_flag' using errcode = 'P0001'; end if;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (null, (select auth.uid()), 'feature_flags', v_id::text, 'update',
          jsonb_build_object('business_action', 'configure_feature_flag', 'key', p_key, 'enabled', p_enabled));
end;
$$;

-- ── exclude an organisation or an event ────────────────────────────────────
create or replace function public.fn_admin_add_flag_exclusion(
  p_key text,
  p_org_id uuid default null,
  p_event_id uuid default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_org uuid;
  v_id uuid;
begin
  if not app.can_platform_mutate() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if num_nonnulls(p_org_id, p_event_id) <> 1 then
    raise exception 'choose_one_target' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.feature_flags where key = p_key and org_id is null) then
    raise exception 'unknown_flag' using errcode = 'P0001';
  end if;
  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'reason_too_long' using errcode = 'P0001';
  end if;

  if p_org_id is not null then
    if not exists (select 1 from public.organizations where id = p_org_id) then
      raise exception 'unknown_organisation' using errcode = 'P0001';
    end if;
    v_org := p_org_id;
  else
    select org_id into v_org from public.events where id = p_event_id;
    if not found then raise exception 'unknown_event' using errcode = 'P0001'; end if;
  end if;

  insert into public.feature_flag_exclusions (flag_key, org_id, event_id, reason, created_by)
  values (p_key, p_org_id, p_event_id, v_reason, (select auth.uid()))
  on conflict do nothing
  returning id into v_id;
  if v_id is null then raise exception 'already_excluded' using errcode = 'P0001'; end if;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (v_org, (select auth.uid()), 'feature_flag_exclusions', v_id::text, 'insert',
          jsonb_build_object('business_action', 'exclude_feature', 'key', p_key,
                             'org_id', p_org_id, 'event_id', p_event_id, 'reason', v_reason));
  return v_id;
end;
$$;

-- ── lift an exclusion ──────────────────────────────────────────────────────
create or replace function public.fn_admin_remove_flag_exclusion(p_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_row public.feature_flag_exclusions;
  v_org uuid;
begin
  if not app.can_platform_mutate() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.feature_flag_exclusions where id = p_id returning * into v_row;
  if v_row.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;

  v_org := coalesce(v_row.org_id, (select org_id from public.events where id = v_row.event_id));
  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (v_org, (select auth.uid()), 'feature_flag_exclusions', v_row.id::text, 'delete',
          jsonb_build_object('business_action', 'include_feature', 'key', v_row.flag_key,
                             'org_id', v_row.org_id, 'event_id', v_row.event_id));
end;
$$;

revoke all on function public.fn_admin_set_platform_flag(text, boolean) from public, anon;
revoke all on function public.fn_admin_add_flag_exclusion(text, uuid, uuid, text) from public, anon;
revoke all on function public.fn_admin_remove_flag_exclusion(uuid) from public, anon;
grant execute on function public.fn_admin_set_platform_flag(text, boolean) to authenticated;
grant execute on function public.fn_admin_add_flag_exclusion(text, uuid, uuid, text) to authenticated;
grant execute on function public.fn_admin_remove_flag_exclusion(uuid) to authenticated;

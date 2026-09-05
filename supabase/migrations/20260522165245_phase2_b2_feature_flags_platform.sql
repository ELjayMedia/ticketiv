-- B2: Make feature_flags support platform-level rows (org_id NULL) and
-- carry rollout metadata used by the super-admin Feature Flags screen.

alter table public.feature_flags
  alter column org_id drop not null;

alter table public.feature_flags
  add column if not exists rollout_percent integer
    check (rollout_percent is null or (rollout_percent between 0 and 100)),
  add column if not exists owner uuid references auth.users(id) on delete set null,
  add column if not exists description text,
  add column if not exists tags text[] not null default array[]::text[],
  add column if not exists last_changed_by uuid references auth.users(id) on delete set null,
  add column if not exists last_changed_at timestamptz;

-- Replace the old (org_id, key) unique index with a pair of partial indexes
-- so a platform-level flag (org_id IS NULL) and a per-org flag with the same
-- key can coexist, but each scope still enforces uniqueness.
drop index if exists public.ux_feature_flags_org_key;

create unique index if not exists ux_feature_flags_org_scoped_key
  on public.feature_flags(org_id, key)
  where org_id is not null;

create unique index if not exists ux_feature_flags_platform_key
  on public.feature_flags(key)
  where org_id is null;

-- Touch last_changed_at automatically.
create or replace function public.fn_feature_flags_touch_last_changed()
returns trigger
language plpgsql
as $$
begin
  if new.rollout_percent is distinct from old.rollout_percent
     or new.enabled is distinct from old.enabled
     or new.config is distinct from old.config
     or new.tags is distinct from old.tags
     or new.description is distinct from old.description
  then
    new.last_changed_at := now();
  end if;
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists trg_feature_flags_touch on public.feature_flags;
create trigger trg_feature_flags_touch
  before update on public.feature_flags
  for each row execute function public.fn_feature_flags_touch_last_changed();

-- Platform-level flags are readable by super-admins; per-org flags follow
-- the existing org-member policy.
drop policy if exists feature_flags_platform_read on public.feature_flags;
create policy feature_flags_platform_read on public.feature_flags
  for select using (
    org_id is null and public.is_super_admin()
  );

drop policy if exists feature_flags_platform_write on public.feature_flags;
create policy feature_flags_platform_write on public.feature_flags
  for all using (
    org_id is null and public.is_super_admin()
  )
  with check (
    org_id is null and public.is_super_admin()
  );

comment on column public.feature_flags.org_id is
  'Per-org flag when set; NULL for platform-wide flags managed by super-admin.';
comment on column public.feature_flags.rollout_percent is
  'Percentage rollout 0-100 for platform-level flags (NULL for binary flags).';
comment on column public.feature_flags.tags is
  'Free-form tags for filtering (e.g. {growth, payments}).';
;

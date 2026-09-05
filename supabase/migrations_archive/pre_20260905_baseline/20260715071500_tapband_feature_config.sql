-- TICK-301 — TapBand feature flags, environment configuration and kill switches.

begin;

create table if not exists public.tapband_feature_configs (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'production',
  org_id uuid references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  enabled boolean not null default false,
  product_visibility_enabled boolean not null default false,
  credential_lookup_enabled boolean not null default false,
  provisioning_enabled boolean not null default false,
  activation_enabled boolean not null default false,
  outlet_lookup_enabled boolean not null default false,
  outlet_sales_enabled boolean not null default false,
  online_nfc_scanning_enabled boolean not null default false,
  offline_nfc_scanning_enabled boolean not null default false,
  offline_manifest_issuance_enabled boolean not null default false,
  qr_fallback_enabled boolean not null default false,
  lost_replacement_enabled boolean not null default false,
  desfire_secure_mode_enabled boolean not null default false,
  allowed_chip_families text[] not null default '{}'::text[],
  allowed_key_versions text[] not null default '{}'::text[],
  supported_entry_zones text[] not null default '{}'::text[],
  manifest_validity_seconds integer not null default 900,
  tap_debounce_ms integer not null default 1500,
  outlet_verification_requirement text not null default 'phone_otp',
  replacement_fee_cents integer not null default 0,
  replacement_fee_waiver_enabled boolean not null default false,
  effective_within_seconds integer not null default 60,
  public_client_config jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tapband_feature_configs_environment_not_blank check (btrim(environment) <> ''),
  constraint tapband_feature_configs_manifest_window check (manifest_validity_seconds between 60 and 86400),
  constraint tapband_feature_configs_debounce_window check (tap_debounce_ms between 0 and 60000),
  constraint tapband_feature_configs_replacement_fee_non_negative check (replacement_fee_cents >= 0),
  constraint tapband_feature_configs_effective_window check (effective_within_seconds between 0 and 3600),
  constraint tapband_feature_configs_verification_requirement check (
    outlet_verification_requirement in ('none', 'staff_pin', 'phone_otp', 'identity_review')
  ),
  constraint tapband_feature_configs_public_config_object check (jsonb_typeof(public_client_config) = 'object')
);

create unique index if not exists tapband_feature_configs_scope_uidx
  on public.tapband_feature_configs (
    environment,
    coalesce(org_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists tapband_feature_configs_org_idx
  on public.tapband_feature_configs (org_id, environment)
  where org_id is not null;

create index if not exists tapband_feature_configs_event_idx
  on public.tapband_feature_configs (event_id, environment)
  where event_id is not null;

create or replace function public.fn_touch_tapband_feature_configs_updated_at()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  new.updated_at = now();
  return new;
end
$function$;

drop trigger if exists trg_touch_tapband_feature_configs_updated_at on public.tapband_feature_configs;
create trigger trg_touch_tapband_feature_configs_updated_at
before update on public.tapband_feature_configs
for each row execute function public.fn_touch_tapband_feature_configs_updated_at();

create table if not exists public.tapband_kill_switches (
  id uuid primary key default gen_random_uuid(),
  switch_type text not null,
  environment text not null default 'production',
  org_id uuid references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  target_ref text,
  capability text,
  reason_code text not null,
  reason text not null,
  enabled boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tapband_kill_switches_type_check check (
    switch_type in (
      'all_credential_lookups',
      'supplier_batch',
      'chip_family',
      'key_version',
      'outlet',
      'provisioning_device',
      'nfc_scanning',
      'offline_manifest_issuance',
      'customer_replacement'
    )
  ),
  constraint tapband_kill_switches_environment_not_blank check (btrim(environment) <> ''),
  constraint tapband_kill_switches_reason_code_not_blank check (btrim(reason_code) <> ''),
  constraint tapband_kill_switches_reason_not_blank check (btrim(reason) <> ''),
  constraint tapband_kill_switches_target_required check (
    switch_type in (
      'all_credential_lookups',
      'nfc_scanning',
      'offline_manifest_issuance',
      'customer_replacement'
    )
    or target_ref is not null
  ),
  constraint tapband_kill_switches_time_order check (ends_at is null or ends_at > starts_at)
);

create index if not exists tapband_kill_switches_active_idx
  on public.tapband_kill_switches (environment, switch_type, enabled, starts_at, ends_at);

create index if not exists tapband_kill_switches_org_idx
  on public.tapband_kill_switches (org_id, environment)
  where org_id is not null;

create index if not exists tapband_kill_switches_event_idx
  on public.tapband_kill_switches (event_id, environment)
  where event_id is not null;

alter table public.tapband_feature_configs enable row level security;
alter table public.tapband_kill_switches enable row level security;

drop policy if exists tapband_feature_configs_select on public.tapband_feature_configs;
create policy tapband_feature_configs_select on public.tapband_feature_configs
  for select to authenticated
  using (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_manager(org_id))
    or (
      event_id is not null
      and exists (
        select 1 from public.events e
        where e.id = tapband_feature_configs.event_id
          and app.is_org_manager(e.org_id)
      )
    )
  );

drop policy if exists tapband_feature_configs_insert on public.tapband_feature_configs;
create policy tapband_feature_configs_insert on public.tapband_feature_configs
  for insert to authenticated
  with check (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_admin_of(org_id))
    or (
      event_id is not null
      and exists (
        select 1 from public.events e
        where e.id = tapband_feature_configs.event_id
          and app.is_org_admin_of(e.org_id)
      )
    )
  );

drop policy if exists tapband_feature_configs_update on public.tapband_feature_configs;
create policy tapband_feature_configs_update on public.tapband_feature_configs
  for update to authenticated
  using (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_admin_of(org_id))
    or (
      event_id is not null
      and exists (
        select 1 from public.events e
        where e.id = tapband_feature_configs.event_id
          and app.is_org_admin_of(e.org_id)
      )
    )
  )
  with check (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_admin_of(org_id))
    or (
      event_id is not null
      and exists (
        select 1 from public.events e
        where e.id = tapband_feature_configs.event_id
          and app.is_org_admin_of(e.org_id)
      )
    )
  );

drop policy if exists tapband_feature_configs_delete on public.tapband_feature_configs;
create policy tapband_feature_configs_delete on public.tapband_feature_configs
  for delete to authenticated
  using (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_admin_of(org_id))
    or (
      event_id is not null
      and exists (
        select 1 from public.events e
        where e.id = tapband_feature_configs.event_id
          and app.is_org_admin_of(e.org_id)
      )
    )
  );

drop policy if exists tapband_kill_switches_select on public.tapband_kill_switches;
create policy tapband_kill_switches_select on public.tapband_kill_switches
  for select to authenticated
  using (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_manager(org_id))
    or (
      event_id is not null
      and exists (
        select 1 from public.events e
        where e.id = tapband_kill_switches.event_id
          and app.is_org_manager(e.org_id)
      )
    )
  );

drop policy if exists tapband_kill_switches_insert on public.tapband_kill_switches;
create policy tapband_kill_switches_insert on public.tapband_kill_switches
  for insert to authenticated
  with check (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_admin_of(org_id))
    or (
      event_id is not null
      and exists (
        select 1 from public.events e
        where e.id = tapband_kill_switches.event_id
          and app.is_org_admin_of(e.org_id)
      )
    )
  );

drop policy if exists tapband_kill_switches_update on public.tapband_kill_switches;
create policy tapband_kill_switches_update on public.tapband_kill_switches
  for update to authenticated
  using (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_admin_of(org_id))
    or (
      event_id is not null
      and exists (
        select 1 from public.events e
        where e.id = tapband_kill_switches.event_id
          and app.is_org_admin_of(e.org_id)
      )
    )
  )
  with check (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_admin_of(org_id))
    or (
      event_id is not null
      and exists (
        select 1 from public.events e
        where e.id = tapband_kill_switches.event_id
          and app.is_org_admin_of(e.org_id)
      )
    )
  );

drop policy if exists tapband_kill_switches_delete on public.tapband_kill_switches;
create policy tapband_kill_switches_delete on public.tapband_kill_switches
  for delete to authenticated
  using (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_admin_of(org_id))
    or (
      event_id is not null
      and exists (
        select 1 from public.events e
        where e.id = tapband_kill_switches.event_id
          and app.is_org_admin_of(e.org_id)
      )
    )
  );

insert into public.tapband_feature_configs (
  environment,
  enabled,
  notes
)
select
  'production',
  false,
  'Seeded default: TapBand is disabled in production until explicitly enabled for a pilot scope.'
where not exists (
  select 1
  from public.tapband_feature_configs
  where environment = 'production'
    and org_id is null
    and event_id is null
);

commit;

-- TICK-287 — TapBand physical credential, inventory, entitlement and tap schema.

begin;

alter table public.order_items
  add column if not exists holder_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_order_items_holder_user_id
  on public.order_items (holder_user_id)
  where holder_user_id is not null;

create table if not exists public.credential_batches (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  supplier_reference text,
  org_id uuid references public.organizations(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  purpose text not null default 'pilot',
  status text not null default 'planned',
  chip_family text not null,
  chip_product text,
  key_version text,
  frequency text not null default '13.56 MHz',
  protocol text not null default 'ISO/IEC 14443 Type A',
  memory_bytes integer,
  quantity_ordered integer not null default 0,
  quantity_received integer not null default 0,
  branding_version text,
  serial_prefix text,
  production_date date,
  received_at timestamptz,
  accepted_at timestamptz,
  quarantined_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credential_batches_supplier_not_blank check (btrim(supplier_name) <> ''),
  constraint credential_batches_chip_family_not_blank check (btrim(chip_family) <> ''),
  constraint credential_batches_purpose_check check (purpose in ('pilot', 'uat', 'production')),
  constraint credential_batches_status_check check (status in ('planned', 'ordered', 'received', 'quarantined', 'accepted', 'rejected', 'retired')),
  constraint credential_batches_quantities_non_negative check (quantity_ordered >= 0 and quantity_received >= 0),
  constraint credential_batches_memory_positive check (memory_bytes is null or memory_bytes > 0),
  constraint credential_batches_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.credential_inventory (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.credential_batches(id) on delete restrict,
  org_id uuid references public.organizations(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  outlet_id text,
  public_serial text not null,
  external_serial text,
  qr_reference text,
  chip_family text not null,
  chip_identifier_hash text,
  chip_fingerprint text,
  secure_element_ref text,
  key_version text,
  inventory_status text not null default 'received',
  current_credential_id uuid,
  issued_at timestamptz,
  activated_at timestamptz,
  retired_at timestamptz,
  defect_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credential_inventory_public_serial_not_blank check (btrim(public_serial) <> ''),
  constraint credential_inventory_outlet_id_not_blank check (outlet_id is null or btrim(outlet_id) <> ''),
  constraint credential_inventory_chip_family_not_blank check (btrim(chip_family) <> ''),
  constraint credential_inventory_hash_not_blank check (chip_identifier_hash is null or btrim(chip_identifier_hash) <> ''),
  constraint credential_inventory_status_check check (
    inventory_status in (
      'received',
      'inspected',
      'available',
      'reserved',
      'issued',
      'active',
      'revoked',
      'defective',
      'lost',
      'destroyed',
      'returned',
      'retired'
    )
  ),
  constraint credential_inventory_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.physical_credentials (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.credential_inventory(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  credential_public_id text not null,
  credential_type text not null default 'ntag_pilot',
  chip_family text not null,
  key_version text,
  authentication_mode text not null default 'server_entitlement',
  status text not null default 'issued',
  issued_by uuid references auth.users(id) on delete set null default auth.uid(),
  activated_by uuid references auth.users(id) on delete set null,
  revoked_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz not null default now(),
  activated_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  replacement_of_id uuid references public.physical_credentials(id) on delete set null,
  replaced_by_id uuid references public.physical_credentials(id) on delete set null,
  pin_enabled boolean not null default false,
  verification_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint physical_credentials_public_id_not_blank check (btrim(credential_public_id) <> ''),
  constraint physical_credentials_chip_family_not_blank check (btrim(chip_family) <> ''),
  constraint physical_credentials_type_check check (credential_type in ('ntag_pilot', 'desfire_ev3', 'qr_fallback', 'manual_reference')),
  constraint physical_credentials_authentication_mode_check check (
    authentication_mode in ('server_entitlement', 'desfire_mutual_auth', 'signed_payload')
  ),
  constraint physical_credentials_status_check check (
    status in ('issued', 'active', 'suspended', 'revoked', 'lost', 'replaced', 'defective', 'retired', 'destroyed')
  ),
  constraint physical_credentials_active_has_user check (status <> 'active' or user_id is not null),
  constraint physical_credentials_replacement_of_not_self check (replacement_of_id is null or replacement_of_id <> id),
  constraint physical_credentials_replaced_by_not_self check (replaced_by_id is null or replaced_by_id <> id),
  constraint physical_credentials_verification_metadata_object check (jsonb_typeof(verification_metadata) = 'object')
);

alter table public.credential_inventory
  drop constraint if exists credential_inventory_current_credential_id_fkey;

alter table public.credential_inventory
  add constraint credential_inventory_current_credential_id_fkey
  foreign key (current_credential_id) references public.physical_credentials(id) on delete set null;

create table if not exists public.credential_entitlements (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.physical_credentials(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  holder_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  assigned_by uuid references auth.users(id) on delete set null default auth.uid(),
  assignment_source text not null default 'activation',
  assigned_at timestamptz not null default now(),
  removed_by uuid references auth.users(id) on delete set null,
  removed_at timestamptz,
  removal_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credential_entitlements_status_check check (status in ('active', 'suspended', 'removed', 'expired', 'consumed')),
  constraint credential_entitlements_assignment_source_check check (
    assignment_source in ('activation', 'outlet_sale', 'support', 'replacement', 'import', 'system')
  ),
  constraint credential_entitlements_valid_window check (valid_until is null or valid_until > valid_from),
  constraint credential_entitlements_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.credential_taps (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid references public.physical_credentials(id) on delete set null,
  inventory_id uuid references public.credential_inventory(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  device_session_id uuid references public.device_sessions(id) on delete set null,
  operator_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  outlet_id text,
  presented_credential_hash text,
  tap_type text not null,
  outcome text not null,
  reason_code text,
  occurred_at timestamptz not null default now(),
  offline boolean not null default false,
  client_attempt_id text,
  synced_at timestamptz,
  latency_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint credential_taps_outlet_id_not_blank check (outlet_id is null or btrim(outlet_id) <> ''),
  constraint credential_taps_presented_hash_not_blank check (presented_credential_hash is null or btrim(presented_credential_hash) <> ''),
  constraint credential_taps_type_check check (
    tap_type in (
      'provision',
      'activate',
      'identify',
      'outlet_sale',
      'check_in',
      'revoke_check',
      'support_lookup',
      'replacement',
      'inventory_audit'
    )
  ),
  constraint credential_taps_outcome_not_blank check (btrim(outcome) <> ''),
  constraint credential_taps_latency_non_negative check (latency_ms is null or latency_ms >= 0),
  constraint credential_taps_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create or replace function public.fn_touch_tapband_credentials_updated_at()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  new.updated_at = now();
  return new;
end
$function$;

drop trigger if exists trg_touch_credential_batches_updated_at on public.credential_batches;
create trigger trg_touch_credential_batches_updated_at
before update on public.credential_batches
for each row execute function public.fn_touch_tapband_credentials_updated_at();

drop trigger if exists trg_touch_credential_inventory_updated_at on public.credential_inventory;
create trigger trg_touch_credential_inventory_updated_at
before update on public.credential_inventory
for each row execute function public.fn_touch_tapband_credentials_updated_at();

drop trigger if exists trg_touch_physical_credentials_updated_at on public.physical_credentials;
create trigger trg_touch_physical_credentials_updated_at
before update on public.physical_credentials
for each row execute function public.fn_touch_tapband_credentials_updated_at();

drop trigger if exists trg_touch_credential_entitlements_updated_at on public.credential_entitlements;
create trigger trg_touch_credential_entitlements_updated_at
before update on public.credential_entitlements
for each row execute function public.fn_touch_tapband_credentials_updated_at();

create or replace function public.fn_prepare_credential_entitlement()
returns trigger language plpgsql set search_path to 'public' as $function$
declare
  v_event_id uuid;
  v_holder_user_id uuid;
begin
  select tt.event_id, coalesce(oi.holder_user_id, oi.current_owner_id, o.buyer_id)
    into v_event_id, v_holder_user_id
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.orders o on o.id = oi.order_id
  where oi.id = new.order_item_id;

  if v_event_id is null then
    raise exception 'credential_entitlements.order_item_id % is not linked to an event', new.order_item_id;
  end if;

  if new.event_id is distinct from v_event_id then
    raise exception 'credential_entitlements.event_id must match the order item event';
  end if;

  if new.holder_user_id is null then
    new.holder_user_id = v_holder_user_id;
  end if;

  return new;
end
$function$;

drop trigger if exists trg_prepare_credential_entitlement on public.credential_entitlements;
create trigger trg_prepare_credential_entitlement
before insert or update of order_item_id, event_id, holder_user_id on public.credential_entitlements
for each row execute function public.fn_prepare_credential_entitlement();

create unique index if not exists credential_batches_supplier_reference_uidx
  on public.credential_batches (supplier_name, supplier_reference)
  where supplier_reference is not null;

create index if not exists credential_batches_scope_idx
  on public.credential_batches (org_id, event_id, status);

create unique index if not exists credential_inventory_public_serial_uidx
  on public.credential_inventory (public_serial);

create unique index if not exists credential_inventory_external_serial_uidx
  on public.credential_inventory (external_serial)
  where external_serial is not null;

create unique index if not exists credential_inventory_qr_reference_uidx
  on public.credential_inventory (qr_reference)
  where qr_reference is not null;

create unique index if not exists credential_inventory_chip_identifier_hash_uidx
  on public.credential_inventory (chip_identifier_hash)
  where chip_identifier_hash is not null;

create index if not exists credential_inventory_batch_status_idx
  on public.credential_inventory (batch_id, inventory_status);

create index if not exists credential_inventory_scope_idx
  on public.credential_inventory (org_id, event_id, outlet_id)
  where org_id is not null or event_id is not null or outlet_id is not null;

create unique index if not exists physical_credentials_public_id_uidx
  on public.physical_credentials (credential_public_id);

create unique index if not exists physical_credentials_active_inventory_uidx
  on public.physical_credentials (inventory_id)
  where status in ('issued', 'active', 'suspended');

create index if not exists physical_credentials_user_status_idx
  on public.physical_credentials (user_id, status)
  where user_id is not null;

create index if not exists physical_credentials_replacement_of_idx
  on public.physical_credentials (replacement_of_id)
  where replacement_of_id is not null;

create unique index if not exists credential_entitlements_active_order_item_uidx
  on public.credential_entitlements (order_item_id)
  where status = 'active';

create unique index if not exists credential_entitlements_active_credential_order_item_uidx
  on public.credential_entitlements (credential_id, order_item_id)
  where status in ('active', 'suspended');

create index if not exists credential_entitlements_credential_status_idx
  on public.credential_entitlements (credential_id, status);

create index if not exists credential_entitlements_event_status_idx
  on public.credential_entitlements (event_id, status);

create index if not exists credential_entitlements_holder_user_idx
  on public.credential_entitlements (holder_user_id, status)
  where holder_user_id is not null;

create index if not exists credential_taps_credential_occurred_idx
  on public.credential_taps (credential_id, occurred_at desc)
  where credential_id is not null;

create index if not exists credential_taps_event_occurred_idx
  on public.credential_taps (event_id, occurred_at desc)
  where event_id is not null;

create index if not exists credential_taps_device_occurred_idx
  on public.credential_taps (device_id, occurred_at desc)
  where device_id is not null;

create unique index if not exists credential_taps_device_attempt_uidx
  on public.credential_taps (device_id, client_attempt_id)
  where device_id is not null and client_attempt_id is not null;

create or replace function app.can_administer_tapband_event(p_event uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select p_event is not null
    and (
      app.is_platform_admin()
      or app.is_event_staff_of(p_event, array['organizer_admin','organizer_staff']::app_role[])
      or exists (
        select 1 from public.events e
        where e.id = p_event
          and app.is_org_manager(e.org_id)
      )
    )
$function$;

create or replace function app.can_record_tapband_event_tap(p_event uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select p_event is not null
    and (
      app.is_platform_admin()
      or app.is_event_staff_of(p_event, array['organizer_admin','organizer_staff','scanner','organizer_scanner']::app_role[])
      or exists (
        select 1 from public.events e
        where e.id = p_event
          and app.is_org_manager(e.org_id)
      )
    )
$function$;

create or replace function app.can_read_tapband_event(p_event uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select p_event is not null
    and (
      app.is_platform_admin()
      or app.is_event_staff_of(p_event, null::app_role[])
      or exists (
        select 1 from public.events e
        where e.id = p_event
          and app.is_org_member_of(e.org_id)
      )
    )
$function$;

create or replace function app.can_read_tapband_order_item(p_order_item uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.events e on e.id = tt.event_id
    where oi.id = p_order_item
      and (
        app.is_platform_admin()
        or oi.current_owner_id = app.uid()
        or oi.holder_user_id = app.uid()
        or o.buyer_id = app.uid()
        or app.is_event_staff_of(e.id, null::app_role[])
        or app.is_org_manager(e.org_id)
      )
  )
$function$;

create or replace function app.can_read_tapband_credential(p_credential uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1
    from public.physical_credentials pc
    where pc.id = p_credential
      and (
        app.is_platform_admin()
        or pc.user_id = app.uid()
        or exists (
          select 1
          from public.credential_entitlements ce
          join public.events e on e.id = ce.event_id
          left join public.order_items oi on oi.id = ce.order_item_id
          left join public.orders o on o.id = oi.order_id
          where ce.credential_id = pc.id
            and (
              ce.holder_user_id = app.uid()
              or oi.current_owner_id = app.uid()
              or oi.holder_user_id = app.uid()
              or o.buyer_id = app.uid()
              or app.is_event_staff_of(e.id, null::app_role[])
              or app.is_org_manager(e.org_id)
            )
        )
      )
  )
$function$;

create or replace function app.can_read_tapband_inventory(p_inventory uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1
    from public.credential_inventory ci
    left join public.events e on e.id = ci.event_id
    where ci.id = p_inventory
      and (
        app.is_platform_admin()
        or (ci.org_id is not null and app.is_org_manager(ci.org_id))
        or (ci.event_id is not null and app.can_read_tapband_event(ci.event_id))
        or exists (
          select 1
          from public.physical_credentials pc
          where pc.inventory_id = ci.id
            and app.can_read_tapband_credential(pc.id)
        )
        or (e.id is not null and app.is_org_member_of(e.org_id))
      )
  )
$function$;

create or replace function app.can_read_tapband_entitlement(p_entitlement uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1
    from public.credential_entitlements ce
    join public.events e on e.id = ce.event_id
    left join public.order_items oi on oi.id = ce.order_item_id
    left join public.orders o on o.id = oi.order_id
    where ce.id = p_entitlement
      and (
        app.is_platform_admin()
        or ce.holder_user_id = app.uid()
        or oi.current_owner_id = app.uid()
        or oi.holder_user_id = app.uid()
        or o.buyer_id = app.uid()
        or app.is_event_staff_of(e.id, null::app_role[])
        or app.is_org_manager(e.org_id)
        or app.can_read_tapband_credential(ce.credential_id)
      )
  )
$function$;

create or replace function app.can_read_tapband_tap(p_tap uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1
    from public.credential_taps ct
    where ct.id = p_tap
      and (
        app.is_platform_admin()
        or (ct.event_id is not null and app.can_read_tapband_event(ct.event_id))
        or (ct.order_item_id is not null and app.can_read_tapband_order_item(ct.order_item_id))
        or (ct.credential_id is not null and app.can_read_tapband_credential(ct.credential_id))
        or (ct.inventory_id is not null and app.can_read_tapband_inventory(ct.inventory_id))
      )
  )
$function$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'app.can_administer_tapband_event(uuid)',
    'app.can_record_tapband_event_tap(uuid)',
    'app.can_read_tapband_event(uuid)',
    'app.can_read_tapband_order_item(uuid)',
    'app.can_read_tapband_credential(uuid)',
    'app.can_read_tapband_inventory(uuid)',
    'app.can_read_tapband_entitlement(uuid)',
    'app.can_read_tapband_tap(uuid)'
  ]
  loop
    execute format('revoke execute on function %s from public', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

alter table public.credential_batches enable row level security;
alter table public.credential_inventory enable row level security;
alter table public.physical_credentials enable row level security;
alter table public.credential_entitlements enable row level security;
alter table public.credential_taps enable row level security;

drop policy if exists order_items_select_authenticated on public.order_items;
create policy order_items_select_authenticated on public.order_items
  for select to authenticated
  using (
    (current_owner_id = app.uid())
    or (holder_user_id = app.uid())
    or exists (select 1 from public.orders o where o.id = order_items.order_id and (o.buyer_id = app.uid() or app.is_org_manager(o.org_id)))
    or exists (select 1 from public.ticket_types tt join public.events e on e.id = tt.event_id
               where tt.id = order_items.ticket_type_id and app.is_event_staff_of(e.id, null::app_role[]))
  );

drop policy if exists credential_batches_select on public.credential_batches;
create policy credential_batches_select on public.credential_batches
  for select to authenticated
  using (
    app.is_platform_admin()
    or (org_id is not null and app.is_org_manager(org_id))
    or (event_id is not null and app.can_read_tapband_event(event_id))
  );

drop policy if exists credential_batches_insert on public.credential_batches;
create policy credential_batches_insert on public.credential_batches
  for insert to authenticated
  with check (app.is_platform_admin());

drop policy if exists credential_batches_update on public.credential_batches;
create policy credential_batches_update on public.credential_batches
  for update to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

drop policy if exists credential_batches_delete on public.credential_batches;
create policy credential_batches_delete on public.credential_batches
  for delete to authenticated
  using (app.is_platform_admin());

drop policy if exists credential_inventory_select on public.credential_inventory;
create policy credential_inventory_select on public.credential_inventory
  for select to authenticated
  using (app.can_read_tapband_inventory(id));

drop policy if exists credential_inventory_insert on public.credential_inventory;
create policy credential_inventory_insert on public.credential_inventory
  for insert to authenticated
  with check (app.is_platform_admin());

drop policy if exists credential_inventory_update on public.credential_inventory;
create policy credential_inventory_update on public.credential_inventory
  for update to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

drop policy if exists credential_inventory_delete on public.credential_inventory;
create policy credential_inventory_delete on public.credential_inventory
  for delete to authenticated
  using (app.is_platform_admin());

drop policy if exists physical_credentials_select on public.physical_credentials;
create policy physical_credentials_select on public.physical_credentials
  for select to authenticated
  using (app.can_read_tapband_credential(id));

drop policy if exists physical_credentials_insert on public.physical_credentials;
create policy physical_credentials_insert on public.physical_credentials
  for insert to authenticated
  with check (app.is_platform_admin());

drop policy if exists physical_credentials_update on public.physical_credentials;
create policy physical_credentials_update on public.physical_credentials
  for update to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

drop policy if exists physical_credentials_delete on public.physical_credentials;
create policy physical_credentials_delete on public.physical_credentials
  for delete to authenticated
  using (app.is_platform_admin());

drop policy if exists credential_entitlements_select on public.credential_entitlements;
create policy credential_entitlements_select on public.credential_entitlements
  for select to authenticated
  using (app.can_read_tapband_entitlement(id));

drop policy if exists credential_entitlements_insert on public.credential_entitlements;
create policy credential_entitlements_insert on public.credential_entitlements
  for insert to authenticated
  with check (app.can_administer_tapband_event(event_id));

drop policy if exists credential_entitlements_update on public.credential_entitlements;
create policy credential_entitlements_update on public.credential_entitlements
  for update to authenticated
  using (app.can_administer_tapband_event(event_id))
  with check (app.can_administer_tapband_event(event_id));

drop policy if exists credential_entitlements_delete on public.credential_entitlements;
create policy credential_entitlements_delete on public.credential_entitlements
  for delete to authenticated
  using (app.can_administer_tapband_event(event_id));

drop policy if exists credential_taps_select on public.credential_taps;
create policy credential_taps_select on public.credential_taps
  for select to authenticated
  using (app.can_read_tapband_tap(id));

drop policy if exists credential_taps_insert on public.credential_taps;
create policy credential_taps_insert on public.credential_taps
  for insert to authenticated
  with check (
    app.is_platform_admin()
    or (event_id is not null and app.can_record_tapband_event_tap(event_id))
  );

drop policy if exists credential_taps_update on public.credential_taps;
create policy credential_taps_update on public.credential_taps
  for update to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

drop policy if exists credential_taps_delete on public.credential_taps;
create policy credential_taps_delete on public.credential_taps
  for delete to authenticated
  using (app.is_platform_admin());

comment on column public.order_items.holder_user_id is 'Optional explicit holder account for physical credential assignment. QR ticket ownership via current_owner_id remains unchanged.';

comment on table public.credential_batches is 'Supplier batch record for TapBand physical credentials, including chip family, quantities and operational acceptance state.';
comment on table public.credential_inventory is 'Per-band inventory. Chip UIDs must only be stored as hashes or secure element references; raw UIDs are intentionally not modeled.';
comment on column public.credential_inventory.chip_identifier_hash is 'Hash of the chip identifier used for lookup and risk controls. Do not store raw NFC UID values here.';
comment on column public.credential_inventory.secure_element_ref is 'Reference to secure-key material or chip attestation metadata; not a raw secret.';
comment on table public.physical_credentials is 'Customer-facing TapBand credential lifecycle record. Production access must pair the credential with server entitlements and configured authentication mode.';
comment on column public.physical_credentials.authentication_mode is 'Production TapBand authentication mode. A hashed UID alone is not an accepted authenticator.';
comment on table public.credential_entitlements is 'Links physical credentials to issued order items and event access windows, with partial unique indexes preventing duplicate active assignment.';
comment on table public.credential_taps is 'Append-only TapBand tap/audit log for provisioning, activation, outlet sale, lookup and entry attempts.';
comment on column public.credential_taps.presented_credential_hash is 'Hash-only representation of a presented credential when the tap cannot be linked to a stored credential row.';

commit;

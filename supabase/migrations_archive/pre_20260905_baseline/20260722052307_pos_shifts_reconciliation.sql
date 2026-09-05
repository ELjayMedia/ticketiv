-- TICK-347: cashier shifts, POS sale attribution and cash reconciliation.

create table if not exists public.pos_shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete restrict,
  cashier_user_id uuid not null references auth.users(id) on delete restrict,
  device_id uuid null references public.devices(id) on delete restrict,
  device_session_id uuid null references public.device_sessions(id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'closed')),
  opening_cash_cents integer not null default 0 check (opening_cash_cents >= 0),
  expected_cash_cents integer null check (expected_cash_cents is null or expected_cash_cents >= 0),
  closing_cash_cents integer null check (closing_cash_cents is null or closing_cash_cents >= 0),
  cash_variance_cents integer null,
  opened_at timestamptz not null default now(),
  opened_by uuid not null references auth.users(id) on delete restrict,
  closed_at timestamptz null,
  closed_by uuid null references auth.users(id) on delete restrict,
  opening_notes text null,
  closing_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pos_shifts_close_state check (
    (status = 'open' and closed_at is null and closed_by is null and closing_cash_cents is null and cash_variance_cents is null)
    or
    (status = 'closed' and closed_at is not null and closed_by is not null and closing_cash_cents is not null and expected_cash_cents is not null and cash_variance_cents is not null)
  )
);

create unique index if not exists pos_shifts_one_open_per_cashier_org
  on public.pos_shifts(org_id, cashier_user_id)
  where status = 'open';

create unique index if not exists pos_shifts_one_open_per_device
  on public.pos_shifts(device_id)
  where status = 'open' and device_id is not null;

create index if not exists pos_shifts_org_opened_at_idx
  on public.pos_shifts(org_id, opened_at desc);

alter table public.orders
  add column if not exists pos_shift_id uuid null references public.pos_shifts(id) on delete restrict,
  add column if not exists cashier_user_id uuid null references auth.users(id) on delete restrict,
  add column if not exists device_session_id uuid null references public.device_sessions(id) on delete restrict;

create index if not exists orders_pos_shift_id_idx on public.orders(pos_shift_id);
create index if not exists orders_cashier_user_id_idx on public.orders(cashier_user_id);

alter table public.pos_shifts enable row level security;

revoke all on table public.pos_shifts from public, anon, authenticated;
grant select on table public.pos_shifts to authenticated, service_role;
grant all on table public.pos_shifts to postgres;

drop policy if exists pos_shifts_select on public.pos_shifts;
create policy pos_shifts_select on public.pos_shifts
for select to authenticated
using (
  app.is_claimed_account()
  and (
    cashier_user_id = auth.uid()
    or app.is_org_manager(org_id)
    or app.is_org_finance_viewer(org_id)
    or app.is_platform_admin()
  )
);

create or replace function public.fn_open_pos_shift(
  p_org_id uuid,
  p_device_id uuid default null,
  p_device_session_id uuid default null,
  p_opening_cash_cents integer default 0,
  p_notes text default null
)
returns public.pos_shifts
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare
  v_actor uuid := auth.uid();
  v_shift public.pos_shifts;
  v_device_org uuid;
  v_device_role public.device_role;
  v_session_device uuid;
  v_session_user uuid;
  v_session_ended timestamptz;
begin
  perform app.require_claimed_account();

  if p_org_id is null then
    raise exception 'org_id_required' using errcode = '22023';
  end if;

  if coalesce(p_opening_cash_cents, 0) < 0 then
    raise exception 'invalid_opening_cash' using errcode = '22023';
  end if;

  if not public.user_has_org_role(
    p_org_id,
    array['admin','organizer','organizer_owner','organizer_admin','organizer_staff','pos']
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_device_session_id is not null and p_device_id is null then
    raise exception 'device_required_for_session' using errcode = '22023';
  end if;

  if p_device_id is not null then
    select d.org_id, d.device_role
      into v_device_org, v_device_role
    from public.devices d
    where d.id = p_device_id;

    if v_device_org is null then
      raise exception 'device_not_found' using errcode = 'P0002';
    end if;

    if v_device_org <> p_org_id then
      raise exception 'device_not_in_org' using errcode = '42501';
    end if;

    if v_device_role not in ('organizer_pos'::public.device_role, 'organizer_kiosk'::public.device_role) then
      raise exception 'device_not_pos_capable' using errcode = '22023';
    end if;
  end if;

  if p_device_session_id is not null then
    select ds.device_id, ds.user_id, ds.ended_at
      into v_session_device, v_session_user, v_session_ended
    from public.device_sessions ds
    where ds.id = p_device_session_id;

    if v_session_device is null then
      raise exception 'device_session_not_found' using errcode = 'P0002';
    end if;

    if v_session_device <> p_device_id then
      raise exception 'device_session_mismatch' using errcode = '42501';
    end if;

    if v_session_ended is not null then
      raise exception 'device_session_closed' using errcode = '55000';
    end if;

    if v_session_user is not null and v_session_user <> v_actor then
      raise exception 'device_session_owned_by_another_user' using errcode = '42501';
    end if;
  end if;

  insert into public.pos_shifts (
    org_id,
    cashier_user_id,
    device_id,
    device_session_id,
    opening_cash_cents,
    opened_by,
    opening_notes
  )
  values (
    p_org_id,
    v_actor,
    p_device_id,
    p_device_session_id,
    coalesce(p_opening_cash_cents, 0),
    v_actor,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_shift;

  insert into public.audit_log(org_id, actor_id, table_name, record_id, action, changes)
  values (
    p_org_id,
    v_actor,
    'pos_shifts',
    v_shift.id::text,
    'open',
    jsonb_build_object(
      'opening_cash_cents', v_shift.opening_cash_cents,
      'device_id', v_shift.device_id,
      'device_session_id', v_shift.device_session_id
    )
  );

  return v_shift;
exception
  when unique_violation then
    raise exception 'pos_shift_already_open' using errcode = '23505';
end;
$$;

revoke all on function public.fn_open_pos_shift(uuid, uuid, uuid, integer, text) from public, anon;
grant execute on function public.fn_open_pos_shift(uuid, uuid, uuid, integer, text) to authenticated, service_role;

create or replace function public.fn_pos_shift_summary(p_shift_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare
  v_shift public.pos_shifts;
  v_order_count integer := 0;
  v_gross_sales integer := 0;
  v_cash_sales integer := 0;
  v_card_sales integer := 0;
  v_upi_sales integer := 0;
  v_comp_sales integer := 0;
  v_other_sales integer := 0;
  v_cash_refunds integer := 0;
  v_total_refunds integer := 0;
  v_expected_cash integer := 0;
begin
  perform app.require_claimed_account();

  select * into v_shift
  from public.pos_shifts
  where id = p_shift_id;

  if not found then
    raise exception 'pos_shift_not_found' using errcode = 'P0002';
  end if;

  if not (
    v_shift.cashier_user_id = auth.uid()
    or app.is_org_manager(v_shift.org_id)
    or app.is_org_finance_viewer(v_shift.org_id)
    or app.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select count(*), coalesce(sum(o.total_cents), 0)
    into v_order_count, v_gross_sales
  from public.orders o
  where o.pos_shift_id = p_shift_id;

  select
    coalesce(sum(p.amount_cents) filter (where lower(p.provider) = 'cash' and p.status = 'succeeded'), 0),
    coalesce(sum(p.amount_cents) filter (where lower(p.provider) = 'card' and p.status = 'succeeded'), 0),
    coalesce(sum(p.amount_cents) filter (where lower(p.provider) = 'upi' and p.status = 'succeeded'), 0),
    coalesce(sum(p.amount_cents) filter (where lower(p.provider) = 'comp' and p.status = 'succeeded'), 0),
    coalesce(sum(p.amount_cents) filter (where lower(p.provider) not in ('cash','card','upi','comp') and p.status = 'succeeded'), 0)
  into v_cash_sales, v_card_sales, v_upi_sales, v_comp_sales, v_other_sales
  from public.payments p
  join public.orders o on o.id = p.order_id
  where o.pos_shift_id = p_shift_id;

  select
    coalesce(sum(r.amount_cents) filter (where lower(p.provider) = 'cash' and r.status = 'processed'), 0),
    coalesce(sum(r.amount_cents) filter (where r.status = 'processed'), 0)
  into v_cash_refunds, v_total_refunds
  from public.refunds r
  join public.payments p on p.id = r.payment_id
  join public.orders o on o.id = p.order_id
  where o.pos_shift_id = p_shift_id;

  v_expected_cash := greatest(0, v_shift.opening_cash_cents + v_cash_sales - v_cash_refunds);

  return jsonb_build_object(
    'shift_id', v_shift.id,
    'org_id', v_shift.org_id,
    'cashier_user_id', v_shift.cashier_user_id,
    'device_id', v_shift.device_id,
    'device_session_id', v_shift.device_session_id,
    'status', v_shift.status,
    'opened_at', v_shift.opened_at,
    'closed_at', v_shift.closed_at,
    'opening_cash_cents', v_shift.opening_cash_cents,
    'expected_cash_cents', coalesce(v_shift.expected_cash_cents, v_expected_cash),
    'closing_cash_cents', v_shift.closing_cash_cents,
    'cash_variance_cents', v_shift.cash_variance_cents,
    'order_count', v_order_count,
    'gross_sales_cents', v_gross_sales,
    'refunds_cents', v_total_refunds,
    'payment_totals', jsonb_build_object(
      'cash_cents', v_cash_sales,
      'card_cents', v_card_sales,
      'upi_cents', v_upi_sales,
      'comp_cents', v_comp_sales,
      'other_cents', v_other_sales
    ),
    'cash_refunds_cents', v_cash_refunds
  );
end;
$$;

revoke all on function public.fn_pos_shift_summary(uuid) from public, anon;
grant execute on function public.fn_pos_shift_summary(uuid) to authenticated, service_role;

create or replace function public.fn_close_pos_shift(
  p_shift_id uuid,
  p_closing_cash_cents integer,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare
  v_shift public.pos_shifts;
  v_summary jsonb;
  v_expected_cash integer;
  v_actor uuid := auth.uid();
begin
  perform app.require_claimed_account();

  if p_closing_cash_cents is null or p_closing_cash_cents < 0 then
    raise exception 'invalid_closing_cash' using errcode = '22023';
  end if;

  select * into v_shift
  from public.pos_shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'pos_shift_not_found' using errcode = 'P0002';
  end if;

  if v_shift.status <> 'open' then
    raise exception 'pos_shift_already_closed' using errcode = '55000';
  end if;

  if not (
    v_shift.cashier_user_id = v_actor
    or app.is_org_manager(v_shift.org_id)
    or app.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  v_summary := public.fn_pos_shift_summary(p_shift_id);
  v_expected_cash := coalesce((v_summary ->> 'expected_cash_cents')::integer, v_shift.opening_cash_cents);

  update public.pos_shifts
  set status = 'closed',
      expected_cash_cents = v_expected_cash,
      closing_cash_cents = p_closing_cash_cents,
      cash_variance_cents = p_closing_cash_cents - v_expected_cash,
      closed_at = now(),
      closed_by = v_actor,
      closing_notes = nullif(btrim(coalesce(p_notes, '')), ''),
      updated_at = now()
  where id = p_shift_id
  returning * into v_shift;

  insert into public.audit_log(org_id, actor_id, table_name, record_id, action, changes)
  values (
    v_shift.org_id,
    v_actor,
    'pos_shifts',
    v_shift.id::text,
    'close',
    jsonb_build_object(
      'expected_cash_cents', v_shift.expected_cash_cents,
      'closing_cash_cents', v_shift.closing_cash_cents,
      'cash_variance_cents', v_shift.cash_variance_cents
    )
  );

  return public.fn_pos_shift_summary(p_shift_id);
end;
$$;

revoke all on function public.fn_close_pos_shift(uuid, integer, text) from public, anon;
grant execute on function public.fn_close_pos_shift(uuid, integer, text) to authenticated, service_role;

create or replace function public.fn_pos_charge_with_shift(
  p_shift_id uuid,
  p_event_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_buyer_name text default null,
  p_buyer_email text default null,
  p_buyer_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare
  v_shift public.pos_shifts;
  v_event_org uuid;
  v_result jsonb;
  v_order_id uuid;
  v_actor uuid := auth.uid();
begin
  perform app.require_claimed_account();

  select * into v_shift
  from public.pos_shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'pos_shift_not_found' using errcode = 'P0002';
  end if;

  if v_shift.status <> 'open' then
    raise exception 'pos_shift_closed' using errcode = '55000';
  end if;

  if v_shift.cashier_user_id <> v_actor then
    raise exception 'not_shift_cashier' using errcode = '42501';
  end if;

  select e.org_id into v_event_org
  from public.events e
  where e.id = p_event_id;

  if v_event_org is null then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;

  if v_event_org <> v_shift.org_id then
    raise exception 'event_not_in_shift_org' using errcode = '42501';
  end if;

  if v_shift.device_session_id is not null and exists (
    select 1 from public.device_sessions ds
    where ds.id = v_shift.device_session_id and ds.ended_at is not null
  ) then
    raise exception 'device_session_closed' using errcode = '55000';
  end if;

  v_result := public.fn_pos_charge_unchecked(
    p_event_id,
    p_items,
    p_payment_method,
    p_buyer_name,
    p_buyer_email,
    p_buyer_phone
  );

  v_order_id := (v_result ->> 'order_id')::uuid;

  update public.orders
  set pos_shift_id = v_shift.id,
      cashier_user_id = v_actor,
      device_id = coalesce(v_shift.device_id, device_id),
      device_session_id = v_shift.device_session_id
  where id = v_order_id;

  update public.payments
  set payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
    'pos_shift_id', v_shift.id,
    'cashier_user_id', v_actor,
    'device_id', v_shift.device_id,
    'device_session_id', v_shift.device_session_id
  )
  where order_id = v_order_id;

  insert into public.audit_log(org_id, actor_id, table_name, record_id, action, changes)
  values (
    v_shift.org_id,
    v_actor,
    'orders',
    v_order_id::text,
    'pos_sale',
    jsonb_build_object(
      'pos_shift_id', v_shift.id,
      'payment_method', lower(p_payment_method),
      'device_id', v_shift.device_id,
      'device_session_id', v_shift.device_session_id
    )
  );

  return v_result || jsonb_build_object(
    'pos_shift_id', v_shift.id,
    'cashier_user_id', v_actor,
    'device_id', v_shift.device_id,
    'device_session_id', v_shift.device_session_id
  );
end;
$$;

revoke all on function public.fn_pos_charge_with_shift(uuid, uuid, jsonb, text, text, text, text) from public, anon;
grant execute on function public.fn_pos_charge_with_shift(uuid, uuid, jsonb, text, text, text, text) to authenticated, service_role;

comment on table public.pos_shifts is 'Controlled cashier/outlet shift lifecycle and reconciliation for Ticketiv POS sales.';
comment on function public.fn_pos_charge_with_shift(uuid, uuid, jsonb, text, text, text, text) is 'Shift-aware POS charge that reuses the canonical inventory-protected order/payment flow and adds cashier/device attribution.';;

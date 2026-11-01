-- Platform fee: one platform-wide fee per ticket sold, taken from the
-- organizer's payout (buyers pay only the ticket price).
--
--   fee per ticket = round(price × percent_bps / 10000) + fixed_per_ticket_cents
--   · free tickets (price 0) pay nothing
--   · a ticket's fee never exceeds its price
--   · an order's fee never exceeds what the buyer paid (after discounts)
--
-- The rate lives in public.platform_fee_settings (versioned, one active row)
-- and is changed only through public.admin_set_platform_fee, called by the
-- super-admin "Pricing & fees" screen. Orders snapshot the active rate when
-- their tickets are added, so a later change never touches existing orders.
-- Settlement is unchanged: fn_complete_order_payment already writes the
-- 'fee' and 'payment_net' ledger lines from orders.platform_fee_cents and
-- orders.organizer_net_cents, and payouts are computed from payment_net.

-- ── Settings table ──────────────────────────────────────────────────────────
create table if not exists public.platform_fee_settings (
  id uuid primary key default gen_random_uuid(),
  percent_bps integer not null check (percent_bps between 0 and 10000),
  fixed_per_ticket_cents integer not null check (fixed_per_ticket_cents >= 0),
  currency text not null default 'SZL' check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  effective_from timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.platform_fee_settings is
  'Platform-wide fee per ticket sold (percent + fixed), deducted from organizer payouts. Versioned: one active row; change via admin_set_platform_fee.';

create unique index if not exists platform_fee_settings_one_active
  on public.platform_fee_settings (active)
  where active;

alter table public.platform_fee_settings enable row level security;

-- The rate is not secret: organizers see it on their pricing page.
drop policy if exists "platform_fee_settings_read" on public.platform_fee_settings;
create policy "platform_fee_settings_read"
  on public.platform_fee_settings
  for select
  to authenticated
  using (true);

revoke insert, update, delete, truncate on table public.platform_fee_settings from anon, authenticated;

-- Start at 0% + 0: nothing changes until a super admin sets a rate.
insert into public.platform_fee_settings (percent_bps, fixed_per_ticket_cents, currency, active)
select 0, 0, 'SZL', true
where not exists (select 1 from public.platform_fee_settings);

-- ── Admin writer ────────────────────────────────────────────────────────────
create or replace function public.admin_set_platform_fee(
  p_percent_bps integer,
  p_fixed_per_ticket_cents integer,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_previous public.platform_fee_settings%rowtype;
  v_new_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if p_actor_id is null then
    raise exception 'Admin actor is required';
  end if;
  if p_percent_bps is null or p_percent_bps < 0 or p_percent_bps > 10000 then
    raise exception 'Percentage must be between 0 and 10000 basis points';
  end if;
  if p_fixed_per_ticket_cents is null or p_fixed_per_ticket_cents < 0 then
    raise exception 'Fixed fee per ticket cannot be negative';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('platform_fee_settings', 0));

  select * into v_previous
  from public.platform_fee_settings
  where active is true
  order by effective_from desc, created_at desc
  limit 1
  for update;

  if v_previous.id is not null then
    update public.platform_fee_settings set active = false where id = v_previous.id;
  end if;

  insert into public.platform_fee_settings (
    percent_bps, fixed_per_ticket_cents, currency, active, effective_from, created_by
  )
  values (
    p_percent_bps, p_fixed_per_ticket_cents, coalesce(v_previous.currency, 'SZL'), true, v_now, p_actor_id
  )
  returning id into v_new_id;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (
    null,
    p_actor_id,
    'platform_fee_settings',
    v_new_id::text,
    case when v_previous.id is null then 'insert'::public.audit_action else 'update'::public.audit_action end,
    jsonb_build_object(
      'business_action', 'set_platform_fee',
      'previous_setting_id', v_previous.id,
      'new_setting_id', v_new_id,
      'effective_from', v_now,
      'previous', case when v_previous.id is null then null else jsonb_build_object(
        'percent_bps', v_previous.percent_bps,
        'fixed_per_ticket_cents', v_previous.fixed_per_ticket_cents,
        'currency', v_previous.currency
      ) end,
      'next', jsonb_build_object(
        'percent_bps', p_percent_bps,
        'fixed_per_ticket_cents', p_fixed_per_ticket_cents,
        'currency', coalesce(v_previous.currency, 'SZL'),
        'fees_paid_by', 'organizer'
      )
    )
  );

  return v_new_id;
end;
$function$;

revoke all on function public.admin_set_platform_fee(integer, integer, uuid) from public;
revoke all on function public.admin_set_platform_fee(integer, integer, uuid) from anon, authenticated;
grant execute on function public.admin_set_platform_fee(integer, integer, uuid) to service_role;

-- ── Order pricing trigger ───────────────────────────────────────────────────
-- Same shape as before, with three changes:
--   1. New orders snapshot the platform fee setting (not a per-org plan).
--   2. Snapshots from platform_fee_settings are priced per ticket.
--      Older snapshots keep the previous calculation, so existing orders
--      price exactly as they did.
--   3. Only pending orders are repriced, so paid / failed / refunded orders
--      can never pick up a different fee.
create or replace function app.recompute_order_totals()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'app'
as $function$
declare
  v_subtotal integer := 0;
  v_count integer := 0;
  v_adjustments integer := 0;
  v_snap jsonb := new.pricing_plan_snapshot;
  v_setting public.platform_fee_settings%rowtype;
  v_platform_bps integer;
  v_fixed_per_ticket integer;
  v_processor_bps integer;
  v_processor_fixed integer;
  v_min integer;
  v_max integer;
  v_payer public.fee_payer;
  v_money record;
  v_priced integer;
  v_platform integer;
  v_buyer integer;
begin
  -- Only standard ticket sales are priced by the platform-fee model.
  if new.channel is distinct from 'online'::public.sales_channel
     and new.channel is distinct from 'pos'::public.sales_channel then
    return new;
  end if;

  -- Settled orders keep the totals they were paid (or failed / refunded) on.
  if tg_op = 'UPDATE' and old.status is distinct from 'pending'::public.order_status then
    return new;
  end if;

  select coalesce(sum(tt.price_cents), 0), count(*)
    into v_subtotal, v_count
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  where oi.order_id = new.id
    and oi.revoked_at is null;

  -- Nothing to price yet (e.g. waitlist order before fulfilment): keep RPC totals.
  if v_count = 0 then
    return new;
  end if;

  select coalesce(sum(amount_cents), 0)
    into v_adjustments
  from public.order_adjustments
  where order_id = new.id;

  if v_snap is null then
    select * into v_setting
    from public.platform_fee_settings
    where active is true
    order by effective_from desc
    limit 1;

    v_snap := jsonb_build_object(
      'source', 'platform_fee_settings',
      'setting_id', v_setting.id,
      'platform_percent_bps', coalesce(v_setting.percent_bps, 0),
      'platform_fixed_per_ticket_cents', coalesce(v_setting.fixed_per_ticket_cents, 0),
      'processor_percent_bps', 0,
      'processor_fixed_cents', 0,
      'fees_paid_by', 'organizer',
      'snapshot_at', now()
    );
    new.pricing_plan_snapshot := v_snap;
    new.fees_paid_by := 'organizer'::public.fee_payer;
  end if;

  if v_snap->>'source' = 'platform_fee_settings' then
    v_platform_bps := coalesce((v_snap->>'platform_percent_bps')::integer, 0);
    v_fixed_per_ticket := coalesce((v_snap->>'platform_fixed_per_ticket_cents')::integer, 0);
    v_payer := coalesce(new.fees_paid_by, (v_snap->>'fees_paid_by')::public.fee_payer, 'organizer'::public.fee_payer);

    -- Per ticket: percent of its price plus the fixed amount, capped at the
    -- price. Free tickets pay nothing.
    select coalesce(sum(
             least(
               tt.price_cents,
               round((tt.price_cents::numeric * v_platform_bps) / 10000)::integer + v_fixed_per_ticket
             )
           ) filter (where tt.price_cents > 0), 0)
      into v_platform
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    where oi.order_id = new.id
      and oi.revoked_at is null;

    v_priced := greatest(v_subtotal + v_adjustments, 0);
    v_platform := least(v_platform, v_priced);
    v_buyer := v_priced + case when v_payer = 'buyer'::public.fee_payer then v_platform else 0 end;

    new.subtotal_cents := v_subtotal;
    new.item_count := v_count;
    new.total_cents := v_buyer;
    new.platform_fee_cents := v_platform;
    new.processor_fee_cents := 0;
    new.organizer_net_cents := v_buyer - v_platform;
    new.currency := coalesce(new.currency, 'SZL');
    new.order_price_cents := v_subtotal + v_adjustments;
    new.order_platform_fee_cents := v_platform;
    new.order_processor_fee_cents := 0;
    new.order_currency := coalesce(new.order_currency, new.currency, 'SZL');
    new.totals_computed_at := now();
    return new;
  end if;

  -- Legacy per-org plan snapshot: previous calculation, unchanged.
  v_platform_bps := coalesce((v_snap->>'platform_percent_bps')::integer, 0);
  v_processor_bps := coalesce((v_snap->>'processor_percent_bps')::integer, 0);
  v_processor_fixed := coalesce((v_snap->>'processor_fixed_cents')::integer, 0);
  v_min := (v_snap->>'min_platform_fee_cents')::integer;
  v_max := (v_snap->>'max_platform_fee_cents')::integer;
  v_payer := coalesce(new.fees_paid_by, (v_snap->>'fees_paid_by')::public.fee_payer, 'organizer'::public.fee_payer);

  select * into v_money
  from public.fn_compute_order_money(
    v_subtotal, v_adjustments, v_platform_bps, v_processor_bps, v_processor_fixed, v_min, v_max, v_payer
  );

  new.subtotal_cents := v_subtotal;
  new.item_count := v_count;
  new.total_cents := v_money.buyer_total_cents;
  new.platform_fee_cents := v_money.platform_fee_cents;
  new.processor_fee_cents := v_money.processor_fee_cents;
  new.organizer_net_cents := v_money.organizer_net_cents;
  new.currency := coalesce(new.currency, 'SZL');
  new.order_price_cents := v_subtotal + v_adjustments;
  new.order_platform_fee_cents := v_money.platform_fee_cents;
  new.order_processor_fee_cents := v_money.processor_fee_cents;
  new.order_currency := coalesce(new.order_currency, new.currency, 'SZL');
  new.totals_computed_at := now();
  return new;
end;
$function$;

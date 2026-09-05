-- TICK-333 — single transactional completion RPC + post-commit outbox.
-- Full rationale in supabase/migrations/20260725180000_transactional_payment_completion.sql

alter table public.ledger_entries drop constraint if exists ledger_entries_type_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ledger_entries'::regclass
      and conname = 'check_ledger_entries_type_allow_reversal'
  ) then
    raise exception 'check_ledger_entries_type_allow_reversal is missing; refusing to leave ledger_entries.type unconstrained';
  end if;
end $$;

create table if not exists public.payment_outbox (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  payment_id    uuid references public.payments(id) on delete set null,
  topic         text not null check (topic in ('ticket_delivery', 'payment_succeeded')),
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts      integer not null default 0,
  last_error    text,
  available_at  timestamptz not null default now(),
  locked_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists ui_payment_outbox_order_topic
  on public.payment_outbox (order_id, topic);

create index if not exists idx_payment_outbox_claimable
  on public.payment_outbox (status, available_at)
  where status in ('pending', 'processing');

alter table public.payment_outbox enable row level security;

revoke all on table public.payment_outbox from public, anon, authenticated;
grant select, insert, update on table public.payment_outbox to service_role;

drop trigger if exists trg_payment_outbox_updated_at on public.payment_outbox;
create trigger trg_payment_outbox_updated_at
  before update on public.payment_outbox
  for each row execute function public.set_updated_at();

create or replace function public.fn_complete_order_payment(
  p_order_id       uuid,
  p_provider       text,
  p_ext_payment_id text,
  p_amount_cents   integer default null,
  p_currency       text default null,
  p_payload        jsonb default '{}'::jsonb
)
returns table (
  order_id           uuid,
  payment_id         uuid,
  already_completed  boolean,
  issued_item_count  integer
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order    public.orders%rowtype;
  v_payment  public.payments%rowtype;
  v_platform integer;
  v_processor integer;
  v_gross    integer;
  v_issued   integer := 0;
begin
  if p_order_id is null then
    raise exception 'order_id_required' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_ext_payment_id), '') = '' then
    raise exception 'provider_reference_required' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if v_order.status = 'paid' then
    select * into v_payment
    from public.payments
    where payments.order_id = v_order.id and payments.status = 'succeeded'
    order by created_at desc
    limit 1;

    select count(*)::integer into v_issued
    from public.order_items where public.order_items.order_id = v_order.id and status = 'issued';

    return query select v_order.id, v_payment.id, true, v_issued;
    return;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order_not_payable_from_status_%', v_order.status using errcode = 'P0001';
  end if;

  if p_amount_cents is not null and p_amount_cents <> v_order.total_cents then
    raise exception 'amount_mismatch_expected_%_got_%', v_order.total_cents, p_amount_cents
      using errcode = 'P0001';
  end if;
  if p_currency is not null and upper(p_currency) <> upper(v_order.currency) then
    raise exception 'currency_mismatch_expected_%_got_%', v_order.currency, p_currency
      using errcode = 'P0001';
  end if;

  insert into public.payments (order_id, provider, amount_cents, currency, ext_payment_id, payload, status, channel)
  values (
    v_order.id, p_provider, v_order.total_cents, v_order.currency,
    p_ext_payment_id, coalesce(p_payload, '{}'::jsonb), 'succeeded', 'online'
  )
  on conflict (provider, ext_payment_id) where ext_payment_id is not null
  do update set status = 'succeeded', payload = excluded.payload
  returning * into v_payment;

  if v_payment.order_id <> v_order.id then
    raise exception 'payment_reference_belongs_to_order_%', v_payment.order_id using errcode = 'P0001';
  end if;

  update public.payment_attempts
  set status = 'succeeded', payment_id = v_payment.id
  where public.payment_attempts.order_id = v_order.id
    and provider = p_provider
    and status = 'pending';

  if not exists (select 1 from public.ledger_entries where payment_id = v_payment.id) then
    v_gross     := v_order.total_cents;
    v_platform  := coalesce(v_order.platform_fee_cents, 0);
    v_processor := coalesce(v_order.processor_fee_cents, 0);

    insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
    values (v_order.org_id, v_order.id, v_payment.id, 'order_gross', v_gross, v_order.currency,
            jsonb_build_object('source', 'payment_completion'));

    if v_platform > 0 then
      insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
      values (v_order.org_id, v_order.id, v_payment.id, 'fee', -v_platform, v_order.currency,
              jsonb_build_object('fee_type', 'platform'));
    end if;

    if v_processor > 0 then
      insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
      values (v_order.org_id, v_order.id, v_payment.id, 'fee', -v_processor, v_order.currency,
              jsonb_build_object('fee_type', 'processor'));
    end if;

    insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
    values (v_order.org_id, v_order.id, v_payment.id, 'payment_net',
            v_gross - v_platform - v_processor, v_order.currency,
            jsonb_build_object('source', 'payment_completion'));
  end if;

  update public.order_items set status = 'issued'
  where public.order_items.order_id = v_order.id and status = 'pending';
  get diagnostics v_issued = row_count;

  update public.orders set status = 'paid' where id = v_order.id;

  if v_order.buyer_id is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (
      v_order.buyer_id, 'payment_succeeded',
      jsonb_build_object('orderId', v_order.id, 'paymentId', v_payment.id,
                         'amountCents', v_order.total_cents, 'currency', v_order.currency),
      'pending', 'in_app', 'payment_succeeded:' || v_payment.id::text
    )
    on conflict do nothing;
  end if;

  insert into public.payment_outbox (order_id, payment_id, topic, payload)
  values
    (v_order.id, v_payment.id, 'ticket_delivery',
     jsonb_build_object('orderId', v_order.id)),
    (v_order.id, v_payment.id, 'payment_succeeded',
     jsonb_build_object('orderId', v_order.id, 'paymentId', v_payment.id, 'orgId', v_order.org_id,
                        'buyerId', v_order.buyer_id, 'amountCents', v_order.total_cents,
                        'currency', v_order.currency))
  on conflict (order_id, topic) do nothing;

  return query select v_order.id, v_payment.id, false, v_issued;
end;
$function$;

revoke execute on function public.fn_complete_order_payment(uuid, text, text, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_complete_order_payment(uuid, text, text, integer, text, jsonb)
  to service_role;

create or replace function public.fn_claim_payment_outbox(p_limit integer default 20)
returns setof public.payment_outbox
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return query
  with claimed as (
    select id from public.payment_outbox
    where status in ('pending', 'processing')
      and available_at <= now()
      and attempts < 8
    order by available_at
    limit greatest(coalesce(p_limit, 20), 1)
    for update skip locked
  )
  update public.payment_outbox o
  set status = 'processing', attempts = o.attempts + 1, locked_at = now()
  from claimed
  where o.id = claimed.id
  returning o.*;
end;
$function$;

revoke execute on function public.fn_claim_payment_outbox(integer) from public, anon, authenticated;
grant execute on function public.fn_claim_payment_outbox(integer) to service_role;

create or replace function public.fn_resolve_payment_outbox(
  p_id    uuid,
  p_ok    boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_attempts integer;
begin
  if p_ok then
    update public.payment_outbox
    set status = 'done', last_error = null, locked_at = null
    where id = p_id;
    return;
  end if;

  select attempts into v_attempts from public.payment_outbox where id = p_id;
  if not found then return; end if;

  update public.payment_outbox
  set status = case when v_attempts >= 8 then 'failed' else 'pending' end,
      last_error = left(coalesce(p_error, 'unknown error'), 2000),
      available_at = now() + least(power(2, greatest(v_attempts, 1))::integer, 64) * interval '1 minute',
      locked_at = null
  where id = p_id;
end;
$function$;

revoke execute on function public.fn_resolve_payment_outbox(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.fn_resolve_payment_outbox(uuid, boolean, text) to service_role;;

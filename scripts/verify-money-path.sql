-- Money-path verification through the real transactional completion RPC.
-- Runs against an existing active pricing plan and rolls every write back.
-- Requires psql because the four fixture IDs use \set / \gset variables.
--
-- Usage:
--   \set org          'organization UUID'
--   \set buyer        'buyer auth user UUID'
--   \set pricing_plan 'active pricing plan UUID for the organization'
--   \set ticket_type  'ticket type UUID belonging to the organization'
--   \i scripts/verify-money-path.sql

\set ON_ERROR_STOP on

begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

create temporary table tick_money_path_context (
  org_id uuid not null,
  buyer_id uuid not null,
  pricing_plan_id uuid not null,
  ticket_type_id uuid not null,
  order_id uuid not null,
  provider_reference text not null,
  currency text not null,
  ticket_price_cents integer not null
) on commit drop;

insert into tick_money_path_context
select
  :'org'::uuid,
  :'buyer'::uuid,
  :'pricing_plan'::uuid,
  :'ticket_type'::uuid,
  gen_random_uuid(),
  'VERIFY-' || upper(substr(md5(random()::text), 1, 12)),
  pp.currency,
  tt.price_cents
from public.pricing_plans pp
join public.events e on e.org_id = pp.org_id
join public.ticket_types tt on tt.event_id = e.id
where pp.id = :'pricing_plan'::uuid
  and pp.org_id = :'org'::uuid
  and pp.active
  and tt.id = :'ticket_type'::uuid
  and tt.currency = pp.currency;

do $$
#variable_conflict use_column
declare
  c tick_money_path_context%rowtype;
  first_result record;
  replay_result record;
  priced record;
  gross integer;
  fee integer;
  net integer;
begin
  select * into strict c from tick_money_path_context;

  insert into public.orders(
    id, org_id, buyer_id, currency, order_currency, status, channel,
    item_count, pricing_plan_id, subtotal_cents, total_cents
  ) values (
    c.order_id, c.org_id, c.buyer_id, c.currency, c.currency, 'pending',
    'online', 1, c.pricing_plan_id, c.ticket_price_cents, c.ticket_price_cents
  );

  insert into public.order_items(order_id, ticket_type_id, ticket_code, status)
  values (c.order_id, c.ticket_type_id, c.provider_reference, 'pending');

  insert into public.payment_attempts(order_id, provider, attempt_no, status, ext_ref)
  values (c.order_id, 'paystack', 1, 'pending', c.provider_reference);

  select o.total_cents, o.platform_fee_cents, o.processor_fee_cents,
         o.organizer_net_cents
    into priced
  from public.orders o where o.id = c.order_id;

  if exists (select 1 from public.ledger_entries le where le.order_id = c.order_id) then
    raise exception 'FAIL ledger rows exist before payment';
  end if;

  select * into first_result from public.fn_complete_order_payment(
    c.order_id, 'paystack', c.provider_reference, priced.total_cents,
    c.currency, jsonb_build_object('verification', 'money-path')
  );

  select
    coalesce(sum(le.amount_cents) filter (where le.type = 'order_gross'), 0),
    coalesce(sum(le.amount_cents) filter (where le.type = 'fee'), 0),
    coalesce(sum(le.amount_cents) filter (where le.type = 'payment_net'), 0)
  into gross, fee, net
  from public.ledger_entries le
  where le.payment_id = first_result.completed_payment_id;

  if first_result.already_completed
     or (select o.status from public.orders o where o.id = c.order_id) <> 'paid'
     or exists (select 1 from public.order_items oi
                where oi.order_id = c.order_id and oi.status <> 'issued')
     or gross <> priced.total_cents
     or fee <> -priced.platform_fee_cents
     or net <> priced.organizer_net_cents
     or gross + fee <> net then
    raise exception 'FAIL completion gross %, fee %, net %, pricing %',
      gross, fee, net, row_to_json(priced);
  end if;

  if (select count(*) from public.ledger_entries le
      where le.payment_id = first_result.completed_payment_id)
       <> case when priced.platform_fee_cents > 0 then 3 else 2 end then
    raise exception 'FAIL unexpected settlement row count';
  end if;

  if exists (
    select 1 from public.ledger_entries le
    where le.payment_id = first_result.completed_payment_id
      and le.meta ->> 'fee_type' = 'processor'
  ) then
    raise exception 'FAIL processor cost was deducted from organizer net';
  end if;

  select * into replay_result from public.fn_complete_order_payment(
    c.order_id, 'paystack', c.provider_reference, priced.total_cents,
    c.currency, jsonb_build_object('verification', 'money-path replay')
  );

  if not replay_result.already_completed
     or replay_result.completed_payment_id <> first_result.completed_payment_id
     or (select count(*) from public.payments p where p.order_id = c.order_id) <> 1
     or (select count(*) from public.payment_outbox ob
         where ob.order_id = c.order_id and ob.topic = 'ticket_delivery') <> 1 then
    raise exception 'FAIL idempotent replay';
  end if;

  raise notice 'Money-path verification: PASS (gross %, platform fee %, processor cost %, organizer net %)',
    gross, -fee, priced.processor_fee_cents, net;
end $$;

rollback;

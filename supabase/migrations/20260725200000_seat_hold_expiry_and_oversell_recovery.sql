-- TICK-344 — seat-hold expiry, cleanup and oversell recovery.
--
-- ============================================================================
-- How inventory actually works here (established before changing anything)
-- ============================================================================
--
-- The oversell guard is fn_create_inventory_protected_order. It locks the
-- ticket_types rows FOR UPDATE in id order (so concurrent checkouts serialise
-- and cannot deadlock against each other), then counts as reserved:
--
--   order_items in ('pending','issued','transferred','checked_in')
--   joined to orders that are either 'paid', or 'pending' and still inside
--   their hold window (hold_expires_at is null or > now())
--
-- and refuses when reserved + requested > quota. That is correct, and this
-- migration deliberately does not touch it.
--
-- Two consequences worth stating, because they shape everything below:
--
--   1. The reservation unit is a pending ORDER with hold_expires_at. It is not
--      public.seat_holds, which no availability path reads.
--   2. Inventory is released by the passage of time, not by a cleanup job. The
--      moment hold_expires_at passes, that order stops counting against quota
--      because the predicate is evaluated at query time.
--
-- So a sweeper is hygiene, not inventory recovery. That matters: it means the
-- sweeper can afford to be conservative and slow, because nothing is waiting
-- on it to free capacity.
--
-- ============================================================================
-- What was wrong
-- ============================================================================
--
-- 1. fn_ticket_type_remaining -- the number buyers actually see, on the public
--    event page, the checkout page and the ticket-types API -- counted only
--    'issued'/'checked_in' items on PAID orders. It ignored live holds
--    entirely. With 10 in quota and 8 held in live checkouts it reported 10
--    remaining, and the 9th buyer was refused at checkout with 'sold_out'
--    having been told the tickets were available. The displayed number and the
--    guard disagreed.
--
-- 2. Nothing ever expired the bookkeeping. Pending orders past their hold
--    window stayed 'pending' forever with their items 'pending', so every
--    "my orders" view, finance report and reconciliation pass had to carry
--    abandoned checkouts indefinitely. seat_holds rows likewise accumulated --
--    the 25 July cleanup removed 67 stale ones by hand.
--
-- 3. No oversell detection. Oversell cannot arise from concurrent checkout,
--    but it can from an organiser lowering quota below what is already sold,
--    and nothing would have noticed.

-- ============================================================================
-- 1. Make displayed availability agree with the checkout guard
-- ============================================================================

create or replace function public.fn_ticket_type_remaining(p_event_id uuid)
returns table(ticket_type_id uuid, remaining integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  -- The reserved predicate below is intentionally identical to the one in
  -- fn_create_inventory_protected_order. If the two ever diverge again, buyers
  -- get told a number that checkout will not honour. Change both together.
  select
    tt.id,
    greatest(0, tt.quota - coalesce(reserved.cnt, 0))::integer
  from public.ticket_types tt
  left join lateral (
    select count(*)::integer as cnt
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = tt.id
      and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
      and (
        o.status = 'paid'
        or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now()))
      )
  ) reserved on true
  where tt.event_id = p_event_id;
$function$;

revoke execute on function public.fn_ticket_type_remaining(uuid) from public;
grant execute on function public.fn_ticket_type_remaining(uuid) to anon, authenticated, service_role;

-- ============================================================================
-- 2. Expire abandoned checkouts
-- ============================================================================

-- Grace period. An order stops holding inventory the instant hold_expires_at
-- passes, so waiting costs nothing -- and it removes the sharp edge where a
-- buyer completing payment at the last second races the sweeper. If we marked
-- the order 'failed' microseconds before a verified payment arrived, the
-- completion RPC would refuse it (order_not_payable_from_status_failed) and
-- the buyer would have paid for nothing.
--
-- Orders carrying a real payment are skipped outright regardless of grace.
create or replace function public.fn_expire_stale_checkout_holds(
  p_grace interval default interval '15 minutes',
  p_limit integer default 500
)
returns table (expired_orders integer, revoked_items integer, deleted_seat_holds integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_orders integer := 0;
  v_items  integer := 0;
  v_holds  integer := 0;
begin
  with candidates as (
    select o.id
    from public.orders o
    where o.status = 'pending'
      and o.hold_expires_at is not null
      and o.hold_expires_at < now() - coalesce(p_grace, interval '15 minutes')
      -- Never touch an order that has money against it. Note payments.status
      -- uses the 4-value payments_status enum (succeeded|failed|pending|
      -- refunded), NOT the richer 8-value payment_status type that also exists
      -- in this database -- 'authorized' is not a legal value here.
      and not exists (
        select 1 from public.payments p
        where p.order_id = o.id and p.status in ('succeeded', 'pending')
      )
    order by o.hold_expires_at
    limit greatest(coalesce(p_limit, 500), 1)
    for update skip locked
  ),
  revoked as (
    update public.order_items oi
    set status = 'revoked'
    where oi.order_id in (select id from candidates)
      and oi.status = 'pending'
    returning 1
  ),
  closed as (
    update public.orders o
    set status = 'failed'
    where o.id in (select id from candidates)
    returning 1
  )
  select (select count(*) from closed), (select count(*) from revoked)
  into v_orders, v_items;

  -- seat_holds is a soft UX reservation that no availability path reads.
  -- Prune expired rows so the table does not grow without bound.
  with pruned as (
    delete from public.seat_holds sh
    where sh.expires_at < now() - interval '1 day'
    returning 1
  )
  select count(*) into v_holds from pruned;

  return query select v_orders, v_items, v_holds;
end;
$function$;

revoke execute on function public.fn_expire_stale_checkout_holds(interval, integer)
  from public, anon, authenticated;
grant execute on function public.fn_expire_stale_checkout_holds(interval, integer) to service_role;

-- ============================================================================
-- 3. Oversell detection
-- ============================================================================

-- Concurrent checkout cannot oversell -- the FOR UPDATE lock prevents it. What
-- can is an organiser lowering quota below what is already committed. This
-- reports it rather than trying to auto-correct: once tickets are sold, the
-- resolution is commercial (honour them, or refund some), not something a
-- migration should decide.
create or replace function public.fn_detect_oversold_ticket_types()
returns table (
  ticket_type_id   uuid,
  event_id         uuid,
  ticket_type_name text,
  quota            integer,
  committed        integer,
  oversold_by      integer
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select tt.id, tt.event_id, tt.name, tt.quota, committed.cnt,
         (committed.cnt - tt.quota)::integer
  from public.ticket_types tt
  join lateral (
    select count(*)::integer as cnt
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = tt.id
      and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
      and (
        o.status = 'paid'
        or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now()))
      )
  ) committed on true
  where tt.quota is not null
    and tt.quota >= 0
    and committed.cnt > tt.quota;
$function$;

revoke execute on function public.fn_detect_oversold_ticket_types() from public, anon, authenticated;
grant execute on function public.fn_detect_oversold_ticket_types() to service_role;

-- ============================================================================
-- 4. Schedule the sweeper
-- ============================================================================

-- Every 5 minutes. Nothing waits on this for capacity, so the cadence only
-- controls how quickly abandoned checkouts stop showing as pending.
select cron.unschedule('expire-stale-checkout-holds')
where exists (select 1 from cron.job where jobname = 'expire-stale-checkout-holds');

select cron.schedule(
  'expire-stale-checkout-holds',
  '*/5 * * * *',
  $cron$select public.fn_expire_stale_checkout_holds();$cron$
);

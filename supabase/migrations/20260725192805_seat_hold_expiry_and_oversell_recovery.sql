-- TICK-344 — full rationale in
-- supabase/migrations/20260725200000_seat_hold_expiry_and_oversell_recovery.sql

create or replace function public.fn_ticket_type_remaining(p_event_id uuid)
returns table(ticket_type_id uuid, remaining integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
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
      and not exists (
        select 1 from public.payments p
        where p.order_id = o.id and p.status in ('succeeded', 'authorized')
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

select cron.unschedule('expire-stale-checkout-holds')
where exists (select 1 from cron.job where jobname = 'expire-stale-checkout-holds');

select cron.schedule(
  'expire-stale-checkout-holds',
  '*/5 * * * *',
  $cron$select public.fn_expire_stale_checkout_holds();$cron$
);;

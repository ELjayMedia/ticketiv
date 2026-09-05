create or replace function public.fn_ticket_type_remaining(p_event_id uuid)
returns table (ticket_type_id uuid, remaining integer)
language sql
security definer
stable
set search_path = public
as $fn$
  select
    tt.id,
    greatest(0, tt.quota - coalesce(sold.cnt, 0))::integer
  from public.ticket_types tt
  left join lateral (
    select count(*)::integer as cnt
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = tt.id
      and oi.status in ('issued', 'checked_in')
      and o.status = 'paid'
  ) sold on true
  where tt.event_id = p_event_id;
$fn$;;

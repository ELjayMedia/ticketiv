create or replace function app.ticket_order_context(p_order_item_id uuid)
returns table (
  order_id uuid,
  buyer_id uuid,
  order_status public.order_status,
  ordered_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.buyer_id, o.status, o.created_at
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = p_order_item_id
    and (
      oi.current_owner_id = (select auth.uid())
      or (oi.current_owner_id is null and o.buyer_id = (select auth.uid()))
    );
$$;

revoke all on function app.ticket_order_context(uuid) from public;
grant execute on function app.ticket_order_context(uuid) to authenticated;

alter policy orders_select on public.orders
using (
  buyer_id = app.uid()
  or app.is_org_manager(org_id)
);

drop function if exists app.current_user_owns_order_item(uuid);

create or replace view public.v_my_tickets
with (security_invoker = true)
as
select
  o.order_id,
  o.buyer_id,
  o.order_status,
  o.ordered_at,
  oi.id as order_item_id,
  oi.ticket_code,
  oi.checked_in_at,
  oi.revoked_at,
  tt.id as ticket_type_id,
  tt.name as ticket_type_name,
  tt.price_cents,
  tt.currency,
  e.id as event_id,
  e.title as event_title,
  e.slug as event_slug,
  e.city,
  e.cover_image_url,
  v.name as venue_name,
  v.address as venue_address,
  coalesce(nextd.starts_at, lastd.starts_at) as event_starts_at,
  oi.status as order_item_status,
  oi.refunded_at,
  oi.transferred_from_order_item_id,
  oi.current_owner_id
from public.order_items oi
join lateral app.ticket_order_context(oi.id) o on true
join public.ticket_types tt on tt.id = oi.ticket_type_id
join public.events e on e.id = tt.event_id
left join public.venues v on v.id = e.venue_id
left join lateral (
  select d.starts_at
  from public.event_dates d
  where d.event_id = e.id and d.starts_at >= now()
  order by d.starts_at
  limit 1
) nextd on true
left join lateral (
  select d.starts_at
  from public.event_dates d
  where d.event_id = e.id and d.starts_at < now()
  order by d.starts_at desc
  limit 1
) lastd on true
where oi.current_owner_id = (select auth.uid())
   or (oi.current_owner_id is null and o.buyer_id = (select auth.uid()));

revoke all on public.v_my_tickets from anon, authenticated;
grant select on public.v_my_tickets to anon, authenticated;

comment on function app.ticket_order_context(uuid) is
  'Ticket-scoped order metadata for My Tickets. Returns only when auth.uid() owns the supplied order_item (or is the legacy buyer when current_owner_id is null), avoiding broader orders-table access for transferred recipients.';

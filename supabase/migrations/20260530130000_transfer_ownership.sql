-- Transfer ownership: add current_owner_id to order_items, create
-- fn_complete_transfer RPC, extend order_items RLS and v_my_tickets so
-- that tickets received via a direct transfer are visible to the new owner.

begin;

-- 1. Track the current owner of a ticket separately from the original order buyer.
--    NULL means the original order buyer still holds the ticket.
alter table public.order_items
  add column if not exists current_owner_id uuid references auth.users(id);

-- 2. Atomic transfer-completion RPC (SECURITY DEFINER so it can update both
--    transfers and order_items regardless of the caller's row-level permissions).
create or replace function public.fn_complete_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer  public.transfers;
  v_actor_id  uuid := (select auth.uid());
begin
  -- Lock the transfer row to prevent concurrent completions.
  select * into v_transfer
  from public.transfers
  where id = p_transfer_id
  for update;

  if not found then
    raise exception 'transfer_not_found';
  end if;

  if v_transfer.to_user_id != v_actor_id then
    raise exception 'transfer_unauthorized';
  end if;

  if v_transfer.status not in ('pending', 'accepted') then
    raise exception 'transfer_invalid_state';
  end if;

  if not exists (
    select 1 from public.order_items
    where id = v_transfer.order_item_id
      and status in ('issued', 'transferred')
  ) then
    raise exception 'ticket_not_transferable';
  end if;

  update public.transfers
  set status = 'completed', updated_at = now()
  where id = p_transfer_id
  returning * into v_transfer;

  update public.order_items
  set current_owner_id = v_transfer.to_user_id,
      status           = 'transferred',
      updated_at       = now()
  where id = v_transfer.order_item_id;

  return jsonb_build_object(
    'transfer_id',   v_transfer.id,
    'order_item_id', v_transfer.order_item_id,
    'new_owner_id',  v_transfer.to_user_id
  );
end;
$$;

-- 3. Extend the order_items SELECT policy so new owners can read their tickets.
drop policy if exists order_items_select_consolidated_authenticated on public.order_items;
create policy order_items_select_consolidated_authenticated on public.order_items
for select to authenticated
using (
  (exists (
    select 1 from orders o
    where o.id = order_items.order_id
      and app.is_org_member_roles(o.org_id, variadic array['organizer_admin'::text, 'organizer_staff'::text])
  ))
  or (exists (
    select 1
    from (ticket_types tt join events e on e.id = tt.event_id)
    where tt.id = order_items.ticket_type_id
      and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role, 'scanner'::app_role])
  ))
  or (
    app.role_in_event_staff(
      (select ticket_types.event_id from ticket_types where ticket_types.id = order_items.ticket_type_id),
      app.current_user_id(),
      null::text[]
    )
    or (exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and (o.buyer_id = app.current_user_id() or app.role_in_membership(o.org_id, app.current_user_id(), null::text[]))
    ))
  )
  or order_items.current_owner_id = (select auth.uid())
);

-- 4. Rebuild v_my_tickets as SECURITY DEFINER so it can read orders belonging
--    to the original buyer even when the caller is the transfer recipient.
--    The WHERE clause enforces caller-scoped visibility.
--    Column list is backward-compatible (new current_owner_id appended at end).
create or replace view public.v_my_tickets as
select
  o.id                              as order_id,
  o.buyer_id,
  o.status                          as order_status,
  o.created_at                      as ordered_at,
  oi.id                             as order_item_id,
  oi.ticket_code,
  oi.checked_in_at,
  oi.revoked_at,
  tt.id                             as ticket_type_id,
  tt.name                           as ticket_type_name,
  tt.price_cents,
  tt.currency,
  e.id                              as event_id,
  e.title                           as event_title,
  e.slug                            as event_slug,
  e.city,
  e.cover_image_url,
  v.name                            as venue_name,
  v.address                         as venue_address,
  coalesce(nextd.starts_at, lastd.starts_at) as event_starts_at,
  oi.status                         as order_item_status,
  oi.refunded_at,
  oi.transferred_from_order_item_id,
  oi.current_owner_id
from public.order_items oi
join public.orders o on o.id = oi.order_id
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
where o.buyer_id            = (select auth.uid())
   or oi.current_owner_id   = (select auth.uid());

-- Grant read access consistent with prior view grants.
grant select on public.v_my_tickets to authenticated;
grant select on public.v_my_tickets to anon;

commit;

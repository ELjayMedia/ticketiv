-- C2: Composite view powering the "Salman sent you a ticket" card on
-- My tickets, the notifications worker, and any future inbound-transfer
-- surface. Always filters to status='pending' and the current viewer.

create or replace view public.v_inbound_transfers
with (security_invoker = true)
as
  select
    t.id                                   as transfer_id,
    t.order_item_id,
    t.from_user_id,
    t.to_user_id,
    t.status,
    t.created_at                           as offered_at,
    t.updated_at,
    (t.created_at + interval '24 hours')   as expires_at,
    -- sender display info
    coalesce(fp.display_name, nullif(trim(coalesce(fp.name,'') || ' ' || coalesce(fp.surname,'')), ''), 'Friend') as from_name,
    fh.handle                              as from_handle,
    -- event + ticket info via order_items
    oi.ticket_code,
    oi.ticket_type_id,
    tt.name                                as ticket_type_name,
    tt.price_cents,
    tt.currency,
    e.id                                   as event_id,
    e.title                                as event_title,
    e.starts_at                            as event_starts_at,
    e.cover_image_url,
    v.name                                 as venue_name
  from public.transfers t
  join public.order_items oi on oi.id = t.order_item_id
  left join public.ticket_types tt on tt.id = oi.ticket_type_id
  left join public.orders o on o.id = oi.order_id
  left join public.events e on e.id = o.org_id is null and false or e.id = (
    select event_id from public.ticket_types where id = oi.ticket_type_id
  )
  left join public.venues v on v.id = e.venue_id
  left join public.profiles fp on fp.user_id = t.from_user_id
  left join public.user_handles fh on fh.user_id = t.from_user_id
  where t.status = 'pending'
    and t.to_user_id = auth.uid();

comment on view public.v_inbound_transfers is
  'Pending transfers offered to the current user, with sender + event context. RLS via security_invoker honors transfers/order_items policies.';

grant select on public.v_inbound_transfers to authenticated;
;

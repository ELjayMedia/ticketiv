-- TICK-40: make fn_issue_guestlist the working "approved backend function"
-- for complimentary ticket issuing.
--
-- The previous version was broken: it inserted order_items without a
-- ticket_code (NOT NULL, no default) and called fn_mint_tickets(order_id)
-- (a stub, and the wrong argument shape), so it could never succeed. The
-- live fulfil path was a hand-rolled API route instead.
--
-- This version:
--   * authorizes active event_staff OR org admins OR global admins;
--   * enforces the remaining allocation (duplicate-fulfillment guard);
--   * resolves the buyer to the guest's own auth account by email when one
--     exists, so the complimentary ticket lands in the guest's My Tickets
--     (falls back to the entry creator);
--   * issues order_items with generated ticket codes (status 'issued');
--   * records one guestlist_fulfillments row per ticket (so the fulfilled
--     count the UI reads matches the number of tickets);
--   * writes an audit_log row.
-- Returns jsonb so the API route can surface counts.

begin;

-- The prior version returned uuid; this one returns jsonb, so drop first.
drop function if exists public.fn_issue_guestlist(uuid, integer);

create or replace function public.fn_issue_guestlist(p_guestlist_entry_id uuid, p_allocate integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_entry public.guestlist_entries%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_tt public.ticket_types%ROWTYPE;
  v_user uuid := (select auth.uid());
  v_fulfilled integer;
  v_remaining integer;
  v_qty integer;
  v_buyer uuid;
  v_order_id uuid;
  v_currency text;
begin
  select * into v_entry from public.guestlist_entries where id = p_guestlist_entry_id;
  if v_entry.id is null then
    raise exception 'guestlist_entry_not_found' using errcode = 'P0001';
  end if;

  select * into v_event from public.events where id = v_entry.event_id;
  if v_event.id is null then
    raise exception 'event_not_found' using errcode = 'P0001';
  end if;

  -- Authorize: active event staff, org admin, or global admin.
  if not (
    exists (
      select 1 from public.event_staff es
      where es.event_id = v_entry.event_id and es.user_id = v_user and es.active = true
    )
    or public.is_org_admin(v_event.org_id)
    or public.is_global_admin(v_user)
  ) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if v_entry.ticket_type_id is null then
    raise exception 'no_ticket_type' using errcode = 'P0001';
  end if;

  select * into v_tt from public.ticket_types where id = v_entry.ticket_type_id and event_id = v_entry.event_id;
  if v_tt.id is null then
    raise exception 'ticket_type_not_found' using errcode = 'P0001';
  end if;

  -- Remaining allocation guard.
  select count(*)::integer into v_fulfilled
  from public.guestlist_fulfillments gf
  join public.order_items oi on oi.order_id = gf.order_id
  where gf.guestlist_entry_id = v_entry.id;

  v_remaining := greatest(0, v_entry.allocation - v_fulfilled);
  if v_remaining <= 0 then
    raise exception 'already_fulfilled' using errcode = 'P0001';
  end if;

  v_qty := least(coalesce(nullif(p_allocate, 0), v_remaining), v_remaining);
  if v_qty <= 0 then
    raise exception 'invalid_quantity' using errcode = 'P0001';
  end if;

  -- Prefer the guest's own account (so the comp ticket shows in their My
  -- Tickets), then the entry creator, then the acting staff member.
  if v_entry.email is not null then
    select id into v_buyer from auth.users where lower(email) = lower(v_entry.email) limit 1;
  end if;
  v_buyer := coalesce(v_buyer, v_entry.created_by, v_user);
  if v_buyer is null then
    raise exception 'no_buyer' using errcode = 'P0001';
  end if;

  v_currency := coalesce(v_tt.currency, v_event.currency, 'SZL');

  -- Complimentary order: zero value, already paid.
  insert into public.orders (
    org_id, buyer_id, total_cents, subtotal_cents, item_count,
    currency, status, channel, email, phone, buyer_email
  ) values (
    v_event.org_id, v_buyer, 0, 0, v_qty,
    v_currency, 'paid', 'online', v_entry.email, v_entry.phone, v_entry.email
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, ticket_type_id, ticket_code, status, name, holder_name, holder_email, holder_phone
  )
  select
    v_order_id, v_tt.id, gen_random_uuid()::text, 'issued', v_tt.name,
    v_entry.full_name, v_entry.email, v_entry.phone
  from generate_series(1, v_qty);

  insert into public.guestlist_fulfillments (guestlist_entry_id, order_id)
  select v_entry.id, v_order_id from generate_series(1, v_qty);

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (
    v_event.org_id, v_user, 'guestlist_fulfillments', v_entry.id::text, 'insert',
    jsonb_build_object(
      'event_id', v_entry.event_id,
      'guestlist_entry_id', v_entry.id,
      'order_id', v_order_id,
      'ticket_type_id', v_tt.id,
      'quantity', v_qty,
      'buyer_id', v_buyer,
      'holder_name', v_entry.full_name
    )
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'quantity', v_qty,
    'fulfilled_count', v_fulfilled + v_qty,
    'remaining_count', v_remaining - v_qty
  );
end;
$function$;

revoke execute on function public.fn_issue_guestlist(uuid, integer) from public, anon;
grant execute on function public.fn_issue_guestlist(uuid, integer) to authenticated;

commit;

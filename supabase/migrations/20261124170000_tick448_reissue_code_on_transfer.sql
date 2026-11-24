-- TICK-448 / TICK-393 — a transferred or resold ticket gets a new code.
--
-- Scanners admit by ticket_code alone (app.fn_check_in). Transfers and paid
-- resales kept the same code, so the previous owner's screenshot, email or PDF
-- of the QR still worked: whoever reached the gate first got in. Completing a
-- transfer or a resale now issues a fresh code (an upper-case UUID, the format production
-- already uses; app.gen_ticket_code relies on base32, which Postgres 17 lacks); the new
-- owner's ticket shows it, the old one is refused as unknown.
--
-- Also:
-- - resale completion sets current_owner_id to the buyer (it was left on the
--   seller);
-- - resale_listing_sold (the seller's "your ticket sold" notice) is allowed by
--   the notification constraint; that insert is not error-swallowed, so every
--   paid resale completion failed;
-- - changes to events.resale_cap_bps are written to audit_log.
--
-- Function bodies are the live definitions with only the marked lines added.
-- Rollback: re-apply the three functions from 20260905000000_production_baseline.sql
-- and drop trigger events_audit_resale_cap.

CREATE OR REPLACE FUNCTION public.fn_complete_resale_after_payment(p_listing_id uuid, p_payment_id uuid)
 RETURNS TABLE(listing_id uuid, transfer_id uuid, buyer_order_id uuid, buyer_order_item_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_buyer_id uuid := auth.uid();
  v_listing public.resale_listings%rowtype;
  v_source_item public.order_items%rowtype;
  v_payment public.payments%rowtype;
  v_buyer_order public.orders%rowtype;
  v_transfer_id uuid;
  v_new_item_id uuid;
begin
  if v_buyer_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_listing
  from public.resale_listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'listing is not active' using errcode = 'P0001';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status <> 'succeeded' then
    raise exception 'payment has not succeeded' using errcode = 'P0001';
  end if;

  if v_payment.payload ->> 'kind' is distinct from 'resale_checkout'
     or (v_payment.payload ->> 'listing_id')::uuid is distinct from v_listing.id then
    raise exception 'payment is not linked to this resale listing' using errcode = 'P0001';
  end if;

  select * into v_buyer_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if not found then
    raise exception 'buyer order not found' using errcode = 'P0002';
  end if;

  if v_buyer_order.buyer_id <> v_buyer_id then
    raise exception 'payment order does not belong to buyer' using errcode = 'P0001';
  end if;

  select * into v_source_item
  from public.order_items
  where id = v_listing.order_item_id
  for update;

  if not found then
    raise exception 'source ticket not found' using errcode = 'P0002';
  end if;

  if v_source_item.status <> 'issued' then
    raise exception 'source ticket is not eligible for transfer' using errcode = 'P0001';
  end if;

  if v_source_item.checked_in_at is not null or v_source_item.revoked_at is not null or v_source_item.refunded_at is not null then
    raise exception 'source ticket is no longer eligible for transfer' using errcode = 'P0001';
  end if;

  insert into public.transfers (
    order_item_id,
    from_user_id,
    to_user_id,
    status,
    metadata
  ) values (
    v_source_item.id,
    v_listing.seller_id,
    v_buyer_id,
    'completed',
    jsonb_build_object('kind', 'paid_resale', 'listing_id', v_listing.id, 'payment_id', v_payment.id)
  ) returning id into v_transfer_id;

  -- Transfer ownership by moving the ticket into a buyer-owned reseller order.
  -- TICK-448: issue a fresh ticket_code so the seller's copy of the QR stops
  -- working at the gate; the buyer's ticket shows the new code.
  update public.order_items
  set order_id = v_buyer_order.id,
      ticket_code = upper(gen_random_uuid()::text),
      current_owner_id = v_buyer_id,
      status = 'issued',
      transferred_from_order_item_id = v_source_item.id,
      updated_at = now()
  where id = v_source_item.id
  returning id into v_new_item_id;

  update public.orders
  set status = 'paid'
  where id = v_buyer_order.id;

  update public.payment_attempts
  set status = 'succeeded'
  where payment_id = v_payment.id;

  update public.resale_listings
  set status = 'sold',
      transfer_id = v_transfer_id,
      updated_at = now()
  where id = v_listing.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values
    (v_buyer_id, 'resale_purchase_completed', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_purchase_completed:' || v_listing.id::text || ':' || v_buyer_id::text),
    (v_listing.seller_id, 'resale_listing_sold', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_listing_sold:' || v_listing.id::text || ':' || v_listing.seller_id::text)
  on conflict do nothing;

  return query select v_listing.id, v_transfer_id, v_buyer_order.id, v_new_item_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_complete_resale_after_payment_webhook(p_payment_id uuid)
 RETURNS TABLE(listing_id uuid, transfer_id uuid, buyer_order_id uuid, buyer_order_item_id uuid, already_completed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payment public.payments%rowtype;
  v_listing public.resale_listings%rowtype;
  v_listing_id uuid;
  v_buyer_id uuid;
  v_source_item public.order_items%rowtype;
  v_buyer_order public.orders%rowtype;
  v_transfer_id uuid;
  v_new_item_id uuid;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'payment not found' using errcode = 'P0002'; end if;
  if v_payment.status <> 'succeeded' then raise exception 'payment has not succeeded' using errcode = 'P0001'; end if;
  if v_payment.payload ->> 'kind' is distinct from 'resale_checkout' then raise exception 'payment is not a resale checkout' using errcode = 'P0001'; end if;

  v_listing_id := (v_payment.payload ->> 'listing_id')::uuid;

  select * into v_listing from public.resale_listings where id = v_listing_id for update;
  if not found then raise exception 'listing not found' using errcode = 'P0002'; end if;

  select * into v_buyer_order from public.orders where id = v_payment.order_id for update;
  if not found then raise exception 'buyer order not found' using errcode = 'P0002'; end if;
  v_buyer_id := v_buyer_order.buyer_id;

  if v_listing.status = 'sold' then
    select id into v_new_item_id from public.order_items
    where order_id = v_buyer_order.id and transferred_from_order_item_id = v_listing.order_item_id
    limit 1;
    return query select v_listing.id, v_listing.transfer_id, v_buyer_order.id, v_new_item_id, true;
    return;
  end if;

  if v_listing.status <> 'active' then raise exception 'listing is not active' using errcode = 'P0001'; end if;

  select * into v_source_item from public.order_items where id = v_listing.order_item_id for update;
  if not found then raise exception 'source ticket not found' using errcode = 'P0002'; end if;
  if v_source_item.status <> 'issued'
     or v_source_item.checked_in_at is not null
     or v_source_item.revoked_at is not null
     or v_source_item.refunded_at is not null then
    raise exception 'source ticket is no longer eligible for transfer' using errcode = 'P0001';
  end if;

  insert into public.transfers (order_item_id, from_user_id, to_user_id, status, metadata)
  values (
    v_source_item.id, v_listing.seller_id, v_buyer_id, 'completed',
    jsonb_build_object('kind', 'paid_resale', 'listing_id', v_listing.id, 'payment_id', v_payment.id, 'via', 'webhook')
  ) returning id into v_transfer_id;

  update public.order_items
  -- TICK-448: fresh ticket_code so the seller's QR stops working.
  set order_id = v_buyer_order.id, ticket_code = upper(gen_random_uuid()::text), current_owner_id = v_buyer_order.buyer_id,
      status = 'issued', transferred_from_order_item_id = v_source_item.id, updated_at = now()
  where id = v_source_item.id
  returning id into v_new_item_id;

  update public.orders set status = 'paid' where id = v_buyer_order.id;
  update public.payment_attempts set status = 'succeeded' where payment_id = v_payment.id;
  update public.resale_listings set status = 'sold', transfer_id = v_transfer_id, updated_at = now() where id = v_listing.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values
    (v_buyer_id, 'resale_purchase_completed', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_purchase_completed:' || v_listing.id::text || ':' || v_buyer_id::text),
    (v_listing.seller_id, 'resale_listing_sold', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_listing_sold:' || v_listing.id::text || ':' || v_listing.seller_id::text)
  on conflict do nothing;

  return query select v_listing.id, v_transfer_id, v_buyer_order.id, v_new_item_id, false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_complete_transfer_unchecked(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app', 'public'
AS $function$
declare
  v_transfer public.transfers;
  v_actor_id uuid := auth.uid();
  v_owner_id uuid;
  v_item_status public.order_item_status;
  v_checked_in_at timestamptz;
  v_revoked_at timestamptz;
  v_refunded_at timestamptz;
  v_order_status public.order_status;
begin
  select * into v_transfer
  from public.transfers
  where id = p_transfer_id
  for update;

  if not found then raise exception 'transfer_not_found'; end if;
  if v_transfer.to_user_id is distinct from v_actor_id then
    raise exception 'transfer_unauthorized';
  end if;
  if v_transfer.status not in (
    'pending'::public.transfer_status,
    'requested'::public.transfer_status
  ) then
    raise exception 'transfer_invalid_state';
  end if;

  if v_transfer.expires_at <= now() then
    update public.transfers
    set status = 'expired'::public.transfer_status,
        updated_at = now()
    where id = p_transfer_id;

    return jsonb_build_object(
      'transfer_id', v_transfer.id,
      'order_item_id', v_transfer.order_item_id,
      'status', 'expired'
    );
  end if;

  select oi.current_owner_id,
         oi.status,
         oi.checked_in_at,
         oi.revoked_at,
         oi.refunded_at,
         o.status
    into v_owner_id,
         v_item_status,
         v_checked_in_at,
         v_revoked_at,
         v_refunded_at,
         v_order_status
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = v_transfer.order_item_id
  for update of oi;

  if not found
     or v_owner_id is distinct from v_transfer.from_user_id
     or v_order_status <> 'paid'::public.order_status
     or v_item_status not in ('issued'::public.order_item_status, 'transferred'::public.order_item_status)
     or v_checked_in_at is not null
     or v_revoked_at is not null
     or v_refunded_at is not null
  then raise exception 'ticket_not_transferable'; end if;

  -- TICK-393 / TICK-448: a fresh ticket_code so the sender's copy of the QR
  -- stops working at the gate once the recipient owns the ticket.
  update public.order_items
  set current_owner_id = v_transfer.to_user_id,
      ticket_code = upper(gen_random_uuid()::text),
      status = 'transferred'::public.order_item_status,
      updated_at = now()
  where id = v_transfer.order_item_id;

  update public.transfers
  set status = 'completed'::public.transfer_status,
      updated_at = now()
  where id = p_transfer_id
  returning * into v_transfer;

  insert into public.notifications (
    user_id, type, payload, status, channel, dedupe_key
  ) values (
    v_transfer.from_user_id,
    'ticket_transfer_accepted',
    jsonb_build_object(
      'transfer_id', v_transfer.id,
      'to_user_id', v_transfer.to_user_id,
      'href', '/transfers'
    ),
    'pending',
    'in_app',
    'ticket-transfer-accepted:' || v_transfer.id::text
  ) on conflict do nothing;

  return jsonb_build_object(
    'transfer_id', v_transfer.id,
    'order_item_id', v_transfer.order_item_id,
    'new_owner_id', v_transfer.to_user_id,
    'status', 'completed'
  );
end;
$function$;

-- The ticket mutation guard's transfer path now allows the new code too.
CREATE OR REPLACE FUNCTION public.guard_scanner_checkin_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if old.status in ('issued'::public.order_item_status, 'transferred'::public.order_item_status)
     and new.status = 'checked_in'::public.order_item_status
     and old.checked_in_at is null
     and new.checked_in_at is not null
     and (to_jsonb(new) - array['status', 'checked_in_at', 'updated_at'])
         = (to_jsonb(old) - array['status', 'checked_in_at', 'updated_at'])
  then return new; end if;

  if old.current_owner_id is null
     and new.current_owner_id is not null
     and new.status = old.status
     and exists (
       select 1 from public.orders o
       where o.id = new.order_id and o.buyer_id = new.current_owner_id
     )
     and (to_jsonb(new) - array['current_owner_id', 'updated_at'])
         = (to_jsonb(old) - array['current_owner_id', 'updated_at'])
  then return new; end if;

  if old.status in ('issued'::public.order_item_status, 'transferred'::public.order_item_status)
     and new.status = 'transferred'::public.order_item_status
     and new.current_owner_id is not null
     and new.current_owner_id is distinct from old.current_owner_id
     and old.checked_in_at is null
     and new.checked_in_at is null
     and old.revoked_at is not distinct from new.revoked_at
     and old.refunded_at is not distinct from new.refunded_at
     -- TICK-448: the transfer path also issues a fresh ticket_code.
     and (to_jsonb(new) - array['status', 'current_owner_id', 'ticket_code', 'updated_at'])
         = (to_jsonb(old) - array['status', 'current_owner_id', 'ticket_code', 'updated_at'])
  then return new; end if;

  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then return new; end if;

  raise exception 'Ticket mutations must use an authorized check-in or transfer path';
end;
$function$;

create or replace function app.audit_event_resale_cap()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.resale_cap_bps is distinct from old.resale_cap_bps then
    insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
    values (new.org_id, (select auth.uid()), 'events', new.id::text, 'update'::public.audit_action,
            jsonb_build_object('event', 'resale_cap_changed', 'from_bps', old.resale_cap_bps, 'to_bps', new.resale_cap_bps));
  end if;
  return new;
end;
$$;
revoke all on function app.audit_event_resale_cap() from public, anon, authenticated;

drop trigger if exists events_audit_resale_cap on public.events;
create trigger events_audit_resale_cap
  after update of resale_cap_bps on public.events
  for each row execute function app.audit_event_resale_cap();

alter table public.notifications drop constraint if exists check_notifications_type_channel;
alter table public.notifications add constraint check_notifications_type_channel check (
  type = any (array[
    'email_confirmation', 'ticket_delivery', 'transfer_notification', 'refund_alert', 'generic',
    'ticket_purchase_succeeded', 'payment_succeeded', 'payment_failed', 'event_published',
    'event_changed', 'event_invite', 'refund_updated', 'payout_updated', 'ticket_transfer_updated',
    'tapband_credential_lost', 'ticket_transfer', 'ticket_transfer_accepted', 'ticket_transfer_declined',
    'organizer_new_event', 'artist_new_event', 'event_update', 'event_reminder', 'saved_event_reminder',
    'feedback_request', 'duplicate_permission_request', 'duplicate_permission_decision',
    'email_broadcast', 'refund_request', 'resale_listing_created', 'resale_purchase_completed',
    'waitlist_offer_fulfilled',
    'venue_claim_decision',
    'venue_new_event',
    'artist_claim_decision',
    'resale_listing_sold'
  ]::text[])
  and (channel is null or channel = any (array['email', 'sms', 'push', 'in_app']::text[]))
);

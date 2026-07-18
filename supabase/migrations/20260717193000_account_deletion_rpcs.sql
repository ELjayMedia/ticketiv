-- TICK-320: account deletion and store-compliance data deletion support.
--
-- The public UI calls a read-only authenticated status RPC. The destructive
-- flow is service-role only: the app validates the current Supabase Auth user,
-- signs out the active session, then calls fn_delete_account_for_user.

begin;

-- Retained commerce/audit rows must not block Auth user deletion. New rows
-- still set these references, but historical rows can be anonymised.
alter table public.orders
  alter column buyer_id drop not null;

alter table public.orders
  drop constraint if exists orders_buyer_id_fkey;

alter table public.orders
  add constraint orders_buyer_id_fkey
  foreign key (buyer_id) references auth.users(id) on delete set null;

alter table public.resale_listings
  alter column seller_id drop not null;

alter table public.resale_listings
  drop constraint if exists resale_listings_seller_id_fkey;

alter table public.resale_listings
  add constraint resale_listings_seller_id_fkey
  foreign key (seller_id) references auth.users(id) on delete set null;

alter table public.audit_log
  drop constraint if exists audit_log_actor_id_fkey;

alter table public.audit_log
  add constraint audit_log_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;

alter table public.device_sessions
  drop constraint if exists device_sessions_user_id_fkey;

alter table public.device_sessions
  add constraint device_sessions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.devices
  drop constraint if exists devices_registered_by_fkey;

alter table public.devices
  add constraint devices_registered_by_fkey
  foreign key (registered_by) references auth.users(id) on delete set null;

alter table public.guestlist_entries
  drop constraint if exists guestlist_entries_created_by_fkey;

alter table public.guestlist_entries
  add constraint guestlist_entries_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.order_items
  drop constraint if exists order_items_current_owner_id_fkey;

alter table public.order_items
  add constraint order_items_current_owner_id_fkey
  foreign key (current_owner_id) references auth.users(id) on delete set null;

alter table public.order_items
  add column if not exists holder_user_id uuid;

alter table public.order_items
  drop constraint if exists order_items_holder_user_id_fkey;

alter table public.order_items
  add constraint order_items_holder_user_id_fkey
  foreign key (holder_user_id) references auth.users(id) on delete set null;

create index if not exists idx_order_items_holder_user_id
  on public.order_items (holder_user_id)
  where holder_user_id is not null;

alter table public.payment_provider_settings
  drop constraint if exists payment_provider_settings_updated_by_fkey;

alter table public.payment_provider_settings
  add constraint payment_provider_settings_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.price_rule_redemptions
  drop constraint if exists price_rule_redemptions_user_id_fkey;

alter table public.price_rule_redemptions
  add constraint price_rule_redemptions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.seat_holds
  drop constraint if exists seat_holds_created_by_fkey;

alter table public.seat_holds
  add constraint seat_holds_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.seat_reservations
  drop constraint if exists seat_reservations_user_id_fkey;

alter table public.seat_reservations
  add constraint seat_reservations_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.transfers
  drop constraint if exists transfers_from_user_id_fkey;

alter table public.transfers
  add constraint transfers_from_user_id_fkey
  foreign key (from_user_id) references auth.users(id) on delete set null;

alter table public.transfers
  drop constraint if exists transfers_to_user_id_fkey;

alter table public.transfers
  add constraint transfers_to_user_id_fkey
  foreign key (to_user_id) references auth.users(id) on delete set null;

create or replace function public.fn_get_account_deletion_status_for_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_owner_orgs integer := 0;
  v_upcoming_tickets integer := 0;
  v_active_resales integer := 0;
  v_pending_transfers integer := 0;
  v_paid_orders integer := 0;
  v_blockers jsonb := '[]'::jsonb;
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = 'P0001';
  end if;

  select count(*)::integer
    into v_owner_orgs
  from public.org_members
  where user_id = p_user_id
    and role in ('admin', 'organizer_owner');

  select count(distinct oi.id)::integer
    into v_upcoming_tickets
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.events e on e.id = tt.event_id
  where o.status = 'paid'
    and oi.status not in ('revoked', 'refunded')
    and oi.revoked_at is null
    and oi.refunded_at is null
    and (
      o.buyer_id = p_user_id
      or oi.current_owner_id = p_user_id
      or oi.holder_user_id = p_user_id
    )
    and coalesce(
      (
        select max(coalesce(ed.ends_at, ed.starts_at))
        from public.event_dates ed
        where ed.event_id = e.id
      ),
      e.ends_at,
      e.starts_at
    ) >= now();

  select count(*)::integer
    into v_active_resales
  from public.resale_listings
  where seller_id = p_user_id
    and status in ('active', 'pending', 'checkout_pending');

  select count(*)::integer
    into v_pending_transfers
  from public.transfers
  where (from_user_id = p_user_id or to_user_id = p_user_id)
    and status in ('requested', 'pending');

  select count(*)::integer
    into v_paid_orders
  from public.orders
  where buyer_id = p_user_id
    and status in ('paid', 'refunded');

  if v_owner_orgs > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'organizer_owner',
      'count', v_owner_orgs,
      'message', 'Transfer organization ownership before deleting this account.'
    ));
  end if;

  if v_upcoming_tickets > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'upcoming_tickets',
      'count', v_upcoming_tickets,
      'message', 'Use, refund, or transfer upcoming paid tickets before deleting this account.'
    ));
  end if;

  if v_active_resales > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'active_resales',
      'count', v_active_resales,
      'message', 'Cancel or complete active resale listings before deleting this account.'
    ));
  end if;

  if v_pending_transfers > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'pending_transfers',
      'count', v_pending_transfers,
      'message', 'Resolve pending ticket transfers before deleting this account.'
    ));
  end if;

  return jsonb_build_object(
    'canDelete', jsonb_array_length(v_blockers) = 0,
    'blockers', v_blockers,
    'counts', jsonb_build_object(
      'paidOrdersRetained', v_paid_orders,
      'ownerOrganizations', v_owner_orgs,
      'upcomingTickets', v_upcoming_tickets,
      'activeResales', v_active_resales,
      'pendingTransfers', v_pending_transfers
    ),
    'retention', jsonb_build_object(
      'orders', 'Retained without buyer profile/contact details for accounting and tax records.',
      'tickets', 'Upcoming paid tickets must be resolved before deletion.',
      'profile', 'Deleted with the Auth account.'
    )
  );
end;
$function$;

revoke execute on function public.fn_get_account_deletion_status_for_user(uuid)
  from public, anon, authenticated;
grant execute on function public.fn_get_account_deletion_status_for_user(uuid)
  to service_role;

create or replace function public.fn_get_my_account_deletion_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return public.fn_get_account_deletion_status_for_user(v_user);
end;
$function$;

revoke execute on function public.fn_get_my_account_deletion_status()
  from public, anon;
grant execute on function public.fn_get_my_account_deletion_status()
  to authenticated;

create or replace function public.fn_delete_account_for_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_exists boolean := false;
  v_status jsonb;
  v_orders_anonymised integer := 0;
  v_order_items_anonymised integer := 0;
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from auth.users where id = p_user_id
  ) into v_exists;

  if not v_exists then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  select public.fn_get_account_deletion_status_for_user(p_user_id)
    into v_status;

  if not coalesce((v_status ->> 'canDelete')::boolean, false) then
    raise exception 'account_deletion_blocked'
      using errcode = 'P0001', detail = v_status::text;
  end if;

  update public.orders
  set
    buyer_email = null,
    buyer_phone = null,
    email = null,
    phone = null
  where buyer_id = p_user_id;
  get diagnostics v_orders_anonymised = row_count;

  update public.order_items
  set
    holder_email = null,
    holder_name = null,
    holder_phone = null,
    holder_user_id = null,
    current_owner_id = null,
    name = null
  where holder_user_id = p_user_id
    or current_owner_id = p_user_id
    or order_id in (select id from public.orders where buyer_id = p_user_id);
  get diagnostics v_order_items_anonymised = row_count;

  update public.resale_listings
  set
    seller_id = null,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('sellerDeletedAt', now())
  where seller_id = p_user_id;

  update public.transfers
  set from_user_id = null
  where from_user_id = p_user_id;

  update public.transfers
  set to_user_id = null
  where to_user_id = p_user_id;

  update public.price_rule_redemptions
  set user_id = null
  where user_id = p_user_id;

  update public.audit_log
  set actor_id = null
  where actor_id = p_user_id;

  update public.devices
  set registered_by = null
  where registered_by = p_user_id;

  update public.guestlist_entries
  set created_by = null
  where created_by = p_user_id;

  update public.payment_provider_settings
  set updated_by = null
  where updated_by = p_user_id;

  update public.seat_holds
  set created_by = null
  where created_by = p_user_id;

  if to_regclass('public.physical_credentials') is not null then
    execute $sql$
      update public.physical_credentials
      set
        status = case
          when status in ('issued', 'active', 'suspended', 'lost') then 'revoked'
          else status
        end,
        user_id = null,
        revoked_at = case
          when status in ('issued', 'active', 'suspended', 'lost') then coalesce(revoked_at, now())
          else revoked_at
        end,
        revocation_reason = case
          when status in ('issued', 'active', 'suspended', 'lost') then coalesce(revocation_reason, 'account_deleted')
          else revocation_reason
        end,
        verification_metadata = coalesce(verification_metadata, '{}'::jsonb)
          || jsonb_build_object('accountDeletedAt', now())
      where user_id = $1
    $sql$ using p_user_id;
  end if;

  update public.waitlists
  set email = null, first_name = null, last_name = null
  where user_id = p_user_id;

  delete from public.notifications
  where user_id = p_user_id;

  delete from public.push_subscriptions
  where user_id = p_user_id;

  delete from public.seat_reservations
  where user_id = p_user_id;

  insert into public.audit_log
    (org_id, actor_id, table_name, record_id, action, changes)
  values (
    null,
    null,
    'auth.users',
    p_user_id::text,
    'delete',
    jsonb_build_object(
      'job', 'account_deletion',
      'orders_anonymised', v_orders_anonymised,
      'order_items_anonymised', v_order_items_anonymised,
      'ran_at', now()
    )
  );

  delete from auth.users
  where id = p_user_id;

  return jsonb_build_object(
    'deleted', true,
    'userId', p_user_id,
    'ordersAnonymised', v_orders_anonymised,
    'orderItemsAnonymised', v_order_items_anonymised
  );
end;
$function$;

revoke execute on function public.fn_delete_account_for_user(uuid)
  from public, anon, authenticated;
grant execute on function public.fn_delete_account_for_user(uuid)
  to service_role;

commit;

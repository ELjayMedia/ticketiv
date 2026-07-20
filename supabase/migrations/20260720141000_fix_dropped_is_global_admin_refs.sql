-- Repair helper functions left referencing dropped legacy RLS helpers.
--
-- 20260628190000_drop_legacy_rls_helpers.sql dropped public.is_global_admin(uuid)
-- and public.is_org_admin(uuid) claiming "all confirmed zero-reference", but three
-- SECURITY DEFINER functions still called them, so every invocation raised
-- "function public.is_global_admin(uuid) does not exist" (42883):
--   * can_manage_org      -> blocks create_event_draft (event creation)
--   * can_manage_event    -> blocks event-management RPCs
--   * fn_issue_guestlist  -> blocks guestlist issuance
--
-- is_global_admin(u) was `exists (select 1 from admin_users where user_id = u)`
-- (== app.is_platform_admin() for the current user); is_org_admin(org) ==
-- app.is_org_admin_of(org). The can_manage_* helpers take an explicit p_user, so
-- the admin check is inlined on p_user to preserve their exact contract;
-- fn_issue_guestlist checks the current caller, so it uses the canonical app.*
-- helpers.

create or replace function public.can_manage_org(p_org_id uuid, p_user uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = p_user
      and om.role::text in ('organizer_admin')
  ) or exists (
    select 1 from public.admin_users au where au.user_id = p_user
  );
$function$;

create or replace function public.can_manage_event(p_event_id uuid, p_user uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select
    exists (select 1 from public.admin_users au where au.user_id = p_user)
    or exists (
      select 1
      from public.event_staff es
      where es.event_id = p_event_id
        and es.user_id = p_user
        and es.role::text in ('organizer_admin','organizer_staff')
    )
    or exists (
      select 1
      from public.events e
      join public.org_members om on om.org_id = e.org_id
      where e.id = p_event_id
        and om.user_id = p_user
        and om.role::text in ('organizer_admin')
    );
$function$;

create or replace function public.fn_issue_guestlist(p_guestlist_entry_id uuid, p_allocate integer default null::integer)
 returns jsonb language plpgsql security definer set search_path to 'public'
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

  if not (
    exists (
      select 1 from public.event_staff es
      where es.event_id = v_entry.event_id and es.user_id = v_user and es.active = true
    )
    or app.is_org_admin_of(v_event.org_id)
    or app.is_platform_admin()
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

  if v_entry.email is not null then
    select id into v_buyer from auth.users where lower(email) = lower(v_entry.email) limit 1;
  end if;
  v_buyer := coalesce(v_buyer, v_entry.created_by, v_user);
  if v_buyer is null then
    raise exception 'no_buyer' using errcode = 'P0001';
  end if;

  v_currency := coalesce(v_tt.currency, v_event.currency, 'SZL');

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

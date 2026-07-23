-- Restrict direct access to internal SECURITY DEFINER utilities.
revoke execute on function public.fn_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.fn_rate_limit(text, integer, integer) to service_role;

revoke execute on function public.fn_finalize_email_broadcast(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.fn_finalize_email_broadcast(uuid, integer, integer) to service_role;

-- Bind role checks to the caller. Service-role callers may inspect another user.
create or replace function public.can_manage_event(p_event_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      p_user = auth.uid()
      or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    )
    and (
      exists (
        select 1 from public.admin_users au
        where au.user_id = p_user and au.active = true
      )
      or exists (
        select 1 from public.event_staff es
        where es.event_id = p_event_id
          and es.user_id = p_user
          and es.active = true
          and es.role::text in ('organizer_admin','organizer_staff')
      )
      or exists (
        select 1
        from public.events e
        join public.org_members om on om.org_id = e.org_id
        where e.id = p_event_id
          and om.user_id = p_user
          and om.role::text in ('organizer_owner','organizer_admin')
      )
    );
$$;

create or replace function public.is_super_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      check_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    )
    and exists (
      select 1
      from public.admin_users au
      where au.user_id = check_user_id
        and au.active = true
    );
$$;

-- A client may only request its own resale count. Trusted server jobs may batch users.
create or replace function public.fn_seller_completed_resales(p_seller_ids uuid[])
returns table(seller_id uuid, completed_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select rl.seller_id, count(*)::bigint
  from public.resale_listings rl
  where rl.seller_id = any(
    case
      when coalesce(auth.jwt() ->> 'role', '') = 'service_role' then p_seller_ids
      else array[auth.uid()]::uuid[]
    end
  )
    and rl.status in ('sold','completed')
  group by rl.seller_id;
$$;

-- Broadcast delivery results are server-owned. Do not trust client-supplied user identity.
create or replace function public.fn_finalize_email_broadcast(
  p_notification_id uuid,
  p_sent_count integer,
  p_failed_count integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if coalesce(p_sent_count, 0) < 0 or coalesce(p_failed_count, 0) < 0 then
    raise exception 'invalid_delivery_counts' using errcode = '22023';
  end if;

  update public.notifications
  set status = case when coalesce(p_failed_count, 0) > 0 and coalesce(p_sent_count, 0) = 0 then 'failed' else 'sent' end,
      sent_at = case when coalesce(p_sent_count, 0) > 0 then now() else sent_at end,
      payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
        'sent_count', coalesce(p_sent_count, 0),
        'failed_count', coalesce(p_failed_count, 0),
        'finalized_at', now()
      )
  where id = p_notification_id
    and type = 'email_broadcast';

  if not found then
    raise exception 'broadcast_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Harden public promo preview: retain checkout functionality without exposing internal rule IDs.
create or replace function public.fn_preview_promo_code(
  p_event_id uuid,
  p_code text,
  p_channel public.sales_channel default 'online'::public.sales_channel
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_rule public.price_rules%rowtype;
  v_total_redemptions integer;
begin
  if p_event_id is null or p_code is null or length(trim(p_code)) < 3 then
    return jsonb_build_object('valid', false, 'reason', 'code_required');
  end if;

  select e.org_id into v_org_id
  from public.events e
  where e.id = p_event_id and e.status = 'published';

  if v_org_id is null then
    return jsonb_build_object('valid', false, 'reason', 'event_not_found');
  end if;

  select * into v_rule
  from public.price_rules
  where org_id = v_org_id
    and lower(code) = lower(trim(p_code))
    and coalesce(is_active, true) = true
    and (event_id is null or event_id = p_event_id)
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and (channel is null or cardinality(channel) = 0 or p_channel = any(channel))
    and type in ('absolute_discount', 'percent_discount')
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'code_invalid');
  end if;

  if v_rule.max_redemptions is not null and v_rule.max_redemptions > 0 then
    select count(*)::integer into v_total_redemptions
    from public.price_rule_redemptions
    where price_rule_id = v_rule.id;
    if v_total_redemptions >= v_rule.max_redemptions then
      return jsonb_build_object('valid', false, 'reason', 'code_exhausted');
    end if;
  end if;

  return jsonb_build_object(
    'valid', true,
    'discountType', case v_rule.type when 'percent_discount' then 'percent' else 'fixed' end,
    'discountValue', case v_rule.type
      when 'percent_discount' then v_rule.value_numeric
      else abs(v_rule.value_numeric)::integer
    end
  );
end;
$$;

-- Validate and rate-limit seat holds. The two-argument overload delegates to the full implementation.
create or replace function public.fn_create_seat_hold(
  p_event_id uuid,
  p_quantity integer default 1,
  p_ticket_type_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hold_code text;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 20 then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  if not exists (select 1 from public.events e where e.id = p_event_id and e.status = 'published') then
    raise exception 'event_not_available' using errcode = 'P0002';
  end if;
  if p_ticket_type_id is not null and not exists (
    select 1 from public.ticket_types tt
    where tt.id = p_ticket_type_id and tt.event_id = p_event_id
  ) then
    raise exception 'ticket_type_not_in_event' using errcode = '22023';
  end if;
  if not public.fn_rate_limit('seat_hold:' || v_user::text, 20, 60) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  v_hold_code := replace(gen_random_uuid()::text, '-', '');
  insert into public.seat_holds(event_id, hold_code, quantity, ticket_type_id, expires_at, created_by)
  values (p_event_id, v_hold_code, p_quantity, p_ticket_type_id, now() + interval '10 minutes', v_user);
  return v_hold_code;
end;
$$;

create or replace function public.fn_create_seat_hold(p_event_id uuid, p_quantity integer default 1)
returns text
language sql
security definer
set search_path = public
as $$
  select public.fn_create_seat_hold(p_event_id, p_quantity, null::uuid);
$$;

-- Ensure a device session used for scanning belongs to the scanning user.
create or replace function public.fn_scan_ticket_unchecked(
  p_ticket_code text,
  p_event_id uuid,
  p_scanned_by uuid,
  p_device_id uuid default null,
  p_session_id uuid default null,
  p_gate text default null,
  p_scanned_at timestamptz default now(),
  p_attempt_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid; v_authorized boolean := false; v_item record; v_scan_id uuid; v_existing record;
  v_effective_scan_time timestamptz := now();
begin
  if p_attempt_id is not null then
    select * into v_existing from public.scans where request_hash = p_attempt_id limit 1;
    if found then
      return jsonb_build_object('outcome',v_existing.outcome,'valid',v_existing.outcome='valid','message','Already processed','scan_id',v_existing.id,'order_item_id',v_existing.order_item_id,'idempotent',true);
    end if;
  end if;

  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  if v_org_id is null then return jsonb_build_object('outcome','error','valid',false,'message','Event not found'); end if;

  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and p_scanned_by is distinct from auth.uid() then
    return jsonb_build_object('outcome','unauthorized','valid',false,'message','Not authorized to scan for this event');
  end if;

  if coalesce(auth.jwt() ->> 'role', '') = 'service_role'
     and p_scanned_at between now() - interval '7 days' and now() + interval '5 minutes' then
    v_effective_scan_time := p_scanned_at;
  end if;

  if exists (select 1 from public.admin_users where user_id = p_scanned_by and active = true) then v_authorized := true; end if;
  if not v_authorized and exists (
    select 1 from public.org_members
    where org_id = v_org_id and user_id = p_scanned_by
      and role in ('admin','organizer','organizer_owner','organizer_admin','organizer_staff','scanner')
  ) then v_authorized := true; end if;
  if not v_authorized and exists (
    select 1 from public.event_staff
    where event_id = p_event_id and user_id = p_scanned_by and active = true
      and role in ('admin','organizer_admin','organizer_staff','scanner','organizer_scanner')
  ) then v_authorized := true; end if;
  if not v_authorized and p_device_id is not null and p_session_id is not null and exists (
    select 1
    from public.device_sessions ds
    join public.devices d on d.id = ds.device_id
    where ds.id = p_session_id
      and ds.device_id = p_device_id
      and ds.user_id = p_scanned_by
      and ds.ended_at is null
      and d.org_id = v_org_id
      and d.event_id = p_event_id
      and d.device_role in ('organizer_scanner','organizer_kiosk')
  ) then
    v_authorized := true;
    update public.devices set last_seen_at = now() where id = p_device_id;
  end if;

  if not v_authorized then return jsonb_build_object('outcome','unauthorized','valid',false,'message','Not authorized to scan for this event'); end if;

  select oi.id, oi.status, oi.checked_in_at, oi.revoked_at, oi.refunded_at,
         tt.event_id as tt_event_id, tt.name as ticket_type_name, o.status as order_status
  into v_item
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.orders o on o.id = oi.order_id
  where oi.ticket_code = p_ticket_code
  for update of oi;

  if not found then
    insert into public.scans(event_id,ticket_code,outcome,device_id,device_session_id,gate,scanned_at,notes,request_hash)
    values(p_event_id,p_ticket_code,'invalid',p_device_id,p_session_id,p_gate,v_effective_scan_time,'Ticket code not found',p_attempt_id)
    returning id into v_scan_id;
    return jsonb_build_object('outcome','not_found','valid',false,'message','Ticket not found','scan_id',v_scan_id);
  end if;
  if v_item.tt_event_id <> p_event_id then
    insert into public.scans(event_id,order_item_id,ticket_code,outcome,device_id,device_session_id,gate,scanned_at,notes,request_hash)
    values(p_event_id,v_item.id,p_ticket_code,'wrong_event',p_device_id,p_session_id,p_gate,v_effective_scan_time,'Ticket belongs to a different event',p_attempt_id)
    returning id into v_scan_id;
    return jsonb_build_object('outcome','wrong_event','valid',false,'message','Ticket is for a different event','scan_id',v_scan_id,'order_item_id',v_item.id);
  end if;
  if v_item.order_status <> 'paid' then
    return jsonb_build_object('outcome','not_paid','valid',false,'message','Order has not been paid','order_item_id',v_item.id);
  end if;
  if v_item.status = 'refunded' or v_item.refunded_at is not null then
    return jsonb_build_object('outcome','refunded','valid',false,'message','Ticket has been refunded','order_item_id',v_item.id);
  end if;
  if v_item.status = 'revoked' or v_item.revoked_at is not null then
    return jsonb_build_object('outcome','revoked','valid',false,'message','Ticket has been revoked','order_item_id',v_item.id);
  end if;
  if v_item.status = 'checked_in' or v_item.checked_in_at is not null then
    return jsonb_build_object('outcome','duplicate','valid',false,'message','Ticket was already scanned','order_item_id',v_item.id,'checked_in_at',v_item.checked_in_at);
  end if;

  insert into public.scans(event_id,order_item_id,ticket_code,outcome,device_id,device_session_id,gate,scanned_at,request_hash)
  values(p_event_id,v_item.id,p_ticket_code,'valid',p_device_id,p_session_id,p_gate,v_effective_scan_time,p_attempt_id)
  returning id into v_scan_id;

  update public.order_items
  set status='checked_in', checked_in_at=v_effective_scan_time, updated_at=now()
  where id=v_item.id;

  return jsonb_build_object('outcome','validated','valid',true,'message','Ticket validated','scan_id',v_scan_id,'order_item_id',v_item.id,'ticket_type_name',v_item.ticket_type_name,'checked_in_at',v_effective_scan_time);
exception when unique_violation then
  return jsonb_build_object('outcome','duplicate','valid',false,'message','Ticket was already scanned (concurrent)','order_item_id',v_item.id);
end;
$$;

-- Only trusted payment infrastructure or platform admins may finalize provider outcomes.
create or replace function public.fn_transition_refund(
  p_refund_id uuid,
  p_new_status public.refund_status,
  p_provider_ref text default null,
  p_provider_payload jsonb default null
)
returns public.refunds
language plpgsql
security definer
set search_path = pg_catalog, app, public
as $$
declare
  v_refund public.refunds;
  v_org uuid;
  v_is_service boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
begin
  if not v_is_service then perform app.require_claimed_account(); end if;

  select r into v_refund from public.refunds r where r.id=p_refund_id for update;
  if not found then raise exception 'refund_not_found' using errcode='P0002'; end if;

  select o.org_id into v_org
  from public.payments py join public.orders o on o.id=py.order_id
  where py.id=v_refund.payment_id;

  if p_new_status not in ('processing','processed','failed','cancelled') then
    raise exception 'invalid_refund_status' using errcode='22023';
  end if;

  if p_new_status in ('processed','failed') then
    if not (v_is_service or app.is_platform_admin()) then
      raise exception 'provider_or_platform_admin_required' using errcode='42501';
    end if;
  elsif not (v_is_service or app.is_org_finance_viewer(v_org) or app.is_platform_admin()) then
    raise exception 'not_authorized' using errcode='42501';
  end if;

  update public.refunds
  set status=p_new_status,
      provider_ref=case when v_is_service or app.is_platform_admin() then coalesce(p_provider_ref,provider_ref) else provider_ref end,
      provider_payload=case when v_is_service or app.is_platform_admin() then coalesce(p_provider_payload,provider_payload) else provider_payload end,
      processed_at=case when p_new_status in ('processed','failed','cancelled') then now() else processed_at end
  where id=p_refund_id
  returning * into v_refund;
  return v_refund;
end;
$$;

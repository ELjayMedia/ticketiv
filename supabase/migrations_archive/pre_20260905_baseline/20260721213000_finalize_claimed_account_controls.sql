-- TICK-338 final hardening pass: refunds, payouts, devices, admin and RLS.

create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
  select app.is_claimed_account()
     and exists (
       select 1 from public.admin_users au
       where au.user_id = auth.uid() and au.active = true
     );
$$;
revoke all on function app.is_platform_admin() from public, anon;
grant execute on function app.is_platform_admin() to authenticated, service_role;

revoke insert, update, delete on table public.refunds,
  public.refund_items, public.payout_accounts, public.payouts,
  public.devices, public.device_sessions, public.admin_users,
  public.org_members, public.event_staff, public.profiles,
  public.guestlist_entries, public.membership_invites
from anon;

drop policy if exists claimed_refunds_mutation on public.refunds;
create policy claimed_refunds_mutation on public.refunds as restrictive for all to authenticated using (app.is_claimed_account()) with check (app.is_claimed_account());
drop policy if exists claimed_refund_items_mutation on public.refund_items;
create policy claimed_refund_items_mutation on public.refund_items as restrictive for all to authenticated using (app.is_claimed_account()) with check (app.is_claimed_account());
drop policy if exists claimed_payout_accounts_mutation on public.payout_accounts;
create policy claimed_payout_accounts_mutation on public.payout_accounts as restrictive for all to authenticated using (app.is_claimed_account()) with check (app.is_claimed_account());
drop policy if exists claimed_payouts_mutation on public.payouts;
create policy claimed_payouts_mutation on public.payouts as restrictive for all to authenticated using (app.is_claimed_account()) with check (app.is_claimed_account());
drop policy if exists claimed_devices_access on public.devices;
create policy claimed_devices_access on public.devices as restrictive for all to authenticated using (app.is_claimed_account()) with check (app.is_claimed_account());
drop policy if exists claimed_device_sessions_access on public.device_sessions;
create policy claimed_device_sessions_access on public.device_sessions as restrictive for all to authenticated using (app.is_claimed_account()) with check (app.is_claimed_account());
drop policy if exists claimed_admin_users_access on public.admin_users;
create policy claimed_admin_users_access on public.admin_users as restrictive for all to authenticated using (app.is_claimed_account()) with check (app.is_claimed_account());
drop policy if exists claimed_org_members_mutation on public.org_members;
create policy claimed_org_members_mutation on public.org_members as restrictive for insert to authenticated with check (app.is_claimed_account());
drop policy if exists claimed_org_members_update on public.org_members;
create policy claimed_org_members_update on public.org_members as restrictive for update to authenticated using (app.is_claimed_account()) with check (app.is_claimed_account());
drop policy if exists claimed_org_members_delete on public.org_members;
create policy claimed_org_members_delete on public.org_members as restrictive for delete to authenticated using (app.is_claimed_account());
drop policy if exists claimed_profiles_update on public.profiles;
create policy claimed_profiles_update on public.profiles as restrictive for update to authenticated using (app.is_claimed_account()) with check (app.is_claimed_account());
drop policy if exists claimed_guestlist_mutation on public.guestlist_entries;
create policy claimed_guestlist_mutation on public.guestlist_entries as restrictive for all to authenticated using (app.is_claimed_account()) with check (app.is_claimed_account());

drop policy if exists refunds_insert on public.refunds;
create policy refunds_insert on public.refunds
for insert to authenticated
with check (
  app.is_claimed_account()
  and initiated_by = auth.uid()
  and status = 'requested'::public.refund_status
  and processed_at is null
  and provider_ref is null
  and exists (
    select 1 from public.payments py
    join public.orders o on o.id = py.order_id
    where py.id = refunds.payment_id
      and (o.buyer_id = auth.uid() or app.is_org_finance_viewer(o.org_id) or app.is_org_admin_of(o.org_id))
  )
);

revoke insert, update, delete on table public.payouts from authenticated;
revoke update, delete on table public.refunds from authenticated;

create or replace function public.fn_transition_refund(
  p_refund_id uuid,
  p_new_status public.refund_status,
  p_provider_ref text default null,
  p_provider_payload jsonb default null
)
returns public.refunds
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare
  v_refund public.refunds;
  v_org uuid;
begin
  perform app.require_claimed_account();

  select r into v_refund
  from public.refunds r
  where r.id = p_refund_id
  for update;
  if not found then raise exception 'refund_not_found' using errcode='P0002'; end if;

  select o.org_id into v_org
  from public.payments py
  join public.orders o on o.id = py.order_id
  where py.id = v_refund.payment_id;

  if not (app.is_org_finance_viewer(v_org) or app.is_platform_admin()) then
    raise exception 'not_authorized' using errcode='42501';
  end if;
  if p_new_status not in ('processing','processed','failed','cancelled') then
    raise exception 'invalid_refund_status' using errcode='22023';
  end if;

  update public.refunds
  set status = p_new_status,
      provider_ref = coalesce(p_provider_ref, provider_ref),
      provider_payload = coalesce(p_provider_payload, provider_payload),
      processed_at = case when p_new_status in ('processed','failed','cancelled') then now() else processed_at end
  where id = p_refund_id
  returning * into v_refund;
  return v_refund;
end;
$$;
revoke all on function public.fn_transition_refund(uuid, public.refund_status, text, jsonb) from public, anon;
grant execute on function public.fn_transition_refund(uuid, public.refund_status, text, jsonb) to authenticated, service_role;

create or replace function public.fn_transition_payout(
  p_payout_id uuid,
  p_new_status public.payout_status,
  p_destination_ref text default null
)
returns public.payouts
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare v_payout public.payouts;
begin
  perform app.require_claimed_account();
  if not app.is_platform_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_new_status not in ('processing','paid','failed','cancelled') then raise exception 'invalid_payout_status' using errcode='22023'; end if;
  update public.payouts
  set status = p_new_status,
      destination_ref = coalesce(p_destination_ref, destination_ref),
      paid_at = case when p_new_status = 'paid' then now() else paid_at end
  where id = p_payout_id
  returning * into v_payout;
  if not found then raise exception 'payout_not_found' using errcode='P0002'; end if;
  return v_payout;
end;
$$;
revoke all on function public.fn_transition_payout(uuid, public.payout_status, text) from public, anon;
grant execute on function public.fn_transition_payout(uuid, public.payout_status, text) to authenticated, service_role;

create or replace function public.fn_register_device(
  p_org_id uuid, p_event_id uuid, p_label text, p_device_role public.device_role
)
returns public.devices
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare v_device public.devices;
begin
  perform app.require_claimed_account();
  if not app.is_org_admin_of(p_org_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_event_id is not null and not exists (select 1 from public.events e where e.id=p_event_id and e.org_id=p_org_id) then
    raise exception 'event_not_in_org' using errcode='22023';
  end if;
  insert into public.devices(org_id,event_id,registered_by,label,device_role)
  values (p_org_id,p_event_id,auth.uid(),nullif(btrim(p_label),''),p_device_role)
  returning * into v_device;
  return v_device;
end;
$$;
revoke all on function public.fn_register_device(uuid, uuid, text, public.device_role) from public, anon;
grant execute on function public.fn_register_device(uuid, uuid, text, public.device_role) to authenticated, service_role;

create or replace function public.fn_start_device_session(p_device_id uuid)
returns public.device_sessions
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare v_session public.device_sessions; v_org uuid;
begin
  perform app.require_claimed_account();
  select org_id into v_org from public.devices where id=p_device_id;
  if v_org is null then raise exception 'device_not_found' using errcode='P0002'; end if;
  if not app.is_org_manager(v_org) then raise exception 'not_authorized' using errcode='42501'; end if;
  insert into public.device_sessions(device_id,user_id)
  values (p_device_id,auth.uid()) returning * into v_session;
  update public.devices set last_seen_at=now() where id=p_device_id;
  return v_session;
end;
$$;
revoke all on function public.fn_start_device_session(uuid) from public, anon;
grant execute on function public.fn_start_device_session(uuid) to authenticated, service_role;

create or replace function public.fn_end_device_session(p_session_id uuid)
returns public.device_sessions
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
declare v_session public.device_sessions; v_org uuid;
begin
  perform app.require_claimed_account();
  select ds into v_session
  from public.device_sessions ds
  where ds.id=p_session_id
  for update;
  if not found then raise exception 'device_session_not_found' using errcode='P0002'; end if;
  select d.org_id into v_org from public.devices d where d.id=v_session.device_id;
  if not (v_session.user_id=auth.uid() or app.is_org_manager(v_org)) then raise exception 'not_authorized' using errcode='42501'; end if;
  update public.device_sessions set ended_at=coalesce(ended_at,now()) where id=p_session_id returning * into v_session;
  return v_session;
end;
$$;
revoke all on function public.fn_end_device_session(uuid) from public, anon;
grant execute on function public.fn_end_device_session(uuid) to authenticated, service_role;

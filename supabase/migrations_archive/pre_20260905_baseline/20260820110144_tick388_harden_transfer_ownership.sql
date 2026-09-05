alter table public.transfers
  add column if not exists expires_at timestamptz;

update public.transfers
set expires_at = coalesce(created_at, now()) + interval '24 hours'
where expires_at is null;

alter table public.transfers
  alter column expires_at set default (now() + interval '24 hours'),
  alter column expires_at set not null;

create or replace function public.guard_scanner_checkin_only()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
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
     and (to_jsonb(new) - array['status', 'current_owner_id', 'updated_at'])
         = (to_jsonb(old) - array['status', 'current_owner_id', 'updated_at'])
  then return new; end if;

  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then return new; end if;

  raise exception 'Ticket mutations must use an authorized check-in or transfer path';
end;
$$;

update public.order_items oi
set current_owner_id = o.buyer_id
from public.orders o
where o.id = oi.order_id
  and oi.current_owner_id is null
  and o.buyer_id is not null;

create unique index if not exists transfers_one_live_per_ticket_idx
  on public.transfers(order_item_id)
  where order_item_id is not null
    and status in ('requested'::public.transfer_status,'pending'::public.transfer_status,'accepted'::public.transfer_status);

create or replace function public.fn_request_transfer_to_user_unchecked(p_order_item_id uuid,p_recipient_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','app','public'
as $$
declare
  v_actor_id uuid := auth.uid();
  v_owner_id uuid;
  v_item_status public.order_item_status;
  v_checked_in_at timestamptz;
  v_revoked_at timestamptz;
  v_refunded_at timestamptz;
  v_order_status public.order_status;
  v_transfer_id uuid;
  v_expires_at timestamptz;
begin
  if v_actor_id is null then raise exception 'authentication_required'; end if;
  if p_recipient_user_id is null or p_recipient_user_id = v_actor_id then raise exception 'invalid_transfer_recipient'; end if;

  if not exists (
    select 1 from auth.users u
    where u.id = p_recipient_user_id and coalesce(u.is_anonymous,false)=false
  ) then raise exception 'recipient_account_not_found'; end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id=v_actor_id and b.blocked_id=p_recipient_user_id)
       or (b.blocker_id=p_recipient_user_id and b.blocked_id=v_actor_id)
  ) then raise exception 'transfer_recipient_unavailable'; end if;

  select oi.current_owner_id,oi.status,oi.checked_in_at,oi.revoked_at,oi.refunded_at,o.status
    into v_owner_id,v_item_status,v_checked_in_at,v_revoked_at,v_refunded_at,v_order_status
  from public.order_items oi
  join public.orders o on o.id=oi.order_id
  where oi.id=p_order_item_id
  for update of oi;

  if not found then raise exception 'ticket_not_found'; end if;
  if v_owner_id is distinct from v_actor_id then raise exception 'transfer_not_owner'; end if;
  if v_order_status <> 'paid'::public.order_status
     or v_item_status not in ('issued'::public.order_item_status,'transferred'::public.order_item_status)
     or v_checked_in_at is not null or v_revoked_at is not null or v_refunded_at is not null
  then raise exception 'ticket_not_transferable'; end if;

  v_expires_at := now()+interval '24 hours';
  begin
    insert into public.transfers(order_item_id,from_user_id,to_user_id,status,expires_at,metadata)
    values(p_order_item_id,v_actor_id,p_recipient_user_id,'pending'::public.transfer_status,v_expires_at,jsonb_build_object('source','ticket_transfer'))
    returning id into v_transfer_id;
  exception when unique_violation then raise exception 'transfer_already_pending'; end;

  insert into public.notifications(user_id,type,payload,status,channel,dedupe_key)
  values(p_recipient_user_id,'ticket_transfer',jsonb_build_object('transfer_id',v_transfer_id,'from_user_id',v_actor_id,'href','/transfers'),'pending','in_app','ticket-transfer-request:'||v_transfer_id::text)
  on conflict do nothing;

  return jsonb_build_object('transfer_id',v_transfer_id,'order_item_id',p_order_item_id,'to_user_id',p_recipient_user_id,'status','pending','expires_at',v_expires_at);
end;
$$;
revoke all on function public.fn_request_transfer_to_user_unchecked(uuid,uuid) from public,anon,authenticated;
grant execute on function public.fn_request_transfer_to_user_unchecked(uuid,uuid) to service_role;

create or replace function public.fn_request_transfer_to_user(p_order_item_id uuid,p_recipient_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','app','public'
as $$
begin
  perform app.require_claimed_account();
  if not public.fn_rate_limit('transfer:'||auth.uid()::text,20,3600) then raise exception 'rate_limited: too many transfer requests, please try again later' using errcode='P0001'; end if;
  return public.fn_request_transfer_to_user_unchecked(p_order_item_id,p_recipient_user_id);
end;
$$;
revoke all on function public.fn_request_transfer_to_user(uuid,uuid) from public,anon;
grant execute on function public.fn_request_transfer_to_user(uuid,uuid) to authenticated,service_role;

create or replace function public.fn_request_transfer_by_email_unchecked(p_order_item_id uuid,p_recipient_email text)
returns json
language plpgsql
security definer
set search_path to 'pg_catalog','app','public'
as $$
declare v_to_user_id uuid;
begin
  select u.id into v_to_user_id from auth.users u
  where lower(u.email)=lower(trim(p_recipient_email)) and coalesce(u.is_anonymous,false)=false limit 1;
  if v_to_user_id is null then raise exception 'recipient_account_not_found'; end if;
  return public.fn_request_transfer_to_user_unchecked(p_order_item_id,v_to_user_id)::json;
end;
$$;
revoke all on function public.fn_request_transfer_by_email_unchecked(uuid,text) from public,anon,authenticated;
grant execute on function public.fn_request_transfer_by_email_unchecked(uuid,text) to service_role;

create or replace function public.fn_request_transfer_by_email(p_order_item_id uuid,p_recipient_email text)
returns json
language plpgsql
security definer
set search_path to 'pg_catalog','app','public'
as $$
begin
  perform app.require_claimed_account();
  if not public.fn_rate_limit('transfer:'||auth.uid()::text,20,3600) then raise exception 'rate_limited: too many transfer requests, please try again later' using errcode='P0001'; end if;
  return public.fn_request_transfer_by_email_unchecked(p_order_item_id,p_recipient_email);
end;
$$;
revoke all on function public.fn_request_transfer_by_email(uuid,text) from public,anon;
grant execute on function public.fn_request_transfer_by_email(uuid,text) to authenticated,service_role;

create or replace function public.fn_request_transfer_by_phone(p_order_item_id uuid,p_recipient_phone text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','app','public'
as $$
declare
  v_to_user_id uuid;
  v_phone text := regexp_replace(coalesce(p_recipient_phone,''),'[^0-9]','','g');
begin
  perform app.require_claimed_account();
  if length(v_phone)<8 then raise exception 'invalid_recipient_phone'; end if;
  if not public.fn_rate_limit('transfer:'||auth.uid()::text,20,3600) then raise exception 'rate_limited: too many transfer requests, please try again later' using errcode='P0001'; end if;
  select u.id into v_to_user_id from auth.users u
  where regexp_replace(coalesce(u.phone,''),'[^0-9]','','g')=v_phone and coalesce(u.is_anonymous,false)=false limit 1;
  if v_to_user_id is null then raise exception 'recipient_account_not_found'; end if;
  return public.fn_request_transfer_to_user_unchecked(p_order_item_id,v_to_user_id);
end;
$$;
revoke all on function public.fn_request_transfer_by_phone(uuid,text) from public,anon;
grant execute on function public.fn_request_transfer_by_phone(uuid,text) to authenticated,service_role;

create or replace function public.fn_complete_transfer_unchecked(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','app','public'
as $$
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
  select * into v_transfer from public.transfers where id=p_transfer_id for update;
  if not found then raise exception 'transfer_not_found'; end if;
  if v_transfer.to_user_id is distinct from v_actor_id then raise exception 'transfer_unauthorized'; end if;
  if v_transfer.status not in ('pending'::public.transfer_status,'requested'::public.transfer_status) then raise exception 'transfer_invalid_state'; end if;
  if v_transfer.expires_at<=now() then return jsonb_build_object('transfer_id',v_transfer.id,'order_item_id',v_transfer.order_item_id,'status','expired'); end if;

  select oi.current_owner_id,oi.status,oi.checked_in_at,oi.revoked_at,oi.refunded_at,o.status
    into v_owner_id,v_item_status,v_checked_in_at,v_revoked_at,v_refunded_at,v_order_status
  from public.order_items oi join public.orders o on o.id=oi.order_id
  where oi.id=v_transfer.order_item_id for update of oi;

  if not found or v_owner_id is distinct from v_transfer.from_user_id
     or v_order_status<>'paid'::public.order_status
     or v_item_status not in ('issued'::public.order_item_status,'transferred'::public.order_item_status)
     or v_checked_in_at is not null or v_revoked_at is not null or v_refunded_at is not null
  then raise exception 'ticket_not_transferable'; end if;

  update public.order_items set current_owner_id=v_transfer.to_user_id,status='transferred'::public.order_item_status,updated_at=now()
  where id=v_transfer.order_item_id;
  update public.transfers set status='completed'::public.transfer_status,updated_at=now() where id=p_transfer_id returning * into v_transfer;

  insert into public.notifications(user_id,type,payload,status,channel,dedupe_key)
  values(v_transfer.from_user_id,'ticket_transfer_accepted',jsonb_build_object('transfer_id',v_transfer.id,'to_user_id',v_transfer.to_user_id,'href','/transfers'),'pending','in_app','ticket-transfer-accepted:'||v_transfer.id::text)
  on conflict do nothing;

  return jsonb_build_object('transfer_id',v_transfer.id,'order_item_id',v_transfer.order_item_id,'new_owner_id',v_transfer.to_user_id,'status','completed');
end;
$$;
revoke all on function public.fn_complete_transfer_unchecked(uuid) from public,anon,authenticated;
grant execute on function public.fn_complete_transfer_unchecked(uuid) to service_role;

create or replace function public.fn_complete_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','app','public'
as $$ begin perform app.require_claimed_account(); return public.fn_complete_transfer_unchecked(p_transfer_id); end; $$;
revoke all on function public.fn_complete_transfer(uuid) from public,anon;
grant execute on function public.fn_complete_transfer(uuid) to authenticated,service_role;

create or replace function public.fn_decline_transfer(p_transfer_id uuid,p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','app','public'
as $$
declare v_transfer public.transfers;
begin
  perform app.require_claimed_account();
  select * into v_transfer from public.transfers where id=p_transfer_id for update;
  if not found then raise exception 'transfer_not_found'; end if;
  if v_transfer.to_user_id is distinct from auth.uid() then raise exception 'transfer_unauthorized'; end if;
  if v_transfer.status not in ('pending'::public.transfer_status,'requested'::public.transfer_status) then raise exception 'transfer_invalid_state'; end if;
  update public.transfers
  set status='declined'::public.transfer_status,
      metadata=coalesce(metadata,'{}'::jsonb)||case when nullif(trim(p_reason),'') is null then '{}'::jsonb else jsonb_build_object('decline_reason',left(trim(p_reason),240)) end,
      updated_at=now()
  where id=p_transfer_id returning * into v_transfer;
  insert into public.notifications(user_id,type,payload,status,channel,dedupe_key)
  values(v_transfer.from_user_id,'ticket_transfer_declined',jsonb_build_object('transfer_id',v_transfer.id,'href','/transfers'),'pending','in_app','ticket-transfer-declined:'||v_transfer.id::text)
  on conflict do nothing;
  return jsonb_build_object('transfer_id',v_transfer.id,'status','declined');
end;
$$;
revoke all on function public.fn_decline_transfer(uuid,text) from public,anon;
grant execute on function public.fn_decline_transfer(uuid,text) to authenticated,service_role;

create or replace function public.fn_cancel_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','app','public'
as $$
declare v_transfer public.transfers;
begin
  perform app.require_claimed_account();
  select * into v_transfer from public.transfers where id=p_transfer_id for update;
  if not found then raise exception 'transfer_not_found'; end if;
  if v_transfer.from_user_id is distinct from auth.uid() then raise exception 'transfer_unauthorized'; end if;
  if v_transfer.status not in ('pending'::public.transfer_status,'requested'::public.transfer_status) then raise exception 'transfer_invalid_state'; end if;
  update public.transfers set status='cancelled'::public.transfer_status,updated_at=now() where id=p_transfer_id;
  return jsonb_build_object('transfer_id',p_transfer_id,'status','cancelled');
end;
$$;
revoke all on function public.fn_cancel_transfer(uuid) from public,anon;
grant execute on function public.fn_cancel_transfer(uuid) to authenticated,service_role;

revoke insert,update,delete on table public.transfers from anon,authenticated;
drop policy if exists transfers_insert_authenticated on public.transfers;
drop policy if exists transfers_update_authenticated on public.transfers;
;

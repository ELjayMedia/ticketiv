create or replace function public.fn_request_transfer_to_user_unchecked(
  p_order_item_id uuid,
  p_recipient_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'app', 'public'
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
  if p_recipient_user_id is null or p_recipient_user_id = v_actor_id then
    raise exception 'invalid_transfer_recipient';
  end if;

  if not exists (
    select 1 from auth.users u
    where u.id = p_recipient_user_id
      and coalesce(u.is_anonymous, false) = false
  ) then raise exception 'recipient_account_not_found'; end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_actor_id and b.blocked_id = p_recipient_user_id)
       or (b.blocker_id = p_recipient_user_id and b.blocked_id = v_actor_id)
  ) then raise exception 'transfer_recipient_unavailable'; end if;

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
  where oi.id = p_order_item_id
  for update of oi;

  if not found then raise exception 'ticket_not_found'; end if;
  if v_owner_id is distinct from v_actor_id then raise exception 'transfer_not_owner'; end if;

  if v_order_status <> 'paid'::public.order_status
     or v_item_status not in ('issued'::public.order_item_status, 'transferred'::public.order_item_status)
     or v_checked_in_at is not null
     or v_revoked_at is not null
     or v_refunded_at is not null
  then raise exception 'ticket_not_transferable'; end if;

  update public.transfers
  set status = 'expired'::public.transfer_status,
      updated_at = now()
  where order_item_id = p_order_item_id
    and status in (
      'requested'::public.transfer_status,
      'pending'::public.transfer_status,
      'accepted'::public.transfer_status
    )
    and expires_at <= now();

  v_expires_at := now() + interval '24 hours';

  begin
    insert into public.transfers (
      order_item_id, from_user_id, to_user_id, status, expires_at, metadata
    ) values (
      p_order_item_id,
      v_actor_id,
      p_recipient_user_id,
      'pending'::public.transfer_status,
      v_expires_at,
      jsonb_build_object('source', 'ticket_transfer')
    ) returning id into v_transfer_id;
  exception when unique_violation then
    raise exception 'transfer_already_pending';
  end;

  insert into public.notifications (
    user_id, type, payload, status, channel, dedupe_key
  ) values (
    p_recipient_user_id,
    'ticket_transfer',
    jsonb_build_object(
      'transfer_id', v_transfer_id,
      'from_user_id', v_actor_id,
      'href', '/transfers'
    ),
    'pending',
    'in_app',
    'ticket-transfer-request:' || v_transfer_id::text
  ) on conflict do nothing;

  return jsonb_build_object(
    'transfer_id', v_transfer_id,
    'order_item_id', p_order_item_id,
    'to_user_id', p_recipient_user_id,
    'status', 'pending',
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.fn_complete_transfer_unchecked(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'app', 'public'
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

  update public.order_items
  set current_owner_id = v_transfer.to_user_id,
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
$$;;

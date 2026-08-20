-- TICK-387: persistent social event invitations.
-- Attendance remains purchase-derived via v_event_friends_going. Invitations do
-- not imply a ticket, RSVP, seat, order, or payment state.

create table if not exists public.event_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','dismissed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint event_invitations_not_self check (inviter_id <> invitee_id),
  constraint event_invitations_unique_pair unique (event_id, inviter_id, invitee_id)
);

create index if not exists event_invitations_invitee_status_created_idx
  on public.event_invitations (invitee_id, status, created_at desc);
create index if not exists event_invitations_inviter_event_idx
  on public.event_invitations (inviter_id, event_id, status);

alter table public.event_invitations enable row level security;
revoke all on table public.event_invitations from public, anon;
revoke all on table public.event_invitations from authenticated;
grant select on table public.event_invitations to authenticated;

drop policy if exists event_invitations_select_participants on public.event_invitations;
create policy event_invitations_select_participants
on public.event_invitations
for select
to authenticated
using (inviter_id = (select auth.uid()) or invitee_id = (select auth.uid()));

-- Add the new in-app notification type without widening channel values.
alter table public.notifications drop constraint if exists check_notifications_type_channel;
alter table public.notifications add constraint check_notifications_type_channel check (
  type = any (array[
    'email_confirmation'::text,
    'ticket_delivery'::text,
    'transfer_notification'::text,
    'refund_alert'::text,
    'generic'::text,
    'ticket_purchase_succeeded'::text,
    'payment_succeeded'::text,
    'payment_failed'::text,
    'event_published'::text,
    'event_changed'::text,
    'event_invite'::text,
    'refund_updated'::text,
    'payout_updated'::text,
    'ticket_transfer_updated'::text,
    'tapband_credential_lost'::text
  ])
  and (channel is null or channel = any (array['email'::text,'sms'::text,'push'::text,'in_app'::text]))
);

-- Return only safe friend identity and invitation state. No order/ticket fields
-- are part of this contract.
create or replace function public.fn_event_invite_candidates(p_event_id uuid)
returns table(
  handle text,
  display_name text,
  avatar_url text,
  is_going boolean,
  invite_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth.uid() as user_id
  ), eligible_friends as (
    select case
      when uc.requester_id = me.user_id then uc.recipient_id
      else uc.requester_id
    end as friend_id
    from public.user_connections uc
    cross join me
    where me.user_id is not null
      and uc.status = 'accepted'::public.connection_status
      and (uc.requester_id = me.user_id or uc.recipient_id = me.user_id)
  )
  select
    h.handle,
    coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(concat_ws(' ', p.name, p.surname)), ''), h.handle) as display_name,
    p.avatar_url,
    exists (
      select 1
      from public.v_event_friends_going fg
      where fg.event_id = p_event_id and fg.friend_id = ef.friend_id
    ) as is_going,
    ei.status as invite_status
  from eligible_friends ef
  join public.profiles p on p.user_id = ef.friend_id
  join public.user_handles h on h.user_id = ef.friend_id
  left join public.event_invitations ei
    on ei.event_id = p_event_id
   and ei.inviter_id = (select user_id from me)
   and ei.invitee_id = ef.friend_id
  where public.fn_event_is_public_now(p_event_id)
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = (select user_id from me) and b.blocked_id = ef.friend_id)
         or (b.blocker_id = ef.friend_id and b.blocked_id = (select user_id from me))
    )
  order by is_going desc, display_name asc;
$$;

revoke all on function public.fn_event_invite_candidates(uuid) from public, anon;
grant execute on function public.fn_event_invite_candidates(uuid) to authenticated;

create or replace function public.fn_invite_friends_to_event(
  p_event_id uuid,
  p_handles text[]
)
returns table(handle text, invitation_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_event public.events%rowtype;
  v_inviter_name text;
  v_handle text;
  v_invitee uuid;
  v_invitation_id uuid;
  v_count integer := coalesce(array_length(p_handles, 1), 0);
begin
  if v_me is null then
    raise exception 'authentication required' using errcode='42501';
  end if;
  if v_count = 0 then return; end if;
  if v_count > 20 then
    raise exception 'select at most 20 friends' using errcode='22023';
  end if;
  if not public.fn_event_is_public_now(p_event_id) then
    raise exception 'event is not publicly available' using errcode='P0002';
  end if;
  if not public.fn_rate_limit('event-invite:' || v_me::text, 30, 3600) then
    raise exception 'rate_limited: too many event invitations' using errcode='P0001';
  end if;

  select e.* into v_event from public.events e where e.id = p_event_id;
  select coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(concat_ws(' ', p.name, p.surname)), ''), h.handle, 'A friend')
    into v_inviter_name
  from public.profiles p
  left join public.user_handles h on h.user_id=p.user_id
  where p.user_id=v_me;

  foreach v_handle in array p_handles loop
    v_handle := lower(regexp_replace(btrim(v_handle), '^@', ''));
    if v_handle = '' then continue; end if;

    select h.user_id into v_invitee
    from public.user_handles h
    where lower(h.handle)=v_handle
    limit 1;

    if v_invitee is null or v_invitee = v_me then continue; end if;

    -- Invites are friend-only and blocks suppress both directions.
    if not exists (
      select 1 from public.user_connections uc
      where uc.status='accepted'::public.connection_status
        and ((uc.requester_id=v_me and uc.recipient_id=v_invitee)
          or (uc.requester_id=v_invitee and uc.recipient_id=v_me))
    ) then continue; end if;

    if exists (
      select 1 from public.user_blocks b
      where (b.blocker_id=v_me and b.blocked_id=v_invitee)
         or (b.blocker_id=v_invitee and b.blocked_id=v_me)
    ) then continue; end if;

    insert into public.event_invitations (
      event_id, inviter_id, invitee_id, status, created_at, updated_at, responded_at
    ) values (
      p_event_id, v_me, v_invitee, 'pending', now(), now(), null
    )
    on conflict (event_id, inviter_id, invitee_id) do update set
      status='pending', updated_at=now(), responded_at=null
    returning id into v_invitation_id;

    insert into public.notifications (
      user_id, type, payload, status, attempts, created_at, channel, dedupe_key, read_at
    ) values (
      v_invitee,
      'event_invite',
      jsonb_build_object(
        'title', v_inviter_name || ' invited you to an event',
        'message', 'Join ' || v_inviter_name || ' at ' || v_event.title || '.',
        'eventId', v_event.id,
        'eventSlug', v_event.slug,
        'eventTitle', v_event.title,
        'inviterName', v_inviter_name,
        'invitationId', v_invitation_id
      ),
      'pending',
      0,
      now(),
      'in_app',
      'event-invite:' || p_event_id::text || ':' || v_me::text || ':' || v_invitee::text,
      null
    )
    on conflict (dedupe_key) where dedupe_key is not null do update set
      payload=excluded.payload,
      status='pending',
      attempts=0,
      last_error=null,
      created_at=now(),
      scheduled_at=null,
      sent_at=null,
      delivered_at=null,
      channel='in_app',
      read_at=null;

    handle := v_handle;
    invitation_id := v_invitation_id;
    status := 'pending';
    return next;
  end loop;
end;
$$;

revoke all on function public.fn_invite_friends_to_event(uuid,text[]) from public, anon;
grant execute on function public.fn_invite_friends_to_event(uuid,text[]) to authenticated;

create or replace function public.fn_dismiss_event_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_changed boolean := false;
begin
  if v_me is null then raise exception 'authentication required' using errcode='42501'; end if;
  update public.event_invitations
  set status='dismissed', updated_at=now(), responded_at=now()
  where id=p_invitation_id and invitee_id=v_me and status='pending';
  v_changed := found;
  return v_changed;
end;
$$;
revoke all on function public.fn_dismiss_event_invitation(uuid) from public, anon;
grant execute on function public.fn_dismiss_event_invitation(uuid) to authenticated;

create or replace function public.fn_cancel_event_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_changed boolean := false;
begin
  if v_me is null then raise exception 'authentication required' using errcode='42501'; end if;
  update public.event_invitations
  set status='cancelled', updated_at=now(), responded_at=now()
  where id=p_invitation_id and inviter_id=v_me and status='pending';
  v_changed := found;
  return v_changed;
end;
$$;
revoke all on function public.fn_cancel_event_invitation(uuid) from public, anon;
grant execute on function public.fn_cancel_event_invitation(uuid) to authenticated;

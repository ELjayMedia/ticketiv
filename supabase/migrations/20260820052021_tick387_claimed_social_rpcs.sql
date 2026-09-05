-- TICK-387: remove the owner-executed friends-going view from the exposed API.
-- Social attendance is served through claimed-account RPCs that explicitly
-- enforce friendship, privacy and block rules.

create or replace function public.fn_my_friends_going(
  p_event_ids uuid[] default null,
  p_from timestamptz default null,
  p_limit integer default 200
)
returns table(
  event_id uuid,
  friend_id uuid,
  friend_name text,
  friend_handle text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 500));
begin
  perform app.require_claimed_account();

  if p_event_ids is not null and cardinality(p_event_ids) > 50 then
    raise exception 'select at most 50 events' using errcode='22023';
  end if;

  return query
  with my_friends as (
    select case
      when uc.requester_id = v_me then uc.recipient_id
      else uc.requester_id
    end as friend_user_id
    from public.user_connections uc
    where uc.status = 'accepted'::public.connection_status
      and (uc.requester_id = v_me or uc.recipient_id = v_me)
  ),
  ticket_attendance as (
    select distinct
      tt.event_id,
      coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) as attendee_id
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.events e on e.id = tt.event_id
    where o.status = 'paid'::public.order_status
      and oi.revoked_at is null
      and oi.refunded_at is null
      and oi.status in (
        'issued'::public.order_item_status,
        'transferred'::public.order_item_status,
        'checked_in'::public.order_item_status
      )
      and coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) is not null
      and (p_event_ids is null or tt.event_id = any(p_event_ids))
      and (p_from is null or e.starts_at >= p_from)
      and public.fn_event_is_public_now(tt.event_id)
  )
  select distinct
    ta.event_id,
    p.user_id as friend_id,
    coalesce(
      nullif(btrim(concat_ws(' ', p.name, p.surname)), ''),
      nullif(btrim(p.display_name), ''),
      uh.handle,
      'Friend'
    ) as friend_name,
    uh.handle as friend_handle
  from ticket_attendance ta
  join my_friends mf on mf.friend_user_id = ta.attendee_id
  join public.profiles p on p.user_id = ta.attendee_id
  left join public.user_handles uh on uh.user_id = p.user_id
  left join public.user_privacy_settings ps on ps.user_id = p.user_id
  where coalesce(ps.show_events_going_to_friends, true)
    and not exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = v_me and b.blocked_id = p.user_id)
         or (b.blocker_id = p.user_id and b.blocked_id = v_me)
    )
  order by friend_name, event_id
  limit v_limit;
end;
$$;

revoke all on function public.fn_my_friends_going(uuid[],timestamptz,integer) from public, anon;
grant execute on function public.fn_my_friends_going(uuid[],timestamptz,integer) to authenticated;

create or replace function public.fn_event_invite_candidates(p_event_id uuid)
returns table(
  handle text,
  display_name text,
  avatar_url text,
  is_going boolean,
  invite_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  perform app.require_claimed_account();

  if not public.fn_event_is_public_now(p_event_id) then
    return;
  end if;

  return query
  with eligible_friends as (
    select case
      when uc.requester_id = v_me then uc.recipient_id
      else uc.requester_id
    end as friend_id
    from public.user_connections uc
    where uc.status = 'accepted'::public.connection_status
      and (uc.requester_id = v_me or uc.recipient_id = v_me)
  ), going as (
    select g.friend_id
    from public.fn_my_friends_going(array[p_event_id], null, 500) g
  )
  select
    h.handle,
    coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(concat_ws(' ', p.name, p.surname)), ''), h.handle) as display_name,
    p.avatar_url,
    (g.friend_id is not null) as is_going,
    ei.status as invite_status
  from eligible_friends ef
  join public.profiles p on p.user_id = ef.friend_id
  join public.user_handles h on h.user_id = ef.friend_id
  left join going g on g.friend_id = ef.friend_id
  left join public.event_invitations ei
    on ei.event_id = p_event_id
   and ei.inviter_id = v_me
   and ei.invitee_id = ef.friend_id
  where not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_me and b.blocked_id = ef.friend_id)
       or (b.blocker_id = ef.friend_id and b.blocked_id = v_me)
  )
  order by (g.friend_id is not null) desc, display_name asc;
end;
$$;

revoke all on function public.fn_event_invite_candidates(uuid) from public, anon;
grant execute on function public.fn_event_invite_candidates(uuid) to authenticated;

create or replace function public.fn_event_friend_signals(p_event_ids uuid[])
returns table(
  event_id uuid,
  friend_count integer,
  friend_names text[],
  friend_handles text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_claimed_account();

  if coalesce(cardinality(p_event_ids), 0) = 0 then
    return;
  end if;
  if cardinality(p_event_ids) > 50 then
    raise exception 'select at most 50 events' using errcode='22023';
  end if;

  return query
  select
    fg.event_id,
    count(*)::integer as friend_count,
    (array_agg(fg.friend_name order by fg.friend_name))[1:3] as friend_names,
    (array_agg(fg.friend_handle order by fg.friend_name) filter (where fg.friend_handle is not null))[1:3] as friend_handles
  from public.fn_my_friends_going(p_event_ids, null, 500) fg
  group by fg.event_id
  order by fg.event_id;
end;
$$;

revoke all on function public.fn_event_friend_signals(uuid[]) from public, anon;
grant execute on function public.fn_event_friend_signals(uuid[]) to authenticated;

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
  perform app.require_claimed_account();
  if v_count = 0 then return; end if;
  if v_count > 20 then raise exception 'select at most 20 friends' using errcode='22023'; end if;
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
  left join public.user_handles h on h.user_id = p.user_id
  where p.user_id = v_me;

  foreach v_handle in array p_handles loop
    v_handle := lower(regexp_replace(btrim(v_handle), '^@', ''));
    if v_handle = '' then continue; end if;

    select h.user_id into v_invitee
    from public.user_handles h
    where lower(h.handle) = v_handle
    limit 1;

    if v_invitee is null or v_invitee = v_me then continue; end if;

    if not exists (
      select 1 from public.user_connections uc
      where uc.status = 'accepted'::public.connection_status
        and ((uc.requester_id = v_me and uc.recipient_id = v_invitee)
          or (uc.requester_id = v_invitee and uc.recipient_id = v_me))
    ) then continue; end if;

    if exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = v_me and b.blocked_id = v_invitee)
         or (b.blocker_id = v_invitee and b.blocked_id = v_me)
    ) then continue; end if;

    insert into public.event_invitations (
      event_id, inviter_id, invitee_id, status, created_at, updated_at, responded_at
    ) values (
      p_event_id, v_me, v_invitee, 'pending', now(), now(), null
    )
    on conflict (event_id, inviter_id, invitee_id) do update set
      status = 'pending', updated_at = now(), responded_at = null
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
      'pending', 0, now(), 'in_app',
      'event-invite:' || p_event_id::text || ':' || v_me::text || ':' || v_invitee::text,
      null
    )
    on conflict (dedupe_key) where dedupe_key is not null do update set
      payload = excluded.payload,
      status = 'pending',
      attempts = 0,
      last_error = null,
      created_at = now(),
      scheduled_at = null,
      sent_at = null,
      delivered_at = null,
      channel = 'in_app',
      read_at = null;

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
  perform app.require_claimed_account();
  update public.event_invitations
  set status = 'dismissed', updated_at = now(), responded_at = now()
  where id = p_invitation_id and invitee_id = v_me and status = 'pending';
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
  perform app.require_claimed_account();
  update public.event_invitations
  set status = 'cancelled', updated_at = now(), responded_at = now()
  where id = p_invitation_id and inviter_id = v_me and status = 'pending';
  v_changed := found;
  return v_changed;
end;
$$;
revoke all on function public.fn_cancel_event_invitation(uuid) from public, anon;
grant execute on function public.fn_cancel_event_invitation(uuid) to authenticated;

drop view if exists public.v_event_friends_going;;

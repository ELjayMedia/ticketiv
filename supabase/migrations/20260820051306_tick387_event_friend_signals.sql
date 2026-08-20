-- TICK-387: make friends-going follow effective per-ticket ownership and expose a narrow batched card signal.

create or replace view public.v_event_friends_going as
with my_friends as (
  select case
    when uc.requester_id = (select auth.uid()) then uc.recipient_id
    else uc.requester_id
  end as friend_id
  from public.user_connections uc
  where uc.status = 'accepted'::public.connection_status
    and ((select auth.uid()) = uc.requester_id or (select auth.uid()) = uc.recipient_id)
),
ticket_attendance as (
  select distinct
    tt.event_id,
    coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) as attendee_id
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  where o.status = 'paid'::public.order_status
    and oi.revoked_at is null
    and oi.refunded_at is null
    and oi.status in (
      'issued'::public.order_item_status,
      'transferred'::public.order_item_status,
      'checked_in'::public.order_item_status
    )
    and coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) is not null
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
join my_friends mf on mf.friend_id = ta.attendee_id
join public.profiles p on p.user_id = ta.attendee_id
left join public.user_handles uh on uh.user_id = p.user_id
left join public.user_privacy_settings ps on ps.user_id = p.user_id
where coalesce(ps.show_events_going_to_friends, true)
  and not exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = p.user_id)
       or (b.blocker_id = p.user_id and b.blocked_id = (select auth.uid()))
  );

revoke all on table public.v_event_friends_going from public, anon, authenticated;
grant select on table public.v_event_friends_going to authenticated;

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
declare
  v_me uuid := (select auth.uid());
  v_count integer := coalesce(cardinality(p_event_ids), 0);
begin
  if v_me is null or v_count = 0 then
    return;
  end if;

  if v_count > 50 then
    raise exception 'select at most 50 events' using errcode='22023';
  end if;

  return query
  select
    fg.event_id,
    count(*)::integer as friend_count,
    (array_agg(fg.friend_name order by fg.friend_name))[1:3] as friend_names,
    (array_agg(fg.friend_handle order by fg.friend_name) filter (where fg.friend_handle is not null))[1:3] as friend_handles
  from public.v_event_friends_going fg
  where fg.event_id = any(p_event_ids)
  group by fg.event_id
  order by fg.event_id;
end;
$$;

revoke all on function public.fn_event_friend_signals(uuid[]) from public, anon;
grant execute on function public.fn_event_friend_signals(uuid[]) to authenticated;

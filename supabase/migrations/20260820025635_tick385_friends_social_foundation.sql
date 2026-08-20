-- TICK-385: Friends v1 social relationship foundation
-- Adds privacy controls and directional blocks, then exposes narrow RPCs for
-- relationship lifecycle and people search. Existing referral and ticket flows
-- remain untouched.

create table if not exists public.user_privacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_discoverability text not null default 'everyone'
    check (profile_discoverability in ('everyone', 'friends')),
  allow_friend_requests boolean not null default true,
  show_events_going_to_friends boolean not null default true,
  allow_friend_suggestions boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_privacy_settings enable row level security;

drop policy if exists user_privacy_settings_select_authenticated on public.user_privacy_settings;
create policy user_privacy_settings_select_authenticated
  on public.user_privacy_settings
  for select
  to authenticated
  using (true);

drop policy if exists user_privacy_settings_insert_self on public.user_privacy_settings;
create policy user_privacy_settings_insert_self
  on public.user_privacy_settings
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists user_privacy_settings_update_self on public.user_privacy_settings;
create policy user_privacy_settings_update_self
  on public.user_privacy_settings
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.user_privacy_settings from anon;
grant select, insert, update on public.user_privacy_settings to authenticated;
grant all privileges on public.user_privacy_settings to service_role;

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self check (blocker_id <> blocked_id),
  constraint user_blocks_pair_uniq unique (blocker_id, blocked_id)
);

create index if not exists user_blocks_blocked_id_idx on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists user_blocks_select_parties on public.user_blocks;
create policy user_blocks_select_parties
  on public.user_blocks
  for select
  to authenticated
  using (blocker_id = (select auth.uid()) or blocked_id = (select auth.uid()));

drop policy if exists user_blocks_insert_blocker on public.user_blocks;
create policy user_blocks_insert_blocker
  on public.user_blocks
  for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists user_blocks_delete_blocker on public.user_blocks;
create policy user_blocks_delete_blocker
  on public.user_blocks
  for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

revoke all on public.user_blocks from anon;
grant select, insert, delete on public.user_blocks to authenticated;
grant all privileges on public.user_blocks to service_role;

create or replace function public.fn_friend_request(p_handle text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
  v_connection public.user_connections%rowtype;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id
    into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
    and btrim(p_handle) ~ '^[A-Za-z0-9_]{3,30}$'
  limit 1;

  if v_target is null or v_target = v_me then
    return 'unavailable';
  end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_me and b.blocked_id = v_target)
       or (b.blocker_id = v_target and b.blocked_id = v_me)
  ) then
    return 'unavailable';
  end if;

  if coalesce((
    select s.allow_friend_requests
    from public.user_privacy_settings s
    where s.user_id = v_target
  ), true) = false then
    return 'unavailable';
  end if;

  select uc.*
    into v_connection
  from public.user_connections uc
  where least(uc.requester_id, uc.recipient_id) = least(v_me, v_target)
    and greatest(uc.requester_id, uc.recipient_id) = greatest(v_me, v_target)
  limit 1;

  if found then
    if v_connection.status::text = 'accepted' then
      return 'friends';
    elsif v_connection.status::text = 'pending' then
      if v_connection.requester_id = v_me then
        return 'outgoing_pending';
      end if;
      return 'incoming_pending';
    elsif v_connection.status::text = 'blocked' then
      return 'unavailable';
    elsif v_connection.status::text = 'declined' then
      delete from public.user_connections
      where id = v_connection.id;
    end if;
  end if;

  insert into public.user_connections (requester_id, recipient_id, status)
  values (v_me, v_target, 'pending');

  return 'outgoing_pending';
exception
  when unique_violation then
    select uc.*
      into v_connection
    from public.user_connections uc
    where least(uc.requester_id, uc.recipient_id) = least(v_me, v_target)
      and greatest(uc.requester_id, uc.recipient_id) = greatest(v_me, v_target)
    limit 1;

    if found and v_connection.status::text = 'accepted' then return 'friends'; end if;
    if found and v_connection.status::text = 'pending' and v_connection.requester_id = v_me then return 'outgoing_pending'; end if;
    if found and v_connection.status::text = 'pending' then return 'incoming_pending'; end if;
    return 'unavailable';
end;
$$;

create or replace function public.fn_friend_respond(p_handle text, p_accept boolean)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_requester uuid;
  v_updated uuid;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id into v_requester
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_requester is null then return 'none'; end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_me and b.blocked_id = v_requester)
       or (b.blocker_id = v_requester and b.blocked_id = v_me)
  ) then
    return 'unavailable';
  end if;

  update public.user_connections
  set status = case when p_accept then 'accepted'::public.connection_status else 'declined'::public.connection_status end
  where requester_id = v_requester
    and recipient_id = v_me
    and status = 'pending'::public.connection_status
  returning id into v_updated;

  if v_updated is null then return 'none'; end if;
  if p_accept then return 'friends'; end if;
  return 'none';
end;
$$;

create or replace function public.fn_friend_cancel(p_handle text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_target is null then return 'none'; end if;

  delete from public.user_connections
  where requester_id = v_me
    and recipient_id = v_target
    and status = 'pending'::public.connection_status;

  return 'none';
end;
$$;

create or replace function public.fn_friend_unfriend(p_handle text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_target is null then return 'none'; end if;

  delete from public.user_connections
  where status = 'accepted'::public.connection_status
    and ((requester_id = v_me and recipient_id = v_target)
      or (requester_id = v_target and recipient_id = v_me));

  return 'none';
end;
$$;

create or replace function public.fn_friend_block(p_handle text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_target is null or v_target = v_me then return 'unavailable'; end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_me, v_target)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.user_connections
  where (requester_id = v_me and recipient_id = v_target)
     or (requester_id = v_target and recipient_id = v_me);

  return 'blocked_by_me';
end;
$$;

create or replace function public.fn_friend_unblock(p_handle text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_target is null then return 'none'; end if;

  delete from public.user_blocks
  where blocker_id = v_me and blocked_id = v_target;

  return 'none';
end;
$$;

create or replace function public.fn_update_my_social_privacy(
  p_profile_discoverability text,
  p_allow_friend_requests boolean,
  p_show_events_going_to_friends boolean,
  p_allow_friend_suggestions boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_profile_discoverability not in ('everyone', 'friends') then
    raise exception 'invalid profile discoverability';
  end if;

  insert into public.user_privacy_settings (
    user_id,
    profile_discoverability,
    allow_friend_requests,
    show_events_going_to_friends,
    allow_friend_suggestions,
    updated_at
  ) values (
    v_me,
    p_profile_discoverability,
    p_allow_friend_requests,
    p_show_events_going_to_friends,
    p_allow_friend_suggestions,
    now()
  )
  on conflict (user_id) do update set
    profile_discoverability = excluded.profile_discoverability,
    allow_friend_requests = excluded.allow_friend_requests,
    show_events_going_to_friends = excluded.show_events_going_to_friends,
    allow_friend_suggestions = excluded.allow_friend_suggestions,
    updated_at = now();
end;
$$;

create or replace function public.get_social_public_profile(p_handle text)
returns table(
  handle text,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  is_owner boolean,
  relationship_state text
)
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select
      h.user_id,
      h.handle,
      p.display_name,
      p.name,
      p.surname,
      p.avatar_url,
      p.created_at,
      coalesce(s.profile_discoverability, 'everyone') as profile_discoverability
    from public.user_handles h
    join public.profiles p on p.user_id = h.user_id
    left join public.user_privacy_settings s on s.user_id = h.user_id
    where lower(h.handle) = lower(btrim(p_handle))
      and btrim(p_handle) ~ '^[A-Za-z0-9_]{3,30}$'
    limit 1
  ), me as (
    select auth.uid() as user_id
  )
  select
    t.handle,
    coalesce(
      nullif(btrim(t.display_name), ''),
      nullif(btrim(concat_ws(' ', t.name, t.surname)), ''),
      t.handle
    ) as display_name,
    t.avatar_url,
    t.created_at as joined_at,
    m.user_id = t.user_id as is_owner,
    case
      when m.user_id is null or m.user_id = t.user_id then 'none'
      when exists (
        select 1 from public.user_blocks b
        where b.blocker_id = m.user_id and b.blocked_id = t.user_id
      ) then 'blocked_by_me'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'accepted'::public.connection_status
          and ((uc.requester_id = m.user_id and uc.recipient_id = t.user_id)
            or (uc.requester_id = t.user_id and uc.recipient_id = m.user_id))
      ) then 'friends'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'pending'::public.connection_status
          and uc.requester_id = m.user_id and uc.recipient_id = t.user_id
      ) then 'outgoing_pending'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'pending'::public.connection_status
          and uc.requester_id = t.user_id and uc.recipient_id = m.user_id
      ) then 'incoming_pending'
      else 'none'
    end as relationship_state
  from target t
  cross join me m
  where not exists (
    select 1 from public.user_blocks b
    where b.blocker_id = t.user_id and b.blocked_id = m.user_id
  )
  and (
    t.profile_discoverability = 'everyone'
    or m.user_id = t.user_id
    or exists (
      select 1 from public.user_blocks b
      where b.blocker_id = m.user_id and b.blocked_id = t.user_id
    )
    or exists (
      select 1 from public.user_connections uc
      where uc.status = 'accepted'::public.connection_status
        and ((uc.requester_id = m.user_id and uc.recipient_id = t.user_id)
          or (uc.requester_id = t.user_id and uc.recipient_id = m.user_id))
    )
  )
  limit 1;
$$;

create or replace function public.fn_search_friend_profiles(p_query text, p_limit integer default 12)
returns table(
  handle text,
  display_name text,
  avatar_url text,
  relationship_state text,
  can_request boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth.uid() as user_id
  ), candidates as (
    select
      h.user_id,
      h.handle,
      coalesce(
        nullif(btrim(p.display_name), ''),
        nullif(btrim(concat_ws(' ', p.name, p.surname)), ''),
        h.handle
      ) as display_name,
      p.avatar_url,
      coalesce(s.profile_discoverability, 'everyone') as profile_discoverability,
      coalesce(s.allow_friend_requests, true) as allow_friend_requests
    from public.user_handles h
    join public.profiles p on p.user_id = h.user_id
    left join public.user_privacy_settings s on s.user_id = h.user_id
    where length(btrim(p_query)) >= 2
      and (
        h.handle ilike '%' || btrim(p_query) || '%'
        or coalesce(p.display_name, '') ilike '%' || btrim(p_query) || '%'
        or concat_ws(' ', p.name, p.surname) ilike '%' || btrim(p_query) || '%'
      )
  )
  select
    c.handle,
    c.display_name,
    c.avatar_url,
    case
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'accepted'::public.connection_status
          and ((uc.requester_id = m.user_id and uc.recipient_id = c.user_id)
            or (uc.requester_id = c.user_id and uc.recipient_id = m.user_id))
      ) then 'friends'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'pending'::public.connection_status
          and uc.requester_id = m.user_id and uc.recipient_id = c.user_id
      ) then 'outgoing_pending'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'pending'::public.connection_status
          and uc.requester_id = c.user_id and uc.recipient_id = m.user_id
      ) then 'incoming_pending'
      else 'none'
    end as relationship_state,
    c.allow_friend_requests as can_request
  from candidates c
  cross join me m
  where m.user_id is not null
    and c.user_id <> m.user_id
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = m.user_id and b.blocked_id = c.user_id)
         or (b.blocker_id = c.user_id and b.blocked_id = m.user_id)
    )
    and (
      c.profile_discoverability = 'everyone'
      or exists (
        select 1 from public.user_connections uc
        where uc.status = 'accepted'::public.connection_status
          and ((uc.requester_id = m.user_id and uc.recipient_id = c.user_id)
            or (uc.requester_id = c.user_id and uc.recipient_id = m.user_id))
      )
    )
  order by
    case when lower(c.handle) = lower(btrim(p_query)) then 0 else 1 end,
    c.display_name
  limit greatest(1, least(coalesce(p_limit, 12), 20));
$$;

revoke all on function public.fn_friend_request(text) from public, anon;
revoke all on function public.fn_friend_respond(text, boolean) from public, anon;
revoke all on function public.fn_friend_cancel(text) from public, anon;
revoke all on function public.fn_friend_unfriend(text) from public, anon;
revoke all on function public.fn_friend_block(text) from public, anon;
revoke all on function public.fn_friend_unblock(text) from public, anon;
revoke all on function public.fn_update_my_social_privacy(text, boolean, boolean, boolean) from public, anon;
revoke all on function public.fn_search_friend_profiles(text, integer) from public, anon;
revoke all on function public.get_social_public_profile(text) from public;

grant execute on function public.fn_friend_request(text) to authenticated;
grant execute on function public.fn_friend_respond(text, boolean) to authenticated;
grant execute on function public.fn_friend_cancel(text) to authenticated;
grant execute on function public.fn_friend_unfriend(text) to authenticated;
grant execute on function public.fn_friend_block(text) to authenticated;
grant execute on function public.fn_friend_unblock(text) to authenticated;
grant execute on function public.fn_update_my_social_privacy(text, boolean, boolean, boolean) to authenticated;
grant execute on function public.fn_search_friend_profiles(text, integer) to authenticated;
grant execute on function public.get_social_public_profile(text) to anon, authenticated;

create or replace view public.v_event_friends_going
with (security_invoker = true)
as
with my_friends as (
  select case
    when uc.requester_id = (select auth.uid()) then uc.recipient_id
    else uc.requester_id
  end as friend_id
  from public.user_connections uc
  where uc.status = 'accepted'::public.connection_status
    and ((select auth.uid()) = uc.requester_id or (select auth.uid()) = uc.recipient_id)
)
select distinct
  tt.event_id,
  p.user_id as friend_id,
  coalesce(nullif(btrim(concat_ws(' ', p.name, p.surname)), ''), p.display_name) as friend_name,
  uh.handle as friend_handle
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.ticket_types tt on tt.id = oi.ticket_type_id
join my_friends mf on mf.friend_id = o.buyer_id
join public.profiles p on p.user_id = o.buyer_id
left join public.user_handles uh on uh.user_id = p.user_id
left join public.user_privacy_settings ps on ps.user_id = p.user_id
where o.status = 'paid'::public.order_status
  and oi.revoked_at is null
  and coalesce(ps.show_events_going_to_friends, true)
  and not exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = p.user_id)
       or (b.blocker_id = p.user_id and b.blocked_id = (select auth.uid()))
  );
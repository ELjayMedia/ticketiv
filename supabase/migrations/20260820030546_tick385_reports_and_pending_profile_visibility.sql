-- TICK-385 follow-up: reporting and pending-request profile visibility.

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  constraint user_reports_no_self check (reporter_id <> reported_id)
);

create index if not exists user_reports_reporter_id_idx on public.user_reports(reporter_id, created_at desc);
create index if not exists user_reports_reported_id_idx on public.user_reports(reported_id, created_at desc);

alter table public.user_reports enable row level security;

drop policy if exists user_reports_select_own on public.user_reports;
create policy user_reports_select_own
  on public.user_reports
  for select
  to authenticated
  using (reporter_id = (select auth.uid()));

drop policy if exists user_reports_insert_own on public.user_reports;
create policy user_reports_insert_own
  on public.user_reports
  for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

revoke all on public.user_reports from anon;
grant select, insert on public.user_reports to authenticated;
grant all privileges on public.user_reports to service_role;

create or replace function public.fn_report_user(p_handle text, p_reason text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
  v_reason text := btrim(p_reason);
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    raise exception 'report reason must be between 3 and 500 characters';
  end if;

  select h.user_id into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_target is null or v_target = v_me then
    return false;
  end if;

  insert into public.user_reports (reporter_id, reported_id, reason)
  values (v_me, v_target, v_reason);

  return true;
end;
$$;

revoke all on function public.fn_report_user(text, text) from public, anon;
grant execute on function public.fn_report_user(text, text) to authenticated;

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
      where uc.status in ('pending'::public.connection_status, 'accepted'::public.connection_status)
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
        where uc.status in ('pending'::public.connection_status, 'accepted'::public.connection_status)
          and ((uc.requester_id = m.user_id and uc.recipient_id = c.user_id)
            or (uc.requester_id = c.user_id and uc.recipient_id = m.user_id))
      )
    )
  order by
    case when lower(c.handle) = lower(btrim(p_query)) then 0 else 1 end,
    c.display_name
  limit greatest(1, least(coalesce(p_limit, 12), 20));
$$;

revoke all on function public.get_social_public_profile(text) from public;
grant execute on function public.get_social_public_profile(text) to anon, authenticated;
revoke all on function public.fn_search_friend_profiles(text, integer) from public, anon;
grant execute on function public.fn_search_friend_profiles(text, integer) to authenticated;
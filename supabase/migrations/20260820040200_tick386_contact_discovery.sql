-- TICK-386: privacy-safe contact discovery
--
-- Contact phone values are matched transiently inside a narrow SECURITY DEFINER
-- RPC. Selected contact values are never persisted and the RPC never returns a
-- phone number. Discoverability is an explicit opt-in separate from the phone
-- number Ticketiv stores privately on a user's profile.

alter table public.user_privacy_settings
  add column if not exists discover_by_phone boolean not null default false;

-- Normalize only for equality matching. Eswatini's common local 8-digit format
-- is canonicalized to country code 268; explicit international numbers keep
-- their country code. This helper is not exposed through the Data API.
create or replace function internal.fn_contact_phone_key(p_phone text)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_digits text;
begin
  v_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

  if left(v_digits, 2) = '00' then
    v_digits := substr(v_digits, 3);
  end if;

  if length(v_digits) = 8 then
    v_digits := '268' || v_digits;
  end if;

  if length(v_digits) < 8 or length(v_digits) > 15 then
    return null;
  end if;

  return v_digits;
end;
$$;

revoke all on function internal.fn_contact_phone_key(text) from public, anon, authenticated;

create index if not exists profiles_contact_phone_key_idx
  on public.profiles ((internal.fn_contact_phone_key(phone)))
  where phone is not null and btrim(phone) <> '';

-- Keep the four-argument TICK-385 RPC for deployed-client compatibility. The
-- five-argument overload is used by TICK-386 and owns discover-by-phone.
create or replace function public.fn_update_my_social_privacy(
  p_profile_discoverability text,
  p_allow_friend_requests boolean,
  p_show_events_going_to_friends boolean,
  p_allow_friend_suggestions boolean,
  p_discover_by_phone boolean
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
    raise exception 'invalid profile discoverability' using errcode = '22023';
  end if;

  insert into public.user_privacy_settings (
    user_id,
    profile_discoverability,
    allow_friend_requests,
    show_events_going_to_friends,
    allow_friend_suggestions,
    discover_by_phone,
    updated_at
  ) values (
    v_me,
    p_profile_discoverability,
    p_allow_friend_requests,
    p_show_events_going_to_friends,
    p_allow_friend_suggestions,
    p_discover_by_phone,
    now()
  )
  on conflict (user_id) do update set
    profile_discoverability = excluded.profile_discoverability,
    allow_friend_requests = excluded.allow_friend_requests,
    show_events_going_to_friends = excluded.show_events_going_to_friends,
    allow_friend_suggestions = excluded.allow_friend_suggestions,
    discover_by_phone = excluded.discover_by_phone,
    updated_at = now();
end;
$$;

revoke all on function public.fn_update_my_social_privacy(text, boolean, boolean, boolean, boolean)
  from public, anon;
grant execute on function public.fn_update_my_social_privacy(text, boolean, boolean, boolean, boolean)
  to authenticated;

create or replace function public.fn_match_friend_contacts(p_phones text[])
returns table(
  input_index integer,
  handle text,
  display_name text,
  avatar_url text,
  relationship_state text,
  can_request boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_count integer := coalesce(array_length(p_phones, 1), 0);
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if v_count = 0 then
    return;
  end if;

  if v_count > 100 then
    raise exception 'too many contacts; select at most 100 phone numbers' using errcode = '22023';
  end if;

  -- Contact matching is a sensitive enumeration surface. Normal UI usage is a
  -- single batch after the user opens the Contact Picker, so 12 batches/hour
  -- leaves room for retries while constraining automated probing.
  if not public.fn_rate_limit('friend-contact-match:' || v_me::text, 12, 3600) then
    raise exception 'rate_limited: too many contact matching attempts' using errcode = 'P0001';
  end if;

  return query
  with inputs as (
    select
      u.ordinality::integer as input_index,
      internal.fn_contact_phone_key(u.phone) as phone_key
    from unnest(p_phones) with ordinality as u(phone, ordinality)
    where u.phone is not null
      and length(u.phone) <= 64
  ), eligible as (
    select
      i.input_index,
      h.user_id,
      h.handle,
      coalesce(
        nullif(btrim(p.display_name), ''),
        nullif(btrim(concat_ws(' ', p.name, p.surname)), ''),
        h.handle
      ) as display_name,
      p.avatar_url,
      coalesce(s.allow_friend_requests, true) as allow_friend_requests
    from inputs i
    join public.profiles p
      on i.phone_key is not null
     and internal.fn_contact_phone_key(p.phone) = i.phone_key
    join public.user_handles h on h.user_id = p.user_id
    left join public.user_privacy_settings s on s.user_id = p.user_id
    where p.user_id <> v_me
      and coalesce(s.discover_by_phone, false)
      and (
        coalesce(s.profile_discoverability, 'everyone') = 'everyone'
        or exists (
          select 1
          from public.user_connections uc
          where uc.status = 'accepted'::public.connection_status
            and ((uc.requester_id = v_me and uc.recipient_id = p.user_id)
              or (uc.requester_id = p.user_id and uc.recipient_id = v_me))
        )
      )
      and not exists (
        select 1
        from public.user_blocks b
        where (b.blocker_id = v_me and b.blocked_id = p.user_id)
           or (b.blocker_id = p.user_id and b.blocked_id = v_me)
      )
  ), unambiguous as (
    select e.*
    from eligible e
    where 1 = (
      select count(*)
      from eligible e2
      where e2.input_index = e.input_index
    )
  )
  select
    u.input_index,
    u.handle,
    u.display_name,
    u.avatar_url,
    case
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'accepted'::public.connection_status
          and ((uc.requester_id = v_me and uc.recipient_id = u.user_id)
            or (uc.requester_id = u.user_id and uc.recipient_id = v_me))
      ) then 'friends'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'pending'::public.connection_status
          and uc.requester_id = v_me and uc.recipient_id = u.user_id
      ) then 'outgoing_pending'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'pending'::public.connection_status
          and uc.requester_id = u.user_id and uc.recipient_id = v_me
      ) then 'incoming_pending'
      else 'none'
    end as relationship_state,
    u.allow_friend_requests
      and not exists (
        select 1 from public.user_connections uc
        where uc.status in ('accepted'::public.connection_status, 'pending'::public.connection_status)
          and ((uc.requester_id = v_me and uc.recipient_id = u.user_id)
            or (uc.requester_id = u.user_id and uc.recipient_id = v_me))
      ) as can_request
  from unambiguous u
  order by u.input_index;
end;
$$;

revoke all on function public.fn_match_friend_contacts(text[]) from public, anon;
grant execute on function public.fn_match_friend_contacts(text[]) to authenticated;

comment on function public.fn_match_friend_contacts(text[]) is
  'TICK-386: transiently matches user-selected phone contacts. Never returns or persists phone values.';

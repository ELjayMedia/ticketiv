-- TICK-386 follow-up: keep contact identity outside the public profile surface.
--
-- The web app already reads account name/surname/phone from user_private_profiles,
-- but production did not yet contain that table and legacy profiles.phone still
-- had broad SELECT grants. Backfill once, route future writes to the private
-- table, clear the legacy public phone field, and make contact discovery match
-- only against the private store.

create table if not exists public.user_private_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  surname text,
  phone text,
  updated_at timestamptz not null default now(),
  constraint user_private_profiles_phone_check check (
    phone is null
    or regexp_replace(phone, '[^0-9+]', '', 'g') ~ '^\+?[0-9]{7,15}$'
  )
);

alter table public.user_private_profiles enable row level security;

revoke all on table public.user_private_profiles from public, anon;
revoke all on table public.user_private_profiles from authenticated;
grant select on table public.user_private_profiles to authenticated;

drop policy if exists user_private_profiles_select_self on public.user_private_profiles;
create policy user_private_profiles_select_self
on public.user_private_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

insert into public.user_private_profiles (user_id, name, surname, phone)
select user_id, name, surname, phone
from public.profiles
where name is not null or surname is not null or phone is not null
on conflict (user_id) do update set
  name = coalesce(public.user_private_profiles.name, excluded.name),
  surname = coalesce(public.user_private_profiles.surname, excluded.surname),
  phone = coalesce(public.user_private_profiles.phone, excluded.phone),
  updated_at = now();

-- Public profile readers never need phone numbers. Remove table-level SELECT and
-- grant only the identity/display columns needed by public profile experiences.
revoke select on table public.profiles from anon, authenticated;
grant select (user_id, display_name, created_at, name, surname, locale, avatar_url)
  on table public.profiles to anon, authenticated;

-- Phone data has been backfilled. Keep the legacy column empty so even database
-- paths added later cannot accidentally expose old contact identifiers.
update public.profiles set phone = null where phone is not null;

drop index if exists public.profiles_contact_phone_key_idx;
create index if not exists user_private_profiles_contact_phone_key_idx
  on public.user_private_profiles ((public.fn_contact_phone_key(phone)))
  where phone is not null and btrim(phone) <> '';

create or replace function public.fn_bootstrap_ticketiv_user(
  p_user_id uuid,
  p_email text default null,
  p_phone text default null,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_profile public.profiles%rowtype;
  v_caller uuid := auth.uid();
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = 'P0001';
  end if;

  if v_caller is null or v_caller <> p_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.profiles (user_id, display_name)
  values (
    p_user_id,
    nullif(trim(coalesce(p_display_name, split_part(coalesce(p_email, ''), '@', 1), '')), '')
  )
  on conflict (user_id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name)
  returning * into v_profile;

  insert into public.user_private_profiles (user_id, name, surname, phone, updated_at)
  values (p_user_id, v_profile.name, v_profile.surname, v_phone, now())
  on conflict (user_id) do update set
    name = coalesce(public.user_private_profiles.name, excluded.name),
    surname = coalesce(public.user_private_profiles.surname, excluded.surname),
    phone = coalesce(public.user_private_profiles.phone, excluded.phone),
    updated_at = now();

  return jsonb_build_object(
    'user_id', v_profile.user_id,
    'display_name', v_profile.display_name,
    'avatar_url', v_profile.avatar_url
  );
end;
$$;

create or replace function public.fn_update_my_profile_unchecked(
  p_display_name text default null,
  p_name text default null,
  p_surname text default null,
  p_phone text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := (select auth.uid());
  v_name text;
  v_surname text;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.profiles
  set
    display_name = nullif(btrim(coalesce(p_display_name, display_name)), ''),
    name = nullif(btrim(coalesce(p_name, name)), ''),
    surname = nullif(btrim(coalesce(p_surname, surname)), ''),
    phone = null
  where user_id = v_user
  returning name, surname into v_name, v_surname;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  insert into public.user_private_profiles (user_id, name, surname, phone, updated_at)
  values (
    v_user,
    v_name,
    v_surname,
    nullif(btrim(coalesce(p_phone, '')), ''),
    now()
  )
  on conflict (user_id) do update set
    name = coalesce(nullif(btrim(p_name), ''), public.user_private_profiles.name, excluded.name),
    surname = coalesce(nullif(btrim(p_surname), ''), public.user_private_profiles.surname, excluded.surname),
    phone = coalesce(nullif(btrim(p_phone), ''), public.user_private_profiles.phone),
    updated_at = now();
end;
$$;

create or replace function public.fn_complete_organizer_signup(
  p_first_name text,
  p_surname text,
  p_phone text,
  p_id_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'app', 'public', 'private'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_first_name text := nullif(btrim(p_first_name), '');
  v_surname text := nullif(btrim(p_surname), '');
  v_phone text := regexp_replace(coalesce(btrim(p_phone), ''), '[^0-9+]', '', 'g');
  v_id_number text := nullif(btrim(p_id_number), '');
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  perform app.require_claimed_account();

  if v_first_name is null then raise exception 'first_name_required' using errcode = '22023'; end if;
  if char_length(v_first_name) > 100 then raise exception 'first_name_too_long' using errcode = '22023'; end if;
  if v_surname is null then raise exception 'surname_required' using errcode = '22023'; end if;
  if char_length(v_surname) > 100 then raise exception 'surname_too_long' using errcode = '22023'; end if;
  if v_phone !~ '^\+?[0-9]{7,15}$' then raise exception 'invalid_phone' using errcode = '22023'; end if;
  if v_id_number is not null and char_length(v_id_number) not between 4 and 64 then
    raise exception 'invalid_id_number_length' using errcode = '22023';
  end if;

  insert into public.profiles (user_id, display_name, name, surname, phone)
  values (v_user_id, concat_ws(' ', v_first_name, v_surname), v_first_name, v_surname, null)
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    name = excluded.name,
    surname = excluded.surname,
    phone = null
  returning * into v_profile;

  insert into public.user_private_profiles (user_id, name, surname, phone, updated_at)
  values (v_user_id, v_first_name, v_surname, v_phone, now())
  on conflict (user_id) do update set
    name = excluded.name,
    surname = excluded.surname,
    phone = excluded.phone,
    updated_at = now();

  if v_id_number is not null then
    insert into private.organizer_identity_details (user_id, id_number)
    values (v_user_id, v_id_number)
    on conflict (user_id) do update set
      id_number = excluded.id_number,
      updated_at = now();
  end if;

  return jsonb_build_object(
    'user_id', v_profile.user_id,
    'display_name', v_profile.display_name,
    'phone', v_phone,
    'has_id_number', v_id_number is not null
  );
end;
$$;

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
  if v_me is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if v_count = 0 then return; end if;
  if v_count > 100 then raise exception 'too many contacts; select at most 100 phone numbers' using errcode = '22023'; end if;
  if not public.fn_rate_limit('friend-contact-match:' || v_me::text, 12, 3600) then
    raise exception 'rate_limited: too many contact matching attempts' using errcode = 'P0001';
  end if;

  return query
  with inputs as (
    select u.ordinality::integer as input_index, public.fn_contact_phone_key(u.phone) as phone_key
    from unnest(p_phones) with ordinality as u(phone, ordinality)
    where u.phone is not null and length(u.phone) <= 64
  ), eligible as (
    select i.input_index, h.user_id, h.handle,
      coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(concat_ws(' ', p.name, p.surname)), ''), h.handle) as display_name,
      p.avatar_url, coalesce(s.allow_friend_requests, true) as allow_friend_requests
    from inputs i
    join public.user_private_profiles pp
      on i.phone_key is not null and public.fn_contact_phone_key(pp.phone) = i.phone_key
    join public.profiles p on p.user_id = pp.user_id
    join public.user_handles h on h.user_id = p.user_id
    left join public.user_privacy_settings s on s.user_id = p.user_id
    where p.user_id <> v_me
      and coalesce(s.discover_by_phone, false)
      and (
        coalesce(s.profile_discoverability, 'everyone') = 'everyone'
        or exists (
          select 1 from public.user_connections uc
          where uc.status = 'accepted'::public.connection_status
            and ((uc.requester_id = v_me and uc.recipient_id = p.user_id)
              or (uc.requester_id = p.user_id and uc.recipient_id = v_me))
        )
      )
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_me and b.blocked_id = p.user_id)
           or (b.blocker_id = p.user_id and b.blocked_id = v_me)
      )
  ), unambiguous as (
    select e.* from eligible e
    where 1 = (select count(*) from eligible e2 where e2.input_index = e.input_index)
  )
  select u.input_index, u.handle, u.display_name, u.avatar_url,
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
    u.allow_friend_requests and not exists (
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

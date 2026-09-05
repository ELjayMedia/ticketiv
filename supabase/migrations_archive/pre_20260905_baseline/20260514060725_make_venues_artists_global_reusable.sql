begin;

-- 1) Make venues global/reusable instead of organization-owned.
alter table public.events drop constraint if exists events_venue_id_fkey;
drop trigger if exists trg_event_venue_org_match on public.events;
drop function if exists public.ensure_event_venue_in_same_org();
drop function if exists public.ensure_event_venue_in_same_org(uuid, uuid);

alter table public.venues drop constraint if exists venues_org_id_fkey;
alter table public.venues drop constraint if exists ux_venues_org_name;
drop index if exists public.ux_venues_org_name;
drop index if exists public.venues_org_idx;
alter table public.venues alter column org_id drop not null;

-- Store a normalized key so the same venue typed by different organizers resolves to one row.
alter table public.venues
  add column if not exists name_key text generated always as (
    lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
  ) stored;

alter table public.venues
  add column if not exists city_key text generated always as (
    lower(regexp_replace(trim(coalesce(city, '')), '\s+', ' ', 'g'))
  ) stored;

-- Merge existing duplicate venue rows before adding the global uniqueness rule.
with ranked as (
  select
    id,
    first_value(id) over (partition by name_key, city_key order by created_at nulls last, id) as keep_id,
    row_number() over (partition by name_key, city_key order by created_at nulls last, id) as rn
  from public.venues
), moved_events as (
  update public.events e
  set venue_id = ranked.keep_id
  from ranked
  where e.venue_id = ranked.id
    and ranked.rn > 1
  returning e.id
)
delete from public.venues v
using ranked
where v.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists venues_global_name_city_unique
  on public.venues (name_key, city_key);

alter table public.events
  add constraint events_venue_id_fkey
  foreign key (venue_id) references public.venues(id) on delete restrict;

-- 2) Make artists global/reusable instead of organization-owned.
drop trigger if exists artists_create_org_on_insert_tr on public.artists;
drop function if exists public.artists_create_org_on_insert();

alter table public.artists drop constraint if exists artists_org_id_fkey;
drop index if exists public.idx_artists_org_id;
alter table public.artists alter column org_id drop not null;

alter table public.artists
  add column if not exists name_key text generated always as (
    lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
  ) stored;

-- Merge existing duplicate artist rows before adding the global uniqueness rule.
with ranked as (
  select
    id,
    first_value(id) over (partition by name_key order by created_at nulls last, id) as keep_id,
    row_number() over (partition by name_key order by created_at nulls last, id) as rn
  from public.artists
), moved_event_artists as (
  update public.event_artists ea
  set artist_id = ranked.keep_id
  from ranked
  where ea.artist_id = ranked.id
    and ranked.rn > 1
  returning ea.event_id
)
delete from public.artists a
using ranked
where a.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists artists_global_name_unique
  on public.artists (name_key);

-- 3) Helper functions for event creation/editor flows: accept typed strings, reuse existing records.
create or replace function public.slugify_text(p_value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'))
$$;

create or replace function public.fn_get_or_create_venue(
  p_name text,
  p_city text default null,
  p_address text default null,
  p_tz text default 'Africa/Mbabane',
  p_capacity integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_city text := nullif(regexp_replace(trim(coalesce(p_city, '')), '\s+', ' ', 'g'), '');
  v_id uuid;
  v_slug_base text;
  v_slug text;
  v_suffix int := 1;
begin
  if v_name is null then
    raise exception 'Venue name is required';
  end if;

  select id into v_id
  from public.venues
  where name_key = lower(v_name)
    and city_key = lower(coalesce(v_city, ''))
  limit 1;

  if v_id is not null then
    update public.venues
    set
      address = coalesce(public.venues.address, nullif(p_address, '')),
      tz = coalesce(public.venues.tz, nullif(p_tz, 'Africa/Mbabane'), p_tz),
      capacity = coalesce(public.venues.capacity, p_capacity)
    where id = v_id;
    return v_id;
  end if;

  v_slug_base := coalesce(nullif(public.slugify_text(v_name || case when v_city is not null then '-' || v_city else '' end), ''), 'venue');
  v_slug := v_slug_base;

  while exists (select 1 from public.venues where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_slug_base || '-' || v_suffix::text;
  end loop;

  insert into public.venues (org_id, name, slug, address, city, tz, capacity)
  values (null, v_name, v_slug, nullif(p_address, ''), v_city, coalesce(nullif(p_tz, ''), 'Africa/Mbabane'), p_capacity)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.fn_get_or_create_artist(
  p_name text,
  p_bio text default null,
  p_image_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_id uuid;
  v_slug_base text;
  v_slug text;
  v_suffix int := 1;
begin
  if v_name is null then
    raise exception 'Artist name is required';
  end if;

  select id into v_id
  from public.artists
  where name_key = lower(v_name)
  limit 1;

  if v_id is not null then
    update public.artists
    set
      bio = coalesce(public.artists.bio, nullif(p_bio, '')),
      image_url = coalesce(public.artists.image_url, nullif(p_image_url, ''))
    where id = v_id;
    return v_id;
  end if;

  v_slug_base := coalesce(nullif(public.slugify_text(v_name), ''), 'artist');
  v_slug := v_slug_base;

  while exists (select 1 from public.artists where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_slug_base || '-' || v_suffix::text;
  end loop;

  insert into public.artists (org_id, name, slug, bio, image_url)
  values (null, v_name, v_slug, nullif(p_bio, ''), nullif(p_image_url, ''))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.fn_link_event_artist_by_name(
  p_event_id uuid,
  p_artist_name text,
  p_role text default null,
  p_bio text default null,
  p_image_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org_id uuid;
  v_artist_id uuid;
begin
  select org_id into v_org_id from public.events where id = p_event_id;

  if v_org_id is null then
    raise exception 'Event not found';
  end if;

  if v_user is null or not public.can_manage_org(v_org_id, v_user) then
    raise exception 'Not allowed for this event';
  end if;

  v_artist_id := public.fn_get_or_create_artist(p_artist_name, p_bio, p_image_url);

  insert into public.event_artists (event_id, artist_id, role)
  values (p_event_id, v_artist_id, p_role)
  on conflict (event_id, artist_id) do update
    set role = coalesce(excluded.role, public.event_artists.role);

  return v_artist_id;
end;
$$;

grant execute on function public.fn_get_or_create_venue(text, text, text, text, integer) to authenticated;
grant execute on function public.fn_get_or_create_artist(text, text, text) to authenticated;
grant execute on function public.fn_link_event_artist_by_name(uuid, text, text, text, text) to authenticated;

commit;;

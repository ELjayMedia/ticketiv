-- TICK-482 / TICK-460 — venue spaces, availability, enquiries and bookings.
--
-- Spaces (TICK-482): a venue has any number of spaces with capacity,
-- amenities, accessibility, images and an indicative rental rate. Managers
-- edit them; the public sees a space only when it is marked public AND the
-- venue is verified.
--
-- Marketplace (TICK-460):
--   * venue_blocks — dates the venue has blocked (maintenance, private use).
--   * venue_enquiries + venue_enquiry_messages — an organiser asks for a date;
--     a threaded conversation; the venue accepts or declines. Only the two
--     parties (venue members, the enquiring organisation's members) and
--     platform admins can read them.
--   * venue_bookings — created when an enquiry is accepted. An exclusion
--     constraint stops two confirmed bookings of the same space (or of the
--     whole venue) overlapping even under concurrent accepts; the accept RPC
--     also locks the venue row and checks whole-venue vs space conflicts,
--     blocks, and events already at the venue.
--   * Events at the venue block the calendar automatically (they are read
--     live, not copied).
--   * fn_create_event_from_booking turns an accepted booking into an event
--     draft with the venue and dates filled in.
--   * fn_search_venues filters verified venues by city, capacity, type and
--     date availability. fn_venue_public_busy exposes only busy ranges, with
--     no names or organisers.
-- v1 has no money between organiser and venue: rates are indicative and
-- contracts are offline.
--
-- Additive. Rollback: drop the RPCs, the tables (venue_enquiry_messages,
-- venue_bookings, venue_enquiries, venue_blocks, venue_spaces) and
-- venues.venue_type; restore fn_update_venue_profile from
-- 20261124120000_tick481_venue_ownership.sql; re-add the previous
-- notification constraint.

-- ── venue type (search filter) ─────────────────────────────────────────────
alter table public.venues add column if not exists venue_type text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'venues_venue_type_check') then
    alter table public.venues add constraint venues_venue_type_check check (
      venue_type is null or venue_type in ('hall', 'club', 'bar', 'theatre', 'stadium', 'outdoor', 'conference', 'church', 'restaurant', 'hotel', 'other')
    );
  end if;
end $$;

drop function if exists public.fn_update_venue_profile(uuid, text, text, integer, text, text, text);
create or replace function public.fn_update_venue_profile(
  p_venue_id uuid,
  p_description text,
  p_address text,
  p_capacity integer,
  p_website text,
  p_contact_email text,
  p_contact_phone text,
  p_venue_type text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not app.is_venue_manager(p_venue_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_capacity is not null and (p_capacity < 1 or p_capacity > 200000) then
    raise exception 'capacity_invalid' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_website, '')), '') is not null and p_website !~* '^https?://' then
    raise exception 'website_invalid' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_contact_email, '')), '') is not null and p_contact_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalid' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_venue_type, '')), '') is not null and p_venue_type not in
     ('hall', 'club', 'bar', 'theatre', 'stadium', 'outdoor', 'conference', 'church', 'restaurant', 'hotel', 'other') then
    raise exception 'venue_type_invalid' using errcode = 'P0001';
  end if;

  update public.venues set
    description = nullif(btrim(coalesce(p_description, '')), ''),
    address = nullif(btrim(coalesce(p_address, '')), ''),
    capacity = p_capacity,
    website = nullif(btrim(coalesce(p_website, '')), ''),
    contact_email = nullif(btrim(coalesce(p_contact_email, '')), ''),
    contact_phone = nullif(btrim(coalesce(p_contact_phone, '')), ''),
    -- null keeps the current type (older callers); '' clears it.
    venue_type = case when p_venue_type is null then venue_type else nullif(btrim(p_venue_type), '') end
  where id = p_venue_id;

  perform app.audit_venue('venues', p_venue_id::text, 'venue_profile_updated', null);
end;
$$;
revoke all on function public.fn_update_venue_profile(uuid, text, text, integer, text, text, text, text) from public, anon;
grant execute on function public.fn_update_venue_profile(uuid, text, text, integer, text, text, text, text) to authenticated, service_role;

-- ── spaces ─────────────────────────────────────────────────────────────────
create table if not exists public.venue_spaces (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text check (description is null or char_length(description) <= 2000),
  capacity_standing integer check (capacity_standing is null or capacity_standing between 1 and 200000),
  capacity_seated integer check (capacity_seated is null or capacity_seated between 1 and 200000),
  amenities text[] not null default '{}',
  accessibility text[] not null default '{}',
  image_urls text[] not null default '{}',
  rate_cents integer check (rate_cents is null or rate_cents between 0 and 100000000),
  rate_currency text not null default 'SZL' check (rate_currency ~ '^[A-Z]{3}$'),
  rate_unit text check (rate_unit is null or rate_unit in ('hour', 'day', 'event')),
  rate_note text check (rate_note is null or char_length(rate_note) <= 300),
  is_public boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists venue_spaces_venue_idx on public.venue_spaces (venue_id, sort_order);

create or replace function app.venue_amenity_keys() returns text[]
language sql immutable set search_path to '' as $$
  select array['stage', 'sound_system', 'lighting', 'projector', 'dressing_room', 'bar', 'kitchen', 'catering',
               'parking', 'security', 'generator', 'wifi', 'air_conditioning', 'outdoor_area', 'seating', 'toilets']
$$;
create or replace function app.venue_accessibility_keys() returns text[]
language sql immutable set search_path to '' as $$
  select array['step_free_entry', 'wheelchair_seating', 'accessible_toilet', 'lift', 'hearing_loop',
               'accessible_parking', 'quiet_room', 'service_animals']
$$;

-- ── blocks, enquiries, bookings ────────────────────────────────────────────
create table if not exists public.venue_blocks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  space_id uuid references public.venue_spaces (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text check (note is null or char_length(note) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists venue_blocks_venue_idx on public.venue_blocks (venue_id, starts_at);

create table if not exists public.venue_enquiries (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  space_id uuid references public.venue_spaces (id) on delete set null,
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- Snapshot: venue members can't read other organisations' rows.
  org_name text,
  requested_by uuid references auth.users (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expected_attendance integer check (expected_attendance is null or expected_attendance between 1 and 200000),
  budget_cents integer check (budget_cents is null or budget_cents between 0 and 100000000),
  currency text not null default 'SZL' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'withdrawn')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists venue_enquiries_venue_idx on public.venue_enquiries (venue_id, status, starts_at);
create index if not exists venue_enquiries_org_idx on public.venue_enquiries (org_id, created_at desc);

create table if not exists public.venue_enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.venue_enquiries (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  side text not null check (side in ('venue', 'organizer')),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists venue_enquiry_messages_enquiry_idx on public.venue_enquiry_messages (enquiry_id, created_at);

create table if not exists public.venue_bookings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  space_id uuid references public.venue_spaces (id) on delete restrict,
  -- The space being booked, or the venue itself for a whole-venue booking.
  space_key uuid generated always as (coalesce(space_id, venue_id)) stored,
  enquiry_id uuid unique references public.venue_enquiries (id) on delete set null,
  org_id uuid not null references public.organizations (id) on delete cascade,
  org_name text,
  event_id uuid references public.events (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  cancelled_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint venue_bookings_no_overlap exclude using gist (
    space_key with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed')
);
create index if not exists venue_bookings_venue_idx on public.venue_bookings (venue_id, starts_at);
create index if not exists venue_bookings_org_idx on public.venue_bookings (org_id, starts_at);

-- ── access helpers ─────────────────────────────────────────────────────────
create or replace function app.is_enquiry_party(p_enquiry uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.venue_enquiries e
     where e.id = p_enquiry
       and (app.is_venue_member(e.venue_id) or app.is_org_member_of(e.org_id) or app.is_platform_admin())
  )
$$;
revoke all on function app.is_enquiry_party(uuid) from public, anon;
grant execute on function app.is_enquiry_party(uuid) to authenticated, service_role;

-- ── RLS (reads only; writes go through the RPCs) ───────────────────────────
alter table public.venue_spaces enable row level security;
alter table public.venue_blocks enable row level security;
alter table public.venue_enquiries enable row level security;
alter table public.venue_enquiry_messages enable row level security;
alter table public.venue_bookings enable row level security;

revoke all on public.venue_spaces, public.venue_blocks, public.venue_enquiries, public.venue_enquiry_messages, public.venue_bookings from anon, authenticated;
grant select on public.venue_spaces to anon, authenticated;
grant select on public.venue_blocks, public.venue_enquiries, public.venue_enquiry_messages, public.venue_bookings to authenticated;
grant all on public.venue_spaces, public.venue_blocks, public.venue_enquiries, public.venue_enquiry_messages, public.venue_bookings to service_role;

drop policy if exists venue_spaces_public_select on public.venue_spaces;
create policy venue_spaces_public_select on public.venue_spaces for select to anon, authenticated
  using (is_public and exists (select 1 from public.venues v where v.id = venue_id and v.verification_status = 'verified'));
drop policy if exists venue_spaces_member_select on public.venue_spaces;
create policy venue_spaces_member_select on public.venue_spaces for select to authenticated
  using (app.is_venue_member(venue_id) or app.is_platform_admin());

drop policy if exists venue_blocks_member_select on public.venue_blocks;
create policy venue_blocks_member_select on public.venue_blocks for select to authenticated
  using (app.is_venue_member(venue_id) or app.is_platform_admin());

drop policy if exists venue_enquiries_party_select on public.venue_enquiries;
create policy venue_enquiries_party_select on public.venue_enquiries for select to authenticated
  using (app.is_venue_member(venue_id) or app.is_org_member_of(org_id) or app.is_platform_admin());

drop policy if exists venue_enquiry_messages_party_select on public.venue_enquiry_messages;
create policy venue_enquiry_messages_party_select on public.venue_enquiry_messages for select to authenticated
  using (app.is_enquiry_party(enquiry_id));

drop policy if exists venue_bookings_party_select on public.venue_bookings;
create policy venue_bookings_party_select on public.venue_bookings for select to authenticated
  using (app.is_venue_member(venue_id) or app.is_org_member_of(org_id) or app.is_platform_admin());

-- ── conflict check ─────────────────────────────────────────────────────────
-- True when [p_starts, p_ends) clashes with a confirmed booking, a block or an
-- event at the venue. A whole-venue request (p_space null) clashes with
-- anything at the venue; a space request clashes with the same space or with
-- whole-venue bookings and blocks. Events not created from a booking hold the
-- whole venue; events without an end are assumed to run six hours.
create or replace function app.venue_slot_conflict(
  p_venue uuid, p_space uuid, p_starts timestamptz, p_ends timestamptz, p_exclude_booking uuid default null
)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(
    (select 'booking' from public.venue_bookings b
      where b.venue_id = p_venue and b.status = 'confirmed'
        and (p_exclude_booking is null or b.id <> p_exclude_booking)
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts, p_ends, '[)')
        and (p_space is null or b.space_id is null or b.space_id = p_space)
      limit 1),
    (select 'blocked' from public.venue_blocks k
      where k.venue_id = p_venue
        and tstzrange(k.starts_at, k.ends_at, '[)') && tstzrange(p_starts, p_ends, '[)')
        and (p_space is null or k.space_id is null or k.space_id = p_space)
      limit 1),
    (select 'event' from public.events e
      where e.venue_id = p_venue and e.cancelled_at is null and e.status in ('published', 'paused')
        and e.starts_at is not null
        and not exists (select 1 from public.venue_bookings b where b.event_id = e.id and b.status = 'confirmed')
        and tstzrange(e.starts_at, coalesce(e.ends_at, e.starts_at + interval '6 hours'), '[)') && tstzrange(p_starts, p_ends, '[)')
      limit 1)
  )
$$;
revoke all on function app.venue_slot_conflict(uuid, uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;

-- ── RPC: spaces ────────────────────────────────────────────────────────────
create or replace function public.fn_save_venue_space(
  p_venue_id uuid,
  p_space_id uuid,
  p_name text,
  p_description text,
  p_capacity_standing integer,
  p_capacity_seated integer,
  p_amenities text[],
  p_accessibility text[],
  p_image_urls text[],
  p_rate_cents integer,
  p_rate_currency text,
  p_rate_unit text,
  p_rate_note text,
  p_is_public boolean
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
  v_amenities text[] := array(select distinct lower(btrim(x)) from unnest(coalesce(p_amenities, '{}')) x where btrim(x) <> '' order by 1);
  v_access text[] := array(select distinct lower(btrim(x)) from unnest(coalesce(p_accessibility, '{}')) x where btrim(x) <> '' order by 1);
  v_images text[] := array(select btrim(x) from unnest(coalesce(p_image_urls, '{}')) with ordinality as t(x, i) where btrim(x) <> '' order by i);
begin
  if not app.is_venue_manager(p_venue_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not (v_amenities <@ app.venue_amenity_keys()) then
    raise exception 'amenity_invalid' using errcode = 'P0001';
  end if;
  if not (v_access <@ app.venue_accessibility_keys()) then
    raise exception 'accessibility_invalid' using errcode = 'P0001';
  end if;
  if cardinality(v_images) > 8 or exists (select 1 from unnest(v_images) u where u !~ '^https://') then
    raise exception 'image_invalid' using errcode = 'P0001';
  end if;
  if p_rate_cents is not null and p_rate_unit is null then
    raise exception 'rate_unit_required' using errcode = 'P0001';
  end if;

  if p_space_id is null then
    if (select count(*) from public.venue_spaces where venue_id = p_venue_id) >= 50 then
      raise exception 'too_many_spaces' using errcode = 'P0001';
    end if;
    insert into public.venue_spaces (venue_id, name, description, capacity_standing, capacity_seated, amenities, accessibility,
                                     image_urls, rate_cents, rate_currency, rate_unit, rate_note, is_public, sort_order)
    values (p_venue_id, btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), p_capacity_standing, p_capacity_seated,
            v_amenities, v_access, v_images, p_rate_cents, coalesce(nullif(upper(btrim(coalesce(p_rate_currency, ''))), ''), 'SZL'),
            p_rate_unit, nullif(btrim(coalesce(p_rate_note, '')), ''), coalesce(p_is_public, false),
            coalesce((select max(sort_order) + 1 from public.venue_spaces where venue_id = p_venue_id), 0))
    returning id into v_id;
    perform app.audit_venue('venue_spaces', v_id::text, 'venue_space_created', jsonb_build_object('venue_id', p_venue_id));
  else
    update public.venue_spaces set
      name = btrim(p_name),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      capacity_standing = p_capacity_standing,
      capacity_seated = p_capacity_seated,
      amenities = v_amenities,
      accessibility = v_access,
      image_urls = v_images,
      rate_cents = p_rate_cents,
      rate_currency = coalesce(nullif(upper(btrim(coalesce(p_rate_currency, ''))), ''), 'SZL'),
      rate_unit = p_rate_unit,
      rate_note = nullif(btrim(coalesce(p_rate_note, '')), ''),
      is_public = coalesce(p_is_public, false),
      updated_at = now()
    where id = p_space_id and venue_id = p_venue_id
    returning id into v_id;
    if v_id is null then
      raise exception 'space_not_found' using errcode = 'P0002';
    end if;
    perform app.audit_venue('venue_spaces', v_id::text, 'venue_space_updated', jsonb_build_object('venue_id', p_venue_id));
  end if;
  return v_id;
end;
$$;
revoke all on function public.fn_save_venue_space(uuid, uuid, text, text, integer, integer, text[], text[], text[], integer, text, text, text, boolean) from public, anon;
grant execute on function public.fn_save_venue_space(uuid, uuid, text, text, integer, integer, text[], text[], text[], integer, text, text, text, boolean) to authenticated, service_role;

create or replace function public.fn_delete_venue_space(p_space_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_venue uuid;
begin
  select venue_id into v_venue from public.venue_spaces where id = p_space_id;
  if v_venue is null or not app.is_venue_manager(v_venue) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.venue_bookings where space_id = p_space_id and status = 'confirmed' and ends_at > now()) then
    raise exception 'space_has_bookings' using errcode = 'P0001';
  end if;
  update public.venue_bookings set space_id = null where space_id = p_space_id and status = 'cancelled';
  delete from public.venue_spaces where id = p_space_id;
  perform app.audit_venue('venue_spaces', p_space_id::text, 'venue_space_deleted', jsonb_build_object('venue_id', v_venue));
end;
$$;
revoke all on function public.fn_delete_venue_space(uuid) from public, anon;
grant execute on function public.fn_delete_venue_space(uuid) to authenticated, service_role;

-- ── RPC: blocks ────────────────────────────────────────────────────────────
create or replace function public.fn_add_venue_block(p_venue_id uuid, p_space_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_note text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
begin
  if not app.is_venue_manager(p_venue_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_ends_at is null or p_starts_at is null or p_ends_at <= p_starts_at or p_ends_at - p_starts_at > interval '366 days' then
    raise exception 'dates_invalid' using errcode = 'P0001';
  end if;
  if p_space_id is not null and not exists (select 1 from public.venue_spaces where id = p_space_id and venue_id = p_venue_id) then
    raise exception 'space_not_found' using errcode = 'P0002';
  end if;
  perform 1 from public.venues where id = p_venue_id for update;
  if exists (select 1 from public.venue_bookings b where b.venue_id = p_venue_id and b.status = 'confirmed'
              and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
              and (p_space_id is null or b.space_id is null or b.space_id = p_space_id)) then
    raise exception 'slot_booked' using errcode = 'P0001';
  end if;
  insert into public.venue_blocks (venue_id, space_id, starts_at, ends_at, note, created_by)
  values (p_venue_id, p_space_id, p_starts_at, p_ends_at, nullif(btrim(coalesce(p_note, '')), ''), (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.fn_add_venue_block(uuid, uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.fn_add_venue_block(uuid, uuid, timestamptz, timestamptz, text) to authenticated, service_role;

create or replace function public.fn_remove_venue_block(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_venue uuid;
begin
  select venue_id into v_venue from public.venue_blocks where id = p_block_id;
  if v_venue is null or not app.is_venue_manager(v_venue) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.venue_blocks where id = p_block_id;
end;
$$;
revoke all on function public.fn_remove_venue_block(uuid) from public, anon;
grant execute on function public.fn_remove_venue_block(uuid) to authenticated, service_role;

-- ── RPC: enquiries ─────────────────────────────────────────────────────────
create or replace function public.fn_submit_venue_enquiry(
  p_venue_id uuid,
  p_space_id uuid,
  p_org_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_expected_attendance integer,
  p_budget_cents integer,
  p_currency text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_id uuid;
  v_venue_name text;
  v_org_name text;
begin
  perform app.require_claimed_account();
  if not app.is_org_manager(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select name into v_venue_name from public.venues where id = p_venue_id and verification_status = 'verified';
  if v_venue_name is null then
    raise exception 'venue_not_listed' using errcode = 'P0001';
  end if;
  if p_space_id is not null and not exists (select 1 from public.venue_spaces where id = p_space_id and venue_id = p_venue_id and is_public) then
    raise exception 'space_not_found' using errcode = 'P0002';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at or p_starts_at < now()
     or p_ends_at - p_starts_at > interval '14 days' then
    raise exception 'dates_invalid' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) < 10 then
    raise exception 'message_required' using errcode = 'P0001';
  end if;
  if (select count(*) from public.venue_enquiries where requested_by = v_user and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'enquiry_rate_limited' using errcode = 'P0001';
  end if;

  select name into v_org_name from public.organizations where id = p_org_id;
  insert into public.venue_enquiries (venue_id, space_id, org_id, org_name, requested_by, starts_at, ends_at, expected_attendance, budget_cents, currency)
  values (p_venue_id, p_space_id, p_org_id, v_org_name, v_user, p_starts_at, p_ends_at, p_expected_attendance, p_budget_cents,
          coalesce(nullif(upper(btrim(coalesce(p_currency, ''))), ''), 'SZL'))
  returning id into v_id;
  insert into public.venue_enquiry_messages (enquiry_id, author_id, side, body) values (v_id, v_user, 'organizer', btrim(p_message));

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  select vm.user_id, 'venue_enquiry', jsonb_build_object(
           'enquiryId', v_id, 'venueId', p_venue_id,
           'title', 'New enquiry for ' || v_venue_name,
           'body', coalesce(v_org_name, 'An organiser') || ' asked about ' || to_char(p_starts_at at time zone 'Africa/Mbabane', 'Dy FMDD Mon YYYY') || '.',
           'href', '/manage/venues/' || p_venue_id || '/enquiries/' || v_id),
         'pending', 'in_app', 'venue_enquiry:' || v_id || ':' || vm.user_id
    from public.venue_members vm
   where vm.venue_id = p_venue_id and vm.role in ('venue_owner', 'venue_manager')
  on conflict do nothing;

  perform app.audit_venue('venue_enquiries', v_id::text, 'venue_enquiry_submitted', jsonb_build_object('venue_id', p_venue_id, 'org_id', p_org_id));
  return v_id;
end;
$$;
revoke all on function public.fn_submit_venue_enquiry(uuid, uuid, uuid, timestamptz, timestamptz, integer, integer, text, text) from public, anon;
grant execute on function public.fn_submit_venue_enquiry(uuid, uuid, uuid, timestamptz, timestamptz, integer, integer, text, text) to authenticated, service_role;

create or replace function public.fn_post_venue_enquiry_message(p_enquiry_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := (select auth.uid());
  e public.venue_enquiries%rowtype;
  v_side text;
  v_id uuid;
begin
  select * into e from public.venue_enquiries where id = p_enquiry_id;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if app.is_venue_manager(e.venue_id) then
    v_side := 'venue';
  elsif app.is_org_manager(e.org_id) then
    v_side := 'organizer';
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'message_required' using errcode = 'P0001';
  end if;
  if e.status in ('declined', 'withdrawn') then
    raise exception 'enquiry_closed' using errcode = 'P0001';
  end if;
  insert into public.venue_enquiry_messages (enquiry_id, author_id, side, body) values (p_enquiry_id, v_user, v_side, btrim(p_body))
  returning id into v_id;
  update public.venue_enquiries set updated_at = now() where id = p_enquiry_id;

  -- Tell the other side.
  if v_side = 'venue' then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    select e.requested_by, 'venue_enquiry_message', jsonb_build_object(
             'enquiryId', e.id, 'title', 'New reply about your venue enquiry', 'body', left(btrim(p_body), 140),
             'href', '/orgs/' || e.org_id || '/venue-enquiries/' || e.id),
           'pending', 'in_app', 'venue_enquiry_message:' || v_id
     where e.requested_by is not null
    on conflict do nothing;
  else
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    select vm.user_id, 'venue_enquiry_message', jsonb_build_object(
             'enquiryId', e.id, 'title', 'New message on an enquiry', 'body', left(btrim(p_body), 140),
             'href', '/manage/venues/' || e.venue_id || '/enquiries/' || e.id),
           'pending', 'in_app', 'venue_enquiry_message:' || v_id || ':' || vm.user_id
      from public.venue_members vm
     where vm.venue_id = e.venue_id and vm.role in ('venue_owner', 'venue_manager')
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;
revoke all on function public.fn_post_venue_enquiry_message(uuid, text) from public, anon;
grant execute on function public.fn_post_venue_enquiry_message(uuid, text) to authenticated, service_role;

-- Venue accepts (creates a confirmed booking) or declines an open enquiry.
create or replace function public.fn_decide_venue_enquiry(p_enquiry_id uuid, p_accept boolean, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := (select auth.uid());
  e public.venue_enquiries%rowtype;
  v_conflict text;
  v_booking uuid;
  v_venue_name text;
begin
  select * into e from public.venue_enquiries where id = p_enquiry_id for update;
  if not found or not app.is_venue_manager(e.venue_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if e.status <> 'open' then
    raise exception 'enquiry_not_open' using errcode = 'P0001';
  end if;
  select name into v_venue_name from public.venues where id = e.venue_id for update;  -- serialise accepts per venue

  if coalesce(p_accept, false) then
    if e.starts_at < now() then
      raise exception 'dates_invalid' using errcode = 'P0001';
    end if;
    v_conflict := app.venue_slot_conflict(e.venue_id, e.space_id, e.starts_at, e.ends_at);
    if v_conflict is not null then
      raise exception 'slot_unavailable' using errcode = 'P0001', detail = v_conflict;
    end if;
    insert into public.venue_bookings (venue_id, space_id, enquiry_id, org_id, org_name, starts_at, ends_at)
    values (e.venue_id, e.space_id, e.id, e.org_id, e.org_name, e.starts_at, e.ends_at)
    returning id into v_booking;
  end if;

  update public.venue_enquiries set
    status = case when coalesce(p_accept, false) then 'accepted' else 'declined' end,
    decided_by = v_user, decided_at = now(), updated_at = now(),
    decision_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = e.id;

  if e.requested_by is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (e.requested_by, 'venue_enquiry_decision', jsonb_build_object(
              'enquiryId', e.id, 'bookingId', v_booking, 'accepted', coalesce(p_accept, false),
              'title', v_venue_name || case when coalesce(p_accept, false) then ' accepted your enquiry' else ' declined your enquiry' end,
              'body', coalesce(nullif(btrim(coalesce(p_note, '')), ''),
                               case when coalesce(p_accept, false) then 'The date is booked. Create the event draft when you are ready.'
                                    else 'You can enquire about another date.' end),
              'href', '/orgs/' || e.org_id || '/venue-enquiries/' || e.id),
            'pending', 'in_app', 'venue_enquiry_decision:' || e.id)
    on conflict do nothing;
  end if;

  perform app.audit_venue('venue_enquiries', e.id::text,
                          case when coalesce(p_accept, false) then 'venue_enquiry_accepted' else 'venue_enquiry_declined' end,
                          jsonb_build_object('booking_id', v_booking));
  return v_booking;
end;
$$;
revoke all on function public.fn_decide_venue_enquiry(uuid, boolean, text) from public, anon;
grant execute on function public.fn_decide_venue_enquiry(uuid, boolean, text) to authenticated, service_role;

create or replace function public.fn_withdraw_venue_enquiry(p_enquiry_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  e public.venue_enquiries%rowtype;
begin
  select * into e from public.venue_enquiries where id = p_enquiry_id for update;
  if not found or not app.is_org_manager(e.org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if e.status <> 'open' then
    raise exception 'enquiry_not_open' using errcode = 'P0001';
  end if;
  update public.venue_enquiries set status = 'withdrawn', updated_at = now() where id = e.id;
  perform app.audit_venue('venue_enquiries', e.id::text, 'venue_enquiry_withdrawn', null);
end;
$$;
revoke all on function public.fn_withdraw_venue_enquiry(uuid) from public, anon;
grant execute on function public.fn_withdraw_venue_enquiry(uuid) to authenticated, service_role;

-- Either side's managers may cancel a future confirmed booking; the date frees up.
create or replace function public.fn_cancel_venue_booking(p_booking_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  b public.venue_bookings%rowtype;
begin
  select * into b from public.venue_bookings where id = p_booking_id for update;
  if not found or not (app.is_venue_manager(b.venue_id) or app.is_org_manager(b.org_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if b.status <> 'confirmed' then
    raise exception 'booking_not_confirmed' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.venue_bookings set status = 'cancelled', cancelled_by = (select auth.uid()), cancelled_at = now() where id = b.id;
  if b.enquiry_id is not null then
    insert into public.venue_enquiry_messages (enquiry_id, author_id, side, body)
    values (b.enquiry_id, (select auth.uid()), case when app.is_venue_manager(b.venue_id) then 'venue' else 'organizer' end,
            'Booking cancelled: ' || btrim(p_reason));
  end if;
  perform app.audit_venue('venue_bookings', b.id::text, 'venue_booking_cancelled', jsonb_build_object('reason', btrim(p_reason)));
end;
$$;
revoke all on function public.fn_cancel_venue_booking(uuid, text) from public, anon;
grant execute on function public.fn_cancel_venue_booking(uuid, text) to authenticated, service_role;

-- Accepted booking → event draft with the venue and dates filled in.
create or replace function public.fn_create_event_from_booking(p_booking_id uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  b public.venue_bookings%rowtype;
  v_event uuid;
begin
  select * into b from public.venue_bookings where id = p_booking_id for update;
  if not found or not app.is_org_manager(b.org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if b.status <> 'confirmed' then
    raise exception 'booking_not_confirmed' using errcode = 'P0001';
  end if;
  if b.event_id is not null then
    return b.event_id;
  end if;
  v_event := public.create_event_draft(b.org_id, p_title, 'private');
  update public.events set venue_id = b.venue_id, starts_at = b.starts_at, ends_at = b.ends_at where id = v_event;
  update public.venue_bookings set event_id = v_event where id = b.id;
  perform app.audit_venue('venue_bookings', b.id::text, 'venue_booking_event_created', jsonb_build_object('event_id', v_event));
  return v_event;
end;
$$;
revoke all on function public.fn_create_event_from_booking(uuid, text) from public, anon;
grant execute on function public.fn_create_event_from_booking(uuid, text) to authenticated, service_role;

-- ── RPC: search and public availability ────────────────────────────────────
create or replace function public.fn_search_venues(
  p_city text default null,
  p_min_capacity integer default null,
  p_max_capacity integer default null,
  p_venue_type text default null,
  p_date date default null
)
returns table (id uuid, name text, slug text, city text, venue_type text, capacity integer, space_count integer, available boolean)
language sql
stable
security definer
set search_path to ''
as $$
  with v as (
    select v.id, v.name, v.slug, v.city, v.venue_type,
           greatest(coalesce(v.capacity, 0),
                    coalesce((select max(greatest(coalesce(s.capacity_standing, 0), coalesce(s.capacity_seated, 0)))
                                from public.venue_spaces s where s.venue_id = v.id and s.is_public), 0)) as capacity,
           (select count(*) from public.venue_spaces s where s.venue_id = v.id and s.is_public)::integer as space_count
      from public.venues v
     where v.verification_status = 'verified'
       and (nullif(btrim(coalesce(p_city, '')), '') is null or v.city_key = lower(btrim(p_city)) or v.city ilike btrim(p_city))
       and (nullif(btrim(coalesce(p_venue_type, '')), '') is null or v.venue_type = p_venue_type)
  )
  select v.id, v.name, v.slug, v.city, v.venue_type, nullif(v.capacity, 0), v.space_count,
         case when p_date is null then null
              when v.space_count = 0 then
                app.venue_slot_conflict(v.id, null, p_date::timestamptz, (p_date + 1)::timestamptz) is null
              else exists (
                select 1 from public.venue_spaces s where s.venue_id = v.id and s.is_public
                   and app.venue_slot_conflict(v.id, s.id, p_date::timestamptz, (p_date + 1)::timestamptz) is null)
         end
    from v
   where (p_min_capacity is null or v.capacity >= p_min_capacity)
     and (p_max_capacity is null or (v.capacity > 0 and v.capacity <= p_max_capacity))
   order by v.name
   limit 200
$$;
revoke all on function public.fn_search_venues(text, integer, integer, text, date) from public;
grant execute on function public.fn_search_venues(text, integer, integer, text, date) to anon, authenticated, service_role;

-- Busy ranges for a verified venue: no names, organisers or notes.
create or replace function public.fn_venue_public_busy(p_venue_id uuid, p_from date, p_to date)
returns table (space_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  select b.space_id, b.starts_at, b.ends_at from public.venue_bookings b
   join public.venues v on v.id = b.venue_id and v.verification_status = 'verified'
   where b.venue_id = p_venue_id and b.status = 'confirmed'
     and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_from::timestamptz, (p_to + 1)::timestamptz, '[)')
     and p_to - p_from <= 400
  union all
  select k.space_id, k.starts_at, k.ends_at from public.venue_blocks k
   join public.venues v on v.id = k.venue_id and v.verification_status = 'verified'
   where k.venue_id = p_venue_id
     and tstzrange(k.starts_at, k.ends_at, '[)') && tstzrange(p_from::timestamptz, (p_to + 1)::timestamptz, '[)')
     and p_to - p_from <= 400
  union all
  select null::uuid, e.starts_at, coalesce(e.ends_at, e.starts_at + interval '6 hours') from public.events e
   join public.venues v on v.id = e.venue_id and v.verification_status = 'verified'
   where e.venue_id = p_venue_id and e.cancelled_at is null and e.status in ('published', 'paused') and e.starts_at is not null
     and not exists (select 1 from public.venue_bookings b where b.event_id = e.id and b.status = 'confirmed')
     and tstzrange(e.starts_at, coalesce(e.ends_at, e.starts_at + interval '6 hours'), '[)') && tstzrange(p_from::timestamptz, (p_to + 1)::timestamptz, '[)')
     and p_to - p_from <= 400
  order by 2
$$;
revoke all on function public.fn_venue_public_busy(uuid, date, date) from public;
grant execute on function public.fn_venue_public_busy(uuid, date, date) to anon, authenticated, service_role;

-- ── notification types ─────────────────────────────────────────────────────
alter table public.notifications drop constraint if exists check_notifications_type_channel;
alter table public.notifications add constraint check_notifications_type_channel check (
  type = any (array[
    'email_confirmation', 'ticket_delivery', 'transfer_notification', 'refund_alert', 'generic',
    'ticket_purchase_succeeded', 'payment_succeeded', 'payment_failed', 'event_published',
    'event_changed', 'event_invite', 'refund_updated', 'payout_updated', 'ticket_transfer_updated',
    'tapband_credential_lost', 'ticket_transfer', 'ticket_transfer_accepted', 'ticket_transfer_declined',
    'organizer_new_event', 'artist_new_event', 'event_update', 'event_reminder', 'saved_event_reminder',
    'feedback_request', 'duplicate_permission_request', 'duplicate_permission_decision',
    'email_broadcast', 'refund_request', 'resale_listing_created', 'resale_purchase_completed',
    'waitlist_offer_fulfilled',
    'venue_claim_decision',
    'venue_new_event',
    'artist_claim_decision',
    'resale_listing_sold',
    'series_new_event',
    'venue_enquiry',
    'venue_enquiry_message',
    'venue_enquiry_decision'
  ]::text[])
  and (channel is null or channel = any (array['email', 'sms', 'push', 'in_app']::text[]))
);

comment on table public.venue_spaces is 'Rentable spaces within a venue (TICK-482). Public only when is_public and the venue is verified.';
comment on table public.venue_enquiries is 'Organiser enquiries to a venue (TICK-460). Visible to the two parties and platform admins.';
comment on table public.venue_bookings is 'Confirmed venue bookings; venue_bookings_no_overlap prevents double booking of a space or the whole venue.';

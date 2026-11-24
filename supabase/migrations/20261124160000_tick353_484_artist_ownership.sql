-- TICK-353 / TICK-484 — claim existing artist profiles, manager permissions,
-- public press kit.
--
-- Artists are global records (name_key is unique), created on line-ups by
-- organisers (fn_get_or_create_artist) or by the performer themselves
-- (fn_create_talent_profile, sets primary_user_id). This adds:
--
--   artist_members  owner / manager per artist; the owner row is kept in sync
--                   with artists.primary_user_id by trigger, so existing
--                   talent profiles and the Talent context keep working.
--   artist_claims   a request to manage an existing artist, reviewed by a
--                   platform admin (same rules as venue claims: no access until
--                   approved; a second owner claim is a dispute that needs an
--                   explicit replace-owner decision; the previous owner stays a
--                   manager).
--   profile fields  genres, links, press kit, booking contact, verification.
--
-- All writes go through SECURITY DEFINER RPCs. Additive; history on event
-- line-ups is untouched because the artist row itself never changes identity.

-- ── artists: public profile fields ─────────────────────────────────────────
alter table public.artists
  add column if not exists performer_type text,
  add column if not exists genres text[] not null default '{}',
  add column if not exists cover_image_url text,
  add column if not exists links jsonb not null default '{}'::jsonb,
  add column if not exists press_kit_url text,
  add column if not exists booking_email text,
  add column if not exists booking_info text,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verified_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'artists_profile_check') then
    alter table public.artists add constraint artists_profile_check check (
      (performer_type is null or performer_type in ('solo', 'band', 'group', 'dj', 'choir', 'comedian', 'other'))
      and verification_status in ('unverified', 'verified')
      and cardinality(genres) <= 8
      and jsonb_typeof(links) = 'object'
      and (bio is null or length(bio) <= 4000)
      and (booking_info is null or length(booking_info) <= 2000)
      and (booking_email is null or length(booking_email) <= 320)
      and (press_kit_url is null or press_kit_url ~* '^https://')
      and (cover_image_url is null or cover_image_url ~* '^https://')
    );
  end if;
end $$;

-- ── artist_members ─────────────────────────────────────────────────────────
create table if not exists public.artist_members (
  artist_id uuid not null references public.artists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('artist_owner', 'artist_manager')),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (artist_id, user_id)
);
create unique index if not exists artist_members_one_owner on public.artist_members (artist_id) where role = 'artist_owner';
create index if not exists artist_members_user_idx on public.artist_members (user_id);

-- Backfill owners from existing self-created talent profiles.
insert into public.artist_members (artist_id, user_id, role)
select a.id, a.primary_user_id, 'artist_owner'
from public.artists a
where a.primary_user_id is not null
on conflict (artist_id, user_id) do update set role = 'artist_owner';

-- primary_user_id stays the owner of record; mirror it into artist_members.
create or replace function app.sync_artist_owner()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.primary_user_id is distinct from coalesce(old.primary_user_id, null) or tg_op = 'INSERT' then
    -- demote any other owner to manager, then make primary_user_id the owner
    update public.artist_members set role = 'artist_manager'
    where artist_id = new.id and role = 'artist_owner' and user_id is distinct from new.primary_user_id;
    if new.primary_user_id is not null then
      insert into public.artist_members (artist_id, user_id, role)
      values (new.id, new.primary_user_id, 'artist_owner')
      on conflict (artist_id, user_id) do update set role = 'artist_owner';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function app.sync_artist_owner() from public, anon, authenticated;

drop trigger if exists artists_sync_owner on public.artists;
create trigger artists_sync_owner
  after insert or update of primary_user_id on public.artists
  for each row execute function app.sync_artist_owner();

-- ── artist_claims ──────────────────────────────────────────────────────────
create table if not exists public.artist_claims (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  claimant_id uuid not null references auth.users (id) on delete cascade,
  claimant_role text not null check (claimant_role in ('artist_owner', 'artist_manager')),
  evidence text not null check (length(btrim(evidence)) between 20 and 2000),
  contact_phone text check (contact_phone is null or length(contact_phone) <= 40),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or length(review_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists artist_claims_one_pending on public.artist_claims (artist_id, claimant_id) where status = 'pending';
create index if not exists artist_claims_status_idx on public.artist_claims (status, created_at);

-- ── helpers ────────────────────────────────────────────────────────────────
create or replace function app.artist_role(p_artist uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select am.role from public.artist_members am
  where am.artist_id = p_artist and am.user_id = (select auth.uid())
$$;

create or replace function app.is_artist_member(p_artist uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$ select app.artist_role(p_artist) is not null $$;

revoke all on function app.artist_role(uuid), app.is_artist_member(uuid) from public, anon;
grant execute on function app.artist_role(uuid), app.is_artist_member(uuid) to authenticated, service_role;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.artist_members enable row level security;
alter table public.artist_claims enable row level security;
revoke all on public.artist_members, public.artist_claims from anon, authenticated;
grant select on public.artist_members, public.artist_claims to authenticated;
grant all on public.artist_members, public.artist_claims to service_role;

drop policy if exists artist_members_select on public.artist_members;
create policy artist_members_select on public.artist_members
  for select to authenticated
  using (user_id = (select auth.uid()) or app.is_artist_member(artist_id) or app.is_platform_admin());

drop policy if exists artist_claims_select on public.artist_claims;
create policy artist_claims_select on public.artist_claims
  for select to authenticated
  using (claimant_id = (select auth.uid()) or app.is_platform_admin());

-- Managers read the artist even before it is on a public line-up.
drop policy if exists artists_select_member on public.artists;
create policy artists_select_member on public.artists
  for select to authenticated
  using (app.is_artist_member(id) or app.is_platform_admin());

-- Verified artists are public profiles even with no public line-up yet.
drop policy if exists artists_public_verified_select on public.artists;
create policy artists_public_verified_select on public.artists
  for select to anon, authenticated
  using (verification_status = 'verified');

-- ── self-create: point to the existing profile instead of a raw error ──────
create or replace function public.fn_create_talent_profile_unchecked(p_name text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := (select auth.uid());
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_base text;
  v_slug text;
  v_id uuid;
  v_existing public.artists%rowtype;
  v_taken uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if v_name is null then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  select * into v_existing
  from public.artists
  where primary_user_id = v_user and org_id is null
  order by created_at
  limit 1;
  if found then
    return jsonb_build_object('id', v_existing.id, 'slug', v_existing.slug, 'name', v_existing.name, 'existing', true);
  end if;

  -- Artist names are unique across Ticketiv (artists_global_name_unique). If the
  -- name is already on a line-up, the performer must claim that profile.
  select id into v_taken from public.artists where name_key = lower(v_name);
  if v_taken is not null then
    raise exception 'artist_exists' using errcode = 'P0001', detail = v_taken::text;
  end if;

  v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if length(v_base) < 2 then
    v_base := 'artist';
  end if;
  v_base := left(v_base, 60);
  v_slug := v_base || '-' || substr(md5(random()::text || v_user::text), 1, 6);

  insert into public.artists (name, slug, primary_user_id, org_id)
  values (v_name, v_slug, v_user, null)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'name', v_name, 'existing', false);
end;
$$;

-- ── audit helper ───────────────────────────────────────────────────────────
create or replace function app.audit_artist(p_table text, p_record text, p_action text, p_changes jsonb)
returns void
language sql
security definer
set search_path to ''
as $$
  insert into public.audit_log (actor_id, table_name, record_id, action, changes)
  values ((select auth.uid()), p_table, p_record, 'other'::public.audit_action,
          jsonb_build_object('event', p_action) || coalesce(p_changes, '{}'::jsonb))
$$;
revoke all on function app.audit_artist(text, text, text, jsonb) from public, anon, authenticated;

-- ── RPCs: claims ───────────────────────────────────────────────────────────
create or replace function public.fn_search_claimable_artists(p_query text)
returns table (id uuid, name text, verification_status text, has_owner boolean, upcoming_events integer)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_q text := lower(regexp_replace(btrim(coalesce(p_query, '')), '\s+', ' ', 'g'));
begin
  perform app.require_claimed_account();
  if length(v_q) < 2 then
    return;
  end if;
  return query
    select a.id, a.name, a.verification_status,
           exists (select 1 from public.artist_members m where m.artist_id = a.id and m.role = 'artist_owner'),
           (select count(*)::integer from public.event_artists ea join public.events e on e.id = ea.event_id
             where ea.artist_id = a.id and e.visibility = 'public' and e.status = 'published' and e.starts_at > now())
    from public.artists a
    where a.name_key like '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
    order by (a.name_key = v_q) desc, length(a.name), a.name
    limit 10;
end;
$$;

create or replace function public.fn_submit_artist_claim(
  p_artist_id uuid, p_claimant_role text, p_evidence text, p_contact_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_claim uuid;
begin
  perform app.require_claimed_account();
  if p_claimant_role not in ('artist_owner', 'artist_manager') then
    raise exception 'role_invalid' using errcode = 'P0001';
  end if;
  if length(btrim(coalesce(p_evidence, ''))) < 20 then
    raise exception 'evidence_required' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.artists where id = p_artist_id) then
    raise exception 'artist_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.artist_members where artist_id = p_artist_id and user_id = v_user) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.artist_claims where artist_id = p_artist_id and claimant_id = v_user and status = 'pending') then
    raise exception 'claim_pending' using errcode = 'P0001';
  end if;

  insert into public.artist_claims (artist_id, claimant_id, claimant_role, evidence, contact_phone)
  values (p_artist_id, v_user, p_claimant_role, btrim(p_evidence), nullif(btrim(coalesce(p_contact_phone, '')), ''))
  returning id into v_claim;

  perform app.audit_artist('artist_claims', v_claim::text, 'artist_claim_submitted',
    jsonb_build_object('artist_id', p_artist_id, 'claimant_role', p_claimant_role));
  return v_claim;
end;
$$;

create or replace function public.fn_withdraw_artist_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.artist_claims set status = 'withdrawn', updated_at = now()
  where id = p_claim_id and claimant_id = (select auth.uid()) and status = 'pending';
  if not found then
    raise exception 'claim_not_found' using errcode = 'P0002';
  end if;
  perform app.audit_artist('artist_claims', p_claim_id::text, 'artist_claim_withdrawn', null);
end;
$$;

create or replace function public.fn_my_artist_claims()
returns table (id uuid, artist_id uuid, artist_name text, claimant_role text, status text, review_note text, created_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  select c.id, c.artist_id, a.name, c.claimant_role, c.status, c.review_note, c.created_at
  from public.artist_claims c join public.artists a on a.id = c.artist_id
  where c.claimant_id = (select auth.uid())
  order by c.created_at desc
  limit 50
$$;

create or replace function public.fn_review_artist_claim(
  p_claim_id uuid, p_approve boolean, p_note text default null, p_replace_owner boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_admin uuid := (select auth.uid());
  c public.artist_claims%rowtype;
  v_owner uuid;
begin
  if not app.can_platform_mutate() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into c from public.artist_claims where id = p_claim_id for update;
  if not found or c.status <> 'pending' then
    raise exception 'claim_not_pending' using errcode = 'P0001';
  end if;

  if coalesce(p_approve, false) then
    if c.claimant_role = 'artist_owner' then
      select primary_user_id into v_owner from public.artists where id = c.artist_id for update;
      if v_owner is not null and v_owner <> c.claimant_id and not coalesce(p_replace_owner, false) then
        raise exception 'artist_already_owned' using errcode = 'P0001';
      end if;
      -- The sync trigger demotes the previous owner to manager.
      update public.artists set primary_user_id = c.claimant_id, verification_status = 'verified', verified_at = now()
      where id = c.artist_id;
    else
      insert into public.artist_members (artist_id, user_id, role, added_by)
      values (c.artist_id, c.claimant_id, 'artist_manager', v_admin)
      on conflict (artist_id, user_id) do nothing;
    end if;
  end if;

  update public.artist_claims
  set status = case when coalesce(p_approve, false) then 'approved' else 'rejected' end,
      reviewed_by = v_admin, reviewed_at = now(), review_note = nullif(btrim(coalesce(p_note, '')), ''),
      updated_at = now()
  where id = c.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  select c.claimant_id, 'artist_claim_decision',
         jsonb_build_object(
           'artistId', a.id, 'claimId', c.id, 'approved', coalesce(p_approve, false),
           'title', case when coalesce(p_approve, false) then 'You can now manage ' || a.name
                         else 'Your request for ' || a.name || ' was not approved' end,
           'body', coalesce(nullif(btrim(coalesce(p_note, '')), ''),
                    case when coalesce(p_approve, false) then 'Open the artist workspace to update your profile.'
                         else 'Contact Ticketiv support if you think this is a mistake.' end),
           'href', case when coalesce(p_approve, false) then '/manage/artists/' || a.id else '/onboarding/talent' end),
         'pending', 'in_app', 'artist_claim_decision:' || c.id
  from public.artists a where a.id = c.artist_id;

  perform app.audit_artist('artist_claims', c.id::text,
    case when coalesce(p_approve, false) then 'artist_claim_approved' else 'artist_claim_rejected' end,
    jsonb_build_object('artist_id', c.artist_id, 'claimant_id', c.claimant_id, 'replaced_owner', v_owner));
  return jsonb_build_object('claim_id', c.id, 'approved', coalesce(p_approve, false));
end;
$$;

-- ── RPCs: profile and team ─────────────────────────────────────────────────
create or replace function public.fn_update_artist_profile(
  p_artist_id uuid,
  p_bio text,
  p_performer_type text,
  p_genres text[],
  p_image_url text,
  p_cover_image_url text,
  p_links jsonb,
  p_press_kit_url text,
  p_booking_email text,
  p_booking_info text
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_links jsonb := '{}'::jsonb;
  k text;
  v text;
begin
  if app.artist_role(p_artist_id) is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Links: known keys only, https URLs only.
  for k, v in select key, value #>> '{}' from jsonb_each(coalesce(p_links, '{}'::jsonb)) loop
    if k not in ('website', 'instagram', 'facebook', 'tiktok', 'x', 'youtube', 'spotify', 'apple_music', 'soundcloud', 'audiomack', 'eljaytunes') then
      raise exception 'link_invalid' using errcode = 'P0001', detail = k;
    end if;
    if nullif(btrim(coalesce(v, '')), '') is not null then
      if v !~* '^https://' or length(v) > 300 then
        raise exception 'link_invalid' using errcode = 'P0001', detail = k;
      end if;
      v_links := v_links || jsonb_build_object(k, btrim(v));
    end if;
  end loop;
  if nullif(btrim(coalesce(p_image_url, '')), '') is not null and p_image_url !~* '^https://' then
    raise exception 'image_invalid' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_booking_email, '')), '') is not null and p_booking_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalid' using errcode = 'P0001';
  end if;

  update public.artists set
    bio = nullif(btrim(coalesce(p_bio, '')), ''),
    performer_type = nullif(btrim(coalesce(p_performer_type, '')), ''),
    genres = coalesce((select array_agg(distinct lower(btrim(g))) from unnest(coalesce(p_genres, '{}')) g where length(btrim(g)) between 1 and 40), '{}'),
    image_url = nullif(btrim(coalesce(p_image_url, '')), ''),
    cover_image_url = nullif(btrim(coalesce(p_cover_image_url, '')), ''),
    links = v_links,
    press_kit_url = nullif(btrim(coalesce(p_press_kit_url, '')), ''),
    booking_email = nullif(btrim(coalesce(p_booking_email, '')), ''),
    booking_info = nullif(btrim(coalesce(p_booking_info, '')), ''),
    updated_at = now()
  where id = p_artist_id;

  perform app.audit_artist('artists', p_artist_id::text, 'artist_profile_updated', null);
end;
$$;

create or replace function public.fn_add_artist_manager(p_artist_id uuid, p_email text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_target uuid;
begin
  if coalesce(app.artist_role(p_artist_id) = 'artist_owner', false) is false then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select u.id into v_target from auth.users u
  where lower(u.email) = lower(btrim(coalesce(p_email, ''))) and coalesce(u.is_anonymous, false) = false;
  if v_target is null then
    return 'no_account';
  end if;
  if exists (select 1 from public.artist_members where artist_id = p_artist_id and user_id = v_target) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  insert into public.artist_members (artist_id, user_id, role, added_by)
  values (p_artist_id, v_target, 'artist_manager', (select auth.uid()));
  perform app.audit_artist('artist_members', p_artist_id::text, 'artist_manager_added', jsonb_build_object('user_id', v_target));
  return 'added';
end;
$$;

create or replace function public.fn_remove_artist_member(p_artist_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_target_role text;
begin
  select role into v_target_role from public.artist_members where artist_id = p_artist_id and user_id = p_user_id;
  if v_target_role is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if v_target_role = 'artist_owner' then
    raise exception 'owner_cannot_be_removed' using errcode = 'P0001';
  end if;
  -- Managers may leave; only the owner removes others. coalesce: NULL denies.
  if p_user_id <> (select auth.uid()) and not coalesce(app.artist_role(p_artist_id) = 'artist_owner', false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.artist_members where artist_id = p_artist_id and user_id = p_user_id;
  perform app.audit_artist('artist_members', p_artist_id::text, 'artist_member_removed', jsonb_build_object('user_id', p_user_id));
end;
$$;

create or replace function public.fn_artist_team(p_artist_id uuid)
returns table (user_id uuid, role text, display_name text, created_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  select am.user_id, am.role, coalesce(nullif(p.display_name, ''), 'Ticketiv member'), am.created_at
  from public.artist_members am
  left join public.profiles p on p.user_id = am.user_id
  where am.artist_id = p_artist_id and app.is_artist_member(p_artist_id)
  order by case am.role when 'artist_owner' then 0 else 1 end, am.created_at
$$;

revoke all on function
  public.fn_search_claimable_artists(text),
  public.fn_submit_artist_claim(uuid, text, text, text),
  public.fn_withdraw_artist_claim(uuid),
  public.fn_my_artist_claims(),
  public.fn_review_artist_claim(uuid, boolean, text, boolean),
  public.fn_update_artist_profile(uuid, text, text, text[], text, text, jsonb, text, text, text),
  public.fn_add_artist_manager(uuid, text),
  public.fn_remove_artist_member(uuid, uuid),
  public.fn_artist_team(uuid)
from public, anon;
grant execute on function
  public.fn_search_claimable_artists(text),
  public.fn_submit_artist_claim(uuid, text, text, text),
  public.fn_withdraw_artist_claim(uuid),
  public.fn_my_artist_claims(),
  public.fn_review_artist_claim(uuid, boolean, text, boolean),
  public.fn_update_artist_profile(uuid, text, text, text[], text, text, jsonb, text, text, text),
  public.fn_add_artist_manager(uuid, text),
  public.fn_remove_artist_member(uuid, uuid),
  public.fn_artist_team(uuid)
to authenticated, service_role;

-- ── Effective roles: artist managers also get the Talent workspace ─────────
create or replace function public.fn_get_ticketiv_effective_roles(p_user_id uuid)
returns table(user_id uuid, role_key text, role_label text, source text, source_id uuid)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.user_id, 'attendee'::text, 'Attendee'::text, 'profiles'::text, p.user_id
  from public.profiles p
  where p.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')

  union

  select om.user_id,
         om.role::text,
         case om.role
           when 'organizer_owner'::public.app_role then 'Owner'
           when 'organizer_admin'::public.app_role then 'Admin'
           when 'organizer_staff'::public.app_role then 'Staff'
           when 'finance'::public.app_role then 'Finance'
           when 'organizer'::public.app_role then 'Organizer'
           else initcap(replace(om.role::text, '_', ' '))
         end,
         'org_members'::text,
         om.org_id
  from public.org_members om
  where om.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
    and om.role in (
      'organizer'::public.app_role,
      'organizer_owner'::public.app_role,
      'organizer_admin'::public.app_role,
      'organizer_staff'::public.app_role,
      'finance'::public.app_role
    )

  union

  select es.user_id, 'scanner'::text, 'Scanner'::text, 'event_staff'::text, es.event_id
  from public.event_staff es
  where es.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
    and es.active is true
    and es.role in ('scanner'::public.app_role, 'organizer_scanner'::public.app_role)

  union

  select a.primary_user_id, 'talent'::text, 'Talent'::text, 'artists.primary_user_id'::text, a.id
  from public.artists a
  where a.primary_user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')

  union

  select am.user_id, 'artist_manager'::text, 'Artist manager'::text, 'artist_members'::text, am.artist_id
  from public.artist_members am
  where am.user_id = p_user_id
    and am.role = 'artist_manager'
    and (auth.uid() = p_user_id or auth.role() = 'service_role')

  union

  select vm.user_id,
         vm.role,
         case vm.role
           when 'venue_owner' then 'Venue owner'
           when 'venue_manager' then 'Venue manager'
           else 'Venue staff'
         end,
         'venue_members'::text,
         vm.venue_id
  from public.venue_members vm
  where vm.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')

  union

  select au.user_id,
         au.role_tier::text,
         case au.role_tier::text
           when 'super_admin' then 'Super admin'
           else initcap(replace(au.role_tier::text, '_', ' '))
         end,
         'admin_users'::text,
         au.user_id
  from public.admin_users au
  where au.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
    and au.active is true;
$function$;

-- ── Notification type for claim decisions ─────────────────────────────────
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
    'artist_claim_decision'
  ]::text[])
  and (channel is null or channel = any (array['email', 'sms', 'push', 'in_app']::text[]))
);

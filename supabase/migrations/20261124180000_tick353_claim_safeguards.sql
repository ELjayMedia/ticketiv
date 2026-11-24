-- TICK-353 — artist claim safeguards: protected identity, rate limits,
-- duplicate merge with preserved history, and claim rollback.
--
-- - fn_get_or_create_artist no longer fills bio/photo on a claimed artist.
-- - Claims are rate-limited per person (venue and artist claims): at most 3
--   pending and 10 submitted in 24 hours.
-- - fn_admin_merge_artists(source, target) moves line-ups, follows and
--   managers to the canonical profile, records a redirect for the old URL and
--   slug, then removes the duplicate. Audited.
-- - fn_admin_reset_artist_owner(artist) rolls back a wrongly approved claim:
--   removes every member, clears primary_user_id and verification. Line-ups
--   and followers are untouched. Audited.
-- Additive. Rollback: drop the two admin functions, the rate-limit triggers and
-- artist_redirects; re-apply fn_get_or_create_artist from the baseline.

CREATE OR REPLACE FUNCTION public.fn_get_or_create_artist(p_name text, p_bio text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- TICK-353: organisers may fill gaps on unclaimed profiles only; a claimed
    -- artist controls their own bio and photo.
    update public.artists
    set
      bio = coalesce(public.artists.bio, nullif(p_bio, '')),
      image_url = coalesce(public.artists.image_url, nullif(p_image_url, ''))
    where id = v_id and primary_user_id is null;
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
$function$;

-- ── rate limits ────────────────────────────────────────────────────────────
create or replace function app.limit_claims()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_pending int;
  v_recent int;
begin
  execute format('select count(*) filter (where status = ''pending''), count(*) filter (where created_at > now() - interval ''24 hours'') from %I.%I where claimant_id = $1', tg_table_schema, tg_table_name)
    into v_pending, v_recent using new.claimant_id;
  if v_pending >= 3 or v_recent >= 10 then
    raise exception 'claim_rate_limited' using errcode = 'P0001',
      hint = 'Wait for pending requests to be reviewed before sending more.';
  end if;
  return new;
end;
$$;
revoke all on function app.limit_claims() from public, anon, authenticated;

drop trigger if exists artist_claims_rate_limit on public.artist_claims;
create trigger artist_claims_rate_limit before insert on public.artist_claims
  for each row execute function app.limit_claims();
drop trigger if exists venue_claims_rate_limit on public.venue_claims;
create trigger venue_claims_rate_limit before insert on public.venue_claims
  for each row execute function app.limit_claims();

-- ── redirects for merged profiles ──────────────────────────────────────────
create table if not exists public.artist_redirects (
  old_id uuid primary key,
  old_slug text unique,
  artist_id uuid not null references public.artists (id) on delete cascade,
  merged_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.artist_redirects enable row level security;
revoke all on public.artist_redirects from anon, authenticated;
grant select on public.artist_redirects to anon, authenticated;
grant all on public.artist_redirects to service_role;
drop policy if exists artist_redirects_public_read on public.artist_redirects;
create policy artist_redirects_public_read on public.artist_redirects for select to anon, authenticated using (true);

-- ── admin: merge duplicates ────────────────────────────────────────────────
create or replace function public.fn_admin_merge_artists(p_source uuid, p_target uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  s public.artists%rowtype;
  t public.artists%rowtype;
  v_lineups int; v_follows int; v_members int;
begin
  if not app.can_platform_mutate() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_source = p_target then
    raise exception 'merge_same_artist' using errcode = 'P0001';
  end if;
  if length(btrim(coalesce(p_note, ''))) < 5 then
    raise exception 'note_required' using errcode = 'P0001';
  end if;
  select * into s from public.artists where id = p_source for update;
  select * into t from public.artists where id = p_target for update;
  if s.id is null or t.id is null then
    raise exception 'artist_not_found' using errcode = 'P0002';
  end if;
  if s.primary_user_id is not null and t.primary_user_id is not null and s.primary_user_id <> t.primary_user_id then
    raise exception 'merge_owner_conflict' using errcode = 'P0001',
      hint = 'Both profiles have different owners. Reset one owner first.';
  end if;

  -- Line-ups: keep every event; skip events where the target is already billed.
  insert into public.event_artists (event_id, artist_id, role)
  select ea.event_id, p_target, ea.role from public.event_artists ea
  where ea.artist_id = p_source
  on conflict (event_id, artist_id) do nothing;
  get diagnostics v_lineups = row_count;
  delete from public.event_artists where artist_id = p_source;

  insert into public.artist_follows (user_id, artist_id, created_at)
  select f.user_id, p_target, f.created_at from public.artist_follows f where f.artist_id = p_source
  on conflict (user_id, artist_id) do nothing;
  get diagnostics v_follows = row_count;

  -- Owner moves only when the target has none; other members become managers.
  if t.primary_user_id is null and s.primary_user_id is not null then
    update public.artists set primary_user_id = s.primary_user_id, verification_status = s.verification_status, verified_at = s.verified_at
    where id = p_target;
  end if;
  insert into public.artist_members (artist_id, user_id, role, added_by)
  select p_target, m.user_id, 'artist_manager', (select auth.uid()) from public.artist_members m
  where m.artist_id = p_source and m.user_id is distinct from (select primary_user_id from public.artists where id = p_target)
  on conflict (artist_id, user_id) do nothing;
  get diagnostics v_members = row_count;

  update public.artist_claims set artist_id = p_target where artist_id = p_source;
  update public.artist_redirects set artist_id = p_target where artist_id = p_source;
  insert into public.artist_redirects (old_id, old_slug, artist_id, merged_by)
  values (s.id, s.slug, p_target, (select auth.uid()));

  -- Fill empty profile fields on the target from the duplicate.
  update public.artists set
    bio = coalesce(bio, s.bio),
    image_url = coalesce(image_url, s.image_url)
  where id = p_target;

  delete from public.artists where id = p_source;

  perform app.audit_artist('artists', p_target::text, 'artist_merged',
    jsonb_build_object('source_id', s.id, 'source_slug', s.slug, 'source_name', s.name, 'lineups_moved', v_lineups,
                       'follows_moved', v_follows, 'members_moved', v_members, 'note', btrim(p_note)));
  return jsonb_build_object('target_id', p_target, 'lineups_moved', v_lineups, 'follows_moved', v_follows, 'members_moved', v_members);
end;
$$;

-- ── admin: roll back an incorrectly approved claim ─────────────────────────
create or replace function public.fn_admin_reset_artist_owner(p_artist_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_owner uuid;
  v_members jsonb;
begin
  if not app.can_platform_mutate() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_note, ''))) < 5 then
    raise exception 'note_required' using errcode = 'P0001';
  end if;
  select primary_user_id into v_owner from public.artists where id = p_artist_id for update;
  if not found then
    raise exception 'artist_not_found' using errcode = 'P0002';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'role', role)), '[]') into v_members
  from public.artist_members where artist_id = p_artist_id;

  delete from public.artist_members where artist_id = p_artist_id;
  update public.artists set primary_user_id = null, verification_status = 'unverified', verified_at = null where id = p_artist_id;

  perform app.audit_artist('artists', p_artist_id::text, 'artist_owner_reset',
    jsonb_build_object('previous_owner', v_owner, 'removed_members', v_members, 'note', btrim(p_note)));
end;
$$;

revoke all on function public.fn_admin_merge_artists(uuid, uuid, text), public.fn_admin_reset_artist_owner(uuid, text) from public, anon;
grant execute on function public.fn_admin_merge_artists(uuid, uuid, text), public.fn_admin_reset_artist_owner(uuid, text) to authenticated, service_role;

-- Venue MVP — the command centre assigns venue admins.
--
-- Until now a person could only get a venue workspace by claiming or adding a
-- venue and waiting for review (TICK-481). For launch the Ticketiv owner
-- onboards venues directly: create the venue if it isn't listed, then give a
-- named person owner / manager / staff access. The app layer creates the
-- person's account (invite email) when they don't have one yet; these RPCs only
-- grant and revoke access, so they never see or set a password.
--
--   fn_admin_create_venue          new venue record (no members yet)
--   fn_admin_assign_venue_member   grant or change a person's venue role;
--                                  optionally mark the venue verified
--   fn_admin_remove_venue_member   revoke a person's venue access
--
-- Only an active super_admin may call them (stricter than
-- app.can_platform_mutate, which also admits support/finance/ops tiers).
-- Every change is audited, and the person gets an in-app notification.
--
-- Additive only. Rollback: drop the three functions and app.is_platform_owner.

create or replace function app.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select app.is_claimed_account()
     and exists (
       select 1 from public.admin_users au
       where au.user_id = (select auth.uid()) and au.active and au.role_tier = 'super_admin'
     )
$$;
revoke all on function app.is_platform_owner() from public, anon;
grant execute on function app.is_platform_owner() to authenticated, service_role;

-- ── create a venue ─────────────────────────────────────────────────────────
create or replace function public.fn_admin_create_venue(
  p_name text,
  p_city text,
  p_address text default null,
  p_capacity integer default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_city text := nullif(regexp_replace(btrim(coalesce(p_city, '')), '\s+', ' ', 'g'), '');
  v_existing uuid;
  v_id uuid;
begin
  if not app.is_platform_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_name is null then raise exception 'name_required' using errcode = 'P0001'; end if;
  if v_city is null then raise exception 'city_required' using errcode = 'P0001'; end if;
  if p_capacity is not null and (p_capacity < 1 or p_capacity > 200000) then
    raise exception 'capacity_invalid' using errcode = 'P0001';
  end if;

  select id into v_existing from public.venues
  where name_key = lower(v_name) and city_key = lower(v_city);
  if v_existing is not null then
    raise exception 'venue_exists' using errcode = 'P0001', detail = v_existing::text;
  end if;

  v_id := public.fn_get_or_create_venue(v_name, v_city, nullif(btrim(coalesce(p_address, '')), ''), 'Africa/Mbabane', p_capacity);
  perform app.audit_venue('venues', v_id::text, 'venue_created_by_admin', jsonb_build_object('name', v_name, 'city', v_city));
  return v_id;
end;
$$;

-- ── assign / change a member ───────────────────────────────────────────────
-- Making someone owner when the venue already has a different owner keeps the
-- previous owner as a venue_manager (never silently removed), like an approved
-- replacing claim. The note is required and lands in the audit log.
create or replace function public.fn_admin_assign_venue_member(
  p_venue_id uuid,
  p_user_id uuid,
  p_role text,
  p_note text,
  p_verify boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_venue public.venues%rowtype;
  v_previous_owner uuid;
  v_previous_role text;
  v_verified boolean := false;
begin
  if not app.is_platform_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('venue_owner', 'venue_manager', 'venue_staff') then
    raise exception 'role_invalid' using errcode = 'P0001';
  end if;
  if v_note is null or length(v_note) < 5 then
    raise exception 'note_required' using errcode = 'P0001';
  end if;
  if length(v_note) > 2000 then
    raise exception 'note_too_long' using errcode = 'P0001';
  end if;

  select * into v_venue from public.venues where id = p_venue_id for update;
  if not found then raise exception 'venue_not_found' using errcode = 'P0001'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  select role into v_previous_role from public.venue_members
  where venue_id = p_venue_id and user_id = p_user_id for update;

  if p_role = 'venue_owner' then
    select user_id into v_previous_owner from public.venue_members
    where venue_id = p_venue_id and role = 'venue_owner' and user_id <> p_user_id for update;
    if v_previous_owner is not null then
      update public.venue_members set role = 'venue_manager'
      where venue_id = p_venue_id and user_id = v_previous_owner;
    end if;
  end if;

  insert into public.venue_members (venue_id, user_id, role, added_by)
  values (p_venue_id, p_user_id, p_role, v_admin)
  on conflict (venue_id, user_id) do update set role = excluded.role, added_by = excluded.added_by;

  if coalesce(p_verify, false) and v_venue.verification_status <> 'verified' then
    update public.venues set verification_status = 'verified', verified_at = now() where id = p_venue_id;
    v_verified := true;
  end if;

  -- Any pending claim by this person for this venue is now moot.
  update public.venue_claims
  set status = 'approved', reviewed_by = v_admin, reviewed_at = now(),
      review_note = 'Access assigned directly by Ticketiv.', updated_at = now()
  where venue_id = p_venue_id and claimant_id = p_user_id and status = 'pending';

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values (p_user_id, 'venue_claim_decision',
          jsonb_build_object(
            'venueId', p_venue_id, 'approved', true,
            'title', 'You can now manage ' || v_venue.name,
            'body', 'Ticketiv gave you access to the venue workspace. Manage bookings, availability and booking requests there.',
            'href', '/manage/venues/' || p_venue_id),
          'pending', 'in_app',
          'venue_assigned:' || p_venue_id || ':' || p_user_id || ':' || p_role || ':' || extract(epoch from clock_timestamp())::bigint);

  perform app.audit_venue('venue_members', p_venue_id::text || ':' || p_user_id::text, 'venue_member_assigned_by_admin',
    jsonb_build_object('venue_id', p_venue_id, 'user_id', p_user_id, 'role', p_role,
                       'previous_role', v_previous_role, 'demoted_owner', v_previous_owner,
                       'verified_now', v_verified, 'note', v_note));

  return jsonb_build_object('venue_id', p_venue_id, 'user_id', p_user_id, 'role', p_role,
                            'previous_role', v_previous_role, 'demoted_owner', v_previous_owner, 'verified_now', v_verified);
end;
$$;

-- ── remove a member ────────────────────────────────────────────────────────
create or replace function public.fn_admin_remove_venue_member(p_venue_id uuid, p_user_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_role text;
begin
  if not app.is_platform_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_note is null or length(v_note) < 5 then
    raise exception 'note_required' using errcode = 'P0001';
  end if;

  delete from public.venue_members where venue_id = p_venue_id and user_id = p_user_id
  returning role into v_role;
  if v_role is null then raise exception 'not_a_member' using errcode = 'P0001'; end if;

  perform app.audit_venue('venue_members', p_venue_id::text || ':' || p_user_id::text, 'venue_member_removed_by_admin',
    jsonb_build_object('venue_id', p_venue_id, 'user_id', p_user_id, 'role', v_role, 'note', left(v_note, 2000)));
end;
$$;

revoke all on function public.fn_admin_create_venue(text, text, text, integer) from public, anon;
revoke all on function public.fn_admin_assign_venue_member(uuid, uuid, text, text, boolean) from public, anon;
revoke all on function public.fn_admin_remove_venue_member(uuid, uuid, text) from public, anon;
grant execute on function public.fn_admin_create_venue(text, text, text, integer) to authenticated;
grant execute on function public.fn_admin_assign_venue_member(uuid, uuid, text, text, boolean) to authenticated;
grant execute on function public.fn_admin_remove_venue_member(uuid, uuid, text) to authenticated;

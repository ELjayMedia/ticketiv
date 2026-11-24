-- TICK-481 — Venue ownership, verification and resource-scoped membership.
--
-- Venues are already global records (org_id is nullable; name+city is unique),
-- created by organisers through fn_get_or_create_venue. This migration lets a
-- person manage a venue independently of any organiser org:
--
--   venue_members  one row per (venue, user); roles venue_owner / venue_manager
--                  / venue_staff. At most one owner per venue. A user can hold
--                  venue roles alongside org, talent and attendee roles — no
--                  global role is introduced.
--   venue_claims   requests to manage a venue, reviewed by a platform admin.
--                  kind = 'claim'  : an existing venue; no access until approved.
--                  kind = 'create' : a venue the requester just created; the
--                                    creator is owner straight away but the venue
--                                    stays 'unverified' until approved, and a
--                                    rejection removes their access.
--
-- All writes go through SECURITY DEFINER RPCs; the tables expose read-only RLS.
-- Additive only: new columns are nullable or defaulted, existing policies on
-- venues are untouched. Rollback: see docs/product/EXECUTION_LEDGER.md (TICK-481).

-- ── venues: public profile fields + verification state ─────────────────────
alter table public.venues
  add column if not exists description text,
  add column if not exists website text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verified_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'venues_verification_status_check') then
    alter table public.venues add constraint venues_verification_status_check
      check (verification_status in ('unverified', 'verified'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'venues_profile_lengths_check') then
    alter table public.venues add constraint venues_profile_lengths_check check (
      (description is null or length(description) <= 4000)
      and (website is null or length(website) <= 300)
      and (contact_email is null or length(contact_email) <= 320)
      and (contact_phone is null or length(contact_phone) <= 40)
    );
  end if;
end $$;

-- ── venue_members ──────────────────────────────────────────────────────────
create table if not exists public.venue_members (
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('venue_owner', 'venue_manager', 'venue_staff')),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (venue_id, user_id)
);

create unique index if not exists venue_members_one_owner
  on public.venue_members (venue_id) where role = 'venue_owner';
create index if not exists venue_members_user_idx on public.venue_members (user_id);

-- ── venue_claims ───────────────────────────────────────────────────────────
create table if not exists public.venue_claims (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  claimant_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'claim' check (kind in ('claim', 'create')),
  claimant_role text not null check (claimant_role in ('venue_owner', 'venue_manager')),
  evidence text not null check (length(btrim(evidence)) between 20 and 2000),
  contact_phone text check (contact_phone is null or length(contact_phone) <= 40),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or length(review_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists venue_claims_one_pending
  on public.venue_claims (venue_id, claimant_id) where status = 'pending';
create index if not exists venue_claims_status_idx on public.venue_claims (status, created_at);
create index if not exists venue_claims_claimant_idx on public.venue_claims (claimant_id);

-- ── helpers ────────────────────────────────────────────────────────────────
create or replace function app.venue_role(p_venue uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select vm.role from public.venue_members vm
  where vm.venue_id = p_venue and vm.user_id = (select auth.uid())
$$;

create or replace function app.is_venue_member(p_venue uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select app.venue_role(p_venue) is not null
$$;

create or replace function app.is_venue_manager(p_venue uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(app.venue_role(p_venue) in ('venue_owner', 'venue_manager'), false)
$$;

revoke all on function app.venue_role(uuid), app.is_venue_member(uuid), app.is_venue_manager(uuid) from public, anon;
grant execute on function app.venue_role(uuid), app.is_venue_member(uuid), app.is_venue_manager(uuid) to authenticated, service_role;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.venue_members enable row level security;
alter table public.venue_claims enable row level security;
revoke all on public.venue_members, public.venue_claims from anon, authenticated;
grant select on public.venue_members, public.venue_claims to authenticated;
grant all on public.venue_members, public.venue_claims to service_role;

drop policy if exists venue_members_select on public.venue_members;
create policy venue_members_select on public.venue_members
  for select to authenticated
  using (user_id = (select auth.uid()) or app.is_venue_member(venue_id) or app.is_platform_admin());

drop policy if exists venue_claims_select on public.venue_claims;
create policy venue_claims_select on public.venue_claims
  for select to authenticated
  using (claimant_id = (select auth.uid()) or app.is_platform_admin());

-- Members can read their own venue even before it hosts a public event.
drop policy if exists venues_select_venue_member on public.venues;
create policy venues_select_venue_member on public.venues
  for select to authenticated
  using (app.is_venue_member(id) or app.is_platform_admin());

-- ── audit helper ───────────────────────────────────────────────────────────
create or replace function app.audit_venue(p_table text, p_record text, p_action text, p_changes jsonb)
returns void
language sql
security definer
set search_path to ''
as $$
  insert into public.audit_log (actor_id, table_name, record_id, action, changes)
  values ((select auth.uid()), p_table, p_record, 'other'::public.audit_action,
          jsonb_build_object('event', p_action) || coalesce(p_changes, '{}'::jsonb))
$$;
revoke all on function app.audit_venue(text, text, text, jsonb) from public, anon, authenticated;

-- ── RPC: create a new venue (creator becomes owner, unverified) ────────────
create or replace function public.fn_create_venue_profile(
  p_name text,
  p_city text,
  p_address text,
  p_capacity integer,
  p_evidence text,
  p_contact_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_city text := nullif(regexp_replace(btrim(coalesce(p_city, '')), '\s+', ' ', 'g'), '');
  v_existing uuid;
  v_id uuid;
  v_claim uuid;
begin
  perform app.require_claimed_account();
  if v_name is null then raise exception 'name_required' using errcode = 'P0001'; end if;
  if v_city is null then raise exception 'city_required' using errcode = 'P0001'; end if;
  if p_capacity is not null and (p_capacity < 1 or p_capacity > 200000) then
    raise exception 'capacity_invalid' using errcode = 'P0001';
  end if;
  if length(btrim(coalesce(p_evidence, ''))) < 20 then
    raise exception 'evidence_required' using errcode = 'P0001';
  end if;

  -- An existing venue must be claimed, not recreated.
  select id into v_existing from public.venues
  where name_key = lower(v_name) and city_key = lower(v_city);
  if v_existing is not null then
    raise exception 'venue_exists' using errcode = 'P0001', detail = v_existing::text;
  end if;

  v_id := public.fn_get_or_create_venue(v_name, v_city, nullif(btrim(coalesce(p_address, '')), ''), 'Africa/Mbabane', p_capacity);

  insert into public.venue_members (venue_id, user_id, role, added_by)
  values (v_id, v_user, 'venue_owner', v_user);

  insert into public.venue_claims (venue_id, claimant_id, kind, claimant_role, evidence, contact_phone)
  values (v_id, v_user, 'create', 'venue_owner', btrim(p_evidence), nullif(btrim(coalesce(p_contact_phone, '')), ''))
  returning id into v_claim;

  perform app.audit_venue('venues', v_id::text, 'venue_created', jsonb_build_object('claim_id', v_claim));
  return jsonb_build_object('venue_id', v_id, 'claim_id', v_claim);
end;
$$;

-- ── RPC: claim an existing venue ───────────────────────────────────────────
create or replace function public.fn_submit_venue_claim(
  p_venue_id uuid,
  p_claimant_role text,
  p_evidence text,
  p_contact_phone text default null
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
  if p_claimant_role not in ('venue_owner', 'venue_manager') then
    raise exception 'role_invalid' using errcode = 'P0001';
  end if;
  if length(btrim(coalesce(p_evidence, ''))) < 20 then
    raise exception 'evidence_required' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.venues where id = p_venue_id) then
    raise exception 'venue_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.venue_members where venue_id = p_venue_id and user_id = v_user) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.venue_claims where venue_id = p_venue_id and claimant_id = v_user and status = 'pending') then
    raise exception 'claim_pending' using errcode = 'P0001';
  end if;

  insert into public.venue_claims (venue_id, claimant_id, kind, claimant_role, evidence, contact_phone)
  values (p_venue_id, v_user, 'claim', p_claimant_role, btrim(p_evidence), nullif(btrim(coalesce(p_contact_phone, '')), ''))
  returning id into v_claim;

  perform app.audit_venue('venue_claims', v_claim::text, 'venue_claim_submitted',
    jsonb_build_object('venue_id', p_venue_id, 'claimant_role', p_claimant_role));
  return v_claim;
end;
$$;

create or replace function public.fn_withdraw_venue_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.venue_claims
  set status = 'withdrawn', updated_at = now()
  where id = p_claim_id and claimant_id = (select auth.uid()) and status = 'pending' and kind = 'claim';
  if not found then
    raise exception 'claim_not_found' using errcode = 'P0002';
  end if;
  perform app.audit_venue('venue_claims', p_claim_id::text, 'venue_claim_withdrawn', null);
end;
$$;

-- ── RPC: platform admin review ─────────────────────────────────────────────
-- Approving an owner claim on a venue that already has a different owner is a
-- dispute: it fails with venue_already_owned unless p_replace_owner is set, in
-- which case the previous owner is kept as a venue_manager (never silently
-- removed) and the change is audited.
create or replace function public.fn_review_venue_claim(
  p_claim_id uuid,
  p_approve boolean,
  p_note text default null,
  p_replace_owner boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_admin uuid := (select auth.uid());
  c public.venue_claims%rowtype;
  v_owner uuid;
begin
  if not app.can_platform_mutate() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into c from public.venue_claims where id = p_claim_id for update;
  if not found or c.status <> 'pending' then
    raise exception 'claim_not_pending' using errcode = 'P0001';
  end if;

  if coalesce(p_approve, false) then
    if c.claimant_role = 'venue_owner' then
      select user_id into v_owner from public.venue_members
      where venue_id = c.venue_id and role = 'venue_owner' for update;
      if v_owner is not null and v_owner <> c.claimant_id then
        if not coalesce(p_replace_owner, false) then
          raise exception 'venue_already_owned' using errcode = 'P0001';
        end if;
        update public.venue_members set role = 'venue_manager'
        where venue_id = c.venue_id and user_id = v_owner;
      end if;
    end if;

    insert into public.venue_members (venue_id, user_id, role, added_by)
    values (c.venue_id, c.claimant_id, c.claimant_role, v_admin)
    on conflict (venue_id, user_id) do update set role = excluded.role;

    if c.claimant_role = 'venue_owner' then
      update public.venues set verification_status = 'verified', verified_at = now()
      where id = c.venue_id;
    end if;
  else
    -- A rejected 'create' claim removes the creator's provisional ownership.
    if c.kind = 'create' then
      delete from public.venue_members where venue_id = c.venue_id and user_id = c.claimant_id;
    end if;
  end if;

  update public.venue_claims
  set status = case when coalesce(p_approve, false) then 'approved' else 'rejected' end,
      reviewed_by = v_admin, reviewed_at = now(), review_note = nullif(btrim(coalesce(p_note, '')), ''),
      updated_at = now()
  where id = c.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  select c.claimant_id, 'venue_claim_decision',
         jsonb_build_object(
           'venueId', v.id, 'claimId', c.id,
           'approved', coalesce(p_approve, false),
           'title', case when coalesce(p_approve, false) then 'You can now manage ' || v.name
                         else 'Your request for ' || v.name || ' was not approved' end,
           'body', coalesce(nullif(btrim(coalesce(p_note, '')), ''),
                    case when coalesce(p_approve, false) then 'Open the venue workspace to update your venue.'
                         else 'Contact Ticketiv support if you think this is a mistake.' end),
           'href', case when coalesce(p_approve, false) then '/manage/venues/' || v.id else '/venues/claim' end),
         'pending', 'in_app', 'venue_claim_decision:' || c.id
  from public.venues v where v.id = c.venue_id;

  perform app.audit_venue('venue_claims', c.id::text,
    case when coalesce(p_approve, false) then 'venue_claim_approved' else 'venue_claim_rejected' end,
    jsonb_build_object('venue_id', c.venue_id, 'claimant_id', c.claimant_id, 'replaced_owner', v_owner));

  return jsonb_build_object('claim_id', c.id, 'approved', coalesce(p_approve, false));
end;
$$;

-- ── RPC: profile update (whitelisted fields only) ──────────────────────────
create or replace function public.fn_update_venue_profile(
  p_venue_id uuid,
  p_description text,
  p_address text,
  p_capacity integer,
  p_website text,
  p_contact_email text,
  p_contact_phone text
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

  update public.venues set
    description = nullif(btrim(coalesce(p_description, '')), ''),
    address = nullif(btrim(coalesce(p_address, '')), ''),
    capacity = p_capacity,
    website = nullif(btrim(coalesce(p_website, '')), ''),
    contact_email = nullif(btrim(coalesce(p_contact_email, '')), ''),
    contact_phone = nullif(btrim(coalesce(p_contact_phone, '')), '')
  where id = p_venue_id;

  perform app.audit_venue('venues', p_venue_id::text, 'venue_profile_updated', null);
end;
$$;

-- ── RPC: team ──────────────────────────────────────────────────────────────
-- Owner adds/removes managers and staff; managers add/remove staff only.
-- The person must already have a claimed Ticketiv account. The caller learns
-- only 'added' or 'no_account', and only for venues they manage.
create or replace function public.fn_add_venue_member(p_venue_id uuid, p_email text, p_role text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_caller_role text := app.venue_role(p_venue_id);
  v_target uuid;
begin
  if v_caller_role is null or v_caller_role = 'venue_staff' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('venue_manager', 'venue_staff') then
    raise exception 'role_invalid' using errcode = 'P0001';
  end if;
  if p_role = 'venue_manager' and v_caller_role <> 'venue_owner' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select u.id into v_target from auth.users u
  where lower(u.email) = lower(btrim(coalesce(p_email, ''))) and coalesce(u.is_anonymous, false) = false;
  if v_target is null then
    return 'no_account';
  end if;
  if exists (select 1 from public.venue_members where venue_id = p_venue_id and user_id = v_target) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  insert into public.venue_members (venue_id, user_id, role, added_by)
  values (p_venue_id, v_target, p_role, (select auth.uid()));

  perform app.audit_venue('venue_members', p_venue_id::text, 'venue_member_added',
    jsonb_build_object('user_id', v_target, 'role', p_role));
  return 'added';
end;
$$;

create or replace function public.fn_remove_venue_member(p_venue_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_caller_role text := app.venue_role(p_venue_id);
  v_target_role text;
begin
  select role into v_target_role from public.venue_members where venue_id = p_venue_id and user_id = p_user_id;
  if v_target_role is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if v_target_role = 'venue_owner' then
    raise exception 'owner_cannot_be_removed' using errcode = 'P0001';
  end if;
  -- Anyone may leave; otherwise owner removes anyone, manager removes staff.
  -- coalesce: a non-member has a NULL role, and NOT(NULL) must still deny.
  if p_user_id <> (select auth.uid()) and not coalesce(
       v_caller_role = 'venue_owner'
       or (v_caller_role = 'venue_manager' and v_target_role = 'venue_staff'),
       false
     ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.venue_members where venue_id = p_venue_id and user_id = p_user_id;
  perform app.audit_venue('venue_members', p_venue_id::text, 'venue_member_removed',
    jsonb_build_object('user_id', p_user_id, 'role', v_target_role));
end;
$$;

-- Members of a venue see each other's display names (not emails).
create or replace function public.fn_venue_team(p_venue_id uuid)
returns table (user_id uuid, role text, display_name text, created_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  select vm.user_id, vm.role, coalesce(nullif(p.display_name, ''), 'Ticketiv member'), vm.created_at
  from public.venue_members vm
  left join public.profiles p on p.user_id = vm.user_id
  where vm.venue_id = p_venue_id and app.is_venue_member(p_venue_id)
  order by case vm.role when 'venue_owner' then 0 when 'venue_manager' then 1 else 2 end, vm.created_at
$$;

revoke all on function
  public.fn_create_venue_profile(text, text, text, integer, text, text),
  public.fn_submit_venue_claim(uuid, text, text, text),
  public.fn_withdraw_venue_claim(uuid),
  public.fn_review_venue_claim(uuid, boolean, text, boolean),
  public.fn_update_venue_profile(uuid, text, text, integer, text, text, text),
  public.fn_add_venue_member(uuid, text, text),
  public.fn_remove_venue_member(uuid, uuid),
  public.fn_venue_team(uuid)
from public, anon;
grant execute on function
  public.fn_create_venue_profile(text, text, text, integer, text, text),
  public.fn_submit_venue_claim(uuid, text, text, text),
  public.fn_withdraw_venue_claim(uuid),
  public.fn_review_venue_claim(uuid, boolean, text, boolean),
  public.fn_update_venue_profile(uuid, text, text, integer, text, text, text),
  public.fn_add_venue_member(uuid, text, text),
  public.fn_remove_venue_member(uuid, uuid),
  public.fn_venue_team(uuid)
to authenticated, service_role;

-- ── RPC: find a venue to claim ─────────────────────────────────────────────
-- Venues created by organisers are only readable once they host a public event,
-- so claimants need a narrow search. Returns directory facts only (no contacts,
-- no members) and whether the venue already has an owner.
create or replace function public.fn_search_claimable_venues(p_query text)
returns table (id uuid, name text, city text, verification_status text, has_owner boolean)
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
    select v.id, v.name, v.city, v.verification_status,
           exists (select 1 from public.venue_members m where m.venue_id = v.id and m.role = 'venue_owner')
    from public.venues v
    where v.name_key like '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
    order by (v.name_key = v_q) desc, length(v.name), v.name
    limit 10;
end;
$$;

revoke all on function public.fn_search_claimable_venues(text) from public, anon;
grant execute on function public.fn_search_claimable_venues(text) to authenticated, service_role;

-- The caller's own claims with the venue name (a pending claimant can't read
-- the venue row itself yet).
create or replace function public.fn_my_venue_claims()
returns table (id uuid, venue_id uuid, venue_name text, kind text, status text, review_note text, created_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  select c.id, c.venue_id, v.name, c.kind, c.status, c.review_note, c.created_at
  from public.venue_claims c
  join public.venues v on v.id = c.venue_id
  where c.claimant_id = (select auth.uid())
  order by c.created_at desc
  limit 50
$$;
revoke all on function public.fn_my_venue_claims() from public, anon;
grant execute on function public.fn_my_venue_claims() to authenticated, service_role;

-- ── Notification type for claim decisions ─────────────────────────────────
-- Extends the list from 20261124110000_fix_notification_type_constraint.
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
    'venue_claim_decision'
  ]::text[])
  and (channel is null or channel = any (array['email', 'sms', 'push', 'in_app']::text[]))
);

-- ── Effective roles: venue memberships surface a Venue workspace ───────────
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

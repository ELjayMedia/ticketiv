-- Event Companion, release 1: the attendee guide and official updates.
--
-- event_guides (one row per event)
--   Structured planning info the organiser fills in once: doors, entrance,
--   getting there, parking, ages, payment, what to bring, house rules, help,
--   a running order and venue facilities. Not sensitive: anyone who can see a
--   published event can read its guide (the event page shows a "Plan your
--   day" strip from it). Organisers can read their drafts.
--
-- event_updates
--   Short official notices from the organiser ("Gates open 30 minutes
--   earlier"). Readable by people holding a ticket for the event, the
--   organiser's team and platform admins. A hidden update disappears for
--   ticket holders but stays visible to the team and admins, with who hid it
--   and why.
--
-- Writes go through SECURITY DEFINER functions, callable by signed-in users
-- and checked inside against the event's organiser (owner/admin) or a
-- platform admin:
--   fn_save_event_guide(event, guide jsonb)
--   fn_post_event_update(event, title, body, notify) -> update id
--     notify = true also drops an in-app notification for each ticket holder.
--   fn_hide_event_update(update, reason)

-- Helpers used by the policies --------------------------------------------

create or replace function app.event_org_id(p_event uuid)
returns uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select e.org_id from public.events e where e.id = p_event
$function$;

comment on function app.event_org_id(uuid) is 'Organiser of an event, for RLS policies that cannot read events directly.';
revoke all on function app.event_org_id(uuid) from public;
grant execute on function app.event_org_id(uuid) to anon, authenticated, service_role;

-- Same ownership rule as v_my_tickets: the current owner, or the buyer for
-- legacy tickets that have no owner recorded. Live tickets only.
create or replace function app.holds_ticket_for_event(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      join public.orders o on o.id = oi.order_id
     where tt.event_id = p_event
       and oi.status in ('issued', 'checked_in')
       and (
         oi.current_owner_id = (select auth.uid())
         or (oi.current_owner_id is null and o.buyer_id = (select auth.uid()))
       )
  )
$function$;

comment on function app.holds_ticket_for_event(uuid) is 'True when the signed-in user holds a live ticket for the event.';
revoke all on function app.holds_ticket_for_event(uuid) from public;
grant execute on function app.holds_ticket_for_event(uuid) to authenticated, service_role;

-- Guide -------------------------------------------------------------------

create table if not exists public.event_guides (
  event_id uuid primary key references public.events (id) on delete cascade,
  doors_open_at timestamptz,
  entrance text,
  getting_there text,
  parking text,
  age_rule text,
  payment_note text,
  what_to_bring text,
  house_rules text,
  help_contact text,
  programme jsonb not null default '[]'::jsonb check (jsonb_typeof(programme) = 'array'),
  facilities jsonb not null default '[]'::jsonb check (jsonb_typeof(facilities) = 'array'),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.event_guides enable row level security;
revoke all on public.event_guides from anon, authenticated;
grant select on public.event_guides to anon, authenticated;

-- Signed-out visitors: published, public events only (is_platform_admin is
-- not granted to anon, so their policy must not call it).
drop policy if exists event_guides_select_public on public.event_guides;
create policy event_guides_select_public on public.event_guides
  for select to anon
  using (public.fn_event_is_public_now(event_id));

drop policy if exists event_guides_select on public.event_guides;
create policy event_guides_select on public.event_guides
  for select to authenticated
  using (
    public.fn_event_is_public_now(event_id)
    or app.is_org_member_of(app.event_org_id(event_id))
    or app.is_platform_admin()
  );

-- Updates -----------------------------------------------------------------

create table if not exists public.event_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text check (body is null or char_length(body) <= 1000),
  notified boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  hidden_at timestamptz,
  hidden_by uuid references auth.users (id) on delete set null,
  hidden_reason text
);

create index if not exists event_updates_event_idx on public.event_updates (event_id, created_at desc);

alter table public.event_updates enable row level security;
revoke all on public.event_updates from anon, authenticated;
grant select on public.event_updates to authenticated;

drop policy if exists event_updates_select on public.event_updates;
create policy event_updates_select on public.event_updates
  for select to authenticated
  using (
    (hidden_at is null and app.holds_ticket_for_event(event_id))
    or app.is_org_member_of(app.event_org_id(event_id))
    or app.is_platform_admin()
  );

-- Writes ------------------------------------------------------------------

create or replace function public.fn_save_event_guide(p_event_id uuid, p_guide jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_org uuid := app.event_org_id(p_event_id);
  v_guide jsonb := coalesce(p_guide, '{}'::jsonb);
  v_programme jsonb := coalesce(v_guide -> 'programme', '[]'::jsonb);
  v_facilities jsonb := coalesce(v_guide -> 'facilities', '[]'::jsonb);
  v_key text;
begin
  if v_org is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if not app.is_org_manager(v_org) then
    raise exception 'Only the event''s organiser can edit its guide' using errcode = '42501';
  end if;
  if jsonb_typeof(v_guide) <> 'object' then
    raise exception 'Guide must be an object' using errcode = '22023';
  end if;
  if jsonb_typeof(v_programme) <> 'array' or jsonb_array_length(v_programme) > 30 then
    raise exception 'Running order must be a list of at most 30 items' using errcode = '22023';
  end if;
  if jsonb_typeof(v_facilities) <> 'array' or jsonb_array_length(v_facilities) > 12 then
    raise exception 'Venue info must be a list of at most 12 items' using errcode = '22023';
  end if;
  foreach v_key in array array['entrance','getting_there','parking','age_rule','payment_note','what_to_bring','house_rules','help_contact'] loop
    if char_length(coalesce(v_guide ->> v_key, '')) > 600 then
      raise exception '% is too long (600 characters at most)', v_key using errcode = '22023';
    end if;
  end loop;

  insert into public.event_guides as g (
    event_id, doors_open_at, entrance, getting_there, parking, age_rule, payment_note,
    what_to_bring, house_rules, help_contact, programme, facilities, updated_by, updated_at
  ) values (
    p_event_id,
    nullif(v_guide ->> 'doors_open_at', '')::timestamptz,
    nullif(btrim(v_guide ->> 'entrance'), ''),
    nullif(btrim(v_guide ->> 'getting_there'), ''),
    nullif(btrim(v_guide ->> 'parking'), ''),
    nullif(btrim(v_guide ->> 'age_rule'), ''),
    nullif(btrim(v_guide ->> 'payment_note'), ''),
    nullif(btrim(v_guide ->> 'what_to_bring'), ''),
    nullif(btrim(v_guide ->> 'house_rules'), ''),
    nullif(btrim(v_guide ->> 'help_contact'), ''),
    v_programme,
    v_facilities,
    (select auth.uid()),
    now()
  )
  on conflict (event_id) do update set
    doors_open_at = excluded.doors_open_at,
    entrance = excluded.entrance,
    getting_there = excluded.getting_there,
    parking = excluded.parking,
    age_rule = excluded.age_rule,
    payment_note = excluded.payment_note,
    what_to_bring = excluded.what_to_bring,
    house_rules = excluded.house_rules,
    help_contact = excluded.help_contact,
    programme = excluded.programme,
    facilities = excluded.facilities,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
end;
$function$;

create or replace function public.fn_post_event_update(p_event_id uuid, p_title text, p_body text, p_notify boolean default false)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_org uuid := app.event_org_id(p_event_id);
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_id uuid;
  v_event_title text;
  v_recent int;
begin
  if v_org is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if not app.is_org_manager(v_org) then
    raise exception 'Only the event''s organiser can post updates' using errcode = '42501';
  end if;
  if char_length(v_title) = 0 or char_length(v_title) > 120 then
    raise exception 'Give the update a title of up to 120 characters' using errcode = '22023';
  end if;
  if v_body is not null and char_length(v_body) > 1000 then
    raise exception 'Keep the update under 1000 characters' using errcode = '22023';
  end if;

  -- Notifications are for things attendees must know. Cap them so a ticket
  -- holder never gets spammed: at most 3 notified updates per event per day.
  if coalesce(p_notify, false) then
    select count(*) into v_recent
      from public.event_updates
     where event_id = p_event_id and notified and created_at > now() - interval '24 hours';
    if v_recent >= 3 then
      raise exception 'You have already notified ticket holders 3 times today. Post without notifying, or wait.' using errcode = '22023';
    end if;
  end if;

  insert into public.event_updates (event_id, title, body, notified, created_by)
  values (p_event_id, v_title, v_body, coalesce(p_notify, false), (select auth.uid()))
  returning id into v_id;

  if coalesce(p_notify, false) then
    select title into v_event_title from public.events where id = p_event_id;
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    select distinct on (holder)
           holder,
           'event_update',
           jsonb_build_object(
             'eventId', p_event_id,
             'eventTitle', v_event_title,
             'updateId', v_id,
             'title', v_title,
             'body', coalesce(v_body, ''),
             'href', '/tickets/event/' || p_event_id::text
           ),
           'pending',
           'in_app',
           'event_update:' || v_id::text || ':' || holder::text
      from (
        select coalesce(oi.current_owner_id, o.buyer_id) as holder
          from public.order_items oi
          join public.ticket_types tt on tt.id = oi.ticket_type_id
          join public.orders o on o.id = oi.order_id
         where tt.event_id = p_event_id
           and oi.status in ('issued', 'checked_in')
      ) h
     where holder is not null
    on conflict do nothing;
  end if;

  return v_id;
end;
$function$;

create or replace function public.fn_hide_event_update(p_update_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_event uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  select event_id into v_event from public.event_updates where id = p_update_id;
  if v_event is null then
    raise exception 'Update not found' using errcode = 'P0002';
  end if;
  if not app.is_org_manager(app.event_org_id(v_event)) then
    raise exception 'Only the event''s organiser can hide updates' using errcode = '42501';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'Say why the update is being hidden' using errcode = '22023';
  end if;

  update public.event_updates
     set hidden_at = now(), hidden_by = (select auth.uid()), hidden_reason = v_reason
   where id = p_update_id and hidden_at is null;
end;
$function$;

revoke all on function public.fn_save_event_guide(uuid, jsonb) from public, anon;
revoke all on function public.fn_post_event_update(uuid, text, text, boolean) from public, anon;
revoke all on function public.fn_hide_event_update(uuid, text) from public, anon;
grant execute on function public.fn_save_event_guide(uuid, jsonb) to authenticated, service_role;
grant execute on function public.fn_post_event_update(uuid, text, text, boolean) to authenticated, service_role;
grant execute on function public.fn_hide_event_update(uuid, text) to authenticated, service_role;

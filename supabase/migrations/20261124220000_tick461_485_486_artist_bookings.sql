-- TICK-461 / TICK-485 / TICK-486 — artist booking requests, the artist's
-- booking calendar, audience insights and follower announcements.
--
-- Booking requests (TICK-461):
--   * Organisation managers send a structured request (event title or an
--     existing event, date, city, set length, offer range, message) to a
--     CLAIMED artist (artists.primary_user_id set). Unclaimed artists can't
--     receive requests.
--   * A private thread (artist_booking_messages): only the artist's team, the
--     requesting organisation's members and platform admins can read it.
--   * The artist accepts, declines or counters (a different fee with a note);
--     the organiser can accept a counter or withdraw. On acceptance the artist
--     is added to the event's line-up if the request names an event; otherwise
--     the organiser links the event later (fn_link_artist_booking_event).
--   * Rate limits: 10 requests per person per day, and at most 2 open
--     requests from one organisation to one artist.
-- Calendar (TICK-485): accepted requests are the artist's confirmed dates;
--   the workspace reads them with line-up events (no new booking API).
-- Insights (TICK-486): fn_artist_insights gives the artist's team follower
--   totals and per-event aggregate ticket and check-in counts. No buyer data.
-- Announcements (TICK-486): fn_post_artist_announcement sends an in-app
--   notice to followers who have in-app notifications on. Email, SMS and
--   WhatsApp need TICK-433 consent and are not sent.
--
-- Additive. Rollback: drop the RPCs and tables (artist_booking_messages,
-- artist_booking_requests, artist_announcements); re-add the previous
-- notification constraint.

create table if not exists public.artist_booking_requests (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  org_name text,
  requested_by uuid references auth.users (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  event_title text not null check (char_length(btrim(event_title)) between 2 and 200),
  starts_at timestamptz not null,
  city text check (city is null or char_length(city) <= 80),
  set_minutes integer check (set_minutes is null or set_minutes between 5 and 720),
  offer_min_cents integer check (offer_min_cents is null or offer_min_cents between 0 and 100000000),
  offer_max_cents integer check (offer_max_cents is null or offer_max_cents between 0 and 100000000),
  currency text not null default 'SZL' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'open' check (status in ('open', 'countered', 'accepted', 'declined', 'withdrawn')),
  counter_cents integer check (counter_cents is null or counter_cents between 0 and 100000000),
  agreed_cents integer check (agreed_cents is null or agreed_cents between 0 and 100000000),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (offer_min_cents is null or offer_max_cents is null or offer_min_cents <= offer_max_cents)
);
create index if not exists artist_booking_requests_artist_idx on public.artist_booking_requests (artist_id, status, starts_at);
create index if not exists artist_booking_requests_org_idx on public.artist_booking_requests (org_id, created_at desc);

create table if not exists public.artist_booking_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.artist_booking_requests (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  side text not null check (side in ('artist', 'organizer')),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists artist_booking_messages_request_idx on public.artist_booking_messages (request_id, created_at);

create table if not exists public.artist_announcements (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 3 and 600),
  event_id uuid references public.events (id) on delete set null,
  recipients integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists artist_announcements_artist_idx on public.artist_announcements (artist_id, created_at desc);

create or replace function app.is_booking_party(p_request uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.artist_booking_requests r
     where r.id = p_request
       and (app.is_artist_member(r.artist_id) or app.is_org_member_of(r.org_id) or app.is_platform_admin())
  )
$$;
revoke all on function app.is_booking_party(uuid) from public, anon;
grant execute on function app.is_booking_party(uuid) to authenticated, service_role;

alter table public.artist_booking_requests enable row level security;
alter table public.artist_booking_messages enable row level security;
alter table public.artist_announcements enable row level security;
revoke all on public.artist_booking_requests, public.artist_booking_messages, public.artist_announcements from anon, authenticated;
grant select on public.artist_booking_requests, public.artist_booking_messages, public.artist_announcements to authenticated;
grant all on public.artist_booking_requests, public.artist_booking_messages, public.artist_announcements to service_role;

drop policy if exists artist_booking_requests_party_select on public.artist_booking_requests;
create policy artist_booking_requests_party_select on public.artist_booking_requests for select to authenticated
  using (app.is_artist_member(artist_id) or app.is_org_member_of(org_id) or app.is_platform_admin());
drop policy if exists artist_booking_messages_party_select on public.artist_booking_messages;
create policy artist_booking_messages_party_select on public.artist_booking_messages for select to authenticated
  using (app.is_booking_party(request_id));
drop policy if exists artist_announcements_member_select on public.artist_announcements;
create policy artist_announcements_member_select on public.artist_announcements for select to authenticated
  using (app.is_artist_member(artist_id) or app.is_platform_admin());

-- Adds the artist to the event's line-up, if the event belongs to the requesting organisation.
create or replace function app.link_booking_lineup(p_request uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.artist_booking_requests%rowtype;
begin
  select * into r from public.artist_booking_requests where id = p_request;
  if r.event_id is not null and exists (select 1 from public.events e where e.id = r.event_id and e.org_id = r.org_id) then
    insert into public.event_artists (event_id, artist_id) values (r.event_id, r.artist_id) on conflict do nothing;
  end if;
end;
$$;
revoke all on function app.link_booking_lineup(uuid) from public, anon, authenticated;

create or replace function app.notify_booking_party(p_request uuid, p_to text, p_type text, p_title text, p_body text, p_dedupe text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.artist_booking_requests%rowtype;
begin
  select * into r from public.artist_booking_requests where id = p_request;
  if p_to = 'artist' then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    select m.user_id, p_type, jsonb_build_object('requestId', r.id, 'artistId', r.artist_id, 'title', p_title, 'body', left(p_body, 140),
                                                 'href', '/manage/artists/' || r.artist_id || '/bookings/' || r.id),
           'pending', 'in_app', p_dedupe || ':' || m.user_id
      from public.artist_members m where m.artist_id = r.artist_id
    on conflict do nothing;
  elsif r.requested_by is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (r.requested_by, p_type, jsonb_build_object('requestId', r.id, 'title', p_title, 'body', left(p_body, 140),
                                                       'href', '/orgs/' || r.org_id || '/artist-bookings/' || r.id),
            'pending', 'in_app', p_dedupe)
    on conflict do nothing;
  end if;
end;
$$;
revoke all on function app.notify_booking_party(uuid, text, text, text, text, text) from public, anon, authenticated;

-- ── RPC: send a request ────────────────────────────────────────────────────
create or replace function public.fn_submit_artist_booking(
  p_artist_id uuid,
  p_org_id uuid,
  p_event_id uuid,
  p_event_title text,
  p_starts_at timestamptz,
  p_city text,
  p_set_minutes integer,
  p_offer_min_cents integer,
  p_offer_max_cents integer,
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
  v_artist text;
  v_org text;
  v_title text := btrim(coalesce(p_event_title, ''));
begin
  perform app.require_claimed_account();
  if not app.is_org_manager(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select name into v_artist from public.artists where id = p_artist_id and primary_user_id is not null;
  if v_artist is null then
    raise exception 'artist_not_claimed' using errcode = 'P0001';
  end if;
  if p_event_id is not null then
    select coalesce(nullif(v_title, ''), e.title) into v_title from public.events e where e.id = p_event_id and e.org_id = p_org_id;
    if not found then
      raise exception 'event_not_found' using errcode = 'P0002';
    end if;
  end if;
  if char_length(v_title) < 2 then
    raise exception 'event_title_required' using errcode = 'P0001';
  end if;
  if p_starts_at is null or p_starts_at < now() then
    raise exception 'dates_invalid' using errcode = 'P0001';
  end if;
  if p_offer_min_cents is not null and p_offer_max_cents is not null and p_offer_min_cents > p_offer_max_cents then
    raise exception 'offer_invalid' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) < 10 then
    raise exception 'message_required' using errcode = 'P0001';
  end if;
  if (select count(*) from public.artist_booking_requests where requested_by = v_user and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'booking_rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.artist_booking_requests
       where org_id = p_org_id and artist_id = p_artist_id and status in ('open', 'countered')) >= 2 then
    raise exception 'booking_open_limit' using errcode = 'P0001';
  end if;

  select name into v_org from public.organizations where id = p_org_id;
  insert into public.artist_booking_requests (artist_id, org_id, org_name, requested_by, event_id, event_title, starts_at, city, set_minutes,
                                              offer_min_cents, offer_max_cents, currency)
  values (p_artist_id, p_org_id, v_org, v_user, p_event_id, v_title, p_starts_at, nullif(btrim(coalesce(p_city, '')), ''), p_set_minutes,
          p_offer_min_cents, p_offer_max_cents, coalesce(nullif(upper(btrim(coalesce(p_currency, ''))), ''), 'SZL'))
  returning id into v_id;
  insert into public.artist_booking_messages (request_id, author_id, side, body) values (v_id, v_user, 'organizer', btrim(p_message));
  perform app.notify_booking_party(v_id, 'artist', 'artist_booking_request', 'Booking request: ' || v_title,
                                   coalesce(v_org, 'An organiser') || ' wants to book ' || v_artist || '.', 'artist_booking_request:' || v_id);
  perform app.audit_venue('artist_booking_requests', v_id::text, 'artist_booking_submitted', jsonb_build_object('artist_id', p_artist_id, 'org_id', p_org_id));
  return v_id;
end;
$$;
revoke all on function public.fn_submit_artist_booking(uuid, uuid, uuid, text, timestamptz, text, integer, integer, integer, text, text) from public, anon;
grant execute on function public.fn_submit_artist_booking(uuid, uuid, uuid, text, timestamptz, text, integer, integer, integer, text, text) to authenticated, service_role;

create or replace function public.fn_post_artist_booking_message(p_request_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.artist_booking_requests%rowtype;
  v_side text;
  v_id uuid;
begin
  select * into r from public.artist_booking_requests where id = p_request_id;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if app.is_artist_member(r.artist_id) then
    v_side := 'artist';
  elsif app.is_org_manager(r.org_id) then
    v_side := 'organizer';
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'message_required' using errcode = 'P0001';
  end if;
  if r.status in ('declined', 'withdrawn') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  insert into public.artist_booking_messages (request_id, author_id, side, body) values (r.id, (select auth.uid()), v_side, btrim(p_body))
  returning id into v_id;
  update public.artist_booking_requests set updated_at = now() where id = r.id;
  perform app.notify_booking_party(r.id, case when v_side = 'artist' then 'organizer' else 'artist' end, 'artist_booking_message',
                                   'New message about ' || r.event_title, btrim(p_body), 'artist_booking_message:' || v_id);
  return v_id;
end;
$$;
revoke all on function public.fn_post_artist_booking_message(uuid, text) from public, anon;
grant execute on function public.fn_post_artist_booking_message(uuid, text) to authenticated, service_role;

-- Artist side: accept, decline or counter (p_counter_cents with a note).
create or replace function public.fn_respond_artist_booking(p_request_id uuid, p_action text, p_counter_cents integer default null, p_note text default null)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.artist_booking_requests%rowtype;
  v_artist text;
begin
  select * into r from public.artist_booking_requests where id = p_request_id for update;
  if not found or not app.is_artist_member(r.artist_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if r.status <> 'open' then
    raise exception 'request_not_open' using errcode = 'P0001';
  end if;
  if p_action not in ('accept', 'decline', 'counter') then
    raise exception 'action_invalid' using errcode = 'P0001';
  end if;
  if p_action = 'counter' and (p_counter_cents is null or p_counter_cents < 0) then
    raise exception 'counter_required' using errcode = 'P0001';
  end if;
  select name into v_artist from public.artists where id = r.artist_id;

  update public.artist_booking_requests set
    status = case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'countered' end,
    counter_cents = case when p_action = 'counter' then p_counter_cents else counter_cents end,
    agreed_cents = case when p_action = 'accept' then coalesce(offer_max_cents, offer_min_cents) else agreed_cents end,
    decided_by = (select auth.uid()), decided_at = now(), updated_at = now()
  where id = r.id;
  if nullif(btrim(coalesce(p_note, '')), '') is not null then
    insert into public.artist_booking_messages (request_id, author_id, side, body) values (r.id, (select auth.uid()), 'artist', btrim(p_note));
  end if;
  if p_action = 'accept' then
    perform app.link_booking_lineup(r.id);
  end if;
  perform app.notify_booking_party(r.id, 'organizer', 'artist_booking_decision',
    v_artist || case p_action when 'accept' then ' accepted your booking request' when 'decline' then ' declined your booking request' else ' sent a counter-offer' end,
    coalesce(nullif(btrim(coalesce(p_note, '')), ''), r.event_title), 'artist_booking_decision:' || r.id || ':' || p_action);
  perform app.audit_venue('artist_booking_requests', r.id::text, 'artist_booking_' || p_action, jsonb_build_object('counter_cents', p_counter_cents));
  return case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'countered' end;
end;
$$;
revoke all on function public.fn_respond_artist_booking(uuid, text, integer, text) from public, anon;
grant execute on function public.fn_respond_artist_booking(uuid, text, integer, text) to authenticated, service_role;

-- Organiser side: accept the artist's counter-offer, or withdraw an open/countered request.
create or replace function public.fn_organizer_artist_booking(p_request_id uuid, p_action text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.artist_booking_requests%rowtype;
begin
  select * into r from public.artist_booking_requests where id = p_request_id for update;
  if not found or not app.is_org_manager(r.org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action = 'accept_counter' then
    if r.status <> 'countered' then
      raise exception 'request_not_countered' using errcode = 'P0001';
    end if;
    update public.artist_booking_requests set status = 'accepted', agreed_cents = r.counter_cents, updated_at = now() where id = r.id;
    perform app.link_booking_lineup(r.id);
    perform app.notify_booking_party(r.id, 'artist', 'artist_booking_decision',
                                     coalesce(r.org_name, 'The organiser') || ' accepted your counter-offer', r.event_title,
                                     'artist_booking_counter_accepted:' || r.id);
  elsif p_action = 'withdraw' then
    if r.status not in ('open', 'countered') then
      raise exception 'request_not_open' using errcode = 'P0001';
    end if;
    update public.artist_booking_requests set status = 'withdrawn', updated_at = now() where id = r.id;
  else
    raise exception 'action_invalid' using errcode = 'P0001';
  end if;
  perform app.audit_venue('artist_booking_requests', r.id::text, 'artist_booking_' || p_action, null);
  return (select status from public.artist_booking_requests where id = r.id);
end;
$$;
revoke all on function public.fn_organizer_artist_booking(uuid, text) from public, anon;
grant execute on function public.fn_organizer_artist_booking(uuid, text) to authenticated, service_role;

-- Organiser links an accepted booking to one of its events; the artist joins the line-up.
create or replace function public.fn_link_artist_booking_event(p_request_id uuid, p_event_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.artist_booking_requests%rowtype;
begin
  select * into r from public.artist_booking_requests where id = p_request_id for update;
  if not found or not app.is_org_manager(r.org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if r.status <> 'accepted' then
    raise exception 'request_not_accepted' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.events e where e.id = p_event_id and e.org_id = r.org_id) then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  update public.artist_booking_requests set event_id = p_event_id, updated_at = now() where id = r.id;
  perform app.link_booking_lineup(r.id);
end;
$$;
revoke all on function public.fn_link_artist_booking_event(uuid, uuid) from public, anon;
grant execute on function public.fn_link_artist_booking_event(uuid, uuid) to authenticated, service_role;

-- ── insights (TICK-486) ────────────────────────────────────────────────────
create or replace function public.fn_artist_insights(p_artist_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v jsonb;
begin
  if not (app.is_artist_member(p_artist_id) or app.is_platform_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  with ev as (
    select e.id, e.title, e.slug, e.starts_at,
           coalesce(s.tickets_sold, 0) as tickets_sold, coalesce(s.checked_in_count, 0) as checked_in
      from public.event_artists ea
      join public.events e on e.id = ea.event_id
      left join public.event_live_stats s on s.event_id = e.id
     where ea.artist_id = p_artist_id and e.status in ('published', 'paused', 'archived') and e.visibility = 'public' and e.cancelled_at is null
  )
  select jsonb_build_object(
    'followers', (select count(*) from public.artist_follows where artist_id = p_artist_id),
    'followers_30d', (select count(*) from public.artist_follows where artist_id = p_artist_id and created_at >= now() - interval '30 days'),
    'past_events', (select count(*) from ev where starts_at < now()),
    'upcoming_events', (select count(*) from ev where starts_at >= now()),
    'tickets_sold', (select coalesce(sum(tickets_sold), 0) from ev where starts_at < now()),
    'checked_in', (select coalesce(sum(checked_in), 0) from ev where starts_at < now()),
    'confirmed_bookings', (select count(*) from public.artist_booking_requests where artist_id = p_artist_id and status = 'accepted' and starts_at >= now()),
    'open_requests', (select count(*) from public.artist_booking_requests where artist_id = p_artist_id and status in ('open', 'countered')),
    'events', coalesce((select jsonb_agg(jsonb_build_object('event_id', id, 'title', title, 'slug', slug, 'starts_at', starts_at,
                                                            'tickets_sold', tickets_sold, 'checked_in', checked_in) order by starts_at desc)
                          from (select * from ev order by starts_at desc limit 20) x), '[]'::jsonb)
  ) into v;
  return v;
end;
$function$;
revoke all on function public.fn_artist_insights(uuid) from public, anon;
grant execute on function public.fn_artist_insights(uuid) to authenticated, service_role;

-- ── announcements (TICK-486) ───────────────────────────────────────────────
create or replace function public.fn_post_artist_announcement(p_artist_id uuid, p_title text, p_body text, p_event_id uuid default null)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
  v_count integer;
  v_name text;
  v_slug text;
begin
  if not app.is_artist_member(p_artist_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) < 3 or char_length(btrim(coalesce(p_body, ''))) < 3 then
    raise exception 'announcement_required' using errcode = 'P0001';
  end if;
  if (select count(*) from public.artist_announcements where artist_id = p_artist_id and created_at > now() - interval '7 days') >= 3 then
    raise exception 'announcement_rate_limited' using errcode = 'P0001';
  end if;
  if p_event_id is not null then
    select e.slug into v_slug from public.events e
     where e.id = p_event_id and e.status = 'published' and e.visibility = 'public'
       and exists (select 1 from public.event_artists ea where ea.event_id = e.id and ea.artist_id = p_artist_id);
    if v_slug is null then
      raise exception 'event_not_found' using errcode = 'P0002';
    end if;
  end if;
  select name into v_name from public.artists where id = p_artist_id;
  insert into public.artist_announcements (artist_id, author_id, title, body, event_id)
  values (p_artist_id, (select auth.uid()), btrim(p_title), btrim(p_body), p_event_id)
  returning id into v_id;

  -- In-app only, to followers who keep in-app notifications on.
  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  select f.user_id, 'artist_announcement',
         jsonb_build_object('artistId', p_artist_id, 'announcementId', v_id, 'title', v_name || ': ' || btrim(p_title), 'body', btrim(p_body),
                            'href', case when v_slug is not null then '/events/' || v_slug else '/artists/' || p_artist_id end),
         'pending', 'in_app', 'artist_announcement:' || v_id || ':' || f.user_id
    from public.artist_follows f
    left join public.user_notification_preferences p on p.user_id = f.user_id
   where f.artist_id = p_artist_id and coalesce(p.in_app_opt_in, true)
  on conflict do nothing;
  get diagnostics v_count = row_count;
  update public.artist_announcements set recipients = v_count where id = v_id;
  perform app.audit_venue('artist_announcements', v_id::text, 'artist_announcement_posted', jsonb_build_object('artist_id', p_artist_id, 'recipients', v_count));
  return v_count;
end;
$$;
revoke all on function public.fn_post_artist_announcement(uuid, text, text, uuid) from public, anon;
grant execute on function public.fn_post_artist_announcement(uuid, text, text, uuid) to authenticated, service_role;

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
    'venue_enquiry_decision',
    'artist_booking_request',
    'artist_booking_message',
    'artist_booking_decision',
    'artist_announcement'
  ]::text[])
  and (channel is null or channel = any (array['email', 'sms', 'push', 'in_app']::text[]))
);

comment on table public.artist_booking_requests is 'Organiser booking requests to claimed artists (TICK-461). Private to the two parties and platform admins.';
comment on table public.artist_announcements is 'Artist announcements sent in-app to followers (TICK-486).';

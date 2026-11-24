-- TICK-434 / TICK-452 — finish following: series alerts, one alert per event,
-- a public follower threshold, the organiser followers trend and "Following".
--
-- 1. Following a series now alerts when a new public event in it is published
--    (series_new_event). It was stored but never used.
-- 2. One notification per user per event across every follow kind, in priority
--    order organiser > series > artist > venue. The organiser alert is
--    unchanged; the series, artist and venue alerts skip anyone a
--    higher-priority follow already covers.
-- 3. v_organizer_public gains follower_count, null below the public threshold
--    (app.public_follower_threshold() = 50) so new organisers aren't shown
--    "3 followers". It is computed on read, so it is always current.
-- 4. fn_org_follower_trend: totals, last-30-day growth and a daily cumulative
--    series for the organiser dashboard. Follows are deleted on unfollow, so
--    this is the growth of current followers (net of anyone who left).
-- 5. fn_my_follows: everything the signed-in user follows, for /me/following.
--
-- Additive (functions, trigger, view column, constraint). Rollback: drop
-- events_notify_series_followers and the new functions; re-run the previous
-- definitions of the artist and venue alert functions from
-- 20261114120000_artist_follows.sql and 20261124150000_tick452_venue_follows_and_counts.sql;
-- re-create v_organizer_public without follower_count.

create or replace function app.public_follower_threshold()
returns integer
language sql
immutable
set search_path to ''
as $$ select 50 $$;
grant execute on function app.public_follower_threshold() to anon, authenticated, service_role;

-- ── 1. series alerts ───────────────────────────────────────────────────────
create or replace function app.notify_series_followers_of_new_event()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.series_id is not null and new.status = 'published' and new.visibility = 'public'
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.visibility is distinct from new.visibility)
     and (new.starts_at is null or new.starts_at > now()) then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    select f.user_id,
           'series_new_event',
           jsonb_build_object(
             'eventId', new.id,
             'eventTitle', new.title,
             'eventSlug', new.slug,
             'seriesId', s.id,
             'title', 'New date in ' || s.title || ': ' || new.title,
             'body', case when new.starts_at is null then 'Tickets and details are on the event page.'
                          else to_char(new.starts_at at time zone app.safe_time_zone(new.tz), 'Dy FMDD Mon "at" HH24:MI') || '. You follow ' || s.title || '.'
                     end,
             'href', '/events/' || new.slug
           ),
           'pending',
           'in_app',
           'series_new_event:' || new.id::text || ':' || f.user_id::text
      from public.series_follows f
      join public.event_series s on s.id = f.series_id
      left join public.user_notification_preferences p on p.user_id = f.user_id
     where f.series_id = new.series_id
       and coalesce(p.in_app_opt_in, true)
       and not exists (select 1 from public.org_follows o where o.user_id = f.user_id and o.org_id = new.org_id)
    on conflict do nothing;
  end if;
  return new;
exception
  when others then
    raise warning 'series follower alert failed for event %: %', new.id, sqlerrm;
    return new;
end;
$function$;
revoke all on function app.notify_series_followers_of_new_event() from public, anon, authenticated;

drop trigger if exists events_notify_series_followers on public.events;
create trigger events_notify_series_followers
  after insert or update of status, visibility on public.events
  for each row execute function app.notify_series_followers_of_new_event();

-- ── 2. artist and venue alerts skip anyone already covered ─────────────────
create or replace function app.notify_artist_followers_of_new_event()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status = 'published' and new.visibility = 'public'
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.visibility is distinct from new.visibility)
     and (new.starts_at is null or new.starts_at > now()) then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    select distinct on (f.user_id)
           f.user_id,
           'artist_new_event',
           jsonb_build_object(
             'eventId', new.id,
             'eventTitle', new.title,
             'eventSlug', new.slug,
             'artistId', a.id,
             'title', a.name || ' is playing ' || new.title,
             'body', case when new.starts_at is null then 'Tickets and details are on the event page.'
                          else to_char(new.starts_at at time zone app.safe_time_zone(new.tz), 'Dy FMDD Mon "at" HH24:MI') || '. You follow ' || a.name || '.'
                     end,
             'href', '/events/' || new.slug
           ),
           'pending',
           'in_app',
           'artist_new_event:' || new.id::text || ':' || f.user_id::text
      from public.event_artists ea
      join public.artists a on a.id = ea.artist_id
      join public.artist_follows f on f.artist_id = ea.artist_id
      left join public.user_notification_preferences p on p.user_id = f.user_id
     where ea.event_id = new.id
       and coalesce(p.in_app_opt_in, true)
       and not exists (select 1 from public.org_follows o where o.user_id = f.user_id and o.org_id = new.org_id)
       and not exists (select 1 from public.series_follows sf where sf.user_id = f.user_id and sf.series_id = new.series_id)
     order by f.user_id, a.name
    on conflict do nothing;
  end if;
  return new;
exception
  when others then
    raise warning 'artist follower alert failed for event %: %', new.id, sqlerrm;
    return new;
end;
$function$;
revoke all on function app.notify_artist_followers_of_new_event() from public, anon, authenticated;

create or replace function app.notify_venue_followers_of_new_event()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status = 'published' and new.visibility = 'public' and new.venue_id is not null
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.visibility is distinct from new.visibility)
     and (new.starts_at is null or new.starts_at > now()) then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    select f.user_id,
           'venue_new_event',
           jsonb_build_object(
             'eventId', new.id,
             'eventTitle', new.title,
             'eventSlug', new.slug,
             'venueId', v.id,
             'title', new.title || ' at ' || v.name,
             'body', case when new.starts_at is null then 'Tickets and details are on the event page.'
                          else to_char(new.starts_at at time zone app.safe_time_zone(new.tz), 'Dy FMDD Mon "at" HH24:MI') || '. You follow ' || v.name || '.'
                     end,
             'href', '/events/' || new.slug
           ),
           'pending',
           'in_app',
           'venue_new_event:' || new.id::text || ':' || f.user_id::text
      from public.venue_follows f
      join public.venues v on v.id = f.venue_id
      left join public.user_notification_preferences p on p.user_id = f.user_id
     where f.venue_id = new.venue_id
       and coalesce(p.in_app_opt_in, true)
       and not exists (select 1 from public.org_follows o where o.user_id = f.user_id and o.org_id = new.org_id)
       and not exists (select 1 from public.series_follows sf where sf.user_id = f.user_id and sf.series_id = new.series_id)
       and not exists (
         select 1 from public.event_artists ea
         join public.artist_follows af on af.artist_id = ea.artist_id
         where ea.event_id = new.id and af.user_id = f.user_id
       )
    on conflict do nothing;
  end if;
  return new;
exception
  when others then
    raise warning 'venue follower alert failed for event %: %', new.id, sqlerrm;
    return new;
end;
$function$;
revoke all on function app.notify_venue_followers_of_new_event() from public, anon, authenticated;

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
    'series_new_event'
  ]::text[])
  and (channel is null or channel = any (array['email', 'sms', 'push', 'in_app']::text[]))
);

-- ── 3. public organiser read model ─────────────────────────────────────────
create or replace view public.v_organizer_public with (security_invoker = 'true') as
select o.id,
       o.name,
       o.slug,
       o.bio,
       o.logo as logo_url,
       null::text as website,
       null::jsonb as social_links,
       (select count(*) from public.events e
         where e.org_id = o.id and e.status = 'published'::public.event_status and e.visibility = 'public') as event_count,
       (select case when c >= app.public_follower_threshold() then c end
          from (select public.fn_follower_count('organizer', o.id) as c) x) as follower_count
  from public.organizations o;

-- ── 4. organiser followers trend ───────────────────────────────────────────
create or replace function public.fn_org_follower_trend(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_total integer;
  v_new integer;
  v_daily jsonb;
begin
  if not (app.is_org_member_of(p_org_id) or app.is_platform_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select count(*), count(*) filter (where created_at >= now() - interval '30 days')
    into v_total, v_new
    from public.org_follows where org_id = p_org_id;
  select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'total', d.total) order by d.day), '[]'::jsonb)
    into v_daily
    from (
      select g.day::date as day,
             (select count(*) from public.org_follows f
               where f.org_id = p_org_id and f.created_at < g.day + interval '1 day') as total
        from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') as g(day)
    ) d;
  return jsonb_build_object('total', v_total, 'new_30d', v_new, 'daily', v_daily,
                            'public_threshold', app.public_follower_threshold());
end;
$function$;
revoke all on function public.fn_org_follower_trend(uuid) from public, anon;
grant execute on function public.fn_org_follower_trend(uuid) to authenticated, service_role;

-- ── 5. what I follow ───────────────────────────────────────────────────────
create or replace function public.fn_my_follows()
returns table (kind text, id uuid, name text, slug text, image_url text, followed_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  select 'organizer', o.id, o.name, o.slug, o.logo, f.created_at
    from public.org_follows f join public.organizations o on o.id = f.org_id
   where f.user_id = (select auth.uid())
  union all
  select 'series', s.id, s.title, s.slug, s.cover_image_url, f.created_at
    from public.series_follows f join public.event_series s on s.id = f.series_id
   where f.user_id = (select auth.uid())
  union all
  select 'artist', a.id, a.name, a.slug, a.image_url, f.created_at
    from public.artist_follows f join public.artists a on a.id = f.artist_id
   where f.user_id = (select auth.uid())
  union all
  select 'venue', v.id, v.name, v.slug, null::text, f.created_at
    from public.venue_follows f join public.venues v on v.id = f.venue_id
   where f.user_id = (select auth.uid())
  order by 6 desc
$$;
revoke all on function public.fn_my_follows() from public, anon;
grant execute on function public.fn_my_follows() to authenticated, service_role;

comment on function public.fn_my_follows() is
  'Organisers, series, artists and venues the caller follows, newest first (/me/following).';
comment on function public.fn_org_follower_trend(uuid) is
  'Organiser dashboard followers card: total, new in 30 days, daily cumulative series. Members only.';

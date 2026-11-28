-- TICK-452 / TICK-434 — follow venues, and public follower counts.
--
-- venue_follows mirrors org_follows / artist_follows: written only through
-- fn_set_venue_follow, readable by the follower alone. When a public event at
-- a followed venue is published, followers get one in-app alert, unless they
-- already follow the organiser or an artist on the bill (those alerts cover it).
--
-- fn_follower_count returns the public number of followers for an organiser,
-- artist, venue or series. The follow tables are select-own under RLS, so a
-- direct count only ever saw the viewer's own row (the series page showed 0 or 1).
-- Additive. Rollback: drop the trigger, functions and venue_follows; re-add
-- the previous notification constraint.

create table if not exists public.venue_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);
create index if not exists venue_follows_venue_idx on public.venue_follows (venue_id);

alter table public.venue_follows enable row level security;
revoke all on public.venue_follows from anon, authenticated;
grant select on public.venue_follows to authenticated;
grant all on public.venue_follows to service_role;

drop policy if exists venue_follows_select_own on public.venue_follows;
create policy venue_follows_select_own on public.venue_follows
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.fn_set_venue_follow(p_venue_id uuid, p_follow boolean)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  perform app.require_claimed_account();
  if not exists (select 1 from public.venues where id = p_venue_id) then
    raise exception 'Venue not found' using errcode = 'P0002';
  end if;
  if coalesce(p_follow, false) then
    insert into public.venue_follows (user_id, venue_id) values (v_user, p_venue_id) on conflict do nothing;
  else
    delete from public.venue_follows where user_id = v_user and venue_id = p_venue_id;
  end if;
  return coalesce(p_follow, false);
end;
$function$;
revoke all on function public.fn_set_venue_follow(uuid, boolean) from public, anon;
grant execute on function public.fn_set_venue_follow(uuid, boolean) to authenticated, service_role;

create or replace function public.fn_follower_count(p_kind text, p_id uuid)
returns integer
language sql
stable
security definer
set search_path to ''
as $$
  select case p_kind
    when 'organizer' then (select count(*) from public.org_follows where org_id = p_id)
    when 'artist' then (select count(*) from public.artist_follows where artist_id = p_id)
    when 'venue' then (select count(*) from public.venue_follows where venue_id = p_id)
    when 'series' then (select count(*) from public.series_follows where series_id = p_id)
  end::integer
$$;
revoke all on function public.fn_follower_count(text, uuid) from public;
grant execute on function public.fn_follower_count(text, uuid) to anon, authenticated, service_role;

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
       and not exists (
         select 1 from public.event_artists ea
         join public.artist_follows af on af.artist_id = ea.artist_id
         where ea.event_id = new.id and af.user_id = f.user_id
       )
    on conflict do nothing;
  end if;
  return new;
exception
  -- Telling followers must never block publishing.
  when others then
    raise warning 'venue follower alert failed for event %: %', new.id, sqlerrm;
    return new;
end;
$function$;
revoke all on function app.notify_venue_followers_of_new_event() from public, anon, authenticated;

drop trigger if exists events_notify_venue_followers on public.events;
create trigger events_notify_venue_followers
  after insert or update of status, visibility on public.events
  for each row execute function app.notify_venue_followers_of_new_event();

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
    'venue_new_event'
  ]::text[])
  and (channel is null or channel = any (array['email', 'sms', 'push', 'in_app']::text[]))
);

-- Verified venues are public profiles (/venues/[slug]) even before they host a
-- public event. Unverified venues stay visible only through their events.
drop policy if exists venues_public_verified_select on public.venues;
create policy venues_public_verified_select on public.venues
  for select to anon, authenticated
  using (verification_status = 'verified');

comment on table public.venue_follows is
  'Venues a user follows. Written by fn_set_venue_follow; drives venue_new_event alerts.';

-- Event Companion, release 2: event reminders that actually send, and saved-event alerts.
--
-- 1. Reminder preferences
--    The Reminders screen reads and saves event_reminders_enabled, remind_24h
--    and remind_2h, but the columns and fn_update_my_reminder_preferences were
--    never created, so every save failed ("reminder timing could not be saved")
--    and nothing was ever sent. Added here, all on by default (the screen's
--    existing defaults).
--
-- 2. fn_companion_reminders_tick(), every hour via pg_cron
--    In-app notifications only, de-duplicated by dedupe_key so a rerun never
--    sends twice:
--      * Ticket holders, not yet scanned in: "Tomorrow"/"Today" (20-24h away) if
--        remind_24h, and "Starting soon" (30min-2h away) if remind_2h.
--        Opens the Event Companion.
--      * Saved events (favourites) the person holds no ticket for: one
--        "Coming up" alert 2-3 days before. Opens the event page.
--    Everyone who switched off event reminders or in-app notifications gets
--    nothing. Times in the text are the event's local time (events.tz, else
--    the venue's, else Eswatini).
--    Server-only: not callable from the browser.

alter table public.user_notification_preferences
  add column if not exists event_reminders_enabled boolean not null default true,
  add column if not exists remind_24h boolean not null default true,
  add column if not exists remind_2h boolean not null default true;

create or replace function public.fn_update_my_reminder_preferences(p_enabled boolean, p_remind_24h boolean, p_remind_2h boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.user_notification_preferences as p (user_id, event_reminders_enabled, remind_24h, remind_2h, updated_at)
  values (v_user, coalesce(p_enabled, true), coalesce(p_remind_24h, true), coalesce(p_remind_2h, true), now())
  on conflict (user_id) do update set
    event_reminders_enabled = coalesce(p_enabled, p.event_reminders_enabled),
    remind_24h = coalesce(p_remind_24h, p.remind_24h),
    remind_2h = coalesce(p_remind_2h, p.remind_2h),
    updated_at = now();
end;
$function$;

revoke all on function public.fn_update_my_reminder_preferences(boolean, boolean, boolean) from public, anon;
grant execute on function public.fn_update_my_reminder_preferences(boolean, boolean, boolean) to authenticated, service_role;

-- A zone Postgres knows, else Eswatini: "at time zone" with an unknown name raises.
create or replace function app.safe_time_zone(p_zone text)
returns text
language sql
stable
set search_path to ''
as $function$
  select case
    when nullif(btrim(p_zone), '') is not null
     and exists (select 1 from pg_catalog.pg_timezone_names where name = btrim(p_zone))
    then btrim(p_zone)
    else 'Africa/Mbabane'
  end
$function$;

revoke all on function app.safe_time_zone(text) from public, anon, authenticated;

create or replace function public.fn_companion_reminders_tick()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_holder_rows integer := 0;
  v_saved_rows integer := 0;
begin
  -- Ticket holders: tomorrow (20-24h) and starting soon (30min-2h).
  with live as (
    select distinct
           coalesce(oi.current_owner_id, o.buyer_id) as user_id,
           e.id as event_id,
           e.title,
           e.starts_at,
           app.safe_time_zone(coalesce(nullif(e.tz, ''), v.tz)) as zone,
           case
             when e.starts_at > now() + interval '20 hours' and e.starts_at <= now() + interval '24 hours' then '24h'
             when e.starts_at > now() + interval '30 minutes' and e.starts_at <= now() + interval '2 hours' then '2h'
           end as kind
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      join public.events e on e.id = tt.event_id
      left join public.venues v on v.id = e.venue_id
     where oi.status = 'issued'
       and e.status = 'published'
       and e.starts_at > now() + interval '30 minutes'
       and e.starts_at <= now() + interval '24 hours'
  )
  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  select l.user_id,
         'event_reminder',
         jsonb_build_object(
           'eventId', l.event_id,
           'eventTitle', l.title,
           -- 20-24h away can still be later today where the event happens.
           'title', case
                      when l.kind = '2h' then 'Starting soon: ' || l.title
                      when (l.starts_at at time zone l.zone)::date = (now() at time zone l.zone)::date then 'Today: ' || l.title
                      else 'Tomorrow: ' || l.title
                    end,
           'body', case l.kind
                     when '24h' then 'Starts ' || to_char(l.starts_at at time zone l.zone, 'Dy FMDD Mon "at" HH24:MI') || '. Your ticket, directions and the event guide are ready.'
                     else 'Starts at ' || to_char(l.starts_at at time zone l.zone, 'HH24:MI') || '. Open your ticket before you join the queue.'
                   end,
           'href', '/tickets/event/' || l.event_id::text,
           'reminder', l.kind
         ),
         'pending',
         'in_app',
         'event_reminder:' || l.kind || ':' || l.event_id::text || ':' || l.user_id::text
    from live l
    left join public.user_notification_preferences p on p.user_id = l.user_id
   where l.kind is not null
     and l.user_id is not null
     and coalesce(p.in_app_opt_in, true)
     and coalesce(p.event_reminders_enabled, true)
     and case l.kind when '24h' then coalesce(p.remind_24h, true) else coalesce(p.remind_2h, true) end
  on conflict do nothing;
  get diagnostics v_holder_rows = row_count;

  -- Saved events without a ticket: one alert 2-3 days before.
  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  select f.user_id,
         'saved_event_reminder',
         jsonb_build_object(
           'eventId', e.id,
           'eventTitle', e.title,
           'eventSlug', e.slug,
           'title', 'Coming up: ' || e.title,
           'body', to_char(e.starts_at at time zone app.safe_time_zone(coalesce(nullif(e.tz, ''), v.tz)), 'Dy FMDD Mon "at" HH24:MI') || '. You saved this event.',
           'href', '/events/' || e.slug
         ),
         'pending',
         'in_app',
         'saved_event_reminder:' || e.id::text || ':' || f.user_id::text
    from public.event_favourites f
    join public.events e on e.id = f.event_id
    left join public.venues v on v.id = e.venue_id
    left join public.user_notification_preferences p on p.user_id = f.user_id
   where e.status = 'published'
     and e.starts_at > now() + interval '48 hours'
     and e.starts_at <= now() + interval '72 hours'
     and coalesce(p.in_app_opt_in, true)
     and coalesce(p.event_reminders_enabled, true)
     and not exists (
       select 1
         from public.order_items oi
         join public.orders o on o.id = oi.order_id
         join public.ticket_types tt on tt.id = oi.ticket_type_id
        where tt.event_id = e.id
          and oi.status in ('issued', 'checked_in')
          and coalesce(oi.current_owner_id, o.buyer_id) = f.user_id
     )
  on conflict do nothing;
  get diagnostics v_saved_rows = row_count;

  return v_holder_rows + v_saved_rows;
end;
$function$;

revoke all on function public.fn_companion_reminders_tick() from public, anon, authenticated;
grant execute on function public.fn_companion_reminders_tick() to service_role;

do $do$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed; skipping companion reminder schedule';
    return;
  end if;
  perform cron.schedule(
    'ticketiv-companion-reminders',
    '7 * * * *',
    $cron$select public.fn_companion_reminders_tick();$cron$
  );
end;
$do$;

-- 3. "Show events I'm going to" becomes opt-in
--    Friends only see that you're going once you switch it on (Friends ›
--    Settings). New rows default to off, people with no settings row count
--    as off, and existing "on" values are reset: they were the old default
--    and can't be told apart from a real choice. fn_my_friends_going (which
--    every friends-going surface uses) is otherwise the live definition,
--    unchanged.

alter table public.user_privacy_settings alter column show_events_going_to_friends set default false;
update public.user_privacy_settings set show_events_going_to_friends = false where show_events_going_to_friends;

CREATE OR REPLACE FUNCTION public.fn_my_friends_going(p_event_ids uuid[] DEFAULT NULL::uuid[], p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 200)
 RETURNS TABLE(event_id uuid, friend_id uuid, friend_name text, friend_handle text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me uuid := (select auth.uid());
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 500));
begin
  perform app.require_claimed_account();

  if p_event_ids is not null and cardinality(p_event_ids) > 50 then
    raise exception 'select at most 50 events' using errcode='22023';
  end if;

  return query
  with my_friends as (
    select case
      when uc.requester_id = v_me then uc.recipient_id
      else uc.requester_id
    end as friend_user_id
    from public.user_connections uc
    where uc.status = 'accepted'::public.connection_status
      and (uc.requester_id = v_me or uc.recipient_id = v_me)
  ),
  ticket_attendance as (
    select distinct
      tt.event_id,
      coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) as attendee_id
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.events e on e.id = tt.event_id
    where o.status = 'paid'::public.order_status
      and oi.revoked_at is null
      and oi.refunded_at is null
      and oi.status in (
        'issued'::public.order_item_status,
        'transferred'::public.order_item_status,
        'checked_in'::public.order_item_status
      )
      and coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) is not null
      and (p_event_ids is null or tt.event_id = any(p_event_ids))
      and (p_from is null or e.starts_at >= p_from)
      and public.fn_event_is_public_now(tt.event_id)
  )
  select distinct
    ta.event_id,
    p.user_id as friend_id,
    coalesce(
      nullif(btrim(concat_ws(' ', p.name, p.surname)), ''),
      nullif(btrim(p.display_name), ''),
      uh.handle,
      'Friend'
    ) as friend_name,
    uh.handle as friend_handle
  from ticket_attendance ta
  join my_friends mf on mf.friend_user_id = ta.attendee_id
  join public.profiles p on p.user_id = ta.attendee_id
  left join public.user_handles uh on uh.user_id = p.user_id
  left join public.user_privacy_settings ps on ps.user_id = p.user_id
  -- Opt-in: only people who switched "Show events I'm going to" on.
  where coalesce(ps.show_events_going_to_friends, false)
    and not exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = v_me and b.blocked_id = p.user_id)
         or (b.blocker_id = p.user_id and b.blocked_id = v_me)
    )
  order by friend_name, event_id
  limit v_limit;
end;
$function$;

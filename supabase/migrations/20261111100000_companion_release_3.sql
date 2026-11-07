-- Event Companion, release 3: event memory, plus reminder emails.
--
-- 1. Reminder emails
--    fn_companion_reminders_tick writes in-app reminders at :07 each hour.
--    fn_reminder_emails_tick (at :12) calls /api/cron/reminder-emails, which
--    emails each new reminder once to people who haven't opted out. It reuses
--    the ops-alert endpoint's Vault secrets: the URL is the ops-alert URL with
--    its path swapped, and the bearer secret is the same CRON_SECRET. Each
--    call is logged in ops_cron_runs (job 'reminder-emails').

create or replace function public.fn_reminder_emails_tick()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ops_url    text;
  v_url        text;
  v_secret     text;
  v_request_id bigint;
begin
  update public.ops_cron_runs r
     set status_code = resp.status_code,
         ok          = (resp.status_code between 200 and 299),
         error       = nullif(resp.error_msg, ''),
         resolved_at = now()
    from net._http_response resp
   where resp.id = r.request_id
     and r.job = 'reminder-emails'
     and r.resolved_at is null;

  select decrypted_secret into v_ops_url from vault.decrypted_secrets where name = 'ops_alert_cron_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'ops_alert_cron_secret';
  if v_ops_url is null or v_secret is null then
    raise exception 'reminder emails cron is not configured: missing ops alert vault secret(s)' using errcode = 'P0001';
  end if;
  v_url := regexp_replace(v_ops_url, '/api/cron/ops-alerts.*$', '/api/cron/reminder-emails');

  select net.http_get(
           url                  => v_url,
           headers              => jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'User-Agent', 'ticketiv-pg-cron/1'),
           timeout_milliseconds => 60000
         )
    into v_request_id;

  insert into public.ops_cron_runs (job, request_id) values ('reminder-emails', v_request_id);

  return jsonb_build_object('job', 'reminder-emails', 'request_id', v_request_id);
end;
$function$;

revoke all on function public.fn_reminder_emails_tick() from public, anon, authenticated;
grant execute on function public.fn_reminder_emails_tick() to service_role;

do $do$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed; skipping reminder email schedule';
    return;
  end if;
  perform cron.schedule(
    'ticketiv-reminder-emails',
    '12 * * * *',
    $cron$select public.fn_reminder_emails_tick();$cron$
  );
end;
$do$;

-- 2. Private event feedback
--    One rating (1-5) and optional comment per person per event, from people
--    who held a live ticket, once the event has started. People see only
--    their own; the organiser's team (and platform admins) see an anonymous
--    summary through fn_event_feedback_summary: counts, average and recent
--    comments, never who wrote them.

create table if not exists public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_feedback enable row level security;
revoke all on public.event_feedback from anon, authenticated;
grant select on public.event_feedback to authenticated;

drop policy if exists event_feedback_select_own on public.event_feedback;
create policy event_feedback_select_own on public.event_feedback
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.fn_submit_event_feedback(p_event_id uuid, p_rating integer, p_comment text default null)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_starts timestamptz;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Choose 1 to 5 stars' using errcode = '22023';
  end if;
  if v_comment is not null and char_length(v_comment) > 1000 then
    raise exception 'Keep your comment under 1000 characters' using errcode = '22023';
  end if;
  select starts_at into v_starts from public.events where id = p_event_id;
  if v_starts is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if now() < v_starts then
    raise exception 'You can rate the event once it has started' using errcode = '22023';
  end if;
  if not app.holds_ticket_for_event(p_event_id) then
    raise exception 'Only people with a ticket can rate this event' using errcode = '42501';
  end if;

  insert into public.event_feedback as f (event_id, user_id, rating, comment)
  values (p_event_id, v_user, p_rating, v_comment)
  on conflict (event_id, user_id) do update set
    rating = excluded.rating,
    comment = excluded.comment,
    updated_at = now();
end;
$function$;

create or replace function public.fn_event_feedback_summary(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_org uuid := app.event_org_id(p_event_id);
begin
  if v_org is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if not (app.is_org_member_of(v_org) or app.is_platform_admin()) then
    raise exception 'Only the event''s organiser can see its feedback' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'count', count(*),
      'average', round(avg(rating)::numeric, 1),
      'distribution', jsonb_build_object(
        '1', count(*) filter (where rating = 1),
        '2', count(*) filter (where rating = 2),
        '3', count(*) filter (where rating = 3),
        '4', count(*) filter (where rating = 4),
        '5', count(*) filter (where rating = 5)
      ),
      'comments', coalesce((
        select jsonb_agg(jsonb_build_object('rating', c.rating, 'comment', c.comment, 'at', c.updated_at) order by c.updated_at desc)
          from (
            select rating, comment, updated_at
              from public.event_feedback
             where event_id = p_event_id and comment is not null
             order by updated_at desc
             limit 50
          ) c
      ), '[]'::jsonb)
    )
    from public.event_feedback
    where event_id = p_event_id
  );
end;
$function$;

-- 3. Highlights the organiser picks
--    Up to 12 photos per event, uploaded through /api/uploads (organiser-
--    checked, stored under events/<event id>/ in the event-covers bucket).
--    Public for published events; the team sees them always.

create table if not exists public.event_highlights (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  image_url text not null check (char_length(image_url) <= 1000),
  caption text check (caption is null or char_length(caption) <= 140),
  position integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists event_highlights_event_idx on public.event_highlights (event_id, position, created_at);

alter table public.event_highlights enable row level security;
revoke all on public.event_highlights from anon, authenticated;
grant select on public.event_highlights to anon, authenticated;

drop policy if exists event_highlights_select_public on public.event_highlights;
create policy event_highlights_select_public on public.event_highlights
  for select to anon
  using (public.fn_event_is_public_now(event_id));

drop policy if exists event_highlights_select on public.event_highlights;
create policy event_highlights_select on public.event_highlights
  for select to authenticated
  using (
    public.fn_event_is_public_now(event_id)
    or app.is_org_member_of(app.event_org_id(event_id))
    or app.is_platform_admin()
  );

create or replace function public.fn_add_event_highlight(p_event_id uuid, p_image_url text, p_caption text default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_org uuid := app.event_org_id(p_event_id);
  v_url text := btrim(coalesce(p_image_url, ''));
  v_caption text := nullif(btrim(coalesce(p_caption, '')), '');
  v_count integer;
  v_id uuid;
begin
  if v_org is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if not app.is_org_manager(v_org) then
    raise exception 'Only the event''s organiser can add highlights' using errcode = '42501';
  end if;
  -- Only images uploaded for this event through our own upload route.
  if v_url !~ ('^https://[^/]+/storage/v1/object/public/event-covers/events/' || p_event_id::text || '/[0-9a-f-]+\.(jpg|png|webp)$') then
    raise exception 'Upload the photo here first' using errcode = '22023';
  end if;
  if v_caption is not null and char_length(v_caption) > 140 then
    raise exception 'Keep captions under 140 characters' using errcode = '22023';
  end if;
  select count(*) into v_count from public.event_highlights where event_id = p_event_id;
  if v_count >= 12 then
    raise exception 'An event can have up to 12 highlights' using errcode = '22023';
  end if;

  insert into public.event_highlights (event_id, image_url, caption, position, created_by)
  values (p_event_id, v_url, v_caption, v_count, (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.fn_remove_event_highlight(p_highlight_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_event uuid;
begin
  select event_id into v_event from public.event_highlights where id = p_highlight_id;
  if v_event is null then
    raise exception 'Highlight not found' using errcode = 'P0002';
  end if;
  if not app.is_org_manager(app.event_org_id(v_event)) then
    raise exception 'Only the event''s organiser can remove highlights' using errcode = '42501';
  end if;
  delete from public.event_highlights where id = p_highlight_id;
end;
$function$;

-- 4. Follow an organiser ("Hear about their next event")
--    Opt-in per organiser. When one of their events becomes published and
--    public, followers get one in-app alert (deduplicated, respects the
--    in-app opt-out).

create table if not exists public.org_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

create index if not exists org_follows_org_idx on public.org_follows (org_id);

alter table public.org_follows enable row level security;
revoke all on public.org_follows from anon, authenticated;
grant select on public.org_follows to authenticated;

drop policy if exists org_follows_select_own on public.org_follows;
create policy org_follows_select_own on public.org_follows
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.fn_set_org_follow(p_org_id uuid, p_follow boolean)
returns boolean
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
  if not exists (select 1 from public.organizations where id = p_org_id) then
    raise exception 'Organiser not found' using errcode = 'P0002';
  end if;
  if coalesce(p_follow, false) then
    insert into public.org_follows (user_id, org_id) values (v_user, p_org_id) on conflict do nothing;
  else
    delete from public.org_follows where user_id = v_user and org_id = p_org_id;
  end if;
  return coalesce(p_follow, false);
end;
$function$;

create or replace function app.notify_org_followers_of_new_event()
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
    select f.user_id,
           'organizer_new_event',
           jsonb_build_object(
             'eventId', new.id,
             'eventTitle', new.title,
             'eventSlug', new.slug,
             'title', coalesce(o.name, 'An organiser you follow') || ' announced ' || new.title,
             'body', case when new.starts_at is null then 'Tickets and details are on the event page.'
                          else to_char(new.starts_at at time zone app.safe_time_zone(new.tz), 'Dy FMDD Mon "at" HH24:MI') || '. You asked to hear about their next event.'
                     end,
             'href', '/events/' || new.slug
           ),
           'pending',
           'in_app',
           'organizer_new_event:' || new.id::text || ':' || f.user_id::text
      from public.org_follows f
      left join public.organizations o on o.id = new.org_id
      left join public.user_notification_preferences p on p.user_id = f.user_id
     where f.org_id = new.org_id
       and coalesce(p.in_app_opt_in, true)
    on conflict do nothing;
  end if;
  return new;
exception
  -- Telling followers must never block publishing.
  when others then
    raise warning 'organiser follower alert failed for event %: %', new.id, sqlerrm;
    return new;
end;
$function$;

revoke all on function app.notify_org_followers_of_new_event() from public, anon, authenticated;

drop trigger if exists events_notify_org_followers on public.events;
create trigger events_notify_org_followers
  after insert or update of status, visibility on public.events
  for each row execute function app.notify_org_followers_of_new_event();

-- 5. "How was it?" the morning after
--    One in-app nudge to people who were scanned in, 10-34 hours after the
--    event ended, unless they already rated it. Hourly at :17.

create or replace function public.fn_feedback_requests_tick()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_rows integer := 0;
begin
  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  select distinct on (a.user_id, a.event_id)
         a.user_id,
         'feedback_request',
         jsonb_build_object(
           'eventId', a.event_id,
           'eventTitle', a.title,
           'title', 'How was ' || a.title || '?',
           'body', 'Rate it in a tap. Only the organiser sees your rating.',
           'href', '/tickets/event/' || a.event_id::text
         ),
         'pending',
         'in_app',
         'feedback_request:' || a.event_id::text || ':' || a.user_id::text
    from (
      select coalesce(oi.current_owner_id, o.buyer_id) as user_id, e.id as event_id, e.title
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        join public.ticket_types tt on tt.id = oi.ticket_type_id
        join public.events e on e.id = tt.event_id
       where oi.status = 'checked_in'
         and coalesce(e.ends_at, e.starts_at + interval '4 hours') between now() - interval '34 hours' and now() - interval '10 hours'
    ) a
    left join public.user_notification_preferences p on p.user_id = a.user_id
   where a.user_id is not null
     and coalesce(p.in_app_opt_in, true)
     and not exists (select 1 from public.event_feedback f where f.event_id = a.event_id and f.user_id = a.user_id)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$function$;

-- Grants ------------------------------------------------------------------

revoke all on function public.fn_submit_event_feedback(uuid, integer, text) from public, anon;
revoke all on function public.fn_event_feedback_summary(uuid) from public, anon;
revoke all on function public.fn_add_event_highlight(uuid, text, text) from public, anon;
revoke all on function public.fn_remove_event_highlight(uuid) from public, anon;
revoke all on function public.fn_set_org_follow(uuid, boolean) from public, anon;
revoke all on function public.fn_feedback_requests_tick() from public, anon, authenticated;
grant execute on function public.fn_submit_event_feedback(uuid, integer, text) to authenticated, service_role;
grant execute on function public.fn_event_feedback_summary(uuid) to authenticated, service_role;
grant execute on function public.fn_add_event_highlight(uuid, text, text) to authenticated, service_role;
grant execute on function public.fn_remove_event_highlight(uuid) to authenticated, service_role;
grant execute on function public.fn_set_org_follow(uuid, boolean) to authenticated, service_role;
grant execute on function public.fn_feedback_requests_tick() to service_role;

do $do$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed; skipping feedback request schedule';
    return;
  end if;
  perform cron.schedule(
    'ticketiv-feedback-requests',
    '17 * * * *',
    $cron$select public.fn_feedback_requests_tick();$cron$
  );
end;
$do$;

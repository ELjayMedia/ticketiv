-- Follow an artist from the event page lineup.
--
-- Mirrors org_follows (companion release 3): an opt-in per artist, written only
-- through a SECURITY DEFINER RPC, readable by the follower alone. When an event
-- featuring a followed artist is published and public, followers get one
-- in-app alert. Someone who already follows the event's organiser is skipped,
-- because the organiser alert already covers that event.

create table if not exists public.artist_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

create index if not exists artist_follows_artist_idx on public.artist_follows (artist_id);

alter table public.artist_follows enable row level security;
revoke all on public.artist_follows from anon, authenticated;
grant select on public.artist_follows to authenticated;

drop policy if exists artist_follows_select_own on public.artist_follows;
create policy artist_follows_select_own on public.artist_follows
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.fn_set_artist_follow(p_artist_id uuid, p_follow boolean)
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
  if not exists (select 1 from public.artists where id = p_artist_id) then
    raise exception 'Artist not found' using errcode = 'P0002';
  end if;
  if coalesce(p_follow, false) then
    insert into public.artist_follows (user_id, artist_id) values (v_user, p_artist_id) on conflict do nothing;
  else
    delete from public.artist_follows where user_id = v_user and artist_id = p_artist_id;
  end if;
  return coalesce(p_follow, false);
end;
$function$;

revoke all on function public.fn_set_artist_follow(uuid, boolean) from public, anon;
grant execute on function public.fn_set_artist_follow(uuid, boolean) to authenticated, service_role;

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
       and not exists (
         select 1 from public.org_follows o where o.user_id = f.user_id and o.org_id = new.org_id
       )
     order by f.user_id, a.name
    on conflict do nothing;
  end if;
  return new;
exception
  -- Telling followers must never block publishing.
  when others then
    raise warning 'artist follower alert failed for event %: %', new.id, sqlerrm;
    return new;
end;
$function$;

revoke all on function app.notify_artist_followers_of_new_event() from public, anon, authenticated;

drop trigger if exists events_notify_artist_followers on public.events;
create trigger events_notify_artist_followers
  after insert or update of status, visibility on public.events
  for each row execute function app.notify_artist_followers_of_new_event();

comment on table public.artist_follows is
  'Artists a user follows from an event lineup. Written by fn_set_artist_follow; drives artist_new_event alerts.';

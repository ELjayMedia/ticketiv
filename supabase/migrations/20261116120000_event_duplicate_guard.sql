-- Duplicate-event guard.
--
-- An organisation can't publish an event that matches another organisation's
-- published event (same day, and the same venue, a similar title or a shared
-- artist). This protects buyers from copycat listings.
--
-- The blocked organiser can ask support for permission from the event form.
-- Support can pass the request to the original organiser, approve it or
-- decline it. If support doesn't act within 3 hours, the request goes to the
-- original organiser automatically. An approval lets that pair of events
-- coexist; nothing else changes.
--
-- Only published events count as originals, so a draft can't be used to
-- squat a date. If a fake is published first, the real organiser is blocked
-- and raises it with support, who can take the fake down.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Requests

create table if not exists public.event_duplicate_requests (
  id uuid primary key default gen_random_uuid(),
  -- The blocked event and its organisation.
  event_id uuid not null references public.events(id) on delete cascade,
  requesting_org_id uuid not null references public.organizations(id) on delete cascade,
  -- The published event it matched, and its organisation.
  original_event_id uuid not null references public.events(id) on delete cascade,
  original_org_id uuid not null references public.organizations(id) on delete cascade,
  reason text not null check (reason in ('permission', 'mine_is_original', 'different_event', 'other')),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  status text not null default 'with_support'
    check (status in ('with_support', 'with_organiser', 'approved', 'declined', 'withdrawn')),
  -- 'support' (an admin passed it on) or 'auto' (no reply from support in 3 hours).
  forwarded_by text check (forwarded_by in ('support', 'auto')),
  forwarded_at timestamptz,
  support_note text check (support_note is null or char_length(support_note) <= 2000),
  -- 'support' or 'organiser'.
  decided_by_role text check (decided_by_role in ('support', 'organiser')),
  decided_by uuid references auth.users(id) on delete set null,
  decision_note text check (decision_note is null or char_length(decision_note) <= 2000),
  decided_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (event_id <> original_event_id),
  check (requesting_org_id <> original_org_id)
);

comment on table public.event_duplicate_requests is
  'Permission requests from organisers blocked by the duplicate-event guard. Reads go through RPCs; no direct table access.';

-- One open request per pair; a new one is allowed after a decision.
create unique index if not exists event_duplicate_requests_open_pair
  on public.event_duplicate_requests (event_id, original_event_id)
  where status in ('with_support', 'with_organiser');
create index if not exists event_duplicate_requests_status_created
  on public.event_duplicate_requests (status, created_at);
create index if not exists event_duplicate_requests_original_org
  on public.event_duplicate_requests (original_org_id, status);
create index if not exists event_duplicate_requests_requesting_org
  on public.event_duplicate_requests (requesting_org_id, status);
create index if not exists event_duplicate_requests_original_event
  on public.event_duplicate_requests (original_event_id);

alter table public.event_duplicate_requests enable row level security;
-- No policies: every read and write goes through the SECURITY DEFINER RPCs
-- below (and the service role in admin pages).
revoke all on public.event_duplicate_requests from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Matching

-- A pair of events may coexist once a request between them was approved,
-- whichever of the two asked.
create or replace function app.event_duplicate_pair_approved(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.event_duplicate_requests r
    where r.status = 'approved'
      and ((r.event_id = p_a and r.original_event_id = p_b) or (r.event_id = p_b and r.original_event_id = p_a))
  )
$$;

-- Published events from other organisations that this event's details match.
-- `blocking` = enough signals that publishing is refused: two of same venue,
-- similar title (trigram similarity >= 0.5) and a shared artist, or a
-- very close title (>= 0.7) on its own. All need the same day (±1 day).
create or replace function app.event_duplicate_matches(
  p_event_id uuid,
  p_org_id uuid,
  p_title text,
  p_venue_id uuid,
  p_starts_at timestamptz
)
returns table (
  other_event_id uuid,
  other_org_id uuid,
  same_venue boolean,
  title_similarity real,
  shared_artists integer,
  blocking boolean,
  approved boolean
)
language sql
stable
security definer
set search_path to ''
as $$
  with candidates as (
    select
      e.id,
      e.org_id,
      (p_venue_id is not null and e.venue_id = p_venue_id) as same_venue,
      extensions.similarity(lower(coalesce(e.title, '')), lower(coalesce(p_title, ''))) as title_similarity,
      (
        select count(*)::int
        from public.event_artists mine
        join public.event_artists theirs on theirs.artist_id = mine.artist_id
        where mine.event_id = p_event_id and theirs.event_id = e.id
      ) as shared_artists
    from public.events e
    where p_starts_at is not null
      and e.id <> p_event_id
      and e.org_id <> p_org_id
      and e.status = 'published'
      and e.cancelled_at is null
      and e.starts_at between p_starts_at - interval '1 day' and p_starts_at + interval '1 day'
  )
  select
    c.id,
    c.org_id,
    c.same_venue,
    c.title_similarity,
    c.shared_artists,
    (
      (c.same_venue::int + (c.title_similarity >= 0.5)::int + (c.shared_artists > 0)::int) >= 2
      or c.title_similarity >= 0.7
    ) as blocking,
    app.event_duplicate_pair_approved(p_event_id, c.id) as approved
  from candidates c
  where c.same_venue or c.title_similarity >= 0.5 or c.shared_artists > 0
$$;

-- Guard: refuse to publish (or, while published, to change the title, venue
-- or date into) an unapproved match of another organisation's event.
create or replace function app.guard_event_duplicate()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_match record;
begin
  if new.status <> 'published' or new.cancelled_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.status = new.status
     and old.title is not distinct from new.title
     and old.venue_id is not distinct from new.venue_id
     and old.starts_at is not distinct from new.starts_at then
    return new;
  end if;

  select m.other_event_id into v_match
  from app.event_duplicate_matches(new.id, new.org_id, new.title, new.venue_id, new.starts_at) m
  where m.blocking and not m.approved
  limit 1;

  if found then
    raise exception 'duplicate_event: this event matches another organiser''s published event (%)', v_match.other_event_id
      using errcode = 'P0001', hint = 'Ask Ticketiv support for permission from the event form.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_event_duplicate on public.events;
create trigger trg_guard_event_duplicate
  before insert or update of status, title, venue_id, starts_at, cancelled_at on public.events
  for each row execute function app.guard_event_duplicate();

-- ---------------------------------------------------------------------------
-- Notifications

create or replace function app.notify_org_managers(p_org uuid, p_type text, p_payload jsonb, p_dedupe text)
returns void
language sql
security definer
set search_path to ''
as $$
  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  select distinct m.user_id, p_type, p_payload, 'pending', 'in_app', p_dedupe || ':' || m.user_id
  from public.org_members m
  where m.org_id = p_org
    and m.role::text in ('organizer_owner', 'organizer_admin', 'organizer', 'admin')
  on conflict do nothing
$$;

-- Hand a request to the original organiser and tell them.
create or replace function app.forward_event_duplicate_request(p_request_id uuid, p_by text, p_note text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.event_duplicate_requests;
  v_requester text;
  v_event text;
begin
  update public.event_duplicate_requests
     set status = 'with_organiser', forwarded_by = p_by, forwarded_at = now(),
         support_note = coalesce(nullif(btrim(p_note), ''), support_note), updated_at = now()
   where id = p_request_id and status = 'with_support'
  returning * into r;
  if not found then return; end if;

  select o.name into v_requester from public.organizations o where o.id = r.requesting_org_id;
  select e.title into v_event from public.events e where e.id = r.original_event_id;

  perform app.notify_org_managers(
    r.original_org_id,
    'duplicate_permission_request',
    jsonb_build_object(
      'requestId', r.id,
      'eventTitle', v_event,
      'title', coalesce(v_requester, 'Another organiser') || ' is asking to list an event like ' || coalesce(v_event, 'yours'),
      'body', 'Read their message and approve or decline.',
      'href', '/orgs/' || r.original_org_id || '/permission-requests'
    ),
    'duplicate_permission_request:' || r.id
  );
end;
$$;

-- Tell the requesting organisation how it went.
create or replace function app.notify_event_duplicate_decision(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.event_duplicate_requests;
  v_event text;
begin
  select * into r from public.event_duplicate_requests where id = p_request_id;
  if not found then return; end if;
  select e.title into v_event from public.events e where e.id = r.event_id;

  perform app.notify_org_managers(
    r.requesting_org_id,
    'duplicate_permission_decision',
    jsonb_build_object(
      'requestId', r.id,
      'eventTitle', v_event,
      'title', case when r.status = 'approved'
                    then 'Approved: you can publish ' || coalesce(v_event, 'your event')
                    else 'Declined: ' || coalesce(v_event, 'your event') || ' can''t be published as it is' end,
      'body', coalesce(r.decision_note, case when r.status = 'approved' then 'Publish it from the event form.' else 'Open the event to see why.' end),
      'href', '/orgs/' || r.requesting_org_id || '/events/' || r.event_id || '/edit?step=publish'
    ),
    'duplicate_permission_decision:' || r.id || ':' || r.status
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Who can act for an organisation's events: the same roles the event API
-- routes accept (owner, admin, organizer), plus platform admins who can change
-- things.
create or replace function app.can_manage_org_events(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select app.org_has_role(p_org, array['organizer_owner', 'organizer_admin', 'organizer', 'admin']::public.app_role[])
      or app.can_platform_mutate()
$$;

-- ---------------------------------------------------------------------------
-- RPCs

-- Matches for the event form and publish check. Org members of the event and
-- platform admins only; the service role is allowed for server routes.
create or replace function public.fn_event_duplicate_check(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  e public.events;
begin
  select * into e from public.events where id = p_event_id;
  if not found then return '[]'::jsonb; end if;
  if (select auth.role()) is distinct from 'service_role'
     and not app.is_org_member_of(e.org_id)
     and not app.is_platform_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'eventId', o.id,
      'title', o.title,
      'slug', o.slug,
      'startsAt', o.starts_at,
      'tz', o.tz,
      'venueName', v.name,
      'orgName', org.name,
      'sameVenue', m.same_venue,
      'titleSimilarity', round(m.title_similarity::numeric, 2),
      'sharedArtists', m.shared_artists,
      'blocking', m.blocking,
      'approved', m.approved,
      'request', (
        select jsonb_build_object('id', r.id, 'status', r.status, 'createdAt', r.created_at,
                                  'forwardedAt', r.forwarded_at, 'forwardedBy', r.forwarded_by,
                                  'decisionNote', r.decision_note, 'decidedAt', r.decided_at)
        from public.event_duplicate_requests r
        where r.event_id = e.id and r.original_event_id = o.id
        order by r.created_at desc
        limit 1
      )
    ) order by m.blocking desc, o.starts_at)
    from app.event_duplicate_matches(e.id, e.org_id, e.title, e.venue_id, e.starts_at) m
    join public.events o on o.id = m.other_event_id
    join public.organizations org on org.id = o.org_id
    left join public.venues v on v.id = o.venue_id
  ), '[]'::jsonb);
end;
$$;

-- Blocked organiser asks support (permission, "the other one is fake", etc.).
create or replace function public.fn_request_duplicate_permission(
  p_event_id uuid,
  p_original_event_id uuid,
  p_reason text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  e public.events;
  v_match record;
  v_id uuid;
begin
  select * into e from public.events where id = p_event_id;
  if not found or not app.can_manage_org_events(e.org_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_reason not in ('permission', 'mine_is_original', 'different_event', 'other') then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;
  if p_message is null or char_length(btrim(p_message)) < 10 then
    raise exception 'message_too_short' using errcode = '22023';
  end if;

  select * into v_match
  from app.event_duplicate_matches(e.id, e.org_id, e.title, e.venue_id, e.starts_at) m
  where m.other_event_id = p_original_event_id;
  if not found then
    raise exception 'not_a_match' using errcode = '22023';
  end if;

  insert into public.event_duplicate_requests
    (event_id, requesting_org_id, original_event_id, original_org_id, reason, message, created_by)
  values
    (e.id, e.org_id, p_original_event_id, v_match.other_org_id, p_reason, btrim(p_message), (select auth.uid()))
  on conflict (event_id, original_event_id) where status in ('with_support', 'with_organiser')
  do update set message = excluded.message, reason = excluded.reason, updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- Requester withdraws an open request.
create or replace function public.fn_withdraw_duplicate_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.event_duplicate_requests;
begin
  select * into r from public.event_duplicate_requests where id = p_request_id;
  if not found or not app.can_manage_org_events(r.requesting_org_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.event_duplicate_requests
     set status = 'withdrawn', updated_at = now()
   where id = p_request_id and status in ('with_support', 'with_organiser');
end;
$$;

-- Support: pass it to the original organiser, or decide it themselves.
create or replace function public.fn_admin_route_duplicate_request(p_request_id uuid, p_action text, p_note text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.event_duplicate_requests;
begin
  if not app.can_platform_mutate() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into r from public.event_duplicate_requests where id = p_request_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  if p_action = 'forward' then
    if r.status <> 'with_support' then raise exception 'already_handled' using errcode = '22023'; end if;
    perform app.forward_event_duplicate_request(r.id, 'support', p_note);
  elsif p_action in ('approve', 'decline') then
    if r.status not in ('with_support', 'with_organiser') then raise exception 'already_handled' using errcode = '22023'; end if;
    if p_action = 'decline' and (p_note is null or char_length(btrim(p_note)) < 5) then
      raise exception 'note_required' using errcode = '22023';
    end if;
    update public.event_duplicate_requests
       set status = case when p_action = 'approve' then 'approved' else 'declined' end,
           decided_by_role = 'support', decided_by = (select auth.uid()),
           decision_note = nullif(btrim(p_note), ''), decided_at = now(), updated_at = now()
     where id = r.id;
    perform app.notify_event_duplicate_decision(r.id);
  else
    raise exception 'invalid_action' using errcode = '22023';
  end if;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (r.requesting_org_id, (select auth.uid()), 'event_duplicate_requests', r.id, 'update',
          jsonb_build_object('action', p_action, 'note', p_note));

  return p_action;
end;
$$;

-- Original organiser: approve or decline a request passed to them.
create or replace function public.fn_decide_duplicate_request(p_request_id uuid, p_decision text, p_note text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.event_duplicate_requests;
begin
  select * into r from public.event_duplicate_requests where id = p_request_id for update;
  if not found or not app.can_manage_org_events(r.original_org_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if r.status <> 'with_organiser' then
    raise exception 'already_handled' using errcode = '22023';
  end if;
  if p_decision not in ('approve', 'decline') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  update public.event_duplicate_requests
     set status = case when p_decision = 'approve' then 'approved' else 'declined' end,
         decided_by_role = 'organiser', decided_by = (select auth.uid()),
         decision_note = nullif(btrim(p_note), ''), decided_at = now(), updated_at = now()
   where id = r.id;
  perform app.notify_event_duplicate_decision(r.id);

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (r.original_org_id, (select auth.uid()), 'event_duplicate_requests', r.id, 'update',
          jsonb_build_object('decision', p_decision));

  return p_decision;
end;
$$;

-- Requests addressed to (or sent by) an organisation, for its workspace.
create or replace function public.fn_org_duplicate_requests(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if not app.is_org_member_of(p_org_id) and not app.is_platform_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'direction', case when r.original_org_id = p_org_id then 'incoming' else 'outgoing' end,
      'status', r.status,
      'reason', r.reason,
      'message', r.message,
      'supportNote', r.support_note,
      'forwardedBy', r.forwarded_by,
      'forwardedAt', r.forwarded_at,
      'decisionNote', r.decision_note,
      'decidedAt', r.decided_at,
      'createdAt', r.created_at,
      'event', jsonb_build_object('id', e.id, 'title', e.title, 'startsAt', e.starts_at, 'tz', e.tz, 'status', e.status),
      'requestingOrg', jsonb_build_object('id', ro.id, 'name', ro.name, 'slug', ro.slug),
      'originalEvent', jsonb_build_object('id', o.id, 'title', o.title, 'slug', o.slug, 'startsAt', o.starts_at, 'tz', o.tz),
      'originalOrg', jsonb_build_object('id', oo.id, 'name', oo.name)
    ) order by (r.status in ('with_support', 'with_organiser')) desc, r.created_at desc)
    from public.event_duplicate_requests r
    join public.events e on e.id = r.event_id
    join public.events o on o.id = r.original_event_id
    join public.organizations ro on ro.id = r.requesting_org_id
    join public.organizations oo on oo.id = r.original_org_id
    -- Incoming requests are only shown once support (or the 3-hour timer) has passed them on.
    where (r.original_org_id = p_org_id and r.status <> 'with_support' and r.forwarded_at is not null)
       or r.requesting_org_id = p_org_id
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3-hour auto-forward

create or replace function public.fn_auto_forward_duplicate_requests()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from public.event_duplicate_requests
    where status = 'with_support' and created_at <= now() - interval '3 hours'
    order by created_at
    limit 200
  loop
    perform app.forward_event_duplicate_request(v_id, 'auto', null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'ticketiv-duplicate-request-autoforward') then
    perform cron.unschedule('ticketiv-duplicate-request-autoforward');
  end if;
  perform cron.schedule('ticketiv-duplicate-request-autoforward', '*/5 * * * *',
                        'select public.fn_auto_forward_duplicate_requests();');
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants

revoke all on function app.event_duplicate_pair_approved(uuid, uuid) from public, anon, authenticated;
revoke all on function app.event_duplicate_matches(uuid, uuid, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function app.guard_event_duplicate() from public, anon, authenticated;
revoke all on function app.notify_org_managers(uuid, text, jsonb, text) from public, anon, authenticated;
revoke all on function app.forward_event_duplicate_request(uuid, text, text) from public, anon, authenticated;
revoke all on function app.notify_event_duplicate_decision(uuid) from public, anon, authenticated;
revoke all on function app.can_manage_org_events(uuid) from public, anon, authenticated;

revoke all on function public.fn_event_duplicate_check(uuid) from public, anon;
grant execute on function public.fn_event_duplicate_check(uuid) to authenticated, service_role;
revoke all on function public.fn_request_duplicate_permission(uuid, uuid, text, text) from public, anon;
grant execute on function public.fn_request_duplicate_permission(uuid, uuid, text, text) to authenticated;
revoke all on function public.fn_withdraw_duplicate_request(uuid) from public, anon;
grant execute on function public.fn_withdraw_duplicate_request(uuid) to authenticated;
revoke all on function public.fn_admin_route_duplicate_request(uuid, text, text) from public, anon;
grant execute on function public.fn_admin_route_duplicate_request(uuid, text, text) to authenticated;
revoke all on function public.fn_decide_duplicate_request(uuid, text, text) from public, anon;
grant execute on function public.fn_decide_duplicate_request(uuid, text, text) to authenticated;
revoke all on function public.fn_org_duplicate_requests(uuid) from public, anon;
grant execute on function public.fn_org_duplicate_requests(uuid) to authenticated, service_role;
revoke all on function public.fn_auto_forward_duplicate_requests() from public, anon, authenticated;

-- TICK-451 — verified-attendee reviews, organiser replies, moderation and the
-- organiser rating. (The organiser photo gallery is event_highlights, already
-- public for public events; the app now shows it on the event page.)
--
--   * Only people whose ticket was scanned in can review, from the end of the
--     event until 14 days after. One review per person per event (editable in
--     the window): 1–5 stars, optional text (≤ 1000), tags from a fixed list.
--     A short blocked-word list refuses abusive text.
--   * Reviews are public once posted. Signed-in people can report a review
--     once each; at 3 reports it is hidden until a platform admin restores or
--     removes it.
--   * The organiser can reply publicly, once per review (editable).
--   * fn_org_rating: the organiser's average only once they have at least 5
--     published reviews.
--   * Public reads go through v_public_event_reviews, which never exposes the
--     reviewer's account id. The base table is readable by the author, the
--     organiser's members and platform admins.
-- The private "How was it?" rating (event_feedback) is unchanged.
--
-- Additive. Rollback: drop the view, the RPCs, event_review_reports and
-- event_reviews.

create table if not exists public.event_reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 1000),
  tags text[] not null default '{}',
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  report_count integer not null default 0,
  org_reply text check (org_reply is null or char_length(org_reply) <= 1000),
  org_reply_at timestamptz,
  org_reply_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists event_reviews_event_idx on public.event_reviews (event_id, status, created_at desc);

create table if not exists public.event_review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.event_reviews (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 3 and 300),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text check (resolution is null or resolution in ('restored', 'removed')),
  unique (review_id, reporter_id)
);

alter table public.event_reviews enable row level security;
alter table public.event_review_reports enable row level security;
revoke all on public.event_reviews, public.event_review_reports from anon, authenticated;
grant select on public.event_reviews to authenticated;
grant select on public.event_review_reports to authenticated;
grant all on public.event_reviews, public.event_review_reports to service_role;

drop policy if exists event_reviews_party_select on public.event_reviews;
create policy event_reviews_party_select on public.event_reviews for select to authenticated
  using (user_id = (select auth.uid()) or app.is_org_member_of(app.event_org_id(event_id)) or app.is_platform_admin());
drop policy if exists event_review_reports_admin_select on public.event_review_reports;
create policy event_review_reports_admin_select on public.event_review_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or app.is_platform_admin());

create or replace function app.review_tag_keys() returns text[]
language sql immutable set search_path to '' as $$
  select array['sound', 'venue', 'value', 'safety', 'organisation', 'atmosphere', 'lineup', 'food_drink']
$$;

-- A deliberately small list; moderation by reports does the rest.
create or replace function app.has_blocked_words(p text) returns boolean
language sql immutable set search_path to '' as $$
  select coalesce(lower(p), '') ~ '\m(fuck|fucking|shit|cunt|bitch|nigger|faggot|whore)\M'
$$;

-- The event's end, or six hours after the start when it has no end.
create or replace function app.event_end_at(p_event uuid) returns timestamptz
language sql stable security definer set search_path to '' as $$
  select coalesce(e.ends_at, e.starts_at + interval '6 hours') from public.events e where e.id = p_event
$$;
revoke all on function app.event_end_at(uuid) from public, anon;
grant execute on function app.event_end_at(uuid) to authenticated, service_role;

create or replace function app.checked_in_at_event(p_event uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (
    select 1
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      join public.orders o on o.id = oi.order_id
     where tt.event_id = p_event
       and oi.checked_in_at is not null
       and (oi.current_owner_id = (select auth.uid()) or (oi.current_owner_id is null and o.buyer_id = (select auth.uid())))
  )
$$;
revoke all on function app.checked_in_at_event(uuid) from public, anon;
grant execute on function app.checked_in_at_event(uuid) to authenticated, service_role;

-- ── RPCs ───────────────────────────────────────────────────────────────────
create or replace function public.fn_submit_event_review(p_event_id uuid, p_rating integer, p_body text, p_tags text[])
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_end timestamptz := app.event_end_at(p_event_id);
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_tags text[] := array(select distinct lower(btrim(t)) from unnest(coalesce(p_tags, '{}')) t where btrim(t) <> '' order by 1);
  v_id uuid;
begin
  perform app.require_claimed_account();
  if v_end is null then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if not app.checked_in_at_event(p_event_id) then
    raise exception 'review_attendees_only' using errcode = '42501';
  end if;
  if now() < v_end then
    raise exception 'review_not_open' using errcode = 'P0001';
  end if;
  if now() > v_end + interval '14 days' then
    raise exception 'review_closed' using errcode = 'P0001';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating_invalid' using errcode = 'P0001';
  end if;
  if v_body is not null and char_length(v_body) > 1000 then
    raise exception 'review_too_long' using errcode = 'P0001';
  end if;
  if not (v_tags <@ app.review_tag_keys()) then
    raise exception 'tag_invalid' using errcode = 'P0001';
  end if;
  if app.has_blocked_words(v_body) then
    raise exception 'review_language' using errcode = 'P0001';
  end if;

  insert into public.event_reviews as r (event_id, user_id, rating, body, tags)
  values (p_event_id, v_user, p_rating, v_body, v_tags)
  on conflict (event_id, user_id) do update set
    rating = excluded.rating, body = excluded.body, tags = excluded.tags, updated_at = now()
    where r.status <> 'removed'
  returning id into v_id;
  if v_id is null then
    raise exception 'review_removed' using errcode = 'P0001';
  end if;
  return v_id;
end;
$$;
revoke all on function public.fn_submit_event_review(uuid, integer, text, text[]) from public, anon;
grant execute on function public.fn_submit_event_review(uuid, integer, text, text[]) to authenticated, service_role;

create or replace function public.fn_report_event_review(p_review_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := (select auth.uid());
  r public.event_reviews%rowtype;
  v_count integer;
begin
  perform app.require_claimed_account();
  select * into r from public.event_reviews where id = p_review_id for update;
  if not found or r.status = 'removed' then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
  if r.user_id = v_user then
    raise exception 'cannot_report_own' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  insert into public.event_review_reports (review_id, reporter_id, reason) values (r.id, v_user, btrim(p_reason))
  on conflict (review_id, reporter_id) do nothing;
  select count(*) into v_count from public.event_review_reports where review_id = r.id and resolved_at is null;
  update public.event_reviews set report_count = v_count,
    status = case when status = 'published' and v_count >= 3 then 'hidden' else status end
  where id = r.id;
  return (select status from public.event_reviews where id = r.id);
end;
$$;
revoke all on function public.fn_report_event_review(uuid, text) from public, anon;
grant execute on function public.fn_report_event_review(uuid, text) to authenticated, service_role;

create or replace function public.fn_moderate_event_review(p_review_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not app.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('restore', 'remove') then
    raise exception 'decision_invalid' using errcode = 'P0001';
  end if;
  update public.event_reviews
     set status = case when p_decision = 'restore' then 'published' else 'removed' end,
         report_count = case when p_decision = 'restore' then 0 else report_count end,
         updated_at = now()
   where id = p_review_id;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
  update public.event_review_reports set resolved_at = now(), resolution = case when p_decision = 'restore' then 'restored' else 'removed' end
   where review_id = p_review_id and resolved_at is null;
  insert into public.audit_log (actor_id, table_name, record_id, action, changes)
  values ((select auth.uid()), 'event_reviews', p_review_id::text, 'other'::public.audit_action,
          jsonb_build_object('event', 'review_moderated', 'decision', p_decision, 'note', nullif(btrim(coalesce(p_note, '')), '')));
end;
$$;
revoke all on function public.fn_moderate_event_review(uuid, text, text) from public, anon;
grant execute on function public.fn_moderate_event_review(uuid, text, text) to authenticated, service_role;

create or replace function public.fn_reply_event_review(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.event_reviews%rowtype;
  v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
begin
  select * into r from public.event_reviews where id = p_review_id;
  if not found or not app.is_org_manager(app.event_org_id(r.event_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_reply is not null and char_length(v_reply) > 1000 then
    raise exception 'review_too_long' using errcode = 'P0001';
  end if;
  if app.has_blocked_words(v_reply) then
    raise exception 'review_language' using errcode = 'P0001';
  end if;
  update public.event_reviews set org_reply = v_reply, org_reply_at = case when v_reply is null then null else now() end,
         org_reply_by = case when v_reply is null then null else (select auth.uid()) end
   where id = r.id;
end;
$$;
revoke all on function public.fn_reply_event_review(uuid, text) from public, anon;
grant execute on function public.fn_reply_event_review(uuid, text) to authenticated, service_role;

-- Organiser rating: shown only from 5 published reviews.
create or replace function public.fn_org_rating(p_org_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select jsonb_build_object(
    'count', count(*),
    'average', case when count(*) >= 5 then round(avg(r.rating)::numeric, 1) end
  )
    from public.event_reviews r
    join public.events e on e.id = r.event_id
   where e.org_id = p_org_id and r.status = 'published' and e.visibility = 'public'
$$;
revoke all on function public.fn_org_rating(uuid) from public;
grant execute on function public.fn_org_rating(uuid) to anon, authenticated, service_role;

-- Public reviews of public events, without the reviewer's account id.
create or replace view public.v_public_event_reviews as
select r.id, r.event_id, r.rating, r.body, r.tags, r.org_reply, r.org_reply_at, r.created_at, r.updated_at
  from public.event_reviews r
  join public.events e on e.id = r.event_id
 where r.status = 'published' and e.visibility = 'public' and e.status in ('published', 'paused', 'archived');
grant select on public.v_public_event_reviews to anon, authenticated;

comment on table public.event_reviews is 'Verified-attendee reviews (TICK-451). Public through v_public_event_reviews only.';
comment on view public.v_public_event_reviews is 'Published reviews of public events, without reviewer identities (TICK-451).';

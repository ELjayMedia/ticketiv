-- Duplicate-event guard: ignore events that are already over.
--
-- A published event that has ended can't be confused with a new listing, so
-- it no longer counts as an "original". An event is over once its end time
-- has passed. Without an end time, it's over 12 hours after it starts.
--
-- Only the candidate filter changes; scoring, approvals, the trigger and the
-- RPCs that call this function are untouched. Grants carry over with
-- create or replace.

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
      -- Past events don't count: only events that haven't ended yet.
      and coalesce(e.ends_at, e.starts_at + interval '12 hours') > now()
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

revoke all on function app.event_duplicate_matches(uuid, uuid, text, uuid, timestamptz) from public, anon, authenticated;

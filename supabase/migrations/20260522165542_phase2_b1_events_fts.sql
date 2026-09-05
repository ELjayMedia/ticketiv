-- B1: Postgres full-text search for the Search results screen.
-- Adds a generated tsvector that covers title + description + city + venue +
-- artist names; GIN index; trigram fallback for typo-tolerance on title;
-- and an RPC fn_search_events that returns ranked rows with filter support.

create extension if not exists pg_trgm;

-- Generated FTS column. We resolve venue + artist names through a small
-- trigger because they live on other tables (immutable functions can't
-- cross-table-join in a generated column).
alter table public.events
  add column if not exists search_text text,
  add column if not exists search_tsv tsvector;

create or replace function public.fn_events_refresh_search()
returns trigger
language plpgsql
as $$
declare
  v_venue text;
  v_artists text;
begin
  select v.name into v_venue from public.venues v where v.id = new.venue_id;
  select string_agg(a.name, ' ')
    into v_artists
    from public.event_artists ea
    join public.artists a on a.id = ea.artist_id
    where ea.event_id = new.id;

  new.search_text :=
    coalesce(new.title, '') || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(new.city, '') || ' ' ||
    coalesce(new.category, '') || ' ' ||
    coalesce(v_venue, '') || ' ' ||
    coalesce(v_artists, '');

  new.search_tsv := to_tsvector('simple', new.search_text);
  return new;
end
$$;

drop trigger if exists trg_events_refresh_search on public.events;
create trigger trg_events_refresh_search
  before insert or update on public.events
  for each row execute function public.fn_events_refresh_search();

-- Backfill existing rows.
update public.events
   set title = title;

create index if not exists idx_events_search_tsv on public.events using gin(search_tsv);
create index if not exists idx_events_title_trgm on public.events using gin (title gin_trgm_ops);

-- When an artist is linked/unlinked we want the event's search_text to
-- refresh too. Cheap to do via a touch on the events row.
create or replace function public.fn_event_artists_refresh_event_search()
returns trigger language plpgsql as $$
declare v_event uuid;
begin
  v_event := coalesce(new.event_id, old.event_id);
  if v_event is not null then
    update public.events set updated_at = now() where id = v_event;
  end if;
  return coalesce(new, old);
end
$$;

drop trigger if exists trg_event_artists_refresh_search on public.event_artists;
create trigger trg_event_artists_refresh_search
  after insert or update or delete on public.event_artists
  for each row execute function public.fn_event_artists_refresh_event_search();

-- Public search RPC. Honors the same visibility rules as v_events_public:
-- only published, visible, in-window events are searchable anonymously.
create or replace function public.fn_search_events(
  p_query text default null,
  p_category text default null,
  p_city text default null,
  p_starts_after timestamptz default null,
  p_starts_before timestamptz default null,
  p_max_price_cents int default null,
  p_only_free boolean default false,
  p_limit int default 30,
  p_offset int default 0
)
returns table(
  id uuid,
  title text,
  slug text,
  cover_image_url text,
  starts_at timestamptz,
  city text,
  category text,
  venue_name text,
  min_price_cents int,
  currency text,
  rank real
)
language sql
stable
security invoker
as $$
  with q as (
    select case
      when p_query is null or length(trim(p_query)) = 0 then null
      else websearch_to_tsquery('simple', p_query)
    end as tsq
  ),
  candidates as (
    select e.*,
      case
        when (select tsq from q) is null then 0.5
        else ts_rank((coalesce(e.search_tsv, to_tsvector('simple', coalesce(e.title,'')))), (select tsq from q))
      end as r
    from public.events e
    where e.status = 'published'
      and e.visibility = 'public'
      and (e.publish_at is null or e.publish_at <= now())
      and (e.unpublish_at is null or e.unpublish_at > now())
      and (
        (select tsq from q) is null
        or e.search_tsv @@ (select tsq from q)
        or e.title ilike '%' || p_query || '%'
      )
      and (p_category is null or e.category = p_category)
      and (p_city is null or e.city ilike p_city)
      and (p_starts_after is null or e.starts_at >= p_starts_after)
      and (p_starts_before is null or e.starts_at <= p_starts_before)
  ),
  priced as (
    select c.*,
      (select min(tt.price_cents) from public.ticket_types tt where tt.event_id = c.id) as min_price_cents,
      (select tt.currency from public.ticket_types tt where tt.event_id = c.id order by tt.price_cents asc limit 1) as currency
    from candidates c
  ),
  filtered as (
    select p.*,
      v.name as venue_name
    from priced p
    left join public.venues v on v.id = p.venue_id
    where (p_max_price_cents is null or coalesce(p.min_price_cents, 0) <= p_max_price_cents)
      and (not p_only_free or coalesce(p.min_price_cents, 0) = 0)
  )
  select
    f.id,
    f.title,
    f.slug,
    f.cover_image_url,
    f.starts_at,
    f.city,
    f.category,
    f.venue_name,
    f.min_price_cents,
    f.currency,
    f.r as rank
  from filtered f
  order by f.r desc, f.starts_at asc nulls last
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$$;

grant execute on function public.fn_search_events(text, text, text, timestamptz, timestamptz, int, boolean, int, int) to anon, authenticated;

comment on function public.fn_search_events is
  'Public ranked search over published events. Combines FTS on search_tsv with ILIKE fallback on title; honors visibility + publish window.';
;

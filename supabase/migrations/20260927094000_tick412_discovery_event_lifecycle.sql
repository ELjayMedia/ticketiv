-- TICK-412: lifecycle-aware public discovery.
-- The final event occurrence determines whether an event is current or past.
-- "Current" includes the three-hour operational grace after the final end.

create or replace view public.v_public_event_cards as
select
  e.id,
  e.title,
  e.slug,
  e.category,
  coalesce(e.city, v.city) as city,
  e.country_code as country,
  e.cover_image_url as poster_url,
  coalesce(nextd.starts_at, e.starts_at) as starts_at,
  e.venue_id,
  v.name as venue_name,
  v.address as venue_address,
  v.tz as venue_tz,
  tp.min_price_cents,
  tp.max_price_cents,
  tp.currency,
  e.org_id as organizer_id,
  o.name as organizer_name,
  o.logo as organizer_logo_url,
  e.featured_priority,
  coalesce(els.tickets_sold, 0) as tickets_sold,
  coalesce(els.tickets_available, 0) as tickets_available,
  coalesce(els.checked_in_count, 0) as checked_in_count,
  els.last_order_at,
  els.last_scan_at,
  els.updated_at as live_stats_updated_at,
  coalesce(finald.ends_at, finald.starts_at, e.ends_at, e.starts_at) as event_ends_at
from public.events e
left join public.venues v on v.id = e.venue_id
left join public.organizations o on o.id = e.org_id
left join public.event_live_stats els on els.event_id = e.id
left join lateral (
  select d.starts_at
  from public.event_dates d
  where d.event_id = e.id
    and d.starts_at >= now()
  order by d.starts_at asc
  limit 1
) nextd on true
left join lateral (
  select d.starts_at, d.ends_at
  from public.event_dates d
  where d.event_id = e.id
  order by coalesce(d.ends_at, d.starts_at) desc
  limit 1
) finald on true
left join lateral (
  select
    min(t.price_cents) as min_price_cents,
    max(t.price_cents) as max_price_cents,
    (
      select t2.currency
      from public.ticket_types t2
      where t2.event_id = e.id
        and t2.sales_status = 'on_sale'::ticket_type_sales_status
      order by t2.price_cents asc
      limit 1
    ) as currency
  from public.ticket_types t
  where t.event_id = e.id
    and t.sales_status = 'on_sale'::ticket_type_sales_status
) tp on true
where e.status = 'published'::event_status
  and e.visibility = 'public'
  and (e.publish_at is null or e.publish_at <= now())
  and (e.unpublish_at is null or e.unpublish_at > now());

revoke all on public.v_public_event_cards from public;
grant select on public.v_public_event_cards to anon, authenticated;

drop function if exists public.fn_search_events(
  text,
  text,
  text,
  timestamp with time zone,
  timestamp with time zone,
  integer,
  boolean,
  integer,
  integer
);

create function public.fn_search_events(
  p_query text default null,
  p_category text default null,
  p_city text default null,
  p_starts_after timestamp with time zone default null,
  p_starts_before timestamp with time zone default null,
  p_max_price_cents integer default null,
  p_only_free boolean default false,
  p_limit integer default 30,
  p_offset integer default 0,
  p_lifecycle text default 'current'
)
returns table(
  id uuid,
  title text,
  slug text,
  cover_image_url text,
  starts_at timestamp with time zone,
  city text,
  category text,
  venue_name text,
  min_price_cents integer,
  currency text,
  organizer_name text,
  organizer_logo_url text,
  tickets_sold integer,
  rank real
)
language sql
stable
set search_path to 'public'
as $function$
  with q as (
    select case
      when p_query is null or length(trim(p_query)) = 0 then null
      else websearch_to_tsquery('simple', p_query)
    end as tsq
  ),
  lifecycle as (
    select case
      when p_lifecycle in ('current', 'past', 'all') then p_lifecycle
      else 'current'
    end as mode
  ),
  base as (
    select
      e.*,
      coalesce(nextd.starts_at, e.starts_at) as display_starts_at,
      coalesce(finald.ends_at, finald.starts_at, e.ends_at, e.starts_at) as lifecycle_end_at
    from public.events e
    left join lateral (
      select d.starts_at
      from public.event_dates d
      where d.event_id = e.id
        and d.starts_at >= now()
      order by d.starts_at asc
      limit 1
    ) nextd on true
    left join lateral (
      select d.starts_at, d.ends_at
      from public.event_dates d
      where d.event_id = e.id
      order by coalesce(d.ends_at, d.starts_at) desc
      limit 1
    ) finald on true
    where e.status = 'published'
      and e.visibility = 'public'
      and (e.publish_at is null or e.publish_at <= now())
      and (e.unpublish_at is null or e.unpublish_at > now())
  ),
  candidates as (
    select b.*,
      case
        when (select tsq from q) is null then 0.5
        else ts_rank(
          coalesce(b.search_tsv, to_tsvector('simple', coalesce(b.title, ''))),
          (select tsq from q)
        )
      end as r
    from base b
    where (
        (select mode from lifecycle) = 'all'
        or (
          (select mode from lifecycle) = 'current'
          and (
            b.lifecycle_end_at is null
            or b.lifecycle_end_at >= now() - interval '3 hours'
          )
        )
        or (
          (select mode from lifecycle) = 'past'
          and b.lifecycle_end_at < now() - interval '3 hours'
        )
      )
      and (
        (select tsq from q) is null
        or b.search_tsv @@ (select tsq from q)
        or b.title ilike '%' || p_query || '%'
      )
      and (p_category is null or b.category = p_category)
      and (p_city is null or b.city ilike p_city)
      and (p_starts_after is null or b.display_starts_at >= p_starts_after)
      and (p_starts_before is null or b.display_starts_at <= p_starts_before)
  ),
  priced as (
    select c.*,
      (
        select min(tt.price_cents)
        from public.ticket_types tt
        where tt.event_id = c.id
      ) as min_price_cents,
      (
        select tt.currency
        from public.ticket_types tt
        where tt.event_id = c.id
        order by tt.price_cents asc
        limit 1
      ) as currency
    from candidates c
  ),
  enriched as (
    select
      p.*,
      v.name as venue_name,
      o.name as organizer_name,
      o.logo as organizer_logo_url,
      els.tickets_sold as live_tickets_sold
    from priced p
    left join public.venues v on v.id = p.venue_id
    left join public.organizations o on o.id = p.org_id
    left join public.event_live_stats els on els.event_id = p.id
    where (p_max_price_cents is null or coalesce(p.min_price_cents, 0) <= p_max_price_cents)
      and (not p_only_free or coalesce(p.min_price_cents, 0) = 0)
  )
  select
    e.id,
    e.title,
    e.slug,
    e.cover_image_url,
    e.display_starts_at as starts_at,
    e.city,
    e.category,
    e.venue_name,
    e.min_price_cents,
    e.currency,
    e.organizer_name,
    e.organizer_logo_url,
    e.live_tickets_sold as tickets_sold,
    e.r as rank
  from enriched e
  order by
    e.r desc,
    case when (select mode from lifecycle) = 'past' then e.display_starts_at end desc nulls last,
    case when (select mode from lifecycle) <> 'past' then e.display_starts_at end asc nulls last
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$function$;

revoke all on function public.fn_search_events(
  text, text, text, timestamp with time zone, timestamp with time zone,
  integer, boolean, integer, integer, text
) from public;
grant execute on function public.fn_search_events(
  text, text, text, timestamp with time zone, timestamp with time zone,
  integer, boolean, integer, integer, text
) to anon, authenticated;

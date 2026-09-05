-- TICK-44 · Extend fn_search_events to also return organizer_name,
-- organizer_logo_url and tickets_sold so public search result cards can
-- render the same trust + momentum signals as v_public_event_cards.
--
-- Pure additive change to the RETURNS TABLE shape. Filter semantics are
-- unchanged. The RPC remains anon-callable (security via the published +
-- public visibility gate that already lives inside the function body).

drop function if exists public.fn_search_events(
  text, text, text, timestamptz, timestamptz, integer, boolean, integer, integer
);

create or replace function public.fn_search_events(
  p_query text default null,
  p_category text default null,
  p_city text default null,
  p_starts_after timestamptz default null,
  p_starts_before timestamptz default null,
  p_max_price_cents integer default null,
  p_only_free boolean default false,
  p_limit integer default 30,
  p_offset integer default 0
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
  enriched as (
    select p.*,
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
    e.starts_at,
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
  order by e.r desc, e.starts_at asc nulls last
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$function$;

grant execute on function public.fn_search_events(
  text, text, text, timestamptz, timestamptz, integer, boolean, integer, integer
) to anon, authenticated;

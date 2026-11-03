-- Ticket sales are organizer-only: remove them from public event data.
--
-- Before, anyone (signed out included) could read per-event sales:
--   * event_live_stats: anon/authenticated policies exposed tickets_sold,
--     gross_sales_cents and payment counts for every published public event.
--   * v_public_event_cards (Discover, search): tickets_sold, checked_in_count,
--     last_order_at, last_scan_at.
--   * fn_search_events: tickets_sold.
--   * v_event_sales_public: tickets_sold + gross revenue granted to PUBLIC/anon
--     (empty in practice, its materialized view has no select grant).
--
-- After:
--   * event_live_stats: org members and platform admins only (realtime too).
--   * fn_event_public_live_stats(event): what attendee pages need and no
--     more (tickets_available, checked_in_count, updated_at), only for
--     published public events. Used by the event page, the public card view
--     and paired gate scanners.
--   * v_public_event_cards rebuilt without the sales columns.
--   * fn_search_events keeps its signature (older clients) but returns
--     tickets_sold as null and no longer reads event_live_stats.
--   * v_event_sales_public: no grants for PUBLIC, anon or authenticated.

-- 1. Public availability, nothing about sales ---------------------------------
create or replace function public.fn_event_public_live_stats(p_event_id uuid)
returns table (event_id uuid, tickets_available integer, checked_in_count integer, updated_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select els.event_id, els.tickets_available, els.checked_in_count, els.updated_at
  from public.event_live_stats els
  join public.events e on e.id = els.event_id
  where els.event_id = p_event_id
    and e.status = 'published'
    and e.visibility = 'public'
    and (e.publish_at is null or e.publish_at <= now())
    and (e.unpublish_at is null or e.unpublish_at > now());
$function$;

comment on function public.fn_event_public_live_stats(uuid) is
  'Attendee-safe live stats for a published public event: availability and check-ins only. Never ticket sales or revenue.';

revoke all on function public.fn_event_public_live_stats(uuid) from public;
grant execute on function public.fn_event_public_live_stats(uuid) to anon, authenticated, service_role;

-- 2. event_live_stats: organizers only ----------------------------------------
drop policy if exists event_live_stats_public_read on public.event_live_stats;

alter policy event_live_stats_org_read on public.event_live_stats
  using (
    exists (
      select 1 from public.events e
      where e.id = event_live_stats.event_id
        and app.is_org_member_of(e.org_id)
    )
    or app.is_platform_admin()
  );

-- 3. Public event cards without sales -------------------------------------------
drop view if exists public.v_public_event_cards;

create view public.v_public_event_cards
with (security_invoker = true)
as
select
  e.id,
  e.title,
  e.slug,
  e.category,
  coalesce(e.city, v.city) as city,
  e.country_code as country,
  e.cover_image_url as poster_url,
  e.starts_at,
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
  coalesce(pls.tickets_available, 0) as tickets_available,
  pls.updated_at as live_stats_updated_at,
  coalesce(finald.ends_at, finald.starts_at, e.ends_at, e.starts_at) as event_ends_at
from public.events e
left join public.venues v on v.id = e.venue_id
left join public.organizations o on o.id = e.org_id
left join lateral public.fn_event_public_live_stats(e.id) pls on true
left join lateral (
  select
    min(t.price_cents) as min_price_cents,
    max(t.price_cents) as max_price_cents,
    (
      select t2.currency
      from public.ticket_types t2
      where t2.event_id = e.id and t2.sales_status = 'on_sale'::ticket_type_sales_status
      order by t2.price_cents
      limit 1
    ) as currency
  from public.ticket_types t
  where t.event_id = e.id and t.sales_status = 'on_sale'::ticket_type_sales_status
) tp on true
left join lateral (
  select d.starts_at, d.ends_at
  from public.event_dates d
  where d.event_id = e.id
  order by coalesce(d.ends_at, d.starts_at) desc
  limit 1
) finald on true
where e.status = 'published'::event_status
  and e.cancelled_at is null
  and e.visibility = 'public'
  and (e.publish_at is null or e.publish_at <= now())
  and (e.unpublish_at is null or e.unpublish_at > now());

comment on view public.v_public_event_cards is
  'Public discovery read model. No ticket sales: availability comes from fn_event_public_live_stats.';

revoke all on public.v_public_event_cards from public;
grant select on public.v_public_event_cards to anon, authenticated;
grant all on public.v_public_event_cards to service_role;

-- 4. Search stops returning sales -----------------------------------------------
do $migration$
declare
  v_old text := pg_get_functiondef(
    'public.fn_search_events(text, text, text, timestamptz, timestamptz, integer, boolean, integer, integer, text)'::regprocedure
  );
  v_new text := v_old;
begin
  v_new := replace(v_new, E',\n      els.tickets_sold as live_tickets_sold', '');
  v_new := replace(v_new, E'\n    left join public.event_live_stats els on els.event_id = p.id', '');
  v_new := replace(v_new, 'e.live_tickets_sold as tickets_sold', 'null::integer as tickets_sold');
  if v_new = v_old or v_new like '%event_live_stats%' or v_new like '%live_tickets_sold%' then
    raise exception 'hide sales: fn_search_events did not match the expected definition';
  end if;
  execute v_new;
end
$migration$;

-- 5. Sales view: never public -----------------------------------------------------
revoke all on public.v_event_sales_public from public, anon, authenticated;

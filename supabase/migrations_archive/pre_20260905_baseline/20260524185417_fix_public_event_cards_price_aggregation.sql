create or replace view public.v_public_event_cards as
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
  coalesce(els.tickets_sold, 0)::integer as tickets_sold,
  coalesce(els.tickets_available, 0)::integer as tickets_available,
  coalesce(els.checked_in_count, 0)::integer as checked_in_count,
  els.last_order_at,
  els.last_scan_at,
  els.updated_at as live_stats_updated_at
from public.events e
left join public.venues v on v.id = e.venue_id
left join public.organizations o on o.id = e.org_id
left join public.event_live_stats els on els.event_id = e.id
left join lateral (
  select
    min(t.price_cents) as min_price_cents,
    max(t.price_cents) as max_price_cents,
    (
      select t2.currency
      from public.ticket_types t2
      where t2.event_id = e.id
        and t2.sales_status = 'on_sale'::ticket_type_sales_status
      order by t2.price_cents
      limit 1
    ) as currency
  from public.ticket_types t
  where t.event_id = e.id
    and t.sales_status = 'on_sale'::ticket_type_sales_status
) tp on true
where e.status = 'published'::event_status
  and e.visibility = 'public'::text
  and (e.publish_at is null or e.publish_at <= now())
  and (e.unpublish_at is null or e.unpublish_at > now());

grant select on public.v_public_event_cards to anon;
grant select on public.v_public_event_cards to authenticated;;

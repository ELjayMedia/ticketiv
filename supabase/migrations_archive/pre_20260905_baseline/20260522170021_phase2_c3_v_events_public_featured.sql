-- Expose featured_priority through v_events_public so the discover home
-- can sort/select the editor's pick without an extra query.

create or replace view public.v_events_public
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
    e.featured_priority
  from public.events e
  left join public.venues v on v.id = e.venue_id
  left join public.organizations o on o.id = e.org_id
  left join lateral (
    select
      min(t.price_cents) as min_price_cents,
      max(t.price_cents) as max_price_cents,
      (
        select t2.currency
          from public.ticket_types t2
         where t2.event_id = e.id
         order by t2.price_cents
         limit 1
      ) as currency
    from public.ticket_types t
    where t.event_id = e.id
  ) tp on true
  where e.status = 'published'::event_status
    and e.visibility = 'public';

grant select on public.v_events_public to anon, authenticated;
;

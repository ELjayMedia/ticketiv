
drop view if exists public.v_events_public;

create view public.v_events_public as
select
  e.id,
  e.title,
  e.slug,
  e.category,
  coalesce(e.city, v.city)  as city,
  e.country_code            as country,
  e.cover_image_url         as poster_url,
  e.starts_at,
  e.venue_id,
  v.name                    as venue_name,
  v.address                 as venue_address,
  v.tz                      as venue_tz,
  tp.min_price_cents,
  tp.max_price_cents,
  tp.currency,
  e.org_id                  as organizer_id,
  o.name                    as organizer_name,
  o.logo                    as organizer_logo_url
from public.events e
left join public.venues v on v.id = e.venue_id
left join public.organizations o on o.id = e.org_id
left join lateral (
  select
    min(t.price_cents) as min_price_cents,
    max(t.price_cents) as max_price_cents,
    (select t2.currency from public.ticket_types t2
       where t2.event_id = e.id order by t2.price_cents limit 1) as currency
  from public.ticket_types t
  where t.event_id = e.id
) tp on true
where e.status = 'published'
  and e.visibility = 'public';

grant select on public.v_events_public to anon, authenticated;

create view public.v_event_public as
select
  ev.*,
  e.description,
  e.visibility,
  v.capacity as venue_capacity
from public.v_events_public ev
join public.events e on e.id = ev.id
left join public.venues v on v.id = ev.venue_id;

grant select on public.v_event_public to anon, authenticated;

create view public.v_organizer_public as
select
  o.id,
  o.name,
  o.slug,
  o.bio,
  o.logo                 as logo_url,
  null::text             as website,
  null::jsonb            as social_links,
  (select count(*) from public.events e
     where e.org_id = o.id
       and e.status = 'published'
       and e.visibility = 'public') as event_count
from public.organizations o;

grant select on public.v_organizer_public to anon, authenticated;

create view public.v_organizer_events_public as
select * from public.v_events_public;

grant select on public.v_organizer_events_public to anon, authenticated;

create view public.v_artist_public as
select
  a.id,
  a.name,
  a.slug,
  a.bio,
  a.image_url   as photo_url,
  null::text    as genre,
  null::jsonb   as social_links
from public.artists a;

grant select on public.v_artist_public to anon, authenticated;

create view public.v_artist_events_public as
select ev.*, ea.artist_id
from public.v_events_public ev
join public.event_artists ea on ea.event_id = ev.id;

grant select on public.v_artist_events_public to anon, authenticated;
;

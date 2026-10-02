-- TICK-410 / TICK-412 / TICK-415
-- Canonical public lifecycle end time and schedule-driven search.
-- Past is derived from final occurrence end + 3h; there is no stored past boolean.
-- Cancellation is an explicit terminal state and remains directly addressable.

alter table public.events
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists cancellation_reason text;

create or replace function public.fn_transition_event_status_unchecked(
  p_event_id uuid,
  p_new_status text
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_event events%rowtype;
  v_active_holders integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_event from events where id = p_event_id;
  if not found then
    raise exception 'Event not found';
  end if;

  if not exists (
    select 1 from org_members
    where org_id = v_event.org_id
      and user_id = v_user_id
      and role = any(array['organizer_owner', 'organizer_admin']::app_role[])
  ) and not exists (
    select 1 from admin_users where user_id = v_user_id and active = true
  ) then
    raise exception 'Insufficient permissions';
  end if;

  if v_event.cancelled_at is not null then
    raise exception 'Event is already cancelled';
  end if;

  if p_new_status not in ('paused', 'published', 'archived', 'cancelled') then
    raise exception 'Invalid target status: %', p_new_status;
  end if;
  if p_new_status = 'paused' and v_event.status::text <> 'published' then
    raise exception 'Can only pause a published event (current: %)', v_event.status;
  end if;
  if p_new_status = 'published' and v_event.status::text <> 'paused' then
    raise exception 'Can only resume a paused event (current: %)', v_event.status;
  end if;
  if p_new_status = 'archived' and v_event.status::text = 'archived' then
    raise exception 'Event is already archived';
  end if;
  if p_new_status = 'cancelled' and v_event.status::text not in ('published', 'paused') then
    raise exception 'Can only cancel a published or paused event (current: %)', v_event.status;
  end if;

  select count(*) into v_active_holders
  from tickets
  where event_id = p_event_id
    and status in ('issued', 'checked_in');

  if p_new_status = 'cancelled' then
    update events
    set cancelled_at = now(),
        cancelled_by = v_user_id,
        updated_at = now()
    where id = p_event_id;
  else
    update events
    set status = p_new_status::event_status,
        updated_at = now()
    where id = p_event_id;
  end if;

  return json_build_object(
    'status', p_new_status,
    'active_holders', v_active_holders
  );
end;
$function$;

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
  e.featured_priority,
  case when e.cancelled_at is not null then 'cancelled' else e.status::text end as event_status,
  coalesce(finald.ends_at, finald.starts_at, e.ends_at, e.starts_at) as event_ends_at
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
        and t2.sales_status = 'on_sale'::ticket_type_sales_status
      order by t2.price_cents
      limit 1
    ) as currency
  from public.ticket_types t
  where t.event_id = e.id
    and t.sales_status = 'on_sale'::ticket_type_sales_status
) tp on true
left join lateral (
  select d.starts_at, d.ends_at
  from public.event_dates d
  where d.event_id = e.id
  order by coalesce(d.ends_at, d.starts_at) desc
  limit 1
) finald on true
where (e.status = 'published'::event_status or e.cancelled_at is not null)
  and e.visibility = 'public'::text;

create or replace view public.v_public_event_cards
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
left join lateral (
  select d.starts_at, d.ends_at
  from public.event_dates d
  where d.event_id = e.id
  order by coalesce(d.ends_at, d.starts_at) desc
  limit 1
) finald on true
where e.status = 'published'::event_status
  and e.cancelled_at is null
  and e.visibility = 'public'::text
  and (e.publish_at is null or e.publish_at <= now())
  and (e.unpublish_at is null or e.unpublish_at > now());

create or replace view public.v_event_public
with (security_invoker = true)
as
select
  ev.id,
  ev.title,
  ev.slug,
  ev.category,
  ev.city,
  ev.country,
  ev.poster_url,
  ev.starts_at,
  ev.venue_id,
  ev.venue_name,
  ev.venue_address,
  ev.venue_tz,
  ev.min_price_cents,
  ev.max_price_cents,
  ev.currency,
  ev.organizer_id,
  ev.organizer_name,
  ev.organizer_logo_url,
  e.description,
  e.visibility,
  v.capacity as venue_capacity,
  ev.event_status as status,
  ev.event_ends_at
from public.v_events_public ev
join public.events e on e.id = ev.id
left join public.venues v on v.id = ev.venue_id;

create or replace view public.v_organizer_events_public
with (security_invoker = true)
as
select
  id,
  title,
  slug,
  category,
  city,
  country,
  poster_url,
  starts_at,
  venue_id,
  venue_name,
  venue_address,
  venue_tz,
  min_price_cents,
  max_price_cents,
  currency,
  organizer_id,
  organizer_name,
  organizer_logo_url,
  event_status,
  event_ends_at
from public.v_events_public;

drop function if exists public.fn_search_events(
  text, text, text, timestamptz, timestamptz, integer, boolean, integer, integer
);

create function public.fn_search_events(
  p_query text default null,
  p_category text default null,
  p_city text default null,
  p_starts_after timestamptz default null,
  p_starts_before timestamptz default null,
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
    select
      e.*,
      coalesce(finald.ends_at, finald.starts_at, e.ends_at, e.starts_at) as lifecycle_ends_at,
      case
        when (select tsq from q) is null then 0.5
        else ts_rank(
          coalesce(e.search_tsv, to_tsvector('simple', coalesce(e.title,''))),
          (select tsq from q)
        )
      end as r
    from public.events e
    left join lateral (
      select d.starts_at, d.ends_at
      from public.event_dates d
      where d.event_id = e.id
      order by coalesce(d.ends_at, d.starts_at) desc
      limit 1
    ) finald on true
    where e.status = 'published'
      and e.cancelled_at is null
      and e.visibility = 'public'
      and (e.publish_at is null or e.publish_at <= now())
      and (e.unpublish_at is null or e.unpublish_at > now())
      and (
        lower(coalesce(p_lifecycle, 'current')) = 'all'
        or (
          lower(coalesce(p_lifecycle, 'current')) = 'past'
          and coalesce(finald.ends_at, finald.starts_at, e.ends_at, e.starts_at) is not null
          and coalesce(finald.ends_at, finald.starts_at, e.ends_at, e.starts_at) + interval '3 hours' < now()
        )
        or (
          lower(coalesce(p_lifecycle, 'current')) not in ('past', 'all')
          and (
            coalesce(finald.ends_at, finald.starts_at, e.ends_at, e.starts_at) is null
            or coalesce(finald.ends_at, finald.starts_at, e.ends_at, e.starts_at) + interval '3 hours' >= now()
          )
        )
      )
      and (
        (select tsq from q) is null
        or e.search_tsv @@ (select tsq from q)
        or e.title ilike '%' || p_query || '%'
        or exists (
          select 1
          from public.organizations search_org
          where search_org.id = e.org_id
            and search_org.name ilike '%' || p_query || '%'
        )
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
  order by
    case when lower(coalesce(p_lifecycle, 'current')) = 'past' then e.starts_at end desc nulls last,
    case when lower(coalesce(p_lifecycle, 'current')) <> 'past' then e.r end desc,
    case when lower(coalesce(p_lifecycle, 'current')) <> 'past' then e.starts_at end asc nulls last
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$function$;

revoke all on function public.fn_search_events(
  text, text, text, timestamptz, timestamptz, integer, boolean, integer, integer, text
) from public;
grant execute on function public.fn_search_events(
  text, text, text, timestamptz, timestamptz, integer, boolean, integer, integer, text
) to anon, authenticated, service_role;

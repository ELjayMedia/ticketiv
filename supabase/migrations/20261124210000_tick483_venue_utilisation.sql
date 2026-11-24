-- TICK-483 — venue utilisation insights.
--
-- fn_venue_utilisation(venue, from, to) gives venue members aggregate use of
-- the venue over a date range (Africa/Mbabane days):
--   * occupied days: days touched by a confirmed booking or by a published
--     event at the venue (events hold the venue even without a booking)
--   * blocked days, booked hours, bookings, events
--   * enquiries received and accepted in the range
--   * per space: booked hours and bookings; per month: occupied days
-- Aggregates only: no attendee data, no ticket sales and no other
-- organisation's private figures. Only members of the venue (or platform
-- admins) can call it.
--
-- The member calendar (bookings, blocks, published events) and the public
-- venue page (published public events only) are in TICK-460 / TICK-452.
--
-- Additive. Rollback: drop function public.fn_venue_utilisation(uuid, date, date).

create or replace function public.fn_venue_utilisation(p_venue_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_tz constant text := 'Africa/Mbabane';
  v_start timestamptz;
  v_end timestamptz;
  v_days integer;
  v_result jsonb;
begin
  if not (app.is_venue_member(p_venue_id) or app.is_platform_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'dates_invalid' using errcode = 'P0001';
  end if;
  v_start := p_from::timestamp at time zone v_tz;
  v_end := (p_to + 1)::timestamp at time zone v_tz;
  v_days := p_to - p_from + 1;

  with days as (
    select d::date as day,
           tstzrange(d::timestamp at time zone v_tz, (d + interval '1 day')::timestamp at time zone v_tz, '[)') as span
      from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
  ),
  bookings as (
    select b.id, b.space_id, tstzrange(b.starts_at, b.ends_at, '[)') * tstzrange(v_start, v_end, '[)') as span
      from public.venue_bookings b
     where b.venue_id = p_venue_id and b.status = 'confirmed'
       and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(v_start, v_end, '[)')
  ),
  events as (
    select e.id, tstzrange(e.starts_at, coalesce(e.ends_at, e.starts_at + interval '6 hours'), '[)') as span
      from public.events e
     where e.venue_id = p_venue_id and e.cancelled_at is null and e.status in ('published', 'paused') and e.starts_at is not null
       and tstzrange(e.starts_at, coalesce(e.ends_at, e.starts_at + interval '6 hours'), '[)') && tstzrange(v_start, v_end, '[)')
  ),
  blocks as (
    select tstzrange(k.starts_at, k.ends_at, '[)') as span
      from public.venue_blocks k
     where k.venue_id = p_venue_id and tstzrange(k.starts_at, k.ends_at, '[)') && tstzrange(v_start, v_end, '[)')
  ),
  day_flags as (
    select d.day,
           exists (select 1 from bookings b where b.span && d.span) or exists (select 1 from events e where e.span && d.span) as occupied,
           exists (select 1 from blocks k where k.span && d.span) as blocked
      from days d
  )
  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'days', v_days,
    'occupied_days', (select count(*) from day_flags where occupied),
    'blocked_days', (select count(*) from day_flags where blocked and not occupied),
    'occupancy_pct', round(100.0 * (select count(*) from day_flags where occupied) / v_days, 1),
    'bookings', (select count(*) from bookings),
    'booked_hours', round(coalesce((select sum(extract(epoch from (upper(span) - lower(span)))) from bookings), 0) / 3600.0, 1),
    'events', (select count(*) from events),
    'enquiries_received', (select count(*) from public.venue_enquiries q
                            where q.venue_id = p_venue_id and q.created_at >= v_start and q.created_at < v_end),
    'enquiries_accepted', (select count(*) from public.venue_enquiries q
                            where q.venue_id = p_venue_id and q.status = 'accepted' and q.created_at >= v_start and q.created_at < v_end),
    'spaces', coalesce((
      select jsonb_agg(jsonb_build_object(
               'space_id', s.id,
               'name', s.name,
               'bookings', (select count(*) from bookings b where b.space_id = s.id),
               'booked_hours', round(coalesce((select sum(extract(epoch from (upper(b.span) - lower(b.span)))) from bookings b where b.space_id = s.id), 0) / 3600.0, 1)
             ) order by s.sort_order, s.name)
        from public.venue_spaces s where s.venue_id = p_venue_id), '[]'::jsonb),
    'whole_venue_bookings', (select count(*) from bookings where space_id is null),
    'months', coalesce((
      select jsonb_agg(jsonb_build_object('month', m.month, 'days', m.days, 'occupied_days', m.occupied) order by m.month)
        from (select to_char(day, 'YYYY-MM') as month, count(*) as days, count(*) filter (where occupied) as occupied
                from day_flags group by 1) m), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$;
revoke all on function public.fn_venue_utilisation(uuid, date, date) from public, anon;
grant execute on function public.fn_venue_utilisation(uuid, date, date) to authenticated, service_role;

comment on function public.fn_venue_utilisation(uuid, date, date) is
  'Venue utilisation aggregates for venue members (TICK-483). No attendee data or ticket sales.';

-- TICK-415: cancellation is terminal, distinct from ended/archived.

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

  if p_new_status not in ('paused', 'published', 'archived', 'cancelled') then
    raise exception 'Invalid target status: %', p_new_status;
  end if;

  if v_event.status::text = 'cancelled' then
    raise exception 'Cancelled events are terminal';
  end if;

  if p_new_status = 'paused' and v_event.status::text != 'published' then
    raise exception 'Can only pause a published event (current: %)', v_event.status;
  end if;

  if p_new_status = 'published' and v_event.status::text != 'paused' then
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

  update events
  set status = p_new_status::event_status,
      updated_at = now()
  where id = p_event_id;

  return json_build_object(
    'status', p_new_status,
    'active_holders', v_active_holders
  );
end;
$function$;

-- Direct event pages intentionally retain cancelled events while discovery
-- remains backed by published-only public list views.
-- Preserve the existing v_event_public column order and append status last:
-- PostgreSQL CREATE OR REPLACE VIEW does not allow renaming/reordering existing
-- output columns in place.
create or replace view public.v_event_public as
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
  e.description,
  e.visibility,
  v.capacity as venue_capacity,
  e.status
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
      order by t2.price_cents asc
      limit 1
    ) as currency
  from public.ticket_types t
  where t.event_id = e.id
    and t.sales_status = 'on_sale'::ticket_type_sales_status
) tp on true
where e.status in ('published'::event_status, 'cancelled'::event_status)
  and e.visibility in ('public', 'unlisted')
  and (e.publish_at is null or e.publish_at <= now());

revoke all on public.v_event_public from public;
grant select on public.v_event_public to anon, authenticated;

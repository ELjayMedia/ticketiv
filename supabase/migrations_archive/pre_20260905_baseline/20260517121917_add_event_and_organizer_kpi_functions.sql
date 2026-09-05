
create or replace function public.get_event_kpis(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.can_manage_event(p_event_id, public.current_user_uid()) then
    raise exception 'not authorized to view event KPIs' using errcode = '42501';
  end if;

  select json_build_object(
    'orders_count', count(distinct oi.order_id),
    'tickets_sold', count(oi.id) filter (where oi.status <> 'revoked' and oi.revoked_at is null),
    'gross_revenue_cents', coalesce(
      sum(tt.price_cents) filter (where oi.status <> 'revoked' and oi.revoked_at is null), 0),
    'check_ins', count(oi.id) filter (where oi.checked_in_at is not null)
  )
  into result
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.orders o on o.id = oi.order_id
  where tt.event_id = p_event_id
    and o.status = 'paid';

  return result;
end;
$$;

create or replace function public.get_organizer_kpis(p_range text default '30d')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz;
  result json;
begin
  since := case p_range
    when '7d' then now() - interval '7 days'
    when '30d' then now() - interval '30 days'
    when '90d' then now() - interval '90 days'
    else '-infinity'::timestamptz
  end;

  with my_orgs as (
    select public.current_user_org_ids() as org_id
  ),
  paid as (
    select o.*
    from public.orders o
    where o.org_id in (select org_id from my_orgs)
      and o.status = 'paid'
      and o.created_at >= since
  )
  select json_build_object(
    'events_count', (select count(*) from public.events e where e.org_id in (select org_id from my_orgs)),
    'tickets_sold', (
      select count(*) from public.order_items oi
      join paid p on p.id = oi.order_id
      where oi.status <> 'revoked' and oi.revoked_at is null),
    'gross_revenue_cents', (select coalesce(sum(total_cents), 0) from paid),
    'net_revenue_cents', (
      select coalesce(sum(total_cents
        - coalesce(platform_fee_cents, 0)
        - coalesce(processor_fee_cents, 0)), 0) from paid),
    'check_ins', (
      select count(*) from public.order_items oi
      join paid p on p.id = oi.order_id
      where oi.checked_in_at is not null),
    'currency', coalesce((select currency from paid limit 1), 'SZL')
  )
  into result;

  return result;
end;
$$;

revoke execute on function public.get_event_kpis(uuid) from public, anon;
revoke execute on function public.get_organizer_kpis(text) from public, anon;
grant execute on function public.get_event_kpis(uuid) to authenticated;
grant execute on function public.get_organizer_kpis(text) to authenticated;
;

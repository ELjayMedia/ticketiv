-- PR #70: backfill and maintain event_live_stats from source-of-truth tables.
-- Depends on 20260523152300_event_live_stats.sql from PR #69.

create or replace function public.fn_recalculate_event_live_stats(p_event_id uuid)
returns public.event_live_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats public.event_live_stats;
begin
  if p_event_id is null then
    raise exception 'event id is required';
  end if;

  insert into public.event_live_stats as els (
    event_id,
    tickets_sold,
    tickets_available,
    gross_sales_cents,
    successful_payments,
    failed_payments,
    checked_in_count,
    last_order_at,
    last_scan_at,
    updated_at
  )
  select
    e.id,
    coalesce(issued.tickets_sold, 0)::integer as tickets_sold,
    greatest(coalesce(capacity.total_quota, 0) - coalesce(issued.tickets_sold, 0), 0)::integer as tickets_available,
    coalesce(payments.gross_sales_cents, 0)::bigint as gross_sales_cents,
    coalesce(payments.successful_payments, 0)::integer as successful_payments,
    coalesce(payments.failed_payments, 0)::integer as failed_payments,
    coalesce(scans.checked_in_count, 0)::integer as checked_in_count,
    payments.last_order_at,
    scans.last_scan_at,
    now()
  from public.events e
  left join lateral (
    select coalesce(sum(greatest(tt.quota, 0)), 0)::integer as total_quota
    from public.ticket_types tt
    where tt.event_id = e.id
  ) capacity on true
  left join lateral (
    select count(*)::integer as tickets_sold
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.orders o on o.id = oi.order_id
    where tt.event_id = e.id
      and o.status::text in ('paid')
      and oi.status::text in ('issued', 'checked_in', 'transferred')
      and oi.revoked_at is null
      and oi.refunded_at is null
  ) issued on true
  left join lateral (
    select
      coalesce(sum(case when p.status::text = 'succeeded' then p.amount_cents else 0 end), 0)::bigint as gross_sales_cents,
      count(*) filter (where p.status::text = 'succeeded')::integer as successful_payments,
      count(*) filter (where p.status::text = 'failed')::integer as failed_payments,
      max(o.created_at) filter (where p.status::text = 'succeeded') as last_order_at
    from public.orders o
    join public.payments p on p.order_id = o.id
    where o.org_id = e.org_id
      and exists (
        select 1
        from public.order_items oi
        join public.ticket_types tt on tt.id = oi.ticket_type_id
        where oi.order_id = o.id
          and tt.event_id = e.id
      )
  ) payments on true
  left join lateral (
    select
      count(*) filter (where s.outcome = 'valid')::integer as checked_in_count,
      max(s.scanned_at) filter (where s.outcome = 'valid') as last_scan_at
    from public.scans s
    where s.event_id = e.id
  ) scans on true
  where e.id = p_event_id
  on conflict (event_id) do update set
    tickets_sold = excluded.tickets_sold,
    tickets_available = excluded.tickets_available,
    gross_sales_cents = excluded.gross_sales_cents,
    successful_payments = excluded.successful_payments,
    failed_payments = excluded.failed_payments,
    checked_in_count = excluded.checked_in_count,
    last_order_at = excluded.last_order_at,
    last_scan_at = excluded.last_scan_at,
    updated_at = now()
  returning * into v_stats;

  if not found then
    raise exception 'event % not found', p_event_id;
  end if;

  return v_stats;
end;
$$;

revoke all on function public.fn_recalculate_event_live_stats(uuid) from public;

grant execute on function public.fn_recalculate_event_live_stats(uuid) to service_role;
grant execute on function public.fn_recalculate_event_live_stats(uuid) to authenticated;

create or replace function public.fn_backfill_event_live_stats()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_count integer := 0;
begin
  for v_event in select id from public.events loop
    perform public.fn_recalculate_event_live_stats(v_event.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.fn_backfill_event_live_stats() from public;
grant execute on function public.fn_backfill_event_live_stats() to service_role;

create or replace function public.fn_recalculate_event_live_stats_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_event_id uuid;
begin
  v_order_id := coalesce(new.order_id, old.order_id);

  for v_event_id in
    select distinct tt.event_id
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    where oi.order_id = v_order_id
  loop
    perform public.fn_recalculate_event_live_stats(v_event_id);
  end loop;

  return coalesce(new, old);
end;
$$;

create or replace function public.fn_recalculate_event_live_stats_from_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if new.ticket_type_id is not null then
    select event_id into v_event_id from public.ticket_types where id = new.ticket_type_id;
    if v_event_id is not null then
      perform public.fn_recalculate_event_live_stats(v_event_id);
    end if;
  end if;

  if old.ticket_type_id is not null and (new.ticket_type_id is null or old.ticket_type_id is distinct from new.ticket_type_id) then
    select event_id into v_event_id from public.ticket_types where id = old.ticket_type_id;
    if v_event_id is not null then
      perform public.fn_recalculate_event_live_stats(v_event_id);
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.fn_recalculate_event_live_stats_from_ticket_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_id is not null then
    perform public.fn_recalculate_event_live_stats(new.event_id);
  end if;

  if old.event_id is not null and (new.event_id is null or old.event_id is distinct from new.event_id) then
    perform public.fn_recalculate_event_live_stats(old.event_id);
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.fn_recalculate_event_live_stats_from_scan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_id is not null then
    perform public.fn_recalculate_event_live_stats(new.event_id);
  end if;

  if old.event_id is not null and (new.event_id is null or old.event_id is distinct from new.event_id) then
    perform public.fn_recalculate_event_live_stats(old.event_id);
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.fn_recalculate_event_live_stats_from_order() from public;
revoke all on function public.fn_recalculate_event_live_stats_from_order_item() from public;
revoke all on function public.fn_recalculate_event_live_stats_from_ticket_type() from public;
revoke all on function public.fn_recalculate_event_live_stats_from_scan() from public;

drop trigger if exists trg_recalc_event_live_stats_orders on public.orders;
create trigger trg_recalc_event_live_stats_orders
after insert or update of status, total_cents on public.orders
for each row
execute function public.fn_recalculate_event_live_stats_from_order();

drop trigger if exists trg_recalc_event_live_stats_payments on public.payments;
create trigger trg_recalc_event_live_stats_payments
after insert or update of status, amount_cents, order_id on public.payments
for each row
execute function public.fn_recalculate_event_live_stats_from_order();

drop trigger if exists trg_recalc_event_live_stats_order_items on public.order_items;
create trigger trg_recalc_event_live_stats_order_items
after insert or update of status, ticket_type_id, order_id, revoked_at, refunded_at, checked_in_at on public.order_items
for each row
execute function public.fn_recalculate_event_live_stats_from_order_item();

drop trigger if exists trg_recalc_event_live_stats_ticket_types on public.ticket_types;
create trigger trg_recalc_event_live_stats_ticket_types
after insert or update of quota, event_id, sales_status on public.ticket_types
for each row
execute function public.fn_recalculate_event_live_stats_from_ticket_type();

drop trigger if exists trg_recalc_event_live_stats_scans on public.scans;
create trigger trg_recalc_event_live_stats_scans
after insert or update of event_id, outcome, scanned_at on public.scans
for each row
execute function public.fn_recalculate_event_live_stats_from_scan();

select public.fn_backfill_event_live_stats();

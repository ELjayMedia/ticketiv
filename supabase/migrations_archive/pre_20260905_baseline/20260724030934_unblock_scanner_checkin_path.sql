-- TICK-311: unblock the gate scanner check-in data path.
--
-- Two pre-existing conflicts made the FIRST check-in on any paid order fail
-- (never exercised: 0 paid orders / 0 valid scans in the DB).

-- Fix 1: the scans BEFORE-INSERT trigger required every scan row to reference an
-- 'issued' order_item and raised otherwise, so audit rows for non-valid outcomes
-- (already_used, unknown/null item, revoked, unpaid, wrong_event) crashed the
-- scanner RPCs. Make it tolerant: record any scan, and only transition the ticket
-- on a genuine 'valid' outcome. Check-in stays idempotent with the RPCs that also
-- perform it (TICK-82 made the scan+checkin RPC canonical).
create or replace function public.validate_scan_and_checkin()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  oi_status public.order_item_status;
begin
  perform set_config('search_path', 'public,pg_catalog', true);

  -- Audit-only scans (e.g. unknown credential / ticket) carry no order_item.
  if new.order_item_id is null then
    return new;
  end if;

  select status into oi_status from public.order_items where id = new.order_item_id;
  if not found then
    return new;
  end if;

  -- Only a genuine valid scan transitions the ticket to checked_in. Non-valid
  -- outcomes (already_used, revoked, wrong_event, not_paid, ...) are recorded
  -- without raising so the RPC can return a graceful outcome to the gate.
  if new.outcome = 'valid' and oi_status = 'issued' then
    update public.order_items
      set checked_in_at = coalesce(checked_in_at, now()),
          status = 'checked_in',
          updated_at = now()
      where id = new.order_item_id;
  end if;

  return new;
end;
$function$;

-- Fix 2: the order_items UPDATE reprice trigger fired on ANY column change,
-- including a scan's status/checked_in_at update. That re-ran order repricing on
-- a paid order and tripped prevent_totals_change_after_paid. Repricing only depends
-- on which items belong to the order and their ticket type, so scope the UPDATE
-- trigger to those columns. (INSERT/DELETE reprice triggers are unchanged.)
drop trigger if exists t_reprice_order_items_upd on public.order_items;
create trigger t_reprice_order_items_upd
  after update of ticket_type_id, order_id on public.order_items
  for each row execute function trg_reprice_order_after_items();;

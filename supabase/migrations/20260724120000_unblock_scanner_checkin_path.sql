-- TICK-311: unblock the gate scanner check-in data path.
--
-- Verifying the scanner data path surfaced two pre-existing conflicts that made
-- the FIRST check-in on any paid order fail. Neither had ever been exercised
-- (0 paid orders / 0 valid scans in the DB), and both affect the normal QR
-- scanner as well as TapBand.

-- Fix 1: validate_scan_and_checkin (BEFORE INSERT on public.scans) required every
-- scan row to reference an 'issued' order_item and RAISED otherwise. But scans
-- records all attempts (outcome invalid/duplicate/already_used/wrong_event/...),
-- so audit rows for non-valid outcomes — already_used, unknown credential (null
-- order_item_id), revoked, unpaid — crashed the scanner RPCs (which only catch
-- unique_violation). Make the trigger tolerant: record any scan, and only
-- transition the ticket on a genuine 'valid' outcome. This also stops it from
-- erroneously checking in a wrong_event ticket. Check-in stays idempotent with
-- the RPCs that already perform it (TICK-82 made the scan+checkin RPC canonical).
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
  -- outcomes are recorded without raising so the RPC returns a graceful outcome.
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
-- a paid order and tripped prevent_totals_change_after_paid (because two pricing
-- calculators — fn_apply_pricing_to_order and app.recompute_order_totals —
-- disagree on the processor-fee basis; reconciling them is TICK-336). Repricing
-- only depends on which items belong to the order and their ticket type, so scope
-- the UPDATE trigger to those columns. A check-in no longer reprices, so it no
-- longer trips the guard, independent of the TICK-336 fee-basis decision. The
-- INSERT/DELETE reprice triggers are unchanged.
drop trigger if exists t_reprice_order_items_upd on public.order_items;
create trigger t_reprice_order_items_upd
  after update of ticket_type_id, order_id on public.order_items
  for each row execute function trg_reprice_order_after_items();

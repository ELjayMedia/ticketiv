-- Fix the order/payment completion trigger stack.
--
-- Verifying the money path (Paystack + MoMo completion) surfaced four
-- interacting, mutually-contradictory triggers on orders / order_items /
-- ledger_entries that made order creation, ticket issuance, and marking an
-- order paid impossible at the database layer -- independent of the RLS /
-- admin-client fixes and the Paystack keys. Each was reproduced live against
-- the database in a rolled-back transaction.
--
--   A. sync_order_status_from_ledger() compared orders.status (the order_status
--      ENUM) against a text value ("... IS DISTINCT FROM derived"), throwing
--      42883 "operator does not exist: order_status = text" on EVERY
--      ledger_entries insert (fired by ledger_sync_order_status_trig). This
--      blocked order-creation repricing AND payment-completion ledger writes.
--      It was also unsafe by design: order_ledger_summary sums every ledger
--      row, and the creation-time reprice ledger writes positive fee rows, so
--      an unpaid order already derives net >= total => 'paid'. A cast-only fix
--      would therefore mark every order paid at creation, before payment.
--      Order status is set explicitly by the completion code (completePaidOrder)
--      and by the resale/waitlist completion RPCs, so this ledger->status
--      auto-sync is redundant; drop it.
--
--   B. order_items_status_transition_guard() did not permit pending -> issued,
--      the normal issuance transition used by completePaidOrder and by
--      issue_order_items_when_order_paid(). Add it (plus pending -> revoked /
--      refunded for pre-issuance cancellations).
--
--   C. trg_reprice_order_on_status() re-ran fn_apply_pricing_to_order on the
--      pending -> paid transition, which rewrites order totals and trips
--      prevent_totals_change_after_paid ("Cannot modify order totals after
--      payment"). Only reprice when an order is (re)entering 'pending'.
--
--   E. fn_apply_pricing_to_order() deleted ledger rows by type
--      (order_gross/fee) ignoring payment_id, so any order_items change after
--      settlement (e.g. issuance during completion) wiped the settlement
--      ledger. Scope the delete to the creation-time rows (payment_id IS NULL).
--
-- FOLLOW-UP (not addressed here, filed separately): the ledger still mixes
-- creation-time composition rows (positive fees) with settlement rows
-- (negative fees + payment_net), and order_ledger_summary sums all of them, so
-- net_cents is not a meaningful figure. Order status no longer depends on it,
-- but org finance reporting (fn_org_finance_summary) and the corrupt fixture
-- order d8b15ab5 should be reconciled separately.

-- ===== FIX A: drop the broken, redundant ledger -> order.status auto-sync =====
drop trigger if exists ledger_sync_order_status_trig on public.ledger_entries;

-- ===== FIX B: allow the normal issuance transition pending -> issued =====
create or replace function public.order_items_status_transition_guard()
 returns trigger language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  old_status public.order_item_status;
  new_status public.order_item_status;
begin
  old_status := OLD.status;
  new_status := NEW.status;
  if old_status = new_status then return NEW; end if;
  if old_status in ('revoked','refunded') then
    raise exception 'cannot change status from terminal state %', old_status;
  end if;
  if old_status = 'checked_in' and new_status = 'transferred' then
    raise exception 'cannot transfer an order_item that is already checked in';
  end if;
  if not ( (old_status = 'pending'     and new_status in ('issued','revoked','refunded'))
        or (old_status = 'issued'      and new_status in ('transferred','checked_in','revoked','refunded'))
        or (old_status = 'transferred' and new_status in ('checked_in','revoked','refunded')) ) then
    raise exception 'invalid status transition from % to %', old_status, new_status;
  end if;
  if new_status = 'checked_in' then NEW.checked_in_at := coalesce(NEW.checked_in_at, now()); end if;
  if new_status = 'revoked'    then NEW.revoked_at    := coalesce(NEW.revoked_at, now());    end if;
  return NEW;
end;
$function$;

-- ===== FIX C: do not reprice when transitioning into a non-pending state =====
create or replace function public.trg_reprice_order_on_status()
 returns trigger language plpgsql set search_path to 'pg_catalog','public','extensions'
as $function$
begin
  if TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status and NEW.status = 'pending'::order_status then
    perform public.fn_apply_pricing_to_order(NEW.id);
  end if;
  return NEW;
end;
$function$;

-- ===== FIX E: repricing must never delete settlement ledger rows =====
create or replace function public.fn_apply_pricing_to_order(p_order_id uuid)
 returns void language plpgsql set search_path to 'pg_catalog','public','extensions'
as $function$
declare
  v_org_id uuid; v_currency text; v_plan public.pricing_plans%ROWTYPE;
  v_subtotal integer; v_adjustments integer; v_count integer;
  v_platform_pct_fee integer; v_platform_fixed_fee integer; v_platform_fee integer;
  v_processor_fee_base integer; v_processor_fee integer; v_total integer;
  v_now timestamptz := now();
begin
  select org_id, currency into v_org_id, v_currency from public.orders where id = p_order_id for update;
  if v_org_id is null then raise exception 'Order % not found', p_order_id; end if;

  select * into v_plan
  from public.pricing_plans
  where org_id = v_org_id and active = true
  order by effective_from desc
  limit 1;
  if not found then raise exception 'No active pricing plan for org %', v_org_id; end if;

  select coalesce(sum(tt.price_cents), 0), count(*)
    into v_subtotal, v_count
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  where oi.order_id = p_order_id;

  select coalesce(sum(amount_cents), 0)
    into v_adjustments
  from public.order_adjustments
  where order_id = p_order_id;

  v_platform_pct_fee := round(v_subtotal * v_plan.platform_percent_bps / 10000.0);
  v_platform_fixed_fee := v_plan.platform_fixed_cents * v_count;
  v_platform_fee := v_platform_pct_fee + v_platform_fixed_fee;

  if v_plan.min_platform_fee_cents is not null and v_platform_fee < v_plan.min_platform_fee_cents then
    v_platform_fee := v_plan.min_platform_fee_cents;
  end if;
  if v_plan.max_platform_fee_cents is not null and v_platform_fee > v_plan.max_platform_fee_cents then
    v_platform_fee := v_plan.max_platform_fee_cents;
  end if;

  if v_plan.platform_fee_payer = 'buyer' then
    v_processor_fee_base := v_subtotal + v_adjustments + v_platform_fee;
  else
    v_processor_fee_base := v_subtotal + v_adjustments;
  end if;
  v_processor_fee := round(v_processor_fee_base * v_plan.processor_percent_bps / 10000.0) + v_plan.processor_fixed_cents;

  if v_plan.platform_fee_payer = 'buyer' and v_plan.processor_fee_payer = 'buyer' then
    v_total := v_subtotal + v_adjustments + v_platform_fee + v_processor_fee;
  elsif v_plan.platform_fee_payer = 'organizer' and v_plan.processor_fee_payer = 'organizer' then
    v_total := v_subtotal + v_adjustments;
  elsif v_plan.platform_fee_payer = 'buyer' and v_plan.processor_fee_payer = 'organizer' then
    v_total := v_subtotal + v_adjustments + v_platform_fee;
  elsif v_plan.platform_fee_payer = 'organizer' and v_plan.processor_fee_payer = 'buyer' then
    v_total := v_subtotal + v_adjustments + v_processor_fee;
  else
    v_total := v_subtotal + v_adjustments + v_platform_fee + v_processor_fee;
  end if;

  if v_total < 0 then v_total := 0; end if;

  update public.orders
  set subtotal_cents = v_subtotal,
      item_count = v_count,
      platform_fee_cents = v_platform_fee,
      processor_fee_cents = v_processor_fee,
      fees_paid_by = case
        when v_plan.platform_fee_payer = 'buyer' and v_plan.processor_fee_payer = 'buyer' then 'buyer'::fee_payer
        when v_plan.platform_fee_payer = 'organizer' and v_plan.processor_fee_payer = 'organizer' then 'organizer'::fee_payer
        else null
      end,
      pricing_plan_id = v_plan.id,
      total_cents = v_total,
      currency = coalesce(v_currency, v_plan.currency),
      totals_computed_at = v_now
  where id = p_order_id;

  -- Only the creation-time composition rows (payment_id IS NULL) are managed
  -- here; settlement rows written at payment (payment_id set) must survive.
  delete from public.ledger_entries
   where order_id = p_order_id and type in ('order_gross', 'fee') and payment_id is null;
  insert into public.ledger_entries (org_id, order_id, type, amount_cents, currency, occurred_at, meta)
  values
    (v_org_id, p_order_id, 'order_gross', v_subtotal, v_currency, v_now, jsonb_build_object('detail', 'ticket subtotal')),
    (v_org_id, p_order_id, 'fee', v_platform_fee, v_currency, v_now,
       jsonb_build_object('kind', 'platform', 'percent_bps', v_plan.platform_percent_bps, 'fixed_cents', v_plan.platform_fixed_cents, 'items', v_count)),
    (v_org_id, p_order_id, 'fee', v_processor_fee, v_currency, v_now,
       jsonb_build_object('kind', 'processor', 'percent_bps', v_plan.processor_percent_bps, 'fixed_cents', v_plan.processor_fixed_cents, 'base', v_processor_fee_base));
end;
$function$;

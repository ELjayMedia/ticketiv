-- Make the ledger settlement-only so org finance figures are meaningful.
--
-- fn_apply_pricing_to_order() (fired on every order_items change) wrote
-- "creation-time" composition rows into ledger_entries for EVERY order,
-- paid or not: order_gross = subtotal and POSITIVE platform/processor fee
-- rows (payment_id IS NULL). The settlement path (buildLedgerEntries, at
-- payment) writes the opposite convention: order_gross = total, NEGATIVE fee
-- rows, plus a payment_net row (payment_id set).
--
-- fn_org_finance_summary sums ledger_entries by type
-- (gross = sum(order_gross), fees = sum(abs(fee)), net = sum(payment_net)),
-- so the creation-time rows inflated gross_cents/fees_cents with every order
-- (including unpaid ones) and double-counted paid orders. The buyer-facing
-- reconciliation (lib/reconciliation.ts) likewise expects a single settlement
-- shape per paid order. net_cents / payout math already read payment_net only,
-- so they stay correct.
--
-- Fix: the ledger becomes settlement-only. Order composition already lives on
-- the order columns (subtotal_cents / platform_fee_cents / processor_fee_cents
-- / total_cents), maintained by app.recompute_order_totals, so the creation-
-- time ledger rows carried no information the order row did not already hold.
--
-- This also removes the observable processor-fee "basis" mismatch: the creation
-- ledger fee rows were written by fn_apply_pricing_to_order (processor on
-- subtotal+platform) while the order columns are written by
-- app.recompute_order_totals (processor on subtotal). With the creation ledger
-- gone, the only fee source is the order column, and settlement rows are built
-- from those columns. NOTE (follow-up, not addressed here): the two fee
-- calculators still diverge (rounding, processor base, fee_payer handling); the
-- processor-fee base is a pricing decision and should be reconciled separately.

-- 1. Stop writing creation-time composition rows into the ledger.
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

  -- Touch the order so app.recompute_order_totals (the canonical calculator)
  -- recomputes the price columns from the current items. The ledger is written
  -- only at settlement (buildLedgerEntries); no creation-time rows here.
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
end;
$function$;

-- 2. Purge the creation-time composition rows that were already written for
--    existing orders (they were never real money movement; settlement rows,
--    which carry a payment_id, are left intact).
delete from public.ledger_entries
 where payment_id is null and type in ('order_gross', 'fee');

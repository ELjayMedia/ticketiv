-- TICK-336 (2/2): route order pricing through the one canonical calculator.
--
-- recompute_order_totals becomes the single computation path and delegates to
-- public.fn_compute_order_money. It is:
--   * channel-scoped — only standard ticket sales (online/pos) are priced by the
--     platform-commission model. reseller (bespoke transfer-fee + P2P settlement),
--     comp (free) and import keep the totals their creating RPC set.
--   * item-aware — if the order has no priced line items yet (e.g. a waitlist
--     order created before fulfilment), it leaves the RPC-set totals alone so the
--     order total cannot diverge from the payment row already written.
--   * snapshot-pinned — the effective plan rates are frozen onto the order the
--     first time it is priced (pricing_plan_snapshot) and read back thereafter, so
--     a later plan edit can never restate a placed order.
--   * idempotent — recomputing with unchanged inputs yields identical columns, so
--     neither the post-paid totals guard nor the pricing guard can trip.

create or replace function app.recompute_order_totals()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'app'
as $function$
declare
  v_subtotal integer := 0;
  v_count integer := 0;
  v_adjustments integer := 0;
  v_snap jsonb := new.pricing_plan_snapshot;
  v_plan public.pricing_plans%rowtype;
  v_platform_bps integer; v_processor_bps integer; v_processor_fixed integer;
  v_min integer; v_max integer;
  v_payer public.fee_payer;
  v_money record;
begin
  -- Only standard ticket sales are priced by the platform-commission model.
  if new.channel is distinct from 'online'::public.sales_channel
     and new.channel is distinct from 'pos'::public.sales_channel then
    return new;
  end if;

  select coalesce(sum(tt.price_cents),0), count(*)
    into v_subtotal, v_count
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  where oi.order_id = new.id and oi.revoked_at is null;

  -- Nothing to price yet (e.g. waitlist order before fulfilment): keep RPC totals.
  if v_count = 0 then
    return new;
  end if;

  select coalesce(sum(amount_cents),0) into v_adjustments
  from public.order_adjustments where order_id = new.id;

  if v_snap is null then
    select * into v_plan
    from public.pricing_plans
    where id = coalesce(new.pricing_plan_id,
                        (select pp.id from public.pricing_plans pp
                          where pp.org_id = new.org_id and pp.active
                          order by effective_from desc limit 1))
    limit 1;

    v_platform_bps    := coalesce(v_plan.platform_percent_bps, 0);
    v_processor_bps   := coalesce(v_plan.processor_percent_bps, 0);
    v_processor_fixed := coalesce(v_plan.processor_fixed_cents, 0);
    v_min             := v_plan.min_platform_fee_cents;
    v_max             := v_plan.max_platform_fee_cents;
    v_payer           := coalesce(new.fees_paid_by, v_plan.platform_fee_payer, 'organizer'::public.fee_payer);

    new.pricing_plan_id := coalesce(new.pricing_plan_id, v_plan.id);
    new.fees_paid_by    := v_payer;
    new.pricing_plan_snapshot := jsonb_build_object(
      'plan_id', v_plan.id,
      'platform_percent_bps', v_platform_bps,
      'processor_percent_bps', v_processor_bps,
      'processor_fixed_cents', v_processor_fixed,
      'min_platform_fee_cents', v_min,
      'max_platform_fee_cents', v_max,
      'fees_paid_by', v_payer,
      'snapshot_at', now()
    );
  else
    v_platform_bps    := coalesce((v_snap->>'platform_percent_bps')::integer, 0);
    v_processor_bps   := coalesce((v_snap->>'processor_percent_bps')::integer, 0);
    v_processor_fixed := coalesce((v_snap->>'processor_fixed_cents')::integer, 0);
    v_min             := (v_snap->>'min_platform_fee_cents')::integer;
    v_max             := (v_snap->>'max_platform_fee_cents')::integer;
    v_payer           := coalesce(new.fees_paid_by, (v_snap->>'fees_paid_by')::public.fee_payer, 'organizer'::public.fee_payer);
  end if;

  select * into v_money
  from public.fn_compute_order_money(
    v_subtotal, v_adjustments, v_platform_bps, v_processor_bps, v_processor_fixed, v_min, v_max, v_payer
  );

  new.subtotal_cents       := v_subtotal;
  new.item_count           := v_count;
  new.total_cents          := v_money.buyer_total_cents;
  new.platform_fee_cents   := v_money.platform_fee_cents;
  new.processor_fee_cents  := v_money.processor_fee_cents;
  new.organizer_net_cents  := v_money.organizer_net_cents;
  new.currency             := coalesce(new.currency, 'SZL');
  new.order_price_cents         := v_subtotal + v_adjustments;
  new.order_platform_fee_cents  := v_money.platform_fee_cents;
  new.order_processor_fee_cents := v_money.processor_fee_cents;
  new.order_currency            := coalesce(new.order_currency, new.currency, 'SZL');
  new.totals_computed_at        := now();

  return new;
end;
$function$;

-- Reprice triggers persist only: nudge the order so the single BEFORE-trigger
-- calculator re-runs. They no longer compute money themselves.
create or replace function public.fn_apply_pricing_to_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.orders set totals_computed_at = now() where id = p_order_id;
end;
$function$;

-- Per the decision: there is no fixed per-ticket component. Zero it on active plans.
update public.pricing_plans set platform_fixed_cents = 0 where platform_fixed_cents <> 0;

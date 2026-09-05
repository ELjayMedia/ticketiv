-- TICK-336 (1/2): the single canonical order-money calculator.
-- Pure, side-effect-free. Both recompute paths and the checkout RPCs will
-- delegate to this in the follow-up wiring step. Encodes the resolved fee model:
--   * Buyer pays face value (organizer-paid default); a buyer-paid plan adds the
--     platform fee on top of the price.
--   * Exactly one order-level fee — the platform sales commission (% of price).
--     No fixed-per-item component. Round half up, once, per fee line.
--   * The processor (Paystack) cost is absorbed INSIDE the platform %, but is
--     still computed on the amount actually charged to the buyer and returned so
--     it can be reconciled against Paystack settlements.
--   * Fees are organizer-side deductions: organizer_net = buyer paid - platform.

create or replace function public.fn_compute_order_money(
  p_subtotal_cents integer,
  p_adjustments_cents integer,
  p_platform_percent_bps integer,
  p_processor_percent_bps integer,
  p_processor_fixed_cents integer,
  p_min_platform_cents integer,
  p_max_platform_cents integer,
  p_fees_paid_by public.fee_payer
)
returns table(
  buyer_total_cents integer,
  platform_fee_cents integer,
  processor_fee_cents integer,
  organizer_net_cents integer
)
language plpgsql
immutable
as $function$
declare
  v_priced   integer := greatest(coalesce(p_subtotal_cents,0) + coalesce(p_adjustments_cents,0), 0);
  v_payer    public.fee_payer := coalesce(p_fees_paid_by, 'organizer'::public.fee_payer);
  v_platform integer;
  v_buyer    integer;
  v_processor integer;
begin
  -- Platform commission on the ticket price (net of adjustments). round() on
  -- numeric is round-half-away-from-zero == half up for non-negative amounts.
  v_platform := round((v_priced::numeric * coalesce(p_platform_percent_bps,0)) / 10000)::integer;
  if p_min_platform_cents is not null then v_platform := greatest(v_platform, p_min_platform_cents); end if;
  if p_max_platform_cents is not null then v_platform := least(v_platform, p_max_platform_cents); end if;

  -- Amount actually charged to the buyer.
  v_buyer := v_priced + case when v_payer = 'buyer' then v_platform else 0 end;

  -- Processor cost on the amount charged to the buyer (stored for reconciliation).
  v_processor := (round((v_buyer::numeric * coalesce(p_processor_percent_bps,0)) / 10000)
                  + coalesce(p_processor_fixed_cents,0))::integer;

  buyer_total_cents   := v_buyer;
  platform_fee_cents  := v_platform;
  processor_fee_cents := v_processor;
  organizer_net_cents := v_buyer - v_platform;
  return next;
end;
$function$;

-- Organizer-facing net column requested in the decision (additive, unused until wiring).
alter table public.orders add column if not exists organizer_net_cents integer;

comment on function public.fn_compute_order_money is
  'TICK-336 canonical order-money calculator. Buyer pays face value (organizer-paid default); one platform commission fee; processor cost absorbed in platform % but returned for reconciliation; round half up; organizer_net = buyer paid - platform.';;

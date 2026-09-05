create or replace function public.fn_apply_pricing_to_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Reprice-trigger helper only. A direct PostgREST/RPC call has depth 0; a
  -- call from one of the reprice triggers has depth >= 1.
  if pg_trigger_depth() = 0 then
    raise exception using
      errcode = '42501',
      message = 'internal_helper_not_directly_callable',
      detail  = 'fn_apply_pricing_to_order is a reprice-trigger helper, not a public RPC.',
      hint    = 'Order totals recompute automatically when order_items, order_adjustments or orders.status change.';
  end if;

  update public.orders set totals_computed_at = now() where id = p_order_id;
end;
$function$;

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
returns table (
  buyer_total_cents integer,
  platform_fee_cents integer,
  processor_fee_cents integer,
  organizer_net_cents integer
)
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v_priced   integer := greatest(coalesce(p_subtotal_cents,0) + coalesce(p_adjustments_cents,0), 0);
  v_payer    public.fee_payer := coalesce(p_fees_paid_by, 'organizer'::public.fee_payer);
  v_platform integer;
  v_buyer    integer;
  v_processor integer;
begin
  v_platform := round((v_priced::numeric * coalesce(p_platform_percent_bps,0)) / 10000)::integer;
  if p_min_platform_cents is not null then v_platform := greatest(v_platform, p_min_platform_cents); end if;
  if p_max_platform_cents is not null then v_platform := least(v_platform, p_max_platform_cents); end if;

  v_buyer := v_priced + case when v_payer = 'buyer' then v_platform else 0 end;

  v_processor := (round((v_buyer::numeric * coalesce(p_processor_percent_bps,0)) / 10000)
                  + coalesce(p_processor_fixed_cents,0))::integer;

  buyer_total_cents   := v_buyer;
  platform_fee_cents  := v_platform;
  processor_fee_cents := v_processor;
  organizer_net_cents := v_buyer - v_platform;
  return next;
end;
$function$;;

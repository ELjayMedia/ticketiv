-- Checkout promo preview RPC.
--
-- Promo codes were dead in checkout: the UI's validation endpoint
-- (/api/orders/validate-promo) queried a `promo_codes` table that has never
-- existed (the real engine is price_rules), and the duplicate endpoint
-- (/api/promo-codes/validate) read price_rules under the buyer's RLS context,
-- where SELECT is org-manager-only — so every code returned "invalid" before
-- fn_apply_promo_code_to_order (which works) was ever reached.
--
-- This read-only SECURITY DEFINER preview mirrors fn_apply_promo_code_to_order's
-- matching exactly (org from event, code, active, event scope, time window,
-- channel, discount types only, total-redemption cap). Per-user limits and
-- already-applied checks still happen at apply time, which remains the
-- enforcement layer.

begin;

create or replace function public.fn_preview_promo_code(
  p_event_id uuid,
  p_code text,
  p_channel public.sales_channel default 'online'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_org_id uuid;
  v_rule public.price_rules%rowtype;
  v_total_redemptions integer;
begin
  if p_event_id is null or p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'code_required');
  end if;

  select org_id into v_org_id from public.events where id = p_event_id;
  if v_org_id is null then
    return jsonb_build_object('valid', false, 'reason', 'event_not_found');
  end if;

  select * into v_rule
  from public.price_rules
  where org_id = v_org_id
    and lower(code) = lower(trim(p_code))
    and coalesce(is_active, true) = true
    and (event_id is null or event_id = p_event_id)
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and (channel is null or cardinality(channel) = 0 or p_channel = any(channel))
    and type in ('absolute_discount', 'percent_discount')
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'code_invalid');
  end if;

  if v_rule.max_redemptions is not null and v_rule.max_redemptions > 0 then
    select count(*)::integer into v_total_redemptions
    from public.price_rule_redemptions
    where price_rule_id = v_rule.id;
    if v_total_redemptions >= v_rule.max_redemptions then
      return jsonb_build_object('valid', false, 'reason', 'code_exhausted');
    end if;
  end if;

  return jsonb_build_object(
    'valid', true,
    'promoId', v_rule.id,
    'discountType', case v_rule.type when 'percent_discount' then 'percent' else 'fixed' end,
    'discountValue', case v_rule.type
      when 'percent_discount' then v_rule.value_numeric
      else abs(v_rule.value_numeric)::integer
    end
  );
end;
$function$;

revoke execute on function public.fn_preview_promo_code(uuid, text, public.sales_channel) from public;
grant execute on function public.fn_preview_promo_code(uuid, text, public.sales_channel) to anon, authenticated;

commit;

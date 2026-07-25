-- Close an unauthenticated write path into public.orders, and pin one mutable
-- search_path. Both surfaced while auditing the Security Advisor's
-- auth_allow_anonymous_sign_ins warnings.
--
-- ============================================================================
-- 1. fn_apply_pricing_to_order: unauthenticated arbitrary-order write
-- ============================================================================
--
-- The function is a reprice-trigger helper -- its whole body nudges an order so
-- the BEFORE-trigger money calculator re-runs:
--
--   update public.orders set totals_computed_at = now() where id = p_order_id;
--
-- but it is SECURITY DEFINER (so it bypasses RLS) and both `anon` and
-- `authenticated` hold EXECUTE, which means PostgREST publishes it at
-- /rest/v1/rpc/fn_apply_pricing_to_order to the open internet. Any caller could
-- pass any order id and write to that row.
--
-- Demonstrated against this database before the fix, in a rolled-back
-- transaction: as `anon`, `select exists(select 1 from orders where id = X)`
-- returned false -- RLS correctly hid the order -- yet the RPC was accepted and
-- totals_computed_at moved from null to now(). An unauthenticated caller could
-- write to a row it could not even read.
--
-- Impact beyond the timestamp: totals_computed_at is the freshness marker for
-- order money, and the update re-fires the BEFORE-trigger calculator, so this
-- also let an anonymous caller force a reprice of someone else's order and
-- forge reconciliation freshness.
--
-- This is the exact class of function 20260524190000_harden_security_definer_surface.sql
-- (TICK-36) was written to lock down -- "trigger-only ... no public RPC entry
-- point is needed" -- but this one was never listed, and no later migration
-- revoked it. It was then re-created by 20260525120000, 20260720121000 and
-- 20260724160000; `create or replace` preserves the ACL, so the default
-- EXECUTE-to-PUBLIC grant from its original creation persisted throughout.
--
-- The fix is a guard rather than a REVOKE. Revoking EXECUTE from anon and
-- authenticated would break checkout: the three callers
-- (trg_reprice_order_after_items on order_items,
-- trg_reprice_order_after_adjustments on order_adjustments,
-- trg_reprice_order_on_status on orders) are all SECURITY INVOKER, so they run
-- as the buyer -- including an anonymous guest -- and would lose the privilege
-- to call this helper. pg_trigger_depth() separates the two cases exactly:
-- every legitimate call arrives from one of those triggers (depth >= 1), and the
-- PostgREST attack always arrives at depth 0. Nothing else calls it (no
-- application code references it; types/database.ts is generated).
--
-- Deliberately not narrowed to specific roles. A direct call is wrong for this
-- helper whoever makes it -- service_role included, since it can simply issue
-- the UPDATE. If a caller ever needs an entry point, add a properly authorized
-- RPC rather than widening this one.

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

-- ============================================================================
-- 2. fn_compute_order_money: pin search_path
-- ============================================================================
--
-- Flagged as function_search_path_mutable. Lower severity than the above: the
-- function is SECURITY INVOKER and IMMUTABLE, touches no tables, and every type
-- reference in its body is already schema-qualified, so there is no known
-- exploit. Pinning search_path is the project's standing convention for
-- public-schema functions and removes the lint. Body is unchanged from
-- 20260724150000_tick336_canonical_order_money_function.sql -- only the
-- `set search_path` clause is added, so the assertions in
-- supabase/tests/tick336_order_money.sql continue to hold.

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

-- ============================================================================
-- Not changed here, and why
-- ============================================================================
--
-- fn_preview_promo_code and fn_ticket_type_remaining are the other two
-- anon-executable SECURITY DEFINER functions. Both are STABLE, write nothing,
-- and are required by anonymous buyers (promo preview during guest checkout,
-- remaining counts on public event pages). fn_preview_promo_code scopes its
-- lookup to `status = 'published'`. Their anon grants are intentional.
--
-- The 78 auth_allow_anonymous_sign_ins warnings are NOT addressed by this
-- migration and must not be "fixed" by disabling anonymous sign-ins: Ticketiv
-- relies on anonymous sessions for guest checkout, which is why
-- app.is_claimed_account() / app.require_claimed_account() exist to gate
-- operations that need a permanent account. That lint fires for every table
-- whose policies target `authenticated` while anonymous sign-ins are on,
-- because an anonymous session also carries the `authenticated` role. Silencing
-- it wholesale would mean adding an is_anonymous check to 186 policies, which
-- would break the flows where anonymous access is the point (seat holds, guest
-- orders, published event reads).
--
-- Those warnings were checked rather than assumed benign. Simulating a real
-- anonymous session (role `authenticated`, JWT is_anonymous = true, so
-- app.is_claimed_account() returns false) and counting rows across the
-- sensitive tables returned zero from every one of them, including tables that
-- were not empty at the time: admin_action_catalog (12 rows), audit_log (60),
-- profiles (5), admin_users (2), feature_flags (6), organizations (1) and
-- org_members (1). payment_provider_settings refuses outright with 42501, since
-- it carries no grant to the API roles at all. So RLS already denies anonymous
-- sessions on the surfaces that matter, and the lint is reporting policy role
-- membership rather than reachable access.
--
-- Note also that fn_apply_pricing_to_order will still appear under
-- anon_security_definer_function_executable after this migration. That lint
-- inspects the EXECUTE grant, which has to stay for the SECURITY INVOKER
-- triggers described above, so it cannot see the runtime guard. Clearing it
-- would mean converting those three trigger functions to SECURITY DEFINER and
-- then revoking -- a wider privilege change than this fix needs, and not worth
-- it purely to move a counter.

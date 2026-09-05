-- TICK-339 — every payment completion path must prove provider authenticity
-- before it changes orders, tickets or ledger state.
--
-- Resale and waitlist checkout each had two completion functions. The _webhook
-- pair was correctly locked to service_role by
-- 20260528160000_resale_waitlist_webhook_completion.sql; the other pair kept
-- its EXECUTE grant to `authenticated`, so PostgREST published both to any
-- signed-in session — including an anonymous guest session, which carries the
-- same `authenticated` database role.
--
-- Not exploitable for free tickets on its own (both require
-- payments.status = 'succeeded', and only service_role can set that), but it
-- was a second, divergent completion contract reachable from the browser.
-- TICK-339 requires one documented contract per provider path, gated behind
-- service_role, so the browser-reachable entry point is removed.
--
-- Both routes now converge on the _webhook functions:
--   Paystack webhook -> verify HMAC over raw body -> match amount vs order
--   Buyer "complete" -> verify session owns order -> pull transaction from
--                       Paystack verify -> match reference, amount, currency
-- (lib/payments/special-checkout.ts is the single module for both.)
--
-- The functions are left in place, not dropped: keeping them callable by
-- postgres/service_role preserves a manual support path for a stuck checkout.

revoke execute on function public.fn_complete_resale_after_payment(uuid, uuid)
  from public, anon, authenticated;

revoke execute on function public.fn_complete_waitlist_after_payment(uuid, uuid)
  from public, anon, authenticated;

do $$
declare
  v_leaked text;
begin
  select string_agg(format('%s -> %s', p.proname, a.grantee), ', ')
    into v_leaked
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(p.proacl) a
  where n.nspname = 'public'
    and p.proname in (
      'fn_complete_resale_after_payment',
      'fn_complete_waitlist_after_payment',
      'fn_complete_resale_after_payment_webhook',
      'fn_complete_waitlist_after_payment_webhook'
    )
    and a.privilege_type = 'EXECUTE'
    and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'));

  if v_leaked is not null then
    raise exception 'Payment completion RPC still reachable from a browser role: %', v_leaked;
  end if;
end $$;;

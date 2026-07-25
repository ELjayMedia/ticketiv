-- TICK-339 — every payment completion path must prove provider authenticity
-- before it changes orders, tickets or ledger state.
--
-- ============================================================================
-- The gap
-- ============================================================================
--
-- Resale and waitlist checkout each had two completion functions:
--
--   fn_complete_resale_after_payment(uuid, uuid)            -> authenticated
--   fn_complete_waitlist_after_payment(uuid, uuid)          -> authenticated
--   fn_complete_resale_after_payment_webhook(uuid)          -> service_role
--   fn_complete_waitlist_after_payment_webhook(uuid)        -> service_role
--
-- The _webhook pair was correctly locked to service_role by
-- 20260528160000_resale_waitlist_webhook_completion.sql. The other pair kept
-- its EXECUTE grant to `authenticated`, so PostgREST published both at
-- /rest/v1/rpc/… to any signed-in session — including an anonymous guest
-- session, which carries the same `authenticated` database role.
--
-- Those functions were not exploitable for free tickets on their own: both
-- require `payments.status = 'succeeded'`, and `payments` carries no INSERT or
-- UPDATE grant to anon/authenticated (only service_role can move a payment to
-- succeeded), so the fraud path was already closed. What remained was a second,
-- divergent completion contract reachable from the browser: it derived the
-- buyer from auth.uid() rather than from the payment's order, checked a
-- different subset of preconditions, and could be invoked directly with an
-- arbitrary (listing_id, payment_id) pair rather than through the application.
--
-- TICK-339 requires one documented contract per provider path, with completion
-- gated behind service_role. So this migration removes the browser-reachable
-- entry point rather than adding a fifth set of checks to it.
--
-- ============================================================================
-- After this migration
-- ============================================================================
--
-- Both completion routes converge on the _webhook functions:
--
--   Paystack webhook  -> verify HMAC over the raw body -> match amount vs order
--                        -> lib/payments/special-checkout.ts -> _webhook RPC
--   Buyer "complete"  -> verify session owns the order -> pull the transaction
--                        from Paystack's verify endpoint -> match reference,
--                        amount and currency -> same module -> _webhook RPC
--
-- The buyer path exists because the buyer can return from the hosted payment
-- page before the webhook lands. It now proves the payment out-of-band instead
-- of trusting that the row already says succeeded, and it fails closed when
-- there is no provider reference to verify against.
--
-- The functions themselves are deliberately left in place, not dropped: they
-- are the same logic the _webhook variants were derived from, and keeping them
-- callable by postgres/service_role preserves a manual support path for
-- reconciling a stuck checkout. Only the browser-reachable grants go.

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
end $$;

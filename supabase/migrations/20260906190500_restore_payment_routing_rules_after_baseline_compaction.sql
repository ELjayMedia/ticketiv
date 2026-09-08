-- Restore the payment routing rules omitted by the 5 September 2026 production-baseline
-- compaction.
--
-- The baseline is a schema-only dump, so it carries no table rows. Routing rules are
-- not user data — they are the shipped configuration that decides which rail a
-- checkout uses, and without them selectPaymentProvider() has nothing to match and
-- every checkout fails with no_matching_route. Production kept its rows; a database
-- rebuilt from this chain had none.
--
-- Rows below are production's. payment_routing_rules has no natural unique key, so
-- each row is matched on (country_code, currency, provider) and inserted only when
-- absent, leaving any operator edits to priority, notes or activation untouched.

insert into public.payment_routing_rules (priority, country_code, currency, provider, is_active, notes)
select v.priority, v.country_code, v.currency, v.provider, v.is_active, v.notes
  from (values
    (10, 'SZ'::text, 'SZL'::text, 'momo'::text, true,
     'Primary: MTN MoMo Collections is the only rail that settles SZL (TICK-355 disabled Paystack for SZL).'),
    (10, 'SZ', 'SZL', 'paystack', false,
     'Disabled by TICK-355: Paystack does not support SZL transactions'),
    (10, null, 'ZAR', 'paystack', true,
     'Primary: Paystack-supported ZAR card and bank payments'),
    (20, null, 'SZL', 'momo', true,
     'Fallback for SZL orders with no country code — matchRoutingRule prefers the SZ-scoped rule when country is known.')
  ) as v(priority, country_code, currency, provider, is_active, notes)
 where not exists (
   select 1
     from public.payment_routing_rules r
    where r.country_code is not distinct from v.country_code
      and r.currency is not distinct from v.currency
      and r.provider = v.provider
 );

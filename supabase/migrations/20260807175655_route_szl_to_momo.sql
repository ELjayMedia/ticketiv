-- Give SZL a payment route.
--
-- TICK-355 disabled the SZ/SZL → paystack rule because Paystack does not
-- process SZL, but nothing replaced it. `payment_routing_rules` has been left
-- with exactly one active rule — ZAR → paystack — so an SZL order that does not
-- name a provider explicitly reaches `selectPaymentProvider` with no matching
-- rule and fails with `no_matching_route`.
--
-- The practical effect is that MoMo, the only rail that *can* take SZL, is only
-- reachable when the client happens to pass `provider: "momo"` by hand. Every
-- other path into checkout is dead for the home currency. docs/PAYMENTS.md has
-- said "Configure SZ/SZL → momo primary" since the rail was built; this is that
-- rule.
--
-- No fallback_provider: Paystack cannot settle SZL, so falling back to it would
-- swap the buyer onto a rail that must fail. An unroutable currency should stay
-- a controlled `no_matching_route` error rather than a confusing decline.
--
-- The table carries no natural unique key, so guard on the logical one to keep
-- this migration idempotent.

insert into public.payment_routing_rules (priority, country_code, currency, provider, fallback_provider, is_active, notes)
select 10, 'SZ', 'SZL', 'momo', null, true,
       'Primary: MTN MoMo Collections is the only rail that settles SZL (TICK-355 disabled Paystack for SZL).'
where not exists (
  select 1 from public.payment_routing_rules
  where currency = 'SZL' and provider = 'momo' and coalesce(country_code, 'SZ') = 'SZ'
);

-- Currency-only companion so an SZL order that arrives without a country code
-- still routes. The SZ-scoped rule above outranks it on specificity at equal
-- priority, so this only applies when country is absent.
insert into public.payment_routing_rules (priority, country_code, currency, provider, fallback_provider, is_active, notes)
select 20, null, 'SZL', 'momo', null, true,
       'Fallback for SZL orders with no country code — matchRoutingRule prefers the SZ-scoped rule when country is known.'
where not exists (
  select 1 from public.payment_routing_rules
  where currency = 'SZL' and provider = 'momo' and country_code is null
);

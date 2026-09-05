insert into public.payment_routing_rules (priority, country_code, currency, provider, fallback_provider, is_active, notes)
select 10, 'SZ', 'SZL', 'momo', null, true,
       'Primary: MTN MoMo Collections is the only rail that settles SZL (TICK-355 disabled Paystack for SZL).'
where not exists (
  select 1 from public.payment_routing_rules
  where currency = 'SZL' and provider = 'momo' and coalesce(country_code, 'SZ') = 'SZ'
);

insert into public.payment_routing_rules (priority, country_code, currency, provider, fallback_provider, is_active, notes)
select 20, null, 'SZL', 'momo', null, true,
       'Fallback for SZL orders with no country code — matchRoutingRule prefers the SZ-scoped rule when country is known.'
where not exists (
  select 1 from public.payment_routing_rules
  where currency = 'SZL' and provider = 'momo' and country_code is null
);;

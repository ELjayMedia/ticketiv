-- TICK-355: Paystack does not accept SZL transaction initialization.
-- Keep the provider route and the launch UAT event in an explicitly supported
-- currency instead of performing an undisclosed currency conversion at charge.

update public.payment_routing_rules
set
  is_active = false,
  notes = 'Disabled by TICK-355: Paystack does not support SZL transactions',
  updated_at = now()
where lower(provider) = 'paystack'
  and upper(currency) = 'SZL'
  and is_active = true;

do $$
begin
  if exists (
    select 1
    from public.payment_routing_rules
    where lower(provider) = 'paystack'
      and upper(currency) = 'ZAR'
  ) then
    update public.payment_routing_rules
    set
      priority = least(coalesce(priority, 10), 10),
      country_code = null,
      is_active = true,
      notes = 'Primary: Paystack-supported ZAR card and bank payments',
      updated_at = now()
    where id = (
      select id
      from public.payment_routing_rules
      where lower(provider) = 'paystack'
        and upper(currency) = 'ZAR'
      order by priority nulls last, created_at, id
      limit 1
    );
  else
    insert into public.payment_routing_rules (
      priority,
      country_code,
      currency,
      provider,
      fallback_provider,
      is_active,
      conditions,
      notes
    ) values (
      10,
      null,
      'ZAR',
      'paystack',
      null,
      true,
      '{}'::jsonb,
      'Primary: Paystack-supported ZAR card and bank payments'
    );
  end if;
end
$$;

-- The named launch/UAT event is priced at the same nominal amount in ZAR.
-- ZAR is shown to the buyer and persisted on the order, payment and ledger;
-- there is no hidden SZL-to-ZAR conversion in application code.
update public.ticket_types
set currency = 'ZAR'
where event_id = (
  select id
  from public.events
  where slug = 'worship-in-my-room-d721ab2b'
)
  and currency = 'SZL';

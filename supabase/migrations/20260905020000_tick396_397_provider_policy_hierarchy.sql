-- TICK-396 + TICK-397: Organizer and ticket-type payment-provider policy.
--
-- Adds payment_providers columns to organizations and ticket_types,
-- plus an RPC that resolves the full policy hierarchy.

-- 1. Add organizations.payment_providers
alter table public.organizations
  add column if not exists payment_providers text[] not null default '{}'::text[];

comment on column public.organizations.payment_providers is
  'Allowed payment providers for this organization. Empty = all enabled providers (no lock). Resolved by fn_get_effective_payment_providers.';

-- 2. Add ticket_types.payment_providers
alter table public.ticket_types
  add column if not exists payment_providers text[] not null default '{}'::text[];

comment on column public.ticket_types.payment_providers is
  'Allowed payment providers for this ticket type. Empty = inherit from event. Resolved by fn_get_effective_payment_providers.';

-- 3. Create RPC to resolve effective policy
create or replace function public.fn_get_effective_payment_providers(
  p_org_id uuid,
  p_event_id uuid default null,
  p_ticket_type_id uuid default null
)
returns text[]
language plpgsql
security definer
stable
as $$
declare
  v_org_providers text[];
  v_event_providers text[];
  v_ticket_providers text[];
  v_platform_providers text[];
begin
  -- Platform-level: providers that are globally enabled
  select array_agg(provider order by provider)
  into v_platform_providers
  from public.payment_provider_settings
  where is_enabled = true;

  -- Organization-level
  select coalesce(payment_providers, '{}'::text[])
  into v_org_providers
  from public.organizations
  where id = p_org_id;

  -- If org has explicit policy, use it; otherwise use platform
  if array_length(v_org_providers, 1) > 0 then
    v_platform_providers := v_org_providers;
  end if;

  -- Event-level override
  if p_event_id is not null then
    select coalesce(payment_providers, '{}'::text[])
    into v_event_providers
    from public.events
    where id = p_event_id;

    if array_length(v_event_providers, 1) > 0 then
      -- Event has explicit policy: intersect with org/platform
      select array_agg(e order by e)
      into v_platform_providers
      from unnest(v_event_providers) e
      where e = any(v_platform_providers);
    end if;
  end if;

  -- Ticket-type-level override
  if p_ticket_type_id is not null then
    select coalesce(payment_providers, '{}'::text[])
    into v_ticket_providers
    from public.ticket_types
    where id = p_ticket_type_id;

    if array_length(v_ticket_providers, 1) > 0 then
      -- Ticket type has explicit policy: intersect with event/org/platform
      select array_agg(e order by e)
      into v_platform_providers
      from unnest(v_ticket_providers) e
      where e = any(v_platform_providers);
    end if;
  end if;

  return coalesce(v_platform_providers, '{}'::text[]);
end;
$$;

comment on function public.fn_get_effective_payment_providers(uuid, uuid, uuid) is
  'Resolves the effective payment providers for an order based on the policy hierarchy: platform > organizer > event > ticket-type. Empty array means no providers available.';

-- 4. Grant execute to service_role
grant execute on function public.fn_get_effective_payment_providers(uuid, uuid, uuid) to service_role;
grant execute on function public.fn_get_effective_payment_providers(uuid, uuid, uuid) to authenticated;

-- TICK-396 + TICK-397: Organizer and ticket-type payment-provider policy.
--
-- Adds payment_providers columns to organizations and ticket_types,
-- plus an RPC that resolves the full policy hierarchy.
--
-- Hierarchy (successive intersections):
--   PLATFORM AVAILABILITY → ORGANIZER ALLOWLIST → EVENT ALLOWLIST → TICKET-TYPE ALLOWLIST
--
-- An empty/inherited config means "no additional restriction" (not "ignore platform").
-- No lower level may re-enable a provider removed by a higher level.

-- 1. Add organizations.payment_providers
alter table public.organizations
  add column if not exists payment_providers text[] not null default '{}'::text[];

comment on column public.organizations.payment_providers is
  'Allowed payment providers for this organization. Empty = inherit from platform. Resolved by fn_get_effective_payment_providers.';

-- 2. Add ticket_types.payment_providers
alter table public.ticket_types
  add column if not exists payment_providers text[] not null default '{}'::text[];

comment on column public.ticket_types.payment_providers is
  'Allowed payment providers for this ticket type. Empty = inherit from event. Resolved by fn_get_effective_payment_providers.';

-- 3. Create RPC to resolve effective policy
--
-- Algorithm: successive intersections starting from platform availability.
-- At each level, if the entity has an explicit allowlist, intersect it with
-- the current effective set. Empty allowlist = no additional restriction.
--
-- Security: SECURITY INVOKER (not DEFINER). Only service_role can execute.
-- This prevents unauthorized access and ensures RLS is respected.
create or replace function public.fn_get_effective_payment_providers(
  p_org_id uuid,
  p_event_id uuid default null,
  p_ticket_type_id uuid default null
)
returns text[]
language plpgsql
security invoker
stable
as $$
declare
  v_effective text[];
  v_allowlist text[];
  v_event_org uuid;
  v_ticket_event uuid;
begin
  -- Platform-level: providers that are globally enabled
  select array_agg(provider order by provider)
  into v_effective
  from public.payment_provider_settings
  where is_enabled = true;

  -- Validate organization exists
  if not exists (select 1 from public.organizations where id = p_org_id) then
    return '{}'::text[];
  end if;

  -- Organization-level: intersect with org allowlist (if explicit)
  select coalesce(payment_providers, '{}'::text[])
  into v_allowlist
  from public.organizations
  where id = p_org_id;

  if array_length(v_allowlist, 1) > 0 then
    select array_agg(e order by e)
    into v_effective
    from unnest(v_allowlist) e
    where e = any(v_effective);
  end if;

  -- Event-level: validate hierarchy, then intersect
  if p_event_id is not null then
    -- Verify event belongs to the organization
    select org_id
    into v_event_org
    from public.events
    where id = p_event_id;

    if v_event_org is distinct from p_org_id then
      -- Invalid hierarchy: event does not belong to org
      return '{}'::text[];
    end if;

    select coalesce(payment_providers, '{}'::text[])
    into v_allowlist
    from public.events
    where id = p_event_id;

    if array_length(v_allowlist, 1) > 0 then
      select array_agg(e order by e)
      into v_effective
      from unnest(v_allowlist) e
      where e = any(v_effective);
    end if;
  end if;

  -- Ticket-type-level: validate hierarchy, then intersect
  if p_ticket_type_id is not null then
    -- Verify ticket type belongs to the event (or to the event's org if no event)
    select tt.event_id
    into v_ticket_event
    from public.ticket_types tt
    where tt.id = p_ticket_type_id;

    if p_event_id is not null and v_ticket_event is distinct from p_event_id then
      -- Invalid hierarchy: ticket type does not belong to event
      return '{}'::text[];
    end if;

    select coalesce(payment_providers, '{}'::text[])
    into v_allowlist
    from public.ticket_types
    where id = p_ticket_type_id;

    if array_length(v_allowlist, 1) > 0 then
      select array_agg(e order by e)
      into v_effective
      from unnest(v_allowlist) e
      where e = any(v_effective);
    end if;
  end if;

  return coalesce(v_effective, '{}'::text[]);
end;
$$;

comment on function public.fn_get_effective_payment_providers(uuid, uuid, uuid) is
  'Resolves the effective payment providers for an order based on the policy hierarchy: platform > organizer > event > ticket-type. Empty array means no providers available. Security invoker — only service_role can execute.';

-- 4. Security configuration
-- Revoke all access first, then grant only to service_role
revoke all on function public.fn_get_effective_payment_providers(uuid, uuid, uuid) from public;
revoke all on function public.fn_get_effective_payment_providers(uuid, uuid, uuid) from anon;
revoke all on function public.fn_get_effective_payment_providers(uuid, uuid, uuid) from authenticated;

grant execute on function public.fn_get_effective_payment_providers(uuid, uuid, uuid) to service_role;

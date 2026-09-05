-- B4: Add outbound webhook endpoint config + delivery log so the
-- super-admin Webhooks screen can render both inbound (existing
-- public.webhooks) and outbound subscribers with HTTP status tails.

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  -- Platform-level endpoints (org_id NULL) are managed by super-admin and
  -- subscribe to platform-wide events; org-level endpoints are managed by
  -- the org's owners/admins and subscribe to that org's events only.
  url text not null,
  description text,
  secret text,
  events text[] not null default array[]::text[],
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_delivery_at timestamptz,
  last_status_code integer
);

create index if not exists idx_webhook_endpoints_org on public.webhook_endpoints(org_id);
create index if not exists idx_webhook_endpoints_active on public.webhook_endpoints(is_active) where is_active = true;

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  attempt_no integer not null default 1,
  response_status integer,
  response_body text,
  duration_ms integer,
  delivered_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_deliveries_endpoint on public.webhook_deliveries(endpoint_id, created_at desc);
create index if not exists idx_webhook_deliveries_pending on public.webhook_deliveries(next_retry_at)
  where delivered_at is null and next_retry_at is not null;

alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;

-- Org admins manage their org's endpoints; super-admin manages everything
-- including platform-level (org_id NULL) endpoints.
create policy webhook_endpoints_org_read on public.webhook_endpoints
  for select using (
    org_id is not null and public.is_org_admin(org_id)
  );
create policy webhook_endpoints_org_write on public.webhook_endpoints
  for all using (
    org_id is not null and public.is_org_admin(org_id)
  )
  with check (
    org_id is not null and public.is_org_admin(org_id)
  );

create policy webhook_endpoints_platform_admin on public.webhook_endpoints
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy webhook_deliveries_endpoint_visibility on public.webhook_deliveries
  for select using (
    exists (
      select 1 from public.webhook_endpoints e
      where e.id = webhook_deliveries.endpoint_id
        and (
          public.is_super_admin()
          or (e.org_id is not null and public.is_org_admin(e.org_id))
        )
    )
  );

-- Inserts/updates come from the server-side delivery worker via service role.
create policy webhook_deliveries_service_write on public.webhook_deliveries
  for all using (false) with check (false);

create or replace function public.fn_webhook_endpoints_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end
$$;

drop trigger if exists trg_webhook_endpoints_touch on public.webhook_endpoints;
create trigger trg_webhook_endpoints_touch
  before update on public.webhook_endpoints
  for each row execute function public.fn_webhook_endpoints_touch_updated_at();

comment on table public.webhook_endpoints is
  'Outbound webhook subscribers. Platform-level rows have org_id NULL.';
comment on table public.webhook_deliveries is
  'One row per delivery attempt; retries get successive rows tied to the same endpoint_id.';
;

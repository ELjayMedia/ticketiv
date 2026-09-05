-- TICK-300 — privacy-minimised TapBand telemetry and operational alerts.

create table if not exists public.tapband_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  event_type text not null,
  severity text not null default 'info',
  outcome text,
  channel text,
  credential_hash text,
  serial_hash text,
  actor_hash text,
  reader_id text,
  correlation_id text,
  latency_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  ingested_at timestamptz not null default now(),
  constraint tapband_telemetry_event_type_not_blank check (btrim(event_type) <> ''),
  constraint tapband_telemetry_severity_check check (severity in ('info', 'warning', 'critical')),
  constraint tapband_telemetry_latency_non_negative check (latency_ms is null or latency_ms >= 0),
  constraint tapband_telemetry_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists tapband_telemetry_events_type_time_idx
  on public.tapband_telemetry_events (event_type, occurred_at desc);

create index if not exists tapband_telemetry_events_org_time_idx
  on public.tapband_telemetry_events (org_id, occurred_at desc)
  where org_id is not null;

create index if not exists tapband_telemetry_events_event_time_idx
  on public.tapband_telemetry_events (event_id, occurred_at desc)
  where event_id is not null;

create index if not exists tapband_telemetry_events_device_time_idx
  on public.tapband_telemetry_events (device_id, occurred_at desc)
  where device_id is not null;

create index if not exists tapband_telemetry_events_credential_idx
  on public.tapband_telemetry_events (credential_hash, occurred_at desc)
  where credential_hash is not null;

create index if not exists tapband_telemetry_events_serial_idx
  on public.tapband_telemetry_events (serial_hash, occurred_at desc)
  where serial_hash is not null;

create index if not exists tapband_telemetry_events_correlation_idx
  on public.tapband_telemetry_events (correlation_id)
  where correlation_id is not null;

alter table public.tapband_telemetry_events enable row level security;

drop policy if exists tapband_telemetry_events_select on public.tapband_telemetry_events;
create policy tapband_telemetry_events_select on public.tapband_telemetry_events
  for select to authenticated
  using (
    (org_id is not null and app.is_org_manager(org_id))
    or exists (
      select 1 from public.events e
      where e.id = tapband_telemetry_events.event_id
        and app.is_org_manager(e.org_id)
    )
  );

create table if not exists public.tapband_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null,
  severity text not null,
  status text not null default 'open',
  org_id uuid references public.organizations(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  correlation_id text,
  title text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tapband_alerts_key_not_blank check (btrim(alert_key) <> ''),
  constraint tapband_alerts_severity_check check (severity in ('warning', 'critical')),
  constraint tapband_alerts_status_check check (status in ('open', 'acknowledged', 'resolved')),
  constraint tapband_alerts_details_object check (jsonb_typeof(details) = 'object')
);

create index if not exists tapband_alerts_open_idx
  on public.tapband_alerts (status, severity, last_seen_at desc)
  where status in ('open', 'acknowledged');

create index if not exists tapband_alerts_org_time_idx
  on public.tapband_alerts (org_id, last_seen_at desc)
  where org_id is not null;

create index if not exists tapband_alerts_event_time_idx
  on public.tapband_alerts (event_id, last_seen_at desc)
  where event_id is not null;

create index if not exists tapband_alerts_device_time_idx
  on public.tapband_alerts (device_id, last_seen_at desc)
  where device_id is not null;

alter table public.tapband_alerts enable row level security;

drop policy if exists tapband_alerts_select on public.tapband_alerts;
create policy tapband_alerts_select on public.tapband_alerts
  for select to authenticated
  using (
    (org_id is not null and app.is_org_manager(org_id))
    or exists (
      select 1 from public.events e
      where e.id = tapband_alerts.event_id
        and app.is_org_manager(e.org_id)
    )
  );;

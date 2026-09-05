create table if not exists public.admin_action_catalog (
  key text primary key,
  workspace_key text not null,
  label text not null,
  description text not null,
  target_table text not null,
  required_role text not null default 'super_admin',
  backend_function text,
  is_enabled boolean not null default false,
  created_at timestamp with time zone not null default now()
);

insert into public.admin_action_catalog (key, workspace_key, label, description, target_table, backend_function, is_enabled)
values
  ('publish_event', 'event-operations', 'Publish event', 'Validate event readiness, publish it, and create an audit entry.', 'events', 'admin_publish_event', false),
  ('archive_event', 'event-operations', 'Archive event', 'Move an event out of marketplace circulation and record the reason.', 'events', 'admin_archive_event', false),
  ('update_payout_status', 'payments-finance', 'Update payout status', 'Move a payout through requested, processing, paid, failed, or cancelled states.', 'payouts', 'admin_update_payout_status', false),
  ('update_refund_status', 'payments-finance', 'Update refund status', 'Move a refund through requested, processing, processed, failed, or cancelled states.', 'refunds', 'admin_update_refund_status', false),
  ('pair_scanner', 'access-control', 'Pair scanner', 'Assign a scanner device to an organization or event.', 'devices', null, false),
  ('pause_promo', 'promotions-controls', 'Pause promo', 'Disable an active price rule while preserving redemption history.', 'price_rules', null, false)
on conflict (key) do update
set workspace_key = excluded.workspace_key,
    label = excluded.label,
    description = excluded.description,
    target_table = excluded.target_table,
    backend_function = excluded.backend_function;

create or replace view public.admin_workspace_actions as
select
  key,
  workspace_key,
  label,
  description,
  target_table,
  backend_function,
  is_enabled,
  created_at
from public.admin_action_catalog
order by workspace_key, label;;

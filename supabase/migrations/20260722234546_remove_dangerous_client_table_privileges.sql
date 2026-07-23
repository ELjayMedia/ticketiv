-- RLS does not apply to TRUNCATE. Client roles must never own schema-management privileges.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;

-- Unauthenticated API users do not need direct access to private operational data.
revoke all privileges on table
  public.admin_users,
  public.org_members,
  public.devices,
  public.device_sessions,
  public.ledger_entries,
  public.payments,
  public.payment_provider_settings,
  public.payout_accounts,
  public.payouts,
  public.refunds,
  public.refund_items,
  public.scans,
  public.webhooks,
  public.webhook_endpoints,
  public.webhook_deliveries
from anon;

-- Signed-in users may read data only where RLS authorizes it; mutations use guarded RPCs
-- or narrowly scoped tables whose policies enforce ownership/organization roles.
revoke insert, update, delete on table public.ledger_entries from authenticated;
revoke insert, update, delete on table public.payments from authenticated;
revoke all privileges on table public.payment_provider_settings from authenticated;
revoke insert, update, delete on table public.scans from authenticated;
revoke insert, update, delete on table public.webhook_deliveries from authenticated;
revoke insert, update, delete on table public.webhooks from authenticated;
revoke insert, update, delete on table public.refund_items from authenticated;

-- Orders and issued tickets are state machines. Prevent arbitrary direct client state changes.
revoke insert, update, delete on table public.orders from authenticated;
revoke insert, update, delete on table public.order_items from authenticated;

-- Device lifecycle is controlled through pairing/session RPCs.
revoke insert, update, delete on table public.devices from authenticated;
revoke insert, update, delete on table public.device_sessions from authenticated;

-- Payout state is server-controlled. Organizers request payouts via fn_request_payout.
revoke insert, update, delete on table public.payouts from authenticated;

-- Refund rows may be requested directly under strict RLS, but provider processing is RPC/server-owned.
revoke update, delete on table public.refunds from authenticated;

-- Preserve intended read/request/configuration paths.
grant select on table public.admin_users to authenticated;
grant select on table public.org_members to authenticated;
grant select on table public.devices to authenticated;
grant select on table public.device_sessions to authenticated;
grant select on table public.ledger_entries to authenticated;
grant select on table public.payments to authenticated;
grant select, insert on table public.refunds to authenticated;
grant select on table public.refund_items to authenticated;
grant select on table public.scans to authenticated;
grant select on table public.payouts to authenticated;
grant select, insert, update, delete on table public.payout_accounts to authenticated;
grant select, insert, update, delete on table public.webhook_endpoints to authenticated;
grant select on table public.webhook_deliveries to authenticated;
grant select on table public.webhooks to authenticated;
grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;

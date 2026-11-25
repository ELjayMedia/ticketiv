-- Integrations: per-integration on/off switch and settings saved from the
-- admin console, so the owner can connect or change a provider without a
-- redeploy (generalises the Chatwoot connection in admin_integration_settings).
--
--   enabled            the card's on/off switch. Off means the app treats the
--                      integration as not configured, even if Coolify still
--                      has environment variables for it.
--   settings           non-secret values, keyed by the environment variable
--                      name they replace (e.g. {"RESEND_FROM": "..."}).
--   secrets_encrypted  secret values, encrypted by the app with the same
--                      at-rest key as payout details. Never sent to a browser.
--   secret_hints       last 4 characters of each saved secret, for the UI.
--
-- A value saved here wins over the environment variable of the same name for
-- that integration; an empty value falls back to the environment. No row at
-- all means "environment only", exactly as before this migration.
--
-- Money providers (MoMo, DeltaPay checkout, DeltaPay payout wallet) only use
-- the switch here; their keys stay in the Coolify environment. Checkout
-- providers' switch is payment_provider_settings.is_enabled, not this table.
--
-- RLS on, no policies, revoked from anon and authenticated: only the admin
-- console's server code (service role) reads or writes it. Every change is
-- copied to admin_settings_history with secret columns masked.
--
-- Additive. Rollback: drop table public.admin_integration_configs.

create table if not exists public.admin_integration_configs (
  provider text primary key check (provider ~ '^[a-z0-9_]{2,40}$'),
  enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  secrets_encrypted text,
  secret_hints jsonb not null default '{}'::jsonb check (jsonb_typeof(secret_hints) = 'object'),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_integration_configs enable row level security;
revoke all on public.admin_integration_configs from anon, authenticated;
grant select, insert, update, delete on public.admin_integration_configs to service_role;

drop trigger if exists trg_settings_history on public.admin_integration_configs;
create trigger trg_settings_history
  after insert or update or delete on public.admin_integration_configs
  for each row execute function app.record_settings_history('provider');

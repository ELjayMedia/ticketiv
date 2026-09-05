create table if not exists public.payment_provider_settings (
  provider text primary key,
  is_enabled boolean not null default false,
  mode text not null default 'test' check (mode in ('test', 'live')),
  public_key text,
  secret_key text,
  webhook_secret text,
  callback_url text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint payment_provider_settings_provider_check check (provider in ('paystack', 'deltapay', 'flutterwave', 'manual'))
);

alter table public.payment_provider_settings enable row level security;

revoke all on public.payment_provider_settings from anon, authenticated;
grant all on public.payment_provider_settings to service_role;

drop policy if exists payment_provider_settings_no_client_access on public.payment_provider_settings;
create policy payment_provider_settings_no_client_access
on public.payment_provider_settings
for all
to authenticated
using (false)
with check (false);

insert into public.payment_provider_settings (provider, is_enabled, mode)
values ('paystack', false, 'test')
on conflict (provider) do nothing;

create or replace function public.set_payment_provider_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payment_provider_settings_updated_at on public.payment_provider_settings;
create trigger trg_payment_provider_settings_updated_at
before update on public.payment_provider_settings
for each row execute function public.set_payment_provider_settings_updated_at();

revoke execute on function public.set_payment_provider_settings_updated_at() from public, anon, authenticated;
grant execute on function public.set_payment_provider_settings_updated_at() to service_role;

comment on table public.payment_provider_settings is 'Service-role only payment gateway settings managed by super-admin dashboard. Secret values are never exposed to browser clients.';;

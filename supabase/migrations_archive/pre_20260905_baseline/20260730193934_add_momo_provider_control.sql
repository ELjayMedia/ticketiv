alter table public.payment_provider_settings drop constraint if exists payment_provider_settings_provider_check;
alter table public.payment_provider_settings add constraint payment_provider_settings_provider_check check (provider = any (array['paystack'::text, 'flutterwave'::text, 'manual'::text, 'momo'::text]));
insert into public.payment_provider_settings (provider, is_enabled, mode)
values ('momo', false, 'test')
on conflict (provider) do update
set is_enabled = false,
    mode = 'test',
    updated_at = now();;

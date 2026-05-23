create index if not exists idx_feature_flags_last_changed_by on public.feature_flags(last_changed_by);
create index if not exists idx_feature_flags_owner on public.feature_flags(owner);
create index if not exists idx_payment_provider_settings_updated_by on public.payment_provider_settings(updated_by);
create index if not exists idx_payment_routing_rules_created_by on public.payment_routing_rules(created_by);
create index if not exists idx_webhook_endpoints_created_by on public.webhook_endpoints(created_by);

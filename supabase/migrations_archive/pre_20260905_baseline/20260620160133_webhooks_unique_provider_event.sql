
CREATE UNIQUE INDEX IF NOT EXISTS webhooks_provider_event_uidx
  ON public.webhooks (provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;
;


ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS resale_cap_bps integer;

ALTER TABLE public.events
  ADD CONSTRAINT events_resale_cap_bps_check
  CHECK (resale_cap_bps IS NULL OR (resale_cap_bps >= 0 AND resale_cap_bps <= 100000));

COMMENT ON COLUMN public.events.resale_cap_bps IS 'Per-event override for the resale price cap, expressed in basis points of face value (10000 = 100%, 11000 = 110%). NULL falls back to the platform default in app config (RESALE_CAP_BPS_DEFAULT).';
;

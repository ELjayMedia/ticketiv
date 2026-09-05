
ALTER TABLE public.events
  ALTER COLUMN refund_policy TYPE jsonb
  USING CASE
    WHEN refund_policy IS NULL THEN NULL
    WHEN refund_policy::text ~ '^\s*[\[{]' THEN refund_policy::jsonb
    ELSE jsonb_build_object('kind', refund_policy)
  END;

COMMENT ON COLUMN public.events.refund_policy IS 'Refund policy as JSON. Supports two shapes:
  1. Preset:  {"kind": "flexible" | "moderate" | "strict" | "none"}
  2. Custom:  {"kind": "custom", "bands": [{"hours_before": 48, "refund_bps": 10000}, {"hours_before": 24, "refund_bps": 5000}]}
The TS helper lib/refund-policy.ts resolves either shape into bands.';
;

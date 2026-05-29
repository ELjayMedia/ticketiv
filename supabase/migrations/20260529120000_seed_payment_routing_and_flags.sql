-- TICK-62: Seed SZL/Eswatini → Paystack routing rule
-- TICK-70: Seed baseline platform feature flags

-- Payment routing: primary SZL route via Paystack (priority 10 = highest)
INSERT INTO payment_routing_rules (priority, country_code, currency, provider, is_active, notes)
SELECT 10, 'SZ', 'SZL', 'paystack', true, 'Primary: Eswatini SZL payments via Paystack'
WHERE NOT EXISTS (
  SELECT 1 FROM payment_routing_rules WHERE currency = 'SZL' AND provider = 'paystack'
);

-- Baseline platform-level feature flags (org_id IS NULL = platform-wide)
-- All gated features default to disabled; enable per-org as needed.
-- Uses WHERE NOT EXISTS because feature_flags has no unique constraint on key.
DO $$
DECLARE
  flags jsonb := '[
    {"key":"resale_enabled",        "enabled":false, "description":"Allow attendees to resell tickets at face value via the resale marketplace", "tags":["commerce","resale"]},
    {"key":"waitlist_enabled",      "enabled":false, "description":"Enable waitlist joins and offer fulfilment for sold-out events",              "tags":["commerce","waitlist"]},
    {"key":"series_enabled",        "enabled":true,  "description":"Enable event series grouping and discovery on public pages",                  "tags":["events","series"]},
    {"key":"pos_enabled",           "enabled":false, "description":"Enable point-of-sale device mode for on-site ticket sales",                   "tags":["scanner","pos"]},
    {"key":"notifications_enabled", "enabled":true,  "description":"Enable in-app and email notifications for buyers",                            "tags":["notifications"]},
    {"key":"guestlist_enabled",     "enabled":true,  "description":"Enable guestlist management and fulfilment for organizers",                   "tags":["events","guestlist"]}
  ]'::jsonb;
  f jsonb;
BEGIN
  FOR f IN SELECT * FROM jsonb_array_elements(flags)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM feature_flags WHERE key = (f->>'key') AND org_id IS NULL) THEN
      INSERT INTO feature_flags (key, enabled, description, tags, org_id)
      VALUES (
        f->>'key',
        (f->>'enabled')::boolean,
        f->>'description',
        ARRAY(SELECT jsonb_array_elements_text(f->'tags')),
        NULL
      );
    END IF;
  END LOOP;
END $$;

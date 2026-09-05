# Phase 6G — Non-Schema Behavior Extraction

**Date:** 2026-09-05

---

## Summary

| Category | Count |
|----------|-------|
| Migrations with non-schema items | 167 |
| INSERT statements | 478 |
| UPDATE statements | 232 |
| DELETE statements | 125 |
| Cron job definitions | 1 |
| Storage bucket definitions | 3 |
| Extension definitions | 2 |
| Custom role definitions | 0 |
| Realtime publications | 0 |

---

## Classification of Non-Schema Items

### 1. REFERENCE DATA (Required for application to function)

| Item | Type | Description | Action |
|------|------|-------------|--------|
| `admin_action_catalog` | INSERT | Admin action catalog entries | ✅ Include in baseline seed |
| `event_categories` | INSERT | Event category seed data | ✅ Include in baseline seed |
| `feature_flags` | INSERT | Feature flag definitions | ✅ Include in baseline seed |
| `payment_provider_settings` | INSERT | Payment provider configuration | ✅ Include in baseline seed |
| `payment_routing_rules` | INSERT | Payment routing rules | ✅ Include in baseline seed |
| `pricing_plans` | INSERT | Pricing plan definitions | ✅ Include in baseline seed |

### 2. BACKFILL/UPDATE DATA (Historical corrections)

| Item | Type | Description | Action |
|------|------|-------------|--------|
| `org_members` backfill | INSERT | Backfill from profiles.org_id | ❌ Exclude — historical |
| `profiles` phone mirror | UPDATE | Mirror phone from auth.users | ❌ Exclude — historical |
| `devices` role enum | UPDATE | Adopt device role enum | ❌ Exclude — historical |
| `organizations` slug | UPDATE | Generate slugs | ❌ Exclude — historical |
| `events` title update | UPDATE | Update titles | ❌ Exclude — historical |

### 3. CRON JOBS

| Item | Type | Description | Action |
|------|------|-------------|--------|
| `refund_reconciliation` | SCHEDULE | pg_cron job for refund reconciliation | ⚠️ Document separately |

### 4. STORAGE BUCKETS

| Item | Type | Description | Action |
|------|------|-------------|--------|
| `event_covers` | INSERT | Event covers bucket | ✅ Include in baseline |
| (others) | INSERT | Other storage buckets | ✅ Include in baseline |

### 5. EXTENSIONS

| Item | Type | Description | Action |
|------|------|-------------|--------|
| `pg_cron` | CREATE EXTENSION | Cron extension | ✅ Include in baseline |
| (other) | CREATE EXTENSION | Other extension | ✅ Include in baseline |

### 6. TRIGGER FUNCTION DATA

| Item | Type | Description | Action |
|------|------|-------------|--------|
| `handle_new_user` | INSERT | Bootstrap new user profile | ✅ Include in baseline |
| `fn_apply_pricing_to_order` | REVOKE | Restrict pricing helper | ✅ Include in baseline |

---

## Bootstrap Data Required for Clean Database

The following reference data is required for Ticketiv to function on an empty database:

```sql
-- Admin action catalog
INSERT INTO public.admin_action_catalog (key, workspace_key, label, description, target_table, ...)
VALUES (...);

-- Event categories
INSERT INTO public.event_categories (name, slug, description, sort_order, is_active)
VALUES (...);

-- Feature flags
INSERT INTO public.feature_flags (key, name, description, is_enabled, ...)
VALUES (...);

-- Payment provider settings
INSERT INTO public.payment_provider_settings (provider, is_enabled, mode)
VALUES ('paystack', true, 'test'), ('momo', true, 'test'), ('deltapay', false, 'test');

-- Payment routing rules
INSERT INTO public.payment_routing_rules (priority, country_code, currency, provider, ...)
VALUES (...);

-- Pricing plans
INSERT INTO public.pricing_plans (name, slug, description, ...)
VALUES (...);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, ...)
VALUES ('event_covers', 'Event Covers', true, ...);

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron jobs
SELECT cron.schedule('refund_reconciliation', '*/15 * * * *', ...);
```

---

## Items to Exclude from Baseline

1. **Historical backfills** — org_members, profiles phone, devices role, slugs
2. **Test fixtures** — seed_ticketiv_four_test_events_v1
3. **Production data** — any customer/user/event/order data
4. **Secrets** — any API keys, tokens, or credentials

---

## Next Steps

1. ✅ Phase 6G: Non-schema behavior extraction — COMPLETE
2. ⏳ Phase 6H: Generate canonical production baseline
3. ⏳ Phase 6I-6L: Test and validate baseline
4. ⏳ Phase 6M-6O: Re-baseline production history and deploy

---

## Files Generated

- `docs/phase6g-non-schema-extraction.md` — This report

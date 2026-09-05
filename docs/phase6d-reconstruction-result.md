# Phase 6D Reconstruction Result — FAILED (Expected)

**Date:** 2026-09-05

---

## Test: 259 Production-Applied Migrations Reconstruction

**Result:** FAILED at migration 1 of 259

### Error Details

| Field | Value |
|-------|-------|
| **Migration** | `20260506184308_create_internal_schema_and_relocate_artifacts.sql` |
| **Statement** | 5 |
| **Error** | `relation "public.ledger_entries" does not exist (SQLSTATE 42P01)` |
| **SQL** | `COMMENT ON TABLE public.ledger_entries IS 'Internal accounting truth...'` |

### Root Cause

The `ledger_entries` table exists in production but is **NOT created by any migration file**. The first migration references it (adds a comment), but no migration actually creates it.

This is a **schema drift** — the table was created outside the migration system, likely via SQL Editor.

---

## Production Schema Audit

### Tables NOT Created by Migrations

| Table | In Production | Created By Migration |
|-------|---------------|---------------------|
| `ledger_entries` | ✅ Yes | ❌ No — **missing** |
| `orders` | ✅ Yes | ✅ Yes |
| `payments` | ✅ Yes | ✅ Yes |
| `events` | ✅ Yes | ✅ Yes |
| `organizations` | ✅ Yes | ✅ Yes |
| `profiles` | ✅ Yes | ✅ Yes |
| `payment_methods` | ✅ Yes | ✅ Yes |
| `payment_provider_settings` | ✅ Yes | ✅ Yes |
| `tickets` | ❌ No | — |
| `attendees` | ❌ No | — |

### Tables in Production (40 confirmed)

```
ledger_entries, orders, payments, events, organizations, profiles,
payment_methods, payment_provider_settings, payment_routing_rules,
webhook_endpoints, webhook_deliveries, order_items, venues, artists,
event_categories, event_series, event_favourites, membership_invites,
org_members, pos_shifts, finance_reconciliation_issues, notification_mutes,
push_subscriptions, push_devices, tapband_telemetry_events,
tapband_feature_configs, tapband_alerts, tapband_kill_switches,
credential_batches, credential_entitlements, credential_inventory,
credential_taps, physical_credentials, admin_action_catalog, app_audit_log,
ops_cron_runs, payment_outbox, event_live_stats, event_invitations,
series_follows
```

---

## Analysis

The migration chain cannot reconstruct production because:

1. **Hidden dependencies**: Tables like `ledger_entries` were created outside migrations
2. **Missing DDL**: No migration file contains `CREATE TABLE ledger_entries`
3. **SQL Editor drift**: Production schema has diverged from migration-tracked schema

This is exactly the scenario the user warned about — SQL Editor was used historically, leaving gaps in the migration chain.

---

## Next Steps Required

1. **Document ALL schema drift** — find every table/column/constraint not in migrations
2. **Recover missing DDL** — either from Git history, SQL Editor logs, or production introspection
3. **Create baseline migration** — or add missing `CREATE TABLE` statements to existing migrations
4. **Re-run reconstruction** — verify the fix works

---

## GitHub Actions Result

**Run ID:** 33950922495  
**Status:** Failed  
**Duration:** 2m 30s  
**Error:** `relation "public.ledger_entries" does not exist`

---

## Backup

Original migration directory preserved at: `/tmp/ticketiv-migrations-before-reconciliation`

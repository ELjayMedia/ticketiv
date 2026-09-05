# Production Schema Inventory

**Date:** 2026-09-05  
**Project:** `radsfmlsjznqvcpogluo`

---

## Schema Classification

### CANONICAL APPLICATION SCHEMA

| Schema | Description | Status |
|--------|-------------|--------|
| `public` | Primary Ticketiv application schema | ✅ Include in baseline |
| `app` | Helper functions (~34 functions) | ✅ Include in baseline |
| `private` | Organizer identity details | ✅ Include in baseline |

### CANONICAL OPERATIONAL SCHEMA

| Schema | Description | Status |
|--------|-------------|--------|
| `monitoring` | Monitoring tables/views/functions | ✅ Include in baseline |
| `_internal` | Internal operational artifacts | ✅ Include in baseline |
| `ops_backup` | Backup/recovery artifacts | ⚠️ Investigate dependencies |

### SUPABASE/MANAGED (Exclude from baseline)

| Schema | Description | Status |
|--------|-------------|--------|
| `auth` | Supabase Auth managed schema | ❌ Exclude |
| `storage` | Supabase Storage managed schema | ❌ Exclude |
| `realtime` | Supabase Realtime managed schema | ❌ Exclude |
| `cron` | pg_cron extension schema | ❌ Exclude |
| `extensions` | Extension views | ❌ Exclude |
| `graphql` | GraphQL managed schema | ❌ Exclude |
| `graphql_public` | GraphQL public schema | ❌ Exclude |
| `net` | Supabase Net extension | ❌ Exclude |
| `vault` | Supabase Vault managed schema | ❌ Exclude |
| `supabase_migrations` | Migration tracking schema | ❌ Exclude |
| `pgbouncer` | Connection pooler | ❌ Exclude |

### HISTORICAL/DEPRECATED (Investigate)

| Schema | Description | Status |
|--------|-------------|--------|
| `malicious` | Appears empty, needs investigation | ⚠️ Investigate |

---

## Detailed Object Inventory

### `public` Schema (CANONICAL APPLICATION)

#### Tables (68)

| Table | Type | Classification |
|-------|------|----------------|
| admin_action_catalog | BASE TABLE | Application |
| admin_users | BASE TABLE | Application |
| app_audit_log | BASE TABLE | Application |
| artists | BASE TABLE | Application |
| audit_log | BASE TABLE | Application |
| audit_log_archive | BASE TABLE | Application |
| credential_batches | BASE TABLE | Application |
| credential_entitlements | BASE TABLE | Application |
| credential_inventory | BASE TABLE | Application |
| credential_taps | BASE TABLE | Application |
| device_sessions | BASE TABLE | Application |
| device_setup_codes | BASE TABLE | Application |
| devices | BASE TABLE | Application |
| disputes | BASE TABLE | Application |
| event_artists | BASE TABLE | Application |
| event_categories | BASE TABLE | Application |
| event_dates | BASE TABLE | Application |
| event_favourites | BASE TABLE | Application |
| event_invitations | BASE TABLE | Application |
| event_live_stats | BASE TABLE | Application |
| event_metrics_daily | BASE TABLE | Application |
| event_series | BASE TABLE | Application |
| event_staff | BASE TABLE | Application |
| events | BASE TABLE | Application |
| feature_flags | BASE TABLE | Application |
| finance_reconciliation_issues | BASE TABLE | Application |
| guestlist_entries | BASE TABLE | Application |
| guestlist_fulfillments | BASE TABLE | Application |
| jobs | BASE TABLE | Application |
| ledger_entries | BASE TABLE | Application |
| membership_invites | BASE TABLE | Application |
| notification_mutes | BASE TABLE | Application |
| notifications | BASE TABLE | Application |
| ops_cron_runs | BASE TABLE | Application |
| order_items | BASE TABLE | Application |
| orders | BASE TABLE | Application |
| org_members | BASE TABLE | Application |
| org_metrics_daily | BASE TABLE | Application |
| organizations | BASE TABLE | Application |
| payment_attempts | BASE TABLE | Application |
| payment_methods | BASE TABLE | Application |
| payment_outbox | BASE TABLE | Application |
| payment_provider_settings | BASE TABLE | Application |
| payment_routing_rules | BASE TABLE | Application |
| payments | BASE TABLE | Application |
| payout_accounts | BASE TABLE | Application |
| payouts | BASE TABLE | Application |
| physical_credentials | BASE TABLE | Application |
| pos_shifts | BASE TABLE | Application |
| price_rule_redemptions | BASE TABLE | Application |
| price_rules | BASE TABLE | Application |
| pricing_plans | BASE TABLE | Application |
| profiles | BASE TABLE | Application |
| provider_settlement_items | BASE TABLE | Application |
| provider_settlements | BASE TABLE | Application |
| push_devices | BASE TABLE | Application |
| push_subscriptions | BASE TABLE | Application |
| rate_limits | BASE TABLE | Application |
| refund_items | BASE TABLE | Application |
| refunds | BASE TABLE | Application |
| resale_listings | BASE TABLE | Application |
| scans | BASE TABLE | Application |
| scans_archive | BASE TABLE | Application |
| seat_holds | BASE TABLE | Application |
| seat_maps | BASE TABLE | Application |
| seat_reservations | BASE TABLE | Application |
| seats | BASE TABLE | Application |
| series_follows | BASE TABLE | Application |
| tapband_alerts | BASE TABLE | Application |
| tapband_feature_configs | BASE TABLE | Application |
| tapband_kill_switches | BASE TABLE | Application |
| tapband_telemetry_events | BASE TABLE | Application |
| ticket_type_channels | BASE TABLE | Application |
| ticket_types | BASE TABLE | Application |
| transfers | BASE TABLE | Application |
| user_blocks | BASE TABLE | Application |
| user_connections | BASE TABLE | Application |
| user_handles | BASE TABLE | Application |
| user_notification_preferences | BASE TABLE | Application |
| user_privacy_settings | BASE TABLE | Application |
| user_private_profiles | BASE TABLE | Application |
| user_reports | BASE TABLE | Application |
| venues | BASE TABLE | Application |
| waitlists | BASE TABLE | Application |
| webhook_deliveries | BASE TABLE | Application |
| webhook_endpoints | BASE TABLE | Application |
| webhooks | BASE TABLE | Application |

#### Views (18)

| View | Classification |
|------|----------------|
| admin_attention_queue | Application |
| admin_command_centre_metrics | Application |
| admin_event_readiness | Application |
| admin_recent_operations | Application |
| admin_workspace_actions | Application |
| admin_workspace_operating_counts | Application |
| event_catalog | Application |
| event_summary | Application |
| order_ledger_summary | Application |
| user_friends | Application |
| v_artist_events_public | Application |
| v_artist_public | Application |
| v_event_kpis | Application |
| v_event_lineup_public | Application |
| v_event_public | Application |
| v_event_sales_public | Application |
| v_events_public | Application |
| v_finance_reconciliation_queue | Application |
| v_inbound_transfers | Application |
| v_my_order_ledger_summary | Application |
| v_my_tickets | Application |
| v_organizer_events_public | Application |
| v_organizer_public | Application |
| v_public_event_cards | Application |
| v_user_events | Application |
| v_user_orgs | Application |

### `app` Schema (CANONICAL APPLICATION)

#### Functions (~34)

To be enumerated during baseline generation.

### `private` Schema (CANONICAL APPLICATION)

#### Tables (1)

| Table | Classification |
|-------|----------------|
| organizer_identity_details | Application |

### `monitoring` Schema (CANONICAL OPERATIONAL)

#### Tables (2)

| Table | Classification |
|-------|----------------|
| index_bloat_snapshots | Operational |
| slow_query_snapshots | Operational |

#### Views (3)

| View | Classification |
|------|----------------|
| long_running_queries | Operational |
| slow_queries_summary | Operational |

### `_internal` Schema (CANONICAL OPERATIONAL)

#### Tables (2)

| Table | Classification |
|-------|----------------|
| policy_backups | Historical/Operational |
| project_docs | Historical/Operational |

### `ops_backup` Schema (NEEDS INVESTIGATION)

#### Tables (1)

| Table | Classification |
|-------|----------------|
| payout_accounts_tick376 | Backup artifact |

**Note:** This table may be a backup from TICK-376. Need to verify if any active code depends on it.

### `malicious` Schema (NEEDS INVESTIGATION)

**Status:** Appears to have no ordinary tables/views. Must be investigated before exclusion.

---

## Baseline Inclusion Summary

| Schema | Include in Baseline | Notes |
|--------|---------------------|-------|
| public | ✅ Yes | Primary application schema |
| app | ✅ Yes | Helper functions |
| private | ✅ Yes | Organizer identity |
| monitoring | ✅ Yes | Operational monitoring |
| _internal | ✅ Yes | Internal artifacts |
| ops_backup | ⚠️ Investigate | Check dependencies |
| malicious | ⚠️ Investigate | Empty? Check dependencies |
| auth | ❌ No | Supabase managed |
| storage | ❌ No | Supabase managed |
| realtime | ❌ No | Supabase managed |
| cron | ❌ No | Extension managed |
| extensions | ❌ No | Extension managed |
| graphql | ❌ No | Supabase managed |
| graphql_public | ❌ No | Supabase managed |
| net | ❌ No | Extension managed |
| vault | ❌ No | Supabase managed |
| supabase_migrations | ❌ No | Migration tracking |
| pgbouncer | ❌ No | Connection pooler |

---

## Next Steps

1. Investigate `malicious` schema contents
2. Verify `ops_backup` dependencies
3. Enumerate `app` schema functions
4. Proceed to Phase 6F (preserve old migration history)

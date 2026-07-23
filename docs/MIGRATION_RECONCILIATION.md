# Migration Reconciliation (TICK-171)

**Snapshot:** 2026-06-23 · live project `radsfmlsjznqvcpogluo` · read-only introspection via Supabase MCP. **No changes were applied to the live DB.**

## The drift

| | Count | Earliest |
|---|---|---|
| Migrations applied on the live DB (`supabase_migrations.schema_migrations`) | **116** | `20260506184308` |
| Migration files in `supabase/migrations/` | **40** | `20260523152300` |

The repo's earliest migration is `20260523`. **Everything before that — the entire base schema, enum types, RLS policies, and the bulk of the SECURITY DEFINER RPCs (~76 migrations from `20260506`–`20260522`) — exists only in the database.** The repo cannot rebuild the DB from scratch: this is a disaster-recovery and environment-parity failure (you cannot stand up a faithful staging/local copy from `supabase/migrations/` alone).

The in-repo files also do **not** correspond 1:1 to rows in the migration-history table (different timestamps/slugs), so they are a partial, divergent slice rather than the tail of the real history.

## Live schema inventory (what a faithful baseline must reproduce)

- **61** base tables (`public`)
- **21** enum types
- **191** functions in `public` schema (SECURITY DEFINER RPCs, trigger functions, helpers)
- **25** views + **2** materialized views (`mv_event_sales`, `mv_revenue_breakdown`)
- **179** RLS policies across 61 tables
- **96** triggers across 25 tables (some tables have duplicate updated_at triggers — see TICK-181)
- **275** indexes (214 non-PK)
- **11** extensions: `plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault, hypopg, pg_cron, index_advisor, btree_gist, pg_trgm, pg_net`
- Cross-schema dependencies on Supabase-managed schemas: `auth` (all `*_fkey` → `auth.users`), `storage`, `realtime`, `cron`, `net`, `vault`, plus project schemas `app`, `monitoring`, `_internal`.

## Migration mapping

### In live DB but NOT in repo (~76 pre-baseline migrations)

All 76 migrations from `20260506184308` through `20260522201207` are applied on the live DB but have no corresponding files in `supabase/migrations/`. These form the foundational schema (org/event/ticket tables, auth wiring, RLS, RPCs, etc.).

### In repo but with different timestamps than live DB

The in-repo files use simplified round-number timestamps (e.g. `20260524170000`) while the live DB has precise timestamps from when `supabase db push` was run (e.g. `20260524185417`). They are matched by content/slug, not timestamp.

| Repo file | Live DB version | Matched by |
|---|---|---|
| `20260524170000_fix_public_event_cards_price_aggregation` | `20260524185417` | slug |
| `20260524180000_search_events_trust_signals` | `20260524192144` | slug |
| `20260524190000_harden_security_definer_surface` | `20260524193814` | slug |
| `20260524200000_event_readiness_v2` | `20260524200122` | slug |
| `20260525120000_pre_payment_validation` | `20260525160045` | slug |
| `20260525130000_my_tickets_status_columns` | `20260525161220` | slug |
| `20260528120000_finance_payout_workspace` | `20260528155051` | slug |
| `20260528160000_resale_waitlist_webhook_completion` | `20260528180109` | slug |
| `20260528180000_rls_initplan_optimization` | `20260528205103` | slug |
| `20260528200000_create_organization_rpc` | `20260529142435` | slug |
| `20260529120000_seed_payment_routing_and_flags` | `20260529055643` | slug |
| `20260530120000_anonymous_user_hygiene` | `20260530080541` | slug |
| `20260530130000_transfer_ownership` | `20260530084947` | slug |
| `20260530140000_ticket_availability_fn` | `20260530090509` | slug |
| `20260530150000_fn_scan_ticket` | `20260530093110` | slug |
| `20260531000000_fn_create_seat_hold` | `20260531174231` | slug |
| `20260619000000_fn_create_seat_hold_add_ticket_type` | `20260619192039` | slug |
| `20260620120000_webhooks_unique_provider_event` | `20260620160133` | slug |
| `20260620130000_security_advisor_remediation` | `20260620160131` | slug |
| `20260620170000_index_hygiene` | `20260621133806` | slug |
| `20260621090000_event_payment_providers` | `20260621133816` | slug |
| `20260621100000_drop_deltapay_provider` | `20260621133823` | slug |
| `20260621110000_bulk_checkin_and_comp_ticket_rpcs` | `20260621180049` | slug |
| `20260621120000_fn_toggle_favourite` | `20260621221624` | slug |
| `20260621130000_fn_request_transfer_by_email` | `20260621221904` | slug |
| `20260622100000_fn_duplicate_event` | `20260622045754` | slug |
| `20260622110000_event_status_paused_transition` | `20260622050824` | slug |
| `20260622120000_account_settings_rpcs` | `20260622053129` | slug |
| `20260622053806_email_attendee_broadcast_rate_limit` | `20260622053842` | slug |
| `20260622130000_push_subscriptions` | `20260622054533` | slug |
| `20260622200000_notification_mutes` | `20260622150716` | slug |
| `20260622210000_waitlist_queue_position` | `20260622151641` | slug |
| `20260622220000_anon_user_cleanup` | `20260622164918` | slug |

### In live DB but NOT in repo (post-baseline additions)

- `20260527163855_explicit_data_api_table_grants_20260527` — in live DB, no matching repo file.

### In repo but NOT in live DB

- `20260523152300_event_live_stats.sql` — repo-only, content superseded by live migrations
- `20260523154500_event_live_stats_maintenance.sql` — repo-only
- `20260523160000_fk_indexes.sql` — repo-only
- `20260523161000_rls_policy_cleanup.sql` — repo-only
- `20260523164000_public_event_cards.sql` — repo-only
- `20260528140000_fix_guestlist_issue_rpc.sql` — repo-only
- `20260621000001_finance_date_range.sql` — repo-only (added but not yet pushed to live)

### ⚠️ Security flag — unexpected `malicious` schema
A schema literally named **`malicious`** exists: owner `postgres`, **0 objects**, no ACL grants. Almost certainly a leftover from a SECURITY DEFINER `search_path` hardening test (the history contains `fix_function_search_paths` and `harden_security_definer_surface`). Not an active threat (empty), but the name is alarming and it should be confirmed-and-dropped under change control:
```sql
-- after confirming it is empty and unauthorized:
DROP SCHEMA IF EXISTS malicious RESTRICT;
```

## What was delivered here

1. **`supabase/schema/baseline_public_structure.sql`** — a comprehensive, verbatim-from-introspection capture of the **full public-schema**: extensions (noted), 21 enums, 61 tables, all PK/FK/UNIQUE constraints, 214 non-PK indexes, 25 views, 2 materialized views, 191 functions, 96 triggers, 179 RLS policies. It is a **reference** — not a standalone restorable migration (GRANTs and cross-schema objects are missing; see its header).
2. **This report.**

## What is NOT yet captured (and why)

A truly *restorable* baseline must also include: GRANTs to specific roles (authenticated, anon, service_role), cross-schema objects in `auth.*`, `app.*`, `storage.*`, `realtime.*`, `cron.*`, in dependency order. Hand-assembling GRANTs from MCP introspection cannot be **verified by restore** in this environment (no DB connection string, no Supabase CLI; CLAUDE.md forbids `psql` on the VPS). Shipping an unverified GRANTs dump would be false confidence.

## Canonical remediation (do this where the DB URL + CLI are available)

Run from a trusted machine with the project linked and the DB connection string in the environment:

```bash
# Option A — Supabase CLI (preferred; writes a timestamped schema migration)
supabase link --project-ref radsfmlsjznqvcpogluo
supabase db pull                     # captures the full schema as one migration
#   review the generated file, then commit it as the repo baseline.

# Option B — pg_dump (schema only)
pg_dump --schema-only --no-owner --no-privileges \
  --schema=public --schema=app \
  "$SUPABASE_DB_URL" > supabase/migrations/00000000000000_baseline.sql
```

### Verify the baseline (acceptance gate)
A fresh Postgres restored from `supabase/migrations/` must reproduce the current schema. Validate on a throwaway target before trusting it for DR:

```bash
supabase db reset            # against a local/branch DB — must apply cleanly
# or diff the restored schema against live:
supabase db diff             # expect: no differences
```

Once `supabase db pull` output is committed and `supabase db reset` applies cleanly, the structural reference file here can be deleted (the pulled migration supersedes it) and TICK-171's acceptance is met.

## 2026-07-23 reconciliation pass

A second sweep compared `supabase_migrations.schema_migrations` against
`supabase/migrations/` by slug and closed the **post-baseline** drift in the
DB→repo direction.

### Reconstructed into the repo (were applied on live DB, missing as files)

Rebuilt verbatim from the recorded `statements` column and committed with their
real live-DB versions so future diffs match by version:

- `20260625175324_profile_rpcs_revoke_anon`
- `20260627214828_guest_order_claim_fix_filter`
- `20260720170050_allow_organizer_owner_to_manage_org`
- `20260720170450_fix_event_draft_venue_and_slug_contract`
- `20260720173639_allow_authenticated_effective_role_lookup`
- `20260720175647_add_owner_safe_delete_organization`
- `20260722230501_remove_overbroad_claimed_account_policies`
- `20260722234445_harden_remaining_public_rpc_security`
- `20260722234546_remove_dangerous_client_table_privileges`
- `20260722234610_remove_remaining_unauthenticated_ticket_writes`

**`rate_limit_rollout` (`20260720161000`)** was applied on the live DB but its
`statements` array is empty (applied via a path that did not record SQL), so it
cannot be reconstructed verbatim. Its effect — rate-limiting the seat-hold and
related RPCs — is superseded by `20260722234445_harden_remaining_public_rpc_security`,
which redefines `fn_create_seat_hold` with `fn_rate_limit` guarding built in.
No repo file was fabricated for it; a `db reset` re-establishes the behaviour
through the later migration.

### Advisor warnings addressed this pass

- `auth_rls_initplan` (2 WARN) → **fixed** in `20260723100000_fix_rls_initplan_refunds_pos_shifts`
  (wrapped `auth.uid()` in `(select …)` on `refunds_insert` and `pos_shifts_select`).
- `unindexed_foreign_keys` (8 INFO) → **fixed** in `20260723101000_index_unindexed_foreign_keys`
  (device_setup_codes ×3, orders ×1, pos_shifts ×4). These now surface transiently
  as `unused_index` until query traffic exercises them — expected for FK-covering indexes.

### Still pending — repo→DB (migrations in repo, objects absent on live DB)

These create **new, un-launched feature schema** and touch the live scanner data
path, so they are held for an explicit apply + verify decision (TICK-311, TICK-348):

- TapBand stack (7): `tapband_telemetry_alerts`, `tapband_feature_config`,
  `tapband_config_outlet_scope`, `tapband_credential_schema`, `tapband_lifecycle_rpcs`,
  `tapband_scanner_checkin`, `tapband_multiple_entitlement_guard`. App code
  (super-admin console, `app/api/scanner/validate`, cron alerts, telemetry/config
  routes) already references tables like `tapband_feature_configs` that do not yet
  exist on the DB.
- `20260723090000_pos_receipts_transactions` — creates `pos_receipts` /
  `pos_transactions`; no app code references them yet.

Known repo-only/superseded files (unchanged from the 2026-06-23 analysis above)
remain intentionally unapplied: `event_live_stats`, `event_live_stats_maintenance`,
`fk_indexes`, `rls_policy_cleanup`, `public_event_cards`, `fix_guestlist_issue_rpc`,
`finance_date_range`.

## Status

- ✅ Post-baseline DB→repo drift closed (10 files reconstructed; `rate_limit_rollout` documented).
- ✅ Actionable advisor warnings fixed (RLS initplan ×2, unindexed FKs ×8).
- ⏳ TapBand + pos_receipts stacks pending an apply/verify decision (see above).
- ✅ Drift quantified (116 applied vs 40 in-repo) and root cause identified.
- ✅ Full live-schema inventory captured; `malicious` schema flagged.
- ✅ Comprehensive public-schema reference committed (enums + tables + constraints + indexes + views + matviews + 191 functions + 96 triggers + 179 RLS policies).
- ✅ Approach decided: **`supabase db pull`** (MCP introspection cannot produce a *verifiable* multi-schema restorable baseline with GRANTs).
- ⏳ **Remaining:** run `supabase db pull` + `supabase db reset` verification in a CLI/DB-connected environment, commit the result as the repo baseline. This is the only step that closes the acceptance criterion and it requires DB-connection access not present in the current session.

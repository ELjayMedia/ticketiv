# Supabase Migration Reconciliation Report

**Date:** 2026-09-05
**Branch:** `chore/supabase-migration-reconciliation`
**Production Project:** `radsfmlsjznqvcpogluo`
**CLI Version:** supabase@2.116.0 (via npx)

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Total local migration files | 377 | — |
| Applied (local + remote timestamps match) | 259 | ✅ In sync |
| Local only (not in remote) | 118 | ⏳ Pending |
| Remote only (not in local) | 0 | ✅ None |
| **Stubs needing SQL recovery** | **193** | 🔴 Critical |

---

## Critical Finding: 193 Empty Stubs

The local migration directory contains **193 empty stub files** (named `*_legacy_migration.sql`) that contain only 2 comment lines. These stubs have timestamps that match production records, but they do NOT contain the actual DDL that was executed in production.

The Supabase CLI considers these "applied" because timestamps match, but the local files are empty placeholders. This means:

1. The repository cannot reconstruct the database schema from migrations
2. Any new developer or CI system running `supabase db reset` would get an empty database
3. The migration history is effectively broken for 193 out of 259 applied migrations

### Affected Files

All 193 stubs follow the pattern: `YYYYMMDDHHMMSS_legacy_migration.sql`

**Range:** `20260506184308` to `20260820040326`

---

## Applied Migrations (259 total)

### Real SQL Files (66)

These files contain actual DDL and match production timestamps:

| Timestamp | Name |
|-----------|------|
| 20260523152300 | event_live_stats |
| 20260523154500 | event_live_stats_maintenance |
| 20260523160000 | fk_indexes |
| 20260523161000 | rls_policy_cleanup |
| 20260523164000 | public_event_cards |
| 20260524170000 | fix_public_event_cards_price_aggregation |
| 20260524180000 | search_events_trust_signals |
| 20260524190000 | harden_security_definer_surface |
| 20260524200000 | event_readiness_v2 |
| 20260525120000 | pre_payment_validation |
| 20260525130000 | my_tickets_status_columns |
| 20260528120000 | finance_payout_workspace |
| 20260528140000 | fix_guestlist_issue_rpc |
| 20260528160000 | resale_waitlist_webhook_completion |
| 20260528180000 | rls_initplan_optimization |
| 20260528200000 | create_organization_rpc |
| 20260529120000 | seed_payment_routing_and_flags |
| 20260530120000 | anonymous_user_hygiene |
| 20260530130000 | transfer_ownership |
| 20260530140000 | ticket_availability_fn |
| 20260530150000 | fn_scan_ticket |
| 20260531000000 | fn_create_seat_hold |
| 20260619000000 | fn_create_seat_hold_add_ticket_type |
| 20260620120000 | webhooks_unique_provider_event |
| 20260620130000 | security_advisor_remediation |
| 20260620170000 | index_hygiene |
| 20260621000001 | finance_date_range |
| 20260621090000 | event_payment_providers |
| 20260621100000 | drop_deltapay_provider |
| 20260621110000 | bulk_checkin_and_comp_ticket_rpcs |
| 20260621120000 | fn_toggle_favourite |
| 20260621130000 | fn_request_transfer_by_email |
| 20260622053806 | email_attendee_broadcast_rate_limit |
| 20260622100000 | fn_duplicate_event |
| 20260622110000 | event_status_paused_transition |
| 20260622120000 | account_settings_rpcs |
| 20260622130000 | push_subscriptions |
| 20260622200000 | notification_mutes |
| 20260622210000 | waitlist_queue_position |
| 20260622220000 | anon_user_cleanup |
| 20260623120000 | fn_seller_completed_resales |
| 20260625120000 | payment_method_rpcs |
| 20260625130000 | profile_locale |
| 20260625140000 | profile_avatar |
| 20260625150000 | fix_current_user_org_ids |
| 20260625160000 | remove_dead_jwt_role_clauses |
| 20260625170000 | effective_roles_resolver |
| 20260625175324 | profile_rpcs_revoke_anon |
| 20260625180000 | retire_profiles_role |
| 20260627100000 | membership_invites |
| 20260627190000 | finance_role_gating |
| 20260627214828 | guest_order_claim_fix_filter |
| 20260628100000 | guest_order_claim |
| 20260628110000 | talent_self_create |
| 20260628120000 | rls_canonical_helpers |
| 20260628130000 | rls_canonical_money_tables |
| 20260628140000 | rls_canonical_org_event_core |
| 20260628150000 | rls_canonical_catalog_seating |
| 20260628160000 | rls_canonical_orderitems_guestlist |
| 20260628170000 | rls_canonical_platform_admin |
| 20260628180000 | rls_canonical_remaining_policies |
| 20260628190000 | drop_legacy_rls_helpers |

### Empty Stubs (193) — NEED SQL RECOVERY

These files are empty placeholders but production has real SQL for them. See `docs/migration-stubs-list.txt` for complete list.

---

## Local-Only Migrations (118)

These files exist locally but NOT in production. They are new migrations pending deployment.

| Timestamp | Name | Status |
|-----------|------|--------|
| 20260714190000 | device_setup_codes | ⏳ Pending |
| 20260714203000 | tapband_telemetry_alerts | ⏳ Pending |
| 20260715071500 | tapband_feature_config | ⏳ Pending |
| 20260715124500 | tapband_config_outlet_scope | ⏳ Pending |
| 20260715170000 | tapband_credential_schema | ⏳ Pending |
| 20260715183000 | tapband_lifecycle_rpcs | ⏳ Pending |
| 20260715205000 | tapband_scanner_checkin | ⏳ Pending |
| 20260716220000 | tapband_multiple_entitlement_guard | ⏳ Pending |
| 20260717095820 | settlement_timing_guardrail | ⏳ Pending |
| 20260717193000 | account_deletion_rpcs | ⏳ Pending |
| 20260718150000 | restore_legacy_auth_helper_shims | ⏳ Pending |
| 20260719163000 | promo_preview_rpc | ⏳ Pending |
| 20260719191500 | restore_anon_ticket_remaining | ⏳ Pending |
| 20260720120000 | fix_order_completion_trigger_stack | ⏳ Pending |
| 20260720121000 | settlement_only_ledger | ⏳ Pending |
| 20260720122000 | cleanup_fixture_order_d8b15ab5 | ⏳ Pending |
| 20260720140000 | grant_create_event_draft_authenticated | ⏳ Pending |
| 20260720141000 | fix_dropped_is_global_admin_refs | ⏳ Pending |
| 20260720142000 | restore_current_user_uid_shim | ⏳ Pending |
| 20260720143000 | fix_is_event_public_now_recursion | ⏳ Pending |
| 20260720144000 | restore_authz_helper_grants | ⏳ Pending |
| 20260720150000 | fn_scan_ticket_caller_guard | ⏳ Pending |
| 20260720160000 | rate_limit_primitive | ⏳ Pending |
| 20260720170050 | allow_organizer_owner_to_manage_org | ⏳ Pending |
| 20260720170450 | fix_event_draft_venue_and_slug_contract | ⏳ Pending |
| 20260720173639 | allow_authenticated_effective_role_lookup | ⏳ Pending |
| 20260720175647 | add_owner_safe_delete_organization | ⏳ Pending |
| 20260721163000 | claimed_account_guard | ⏳ Pending |
| 20260721190000 | protect_claimed_account_rpcs | ⏳ Pending |
| 20260721210000 | protect_claimed_account_operations | ⏳ Pending |
| 20260721213000 | finalize_claimed_account_controls | ⏳ Pending |
| 20260722080000 | pos_shifts_reconciliation | ⏳ Pending |
| 20260722230501 | remove_overbroad_claimed_account_policies | ⏳ Pending |
| 20260722234445 | harden_remaining_public_rpc_security | ⏳ Pending |
| 20260722234546 | remove_dangerous_client_table_privileges | ⏳ Pending |
| 20260722234610 | remove_remaining_unauthenticated_ticket_writes | ⏳ Pending |
| 20260723090000 | pos_receipts_transactions | ⏳ Pending |
| 20260723100000 | fix_rls_initplan_refunds_pos_shifts | ⏳ Pending |
| 20260723101000 | index_unindexed_foreign_keys | ⏳ Pending |
| 20260723110000 | fix_tapband_rpc_execute_grants | ⏳ Pending |
| 20260724120000 | unblock_scanner_checkin_path | ⏳ Pending |
| 20260724130000 | remove_broken_mint_on_payment_trigger | ⏳ Pending |
| 20260724140000 | dedupe_updated_at_triggers | ⏳ Pending |
| 20260724150000 | tick336_canonical_order_money_function | ⏳ Pending |
| 20260724160000 | tick336_wire_canonical_calculator | ⏳ Pending |
| 20260725120000 | cleanup_seeded_orgs_for_uat | ⏳ Pending |
| 20260725130000 | fix_event_live_stats_recalc_on_event_delete | ⏳ Pending |
| 20260725140000 | close_anon_reprice_rpc_and_search_path | ⏳ Pending |
| 20260725160000 | lock_client_callable_completion_rpcs | ⏳ Pending |
| 20260725170000 | rpc_permission_matrix_exporter | ⏳ Pending |
| 20260725180000 | transactional_payment_completion | ⏳ Pending |
| 20260725190000 | align_notification_types_with_application | ⏳ Pending |
| 20260725200000 | seat_hold_expiry_and_oversell_recovery | ⏳ Pending |
| 20260725210000 | fix_refund_execution_and_chargeback_clawback | ⏳ Pending |
| 20260725220000 | fix_app_role_text_comparison | ⏳ Pending |
| 20260725230000 | uat_fixtures | ⏳ Pending |
| 20260726120000 | rate_limit_rollout_checkout | ⏳ Pending |
| 20260726120500 | rate_limit_edge_wrapper | ⏳ Pending |
| 20260726121000 | rate_limit_rollout_org_transfer_resale | ⏳ Pending |
| 20260726121500 | rate_limit_grants_hardening | ⏳ Pending |
| 20260727171416 | capture_live_uat_rpc_helpers | ⏳ Pending |
| 20260727230509 | fix_pos_shift_audit_actions | ⏳ Pending |
| 20260728120000 | ops_reconciliation_counts | ⏳ Pending |
| 20260728130000 | audit_log_retention | ⏳ Pending |
| 20260730093831 | create_event_covers_bucket | ⏳ Pending |
| 20260730200000 | ops_counts_exclude_in_app_notifications | ⏳ Pending |
| 20260730210000 | provider_settlements | ⏳ Pending |
| 20260730220000 | scans_retention | ⏳ Pending |
| 20260730230000 | disputes | ⏳ Pending |
| 20260731181047 | organizer_signup_profile | ⏳ Pending |
| 20260801154933 | fix_composite_row_rpc_reads | ⏳ Pending |
| 20260801164717 | fix_paystack_currency_routing | ⏳ Pending |
| 20260801190015 | fix_absorbed_processor_ledger | ⏳ Pending |
| 20260801192157 | align_payment_outbox_topics | ⏳ Pending |
| 20260801194213 | restore_external_only_payment_outbox | ⏳ Pending |
| 20260802084804 | remove_duplicate_scans_archive_event_index | ⏳ Pending |
| 20260804061003 | ops_alerts_pg_cron_schedule | ⏳ Pending |
| 20260807175655 | route_szl_to_momo | ⏳ Pending |
| 20260808112029 | settlement_ingest_pg_cron_schedule | ⏳ Pending |
| 20260808125500 | default_paystack_ticket_currency_to_zar | ⏳ Pending |
| 20260809022500 | canonical_profile_identity_and_backfill | ⏳ Pending |
| 20260809040000 | add_public_profile_lookup | ⏳ Pending |
| 20260809083000 | align_ticket_purchase_limits | ⏳ Pending |
| 20260809145448 | enable_attendee_check_in_realtime | ⏳ Pending |
| 20260809174000 | fix_atomic_scanner_checkin | ⏳ Pending |
| 20260809190000 | separate_private_profile_data | ⏳ Pending |
| 20260809203000 | event_reminder_scheduling | ⏳ Pending |
| 20260811111500 | refund_request_idempotency | ⏳ Pending |
| 20260811114500 | record_duplicate_scan_attempts | ⏳ Pending |
| 20260811123000 | refund_reconciliation_pg_cron | ⏳ Pending |
| 20260811133000 | finance_reconciliation_issue_queue | ⏳ Pending |
| 20260811134500 | finance_reconciliation_runbook_path | ⏳ Pending |
| 20260811135000 | reconciliation_status_rpc_grants | ⏳ Pending |
| 20260811190000 | native_push_devices | ⏳ Pending |
| 20260811213000 | independent_uptime_watchdog | ⏳ Pending |
| 20260812033500 | fix_uat_fixture_currency | ⏳ Pending |
| 20260812180000 | pricing_plan_effective_dating | ⏳ Pending |
| 20260812183000 | pricing_plan_admin_version_rpc | ⏳ Pending |
| 20260813082432 | safe_payout_account_reencryption | ⏳ Pending |
| 20260813131931 | refund_reconciliation_cron_delivery_audit | ⏳ Pending |
| 20260813150000 | finance_reconciliation_operator_actions | ⏳ Pending |
| 20260818182500 | add_deltapay_payment_provider | ⏳ Pending |
| 20260820040200 | tick386_contact_discovery | ⏳ Pending |
| 20260820043000 | tick386_private_contact_identity | ⏳ Pending |
| 20260905010000 | tick395_add_deltapay_provider_settings | ⏳ Pending |
| 20260905020000 | tick396_397_provider_policy_hierarchy | ⏳ Pending |

---

## Known Timestamp Mismatches

Production contains these migrations that local files have with different timestamps:

| Production Timestamp | Production Name | Local Timestamp | Local Name |
|---------------------|-----------------|-----------------|------------|
| 20260819014801 | restrict_internal_pricing_helper_execution | (missing) | — |
| 20260820035650 | tick386_contact_discovery | 20260820040200 | tick386_contact_discovery |
| 20260820040326 | tick386_private_contact_identity | 20260820043000 | tick386_private_contact_identity |

**Action required:** Investigate and reconcile these mismatches.

---

## Next Steps

1. ✅ Phase 1: CLI access configured
2. ✅ Phase 2: State preserved (backup at `/tmp/ticketiv-migrations-before-reconciliation`)
3. ✅ Phase 3: Local/remote comparison complete
4. ⏳ Phase 4: Investigate known mismatches
5. ⏳ Phase 5: Recover SQL for 193 stubs
6. ⏳ Phase 6: Validate reconstructability
7. ⏳ Phase 7: Repair migration history
8. ⏳ Phase 8: Dry-run new migrations
9. ⏳ Phase 9: Validate payment migrations
10. ⏳ Phase 10: Production deployment

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| 193 empty stubs | 🔴 High | Recover SQL from production before any migration operations |
| Timestamp mismatches | 🟡 Medium | Investigate and align before pushing |
| 118 unapplied migrations | 🟡 Medium | Validate locally before production push |
| Production data loss | 🔴 Critical | No destructive commands; backup before any changes |

---

## Files Generated

- `docs/migration-list-raw.json` — Raw CLI migration list output
- `docs/migration-analysis.json` — Structured analysis
- `docs/supabase-migration-reconciliation.md` — This report

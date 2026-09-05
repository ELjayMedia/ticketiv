# Local-Only Migration Audit — In Progress

**Date:** 2026-09-05

---

## Summary

| Category | Count |
|----------|-------|
| Total local-only migrations | 118 |
| A - Historical (timestamp <= 20260821202257) | 116 |
| B - Post-head (timestamp > 20260821202257) | 2 |

---

## Post-Head Local-Only (Deployment Candidates)

| Timestamp | Filename | Commit | Jira |
|-----------|----------|--------|------|
| 20260905010000 | tick395_add_deltapay_provider_settings.sql | (new) | TICK-395 |
| 20260905020000 | tick396_397_provider_policy_hierarchy.sql | (new) | TICK-396/397 |

---

## Historical Local-Only (Need Investigation)

116 migrations with timestamps before production head. These require investigation to determine:
- Whether DDL was manually applied via SQL Editor
- Whether they were superseded by later work
- Whether they were abandoned

### Git Commit Analysis

All 116 historical local-only migrations have Git commits. Sample:

| Timestamp | Filename | Commit | Jira |
|-----------|----------|--------|------|
| 20260523152300 | event_live_stats.sql | c80566b feat(db): add event_live_stats read model | — |
| 20260523154500 | event_live_stats_maintenance.sql | 723ed09 feat(db): maintain event_live_stats counters | — |
| 20260818182500 | add_deltapay_payment_provider.sql | e087589 feat(payments): allow DeltaPay provider settings | — |
| 20260820040200 | tick386_contact_discovery.sql | e84bdbb feat(friends): add privacy-safe contact matching | TICK-386 |
| 20260820043000 | tick386_private_contact_identity.sql | 765ccca fix(privacy): move contact identity out of public profiles | TICK-386 |

---

## Next Steps

1. Complete Phase 6A: Full classification of all 118 migrations
2. Phase 6D-6G: Reconstruction tests and drift investigation
3. Phase 7-9: Conditional repair, dry run, and deployment

---

## Files Generated

- `docs/supabase-production-applied-migrations.txt` — 259 applied versions
- `.github/workflows/supabase-migration-reconstruction.yml` — CI workflow
- `docs/supabase-migration-reconciliation.md` — Full reconciliation report

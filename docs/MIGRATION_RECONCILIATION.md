# Migration Reconciliation (TICK-171)

**Snapshot:** 2026-06-20 · live project `radsfmlsjznqvcpogluo` · read-only introspection via Supabase MCP. **No changes were applied to the live DB.**

## The drift

| | Count | Earliest |
|---|---|---|
| Migrations applied on the live DB (`supabase_migrations.schema_migrations`) | **108** | `20260506184308` |
| Migration files in `supabase/migrations/` | **25** | `20260523152300` |

The repo's earliest migration is `20260523`. **Everything before that — the entire base schema, enum types, RLS policies, and the bulk of the SECURITY DEFINER RPCs (~52 migrations from `20260506`–`20260522`) — exists only in the database.** The repo cannot rebuild the DB from scratch: this is a disaster-recovery and environment-parity failure (you cannot stand up a faithful staging/local copy from `supabase/migrations/` alone).

The in-repo files also do **not** correspond 1:1 to rows in the migration-history table (different timestamps/slugs), so they are a partial, divergent slice rather than the tail of the real history.

## Live schema inventory (what a faithful baseline must reproduce)

- **62** base tables (`public`)
- **21** enum types
- **174** functions in `public` + **28** in `app` (SECURITY DEFINER RPCs, triggers, helpers like `app.normalize_ticket_code`, `fn_array_has_dups`)
- **27** views + **2** materialized views (`mv_event_sales`, `mv_revenue_breakdown`)
- **177** RLS policies
- **65** triggers
- **11** extensions: `plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault, hypopg, pg_cron, index_advisor, btree_gist, pg_trgm, pg_net`
- Cross-schema dependencies on Supabase-managed schemas: `auth` (all `*_fkey` → `auth.users`), `storage`, `realtime`, `cron`, `net`, `vault`, plus project schemas `app`, `monitoring`, `_internal`.

### ⚠️ Security flag — unexpected `malicious` schema
A schema literally named **`malicious`** exists: owner `postgres`, **0 objects**, no ACL grants. Almost certainly a leftover from a SECURITY DEFINER `search_path` hardening test (the history contains `fix_function_search_paths` and `harden_security_definer_surface`). Not an active threat (empty), but the name is alarming and it should be confirmed-and-dropped under change control:
```sql
-- after confirming it is empty and unauthorized:
DROP SCHEMA IF EXISTS malicious RESTRICT;
```

## What was delivered here

1. **`supabase/schema/baseline_public_structure.sql`** — a reviewed, verbatim-from-introspection capture of the **public-schema structure**: extensions (noted), 21 enums, 62 tables, all PK/FK/UNIQUE/CHECK constraints, and all non-constraint indexes. It is a **reference**, not a standalone restorable migration (see its header).
2. **This report.**

## What is NOT yet captured (and why)

A truly *restorable* baseline must also include the 202 functions, 27 views, 2 matviews, 177 RLS policies, 65 triggers, GRANTs, and the cross-schema objects above, in dependency order. Hand-assembling that from MCP introspection cannot be **verified by restore** in this environment (offline, no DB connection string, no Supabase CLI; CLAUDE.md forbids `psql` on the VPS). Shipping an unverified 200+-object dump and calling it a DR baseline would be false confidence.

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

## Status

- ✅ Drift quantified (108 applied vs 25 in-repo) and root cause identified.
- ✅ Full live-schema inventory captured; `malicious` schema flagged.
- ✅ Public-schema structural reference committed.
- ✅ Approach decided: **`supabase db pull`** (MCP introspection cannot produce a *verifiable* multi-schema restorable baseline).
- ⏳ **Remaining:** run `supabase db pull` + `supabase db reset` verification in a CLI/DB-connected environment, commit the result as the repo baseline. This is the only step that closes the acceptance criterion and it requires DB-connection access not present in the current session.

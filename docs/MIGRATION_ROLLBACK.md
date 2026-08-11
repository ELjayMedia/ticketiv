# Shared-environment migration and rollback procedure

Ticketiv currently uses one Supabase project for development, UAT and production (ADR 0002). There is no disposable database target. Every migration therefore has production blast radius and must be treated as a production change even when it originates on a feature branch.

This procedure is the compensating control for TICK-342. It does not make destructive database changes safe; it makes the decision, verification and recovery path explicit.

## 1. Classify the change before writing SQL

Prefer **expand → migrate → contract**:

1. add a compatible column/table/function/index;
2. deploy code that can read both old and new shapes;
3. backfill in bounded batches if needed;
4. verify production reads/writes and reconciliation;
5. remove the old shape only in a later migration after it is provably unused.

A migration is **high risk** if it does any of the following:

- drops or renames a table, column, enum value, constraint, function, policy or grant used by current code;
- rewrites a large populated table;
- changes payment, refund, payout, ticket ownership or scanner state in place;
- disables RLS, triggers, constraints or audit paths, even temporarily;
- deletes rows by broad negative predicates (`not in`, `<>`, missing marker) rather than explicit fixture identity;
- changes a SECURITY DEFINER function or its EXECUTE grants;
- changes data needed to decrypt, reconcile or audit money movement.

High-risk work requires a separate reviewed migration and an explicit recovery plan before it is applied. If the recovery plan is “restore the database”, stop: the backup/restore drill under TICK-343 must be proven first or the change must be redesigned to be additive.

## 2. Pre-apply gate

Before applying a migration to the shared project, record the following on the owning PR/Jira ticket:

- migration filename/version and intended schema/data effect;
- exact tables/functions/policies/grants touched;
- whether existing application code remains compatible while the migration is live;
- expected row count affected by any UPDATE/DELETE/backfill;
- rollback/forward-fix statement;
- whether the change touches money, tickets, auth, RLS, scanner or secrets;
- the commit SHA that contains the migration.

Then require these checks:

```text
[ ] PR release gate is green
[ ] current production /api/health is healthy
[ ] current production /api/health/supabase is healthy
[ ] finance reconciliation has no unexplained critical discrepancy
[ ] any destructive DML targets explicit IDs or a unique UAT marker
[ ] SECURITY DEFINER changes include explicit search_path + grant review
[ ] a code rollback is compatible with the post-migration schema
```

If live events are actively scanning or a payment incident is open, defer non-emergency schema work. Do not stack an unrelated migration on top of an unresolved production incident.

## 3. Migration design rules

### Data changes

- UAT cleanup must target the exact `uat-...` marker or the dedicated fixture IDs/functions. Never infer “test data” from absence of a production marker.
- Prefer bounded updates with a predicate that can be counted before execution.
- Record before/after counts for money or ticket-state changes.
- Do not hand-edit financial state to make reconciliation green; use the normal domain/RPC path or a reviewed corrective migration with audit evidence.

### Functions and permissions

- SECURITY DEFINER functions must pin a safe `search_path`.
- Revoke broad EXECUTE first, then grant only the documented caller classes.
- Update the committed RPC permission matrix/allowlist in the same change when the exposed surface changes.
- Run the live permission drift check after application.

### Long-running schema changes

- Avoid table rewrites on hot paths during an event or active checkout window.
- Add indexes and constraints in the least blocking form supported by the migration mechanism.
- For a potentially expensive statement, establish expected table size/query impact first; do not learn its runtime against production by trial.

## 4. Apply exactly once

The migration file in `supabase/migrations/` is the source of truth. Apply the reviewed migration through the normal Supabase migration mechanism; do not paste a modified variant into the SQL editor and then commit a different file later.

Immediately record the applied version and timestamp on the owning ticket/PR. If the database already contains an equivalent hotfix, reconcile migration history before doing more schema work rather than silently applying a second variant.

## 5. Post-apply verification

Run the smallest relevant set immediately, then the full release evidence where the change warrants it:

1. `scripts/smoke-deployment.sh https://ticketiv.app` for application + Supabase reachability;
2. the owning feature/UAT check;
3. `scripts/ops-reconciliation.sql` for money/order/ticket invariants when the change can affect them;
4. `pnpm check:permissions` for function/grant/RLS-adjacent changes;
5. inspect Vercel/Sentry/runtime errors for a new cluster tied to the deployment;
6. verify the expected row/schema count and no unexpected rows changed.

Do not call a migration complete merely because PostgreSQL returned success.

## 6. Rollback decision tree

### A. Application regression, schema is backward compatible

Prefer **code rollback**. Revert/promote the last known-good application deployment while leaving the additive schema in place. This is the safest recovery path and the main reason migrations should be backward compatible.

### B. Migration introduced a bad additive object but no data was lost

Prefer a **forward-fix migration** that disables/removes only the bad object after application compatibility is restored. Keep the original migration in history; do not rewrite an already-applied migration file.

### C. Data was changed incorrectly but the original values are derivable

Create a reviewed corrective migration using explicit IDs/evidence. Capture before/after counts and run reconciliation. Do not run an ad-hoc UPDATE and leave migration history unable to reproduce production.

### D. Destructive change caused unrecoverable data loss/corruption

Stop writes where necessary and follow `docs/OPERATIONS.md` backup/restore procedure. This is an incident, not an ordinary migration rollback. Preserve logs/audit evidence, identify the restore point, and do not resume money movement until reconciliation and security checks pass.

## 7. Emergency production hotfixes

A hotfix can shorten review time; it cannot remove reproducibility requirements.

If an emergency SQL change is unavoidable:

1. capture the exact SQL and reason before execution;
2. keep the blast radius explicit and minimal;
3. verify the outcome immediately;
4. create the matching idempotent migration in the same incident window;
5. reconcile live migration history and committed permission metadata;
6. attach evidence to the incident/Jira ticket.

“Fixed directly in production” is not a terminal state.

## 8. Evidence template

Use this on migration-bearing launch PRs:

```text
Migration: YYYYMMDDHHMMSS_description.sql
Risk: low | medium | high
Touches: <tables/functions/policies>
Expected affected rows: <count / none>
Backward-compatible with previous app: yes/no
Rollback mode: code rollback | forward-fix | corrective migration | restore
Preflight: release gate / health / reconciliation / permission status
Applied at: <UTC timestamp>
Post-apply: smoke / feature proof / reconciliation / permission proof
Unexpected findings: <none or linked ticket>
```

## 9. When to stop relying on this control

This process compensates for the single-project constraint; it is not equivalent to environment isolation. Revisit ADR 0002 when real customer money is flowing, multiple organizers depend on Ticketiv, or any incident shows that the shared blast radius is materially more expensive than a separate production project.

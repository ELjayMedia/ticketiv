# Production Readiness

**Audit:** June 2026 · **Epic:** [TICK-170](https://ticketiv.atlassian.net/browse/TICK-170) — Production Readiness

This document tracks the phased plan that takes Ticketiv from its current
state to production-grade. It is the index for epic TICK-170 and its child
tasks TICK-171 … TICK-181.

## Context

The June 2026 audit found the platform functionally complete but carrying
operational debt that blocks a confident production launch: CI never ran, the
repo carried a stray npm lockfile alongside `pnpm-lock.yaml`, there was no
error monitoring, `typescript.ignoreBuildErrors` was masking type errors on
the money paths, and the critical purchase/payout flows had no automated test
coverage. The plan below is sequenced to stop active risk first, then harden
security, then lock down the money paths, then build out market rails, and
finally round out operations.

## Phased plan

### P0 — Stop the bleeding
Get a safety net under the repo so regressions are caught and basic hygiene is
restored.

| Task | Summary |
|---|---|
| **TICK-171** | P0 tracking task — stop-the-bleeding rollup. |
| **TICK-172** | CI + repo hygiene: GitHub Actions pipeline (lint, typecheck, build), delete the npm `package-lock.json`, prune dead legacy Pages Router routes, add this document. |
| **TICK-173** | Error monitoring: wire Sentry (server/client/edge), gated behind `SENTRY_DSN` so it is a clean no-op when unset; capture in the Paystack webhook and payment completion. |

### P1 — Security
Close exposure on auth, RLS, and secret handling before wider exposure.

| Task | Summary |
|---|---|
| **TICK-174** | Security hardening pass — RLS coverage, `(select auth.uid())` InitPlan pattern, secret/`details_encrypted` exposure review, webhook signature verification. |

### P2 — Type safety & tests on the money paths
Make the money paths trustworthy: turn the type checker back on and cover the
critical flows with tests.

| Task | Summary |
|---|---|
| **TICK-175** | Flip `tsc --noEmit` to **blocking** in CI and remove `typescript.ignoreBuildErrors`; burn down the type errors on orders/pricing/payments. |
| **TICK-176** | Automated tests for the purchase, payout, and refund/ledger paths. |
| **TICK-177** | Reconciliation / ledger-integrity checks. |

### P3 — Market rails
Build out the secondary-market and growth surfaces on top of a trustworthy core.

| Task | Summary |
|---|---|
| **TICK-178** | Resale / waitlist marketplace hardening. |
| **TICK-179** | Payout queue & finance ops rails. |

### P4 — Operations
Round out day-2 operations: observability, runbooks, and on-call readiness.

| Task | Summary |
|---|---|
| **TICK-180** | Observability dashboards, alerting, and runbooks. |
| **TICK-181** | Release process, rollback, and on-call readiness. |

## Status legend

Each task tracks its own status in Jira. This file is the high-level map; refer
to the linked issues for acceptance criteria and current progress.

# Security Advisor Remediation (TICK-176)

Source: Supabase `get_advisors(security)` on project `radsfmlsjznqvcpogluo`, 2026-06-20.
Migration: `supabase/migrations/20260620130000_security_advisor_remediation.sql`.

> Status (2026-06-20): the SAFE SUBSET is **applied** to the live DB and verified —
> `v_my_tickets` + `admin_event_readiness` now `security_invoker`, and `anon`
> EXECUTE revoked on `fn_scan_ticket` + `fn_complete_transfer`. The materialized-view
> SELECT revoke is **deferred** (see finding #3) because organizer analytics reads
> those views through the authenticated client — revoking would break it until the
> reads move to the service-role admin client.

## Findings & actions

| # | Advisor finding | Level | Action |
|---|---|---|---|
| 1 | `v_my_tickets`, `admin_event_readiness` are SECURITY DEFINER views | ERROR | `ALTER VIEW ... SET (security_invoker = on)` so the caller's RLS applies |
| 2 | `fn_scan_ticket` executable by `anon` | WARN | **Revoke** anon+public. Gate scanning is staff/device-only |
| 2 | `fn_complete_transfer` executable by `anon` | WARN | **Revoke** anon+public. Takes only a transfer id → anon could complete arbitrary transfers |
| 2 | `fn_ticket_type_remaining` executable by `anon` | WARN | **Keep.** Read-only availability count for public event pages |
| 2 | `fn_create_seat_hold` (both overloads) executable by `anon` | WARN | **Keep.** Guest checkout creates holds before auth. Abuse mitigated by rate limiting (TICK-177) |
| 3 | `mv_event_sales`, `mv_revenue_breakdown` selectable by anon/authenticated | WARN | **Revoke** SELECT from anon + authenticated (revenue exposure) |
| 4 | `pg_trgm` in `public` schema | WARN | **Deferred — manual.** Relocating drops dependent trigram indexes; do as a planned change |
| 5 | Leaked-password protection disabled | WARN | **Config, not SQL.** Enable HIBP in Supabase Auth settings |
| 6 | 63 "Anonymous Access Policies" | WARN | **Audit task.** Mostly intentional public-discovery reads; confirm none leak protected columns |

## Keep/revoke decision rationale

`anon` EXECUTE was revoked only where a function performs a privileged or
unbounded write that a logged-out user should never trigger directly
(`fn_scan_ticket`, `fn_complete_transfer`). Functions that back guest discovery
and guest checkout (`fn_ticket_type_remaining`, `fn_create_seat_hold`) keep anon
access because the guest flow depends on them; they are bounded reads/holds and
are protected against abuse by the rate limiter rather than by removing access.

## Applying

```
# review first
supabase db diff   # or apply via Supabase MCP apply_migration after sign-off
```

After applying, re-run `get_advisors(security)` and confirm the 2 ERRORs and the
revoked anon EXECUTE / mat-view grants are cleared.

---

# Follow-up audit, 2026-07-25

Closes finding #6 above (now 78 tables, not 63) and adds the first full pass over
the SECURITY DEFINER RPC surface. Source: `get_advisors(security)` on the same
project, 149 findings after the migrations below.

Migrations: `20260725140000_close_anon_reprice_rpc_and_search_path.sql`.
Test: `supabase/tests/anon_reprice_rpc_guard.sql`.

## One real vulnerability found and fixed

`fn_apply_pricing_to_order(p_order_id uuid)` — a reprice-trigger helper whose
whole body is `update public.orders set totals_computed_at = now() where id =
p_order_id`. It is SECURITY DEFINER (bypasses RLS) and both `anon` and
`authenticated` held EXECUTE, so PostgREST published it at
`/rest/v1/rpc/fn_apply_pricing_to_order`. Any caller could pass any order id and
write to that row.

Confirmed against the live DB in a rolled-back transaction: as `anon`,
`exists(select 1 from orders where id = X)` returned false — RLS hid the order —
yet the RPC was accepted and `totals_computed_at` moved from null to now(). An
unauthenticated caller could write to a row it could not read. `totals_computed_at`
is the freshness marker for order money and the update re-fires the BEFORE-trigger
calculator, so this also allowed forcing a reprice of another buyer's order.

This is the class TICK-36 (`20260524190000_harden_security_definer_surface.sql`)
was written to lock down as "trigger-only … no public RPC entry point is needed",
but it was never listed there. Later migrations re-created it with `create or
replace`, which preserves the ACL, so the original EXECUTE-to-PUBLIC grant
persisted.

Fixed with a `pg_trigger_depth()` guard, **not** a revoke: the three callers
(`trg_reprice_order_after_items`, `trg_reprice_order_after_adjustments`,
`trg_reprice_order_on_status`) are all SECURITY INVOKER, so they run as the buyer
— including an anonymous guest — and a revoke would break checkout. It still
appears under `anon_security_definer_function_executable`, because that lint reads
the grant and cannot see the runtime guard.

## The other 65 authenticated SECURITY DEFINER functions: no findings

Method: for each flagged function, walk its body plus the body of any
`*_unchecked` function it delegates to, and look for an authorization predicate
using the project's actual helper vocabulary — `is_org_admin`, `can_manage_org`,
`can_manage_event`, `is_org_manager`, `is_org_member_of`, `is_org_owner`,
`is_org_staff`, `is_org_finance_viewer`, `is_platform_admin`, `is_super_admin`,
`is_event_staff_of`, `is_event_organizer`, `org_has_role`, `user_has_org_role`,
`has_app_role` — or self-scoping via `auth.uid()` / `app.uid()` /
`current_user_uid()`. Note `app.require_claimed_account()` is **not**
authorization: it only proves the account is not anonymous.

That left six with no authorization signal, all resolved:

| Function | Verdict |
|---|---|
| `fn_apply_pricing_to_order` | Fixed above |
| `fn_preview_promo_code` | Intentional. STABLE, writes nothing, scoped to `status = 'published'` |
| `fn_ticket_type_remaining` | Intentional. STABLE, public availability counts |
| `fn_create_seat_hold` (2-arg SQL) | Thin overload delegating to the 3-arg plpgsql one, which does the checks |
| `get_organizer_kpis` | Scopes every aggregate to `current_user_org_ids()`, which filters `org_members` by `current_user_uid()` = `auth.uid()` |
| `get_ticket_type_event` | RLS predicate helper, returns one `event_id` for a `ticket_type` id. Both opaque UUIDs; the grant is needed by the policies that call it |

Two structural properties worth keeping:

- **All 25 `_unchecked` functions have EXECUTE revoked from `anon` and
  `authenticated`.** The wrapper layer cannot be bypassed by calling the inner
  function directly. Preserve this whenever a new `_unchecked` pair is added.
- Every one of the 66 has `search_path` pinned. `fn_compute_order_money` was the
  last exception and is fixed in the migration above.

End-to-end check, as a claimed authenticated user who is **not** a member of the
target org, against EljayTunes:

```
fn_org_finance_summary   -> blocked (P0001)
get_event_kpis           -> blocked (42501)
fn_request_payout        -> blocked (P0001)
create_event_draft       -> blocked (P0001)
fn_delete_organization   -> blocked (P0001)
fn_create_membership_invite(role organizer_owner) -> blocked (42501)
get_organizer_kpis       -> {"events_count":0,"tickets_sold":0,"gross_revenue_cents":0,...}
```

`get_organizer_kpis` returning zeros rather than another org's revenue is the
expected shape: it is scoped, not gated.

## Finding #6 (anonymous access policies) — closed, no action

78 tables are flagged because anonymous sign-ins are **enabled**, which Ticketiv
depends on for guest checkout; an anonymous session carries the `authenticated`
role, so every `TO authenticated` policy trips the lint. This must not be
"remediated" by disabling anonymous sign-ins, and silencing it wholesale would
mean adding an `is_anonymous` check to 186 policies — breaking the flows where
anonymous access is the point (seat holds, guest orders, published event reads).
`app.is_claimed_account()` / `app.require_claimed_account()` already exist to gate
operations that require a permanent account; see `docs/CLAIMED_ACCOUNT_GUARD.md`.

Verified rather than assumed: simulating a real anonymous session (role
`authenticated`, JWT `is_anonymous: true`, so `is_claimed_account()` false) and
counting rows returned **zero from every sensitive table**, including ones that
were not empty at the time — `admin_action_catalog` (12 rows), `audit_log` (60),
`profiles` (5), `admin_users` (2), `feature_flags` (6), `organizations` (1),
`org_members` (1). `payment_provider_settings` refuses outright with `42501`,
having no grant to the API roles at all.

## Still open

| Item | Notes |
|---|---|
| `auth_leaked_password_protection` | Still disabled. Auth config (HIBP), not SQL — same as finding #5 above |
| `rls_enabled_no_policy` on `rate_limits` | INFO. RLS on with no policy is deny-all through PostgREST, which is the fail-safe direction; service-role only by design |
| `pg_trgm` in `public` | Still deferred, unchanged from finding #4 |

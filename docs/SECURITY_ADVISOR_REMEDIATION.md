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

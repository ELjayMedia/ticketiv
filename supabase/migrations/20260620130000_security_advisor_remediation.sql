-- TICK-176 — Supabase security advisor remediation.
-- Authored from get_advisors(security) on project radsfmlsjznqvcpogluo (2026-06-20).
-- Idempotent. See docs/SECURITY_ADVISOR_REMEDIATION.md for the rationale and the
-- per-function keep/revoke decisions.

-- 1) ERROR: SECURITY DEFINER views. Run them with the querying user's
--    privileges so the underlying RLS is enforced, not bypassed.
ALTER VIEW IF EXISTS public.v_my_tickets        SET (security_invoker = on);
ALTER VIEW IF EXISTS public.admin_event_readiness SET (security_invoker = on);

-- 2) SECURITY DEFINER functions reachable by anon via /rest/v1/rpc.
--    Revoke anon on staff/owner-only operations. Keep authenticated.
--    fn_scan_ticket: gate check-in is staff/device only — never anonymous.
REVOKE EXECUTE ON FUNCTION public.fn_scan_ticket(
  p_ticket_code text, p_event_id uuid, p_scanned_by uuid, p_device_id uuid,
  p_session_id uuid, p_gate text, p_scanned_at timestamp with time zone, p_attempt_id text
) FROM anon, public;

--    fn_complete_transfer: takes only a transfer id; an anon caller could
--    complete arbitrary transfers. Require an authenticated session.
REVOKE EXECUTE ON FUNCTION public.fn_complete_transfer(p_transfer_id uuid) FROM anon, public;

-- NOTE — deliberately KEPT executable by anon (guest discovery / guest checkout):
--   * fn_ticket_type_remaining(uuid)        -> read-only availability on public event pages
--   * fn_create_seat_hold(uuid,int)         -> guest checkout creates holds pre-auth
--   * fn_create_seat_hold(uuid,int,uuid)    -> guest checkout creates holds pre-auth
-- These are write-but-bounded; abuse is mitigated by rate limiting (TICK-177).

-- 3) Materialized views exposing revenue must not be readable by clients.
REVOKE SELECT ON public.mv_event_sales        FROM anon, authenticated;
REVOKE SELECT ON public.mv_revenue_breakdown  FROM anon, authenticated;

-- NOT handled here (require non-SQL / risky DDL — see remediation doc):
--   * pg_trgm in public schema  -> moving it drops dependent trigram indexes; do as a
--     planned manual step, not an automatic migration.
--   * Leaked-password protection -> Supabase Auth dashboard / config, not SQL.
--   * 63 anonymous-access policy warnings -> audit task, mostly intentional public reads.

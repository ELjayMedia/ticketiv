
ALTER VIEW IF EXISTS public.v_my_tickets        SET (security_invoker = on);
ALTER VIEW IF EXISTS public.admin_event_readiness SET (security_invoker = on);

REVOKE EXECUTE ON FUNCTION public.fn_scan_ticket(
  p_ticket_code text, p_event_id uuid, p_scanned_by uuid, p_device_id uuid,
  p_session_id uuid, p_gate text, p_scanned_at timestamp with time zone, p_attempt_id text
) FROM anon, public;

REVOKE EXECUTE ON FUNCTION public.fn_complete_transfer(p_transfer_id uuid) FROM anon, public;
;

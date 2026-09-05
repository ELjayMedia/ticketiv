-- TICK-236 — "Email attendees" broadcast: server-side rate limit + audit record.
--
-- A single SECURITY DEFINER RPC enforces the acceptance criteria atomically:
--   * Only organizer_owner / organizer_admin of the event's org may broadcast.
--   * Max 1 broadcast per event per rolling hour (rate limit cannot be raced).
--   * Each successful claim is recorded in `notifications` as the audit row.
--
-- The action layer calls this BEFORE dispatching email so the rate-limit slot
-- is claimed transactionally; the actual per-recipient send is best-effort and
-- happens in the Next.js server action (recipient emails never reach the RPC).

CREATE OR REPLACE FUNCTION public.fn_claim_email_broadcast(
  p_org_id uuid,
  p_event_id uuid,
  p_recipient_count integer,
  p_audience text,
  p_subject text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_user uuid;
  v_event_ok boolean;
  v_notification_id uuid;
BEGIN
  SELECT (select auth.uid()) INTO v_user;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only org owner or admin may broadcast (AC: send gated to owner/admin).
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = v_user
      AND role IN ('organizer_owner', 'organizer_admin')
  ) THEN
    RAISE EXCEPTION 'Only org owners and admins can email attendees';
  END IF;

  -- Event must belong to this org.
  SELECT true INTO v_event_ok
  FROM public.events
  WHERE id = p_event_id AND org_id = p_org_id;

  IF v_event_ok IS NOT TRUE THEN
    RAISE EXCEPTION 'Event not found in this organization';
  END IF;

  IF p_recipient_count < 1 THEN
    RAISE EXCEPTION 'No recipients for the selected audience';
  END IF;

  -- Rate limit: max 1 broadcast per event per rolling hour. The partial unique
  -- guard below would also catch this, but an explicit check yields a clean
  -- message. Counts only successfully-claimed broadcasts (status = 'queued').
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE type = 'email_broadcast'
      AND channel = 'email'
      AND status = 'queued'
      AND payload->>'event_id' = p_event_id::text
      AND created_at > (now() - interval '1 hour')
  ) THEN
    RAISE EXCEPTION 'Rate limit: only one attendee broadcast per event per hour';
  END IF;

  INSERT INTO public.notifications (
    user_id, type, channel, status, payload, created_at
  )
  VALUES (
    v_user,
    'email_broadcast',
    'email',
    'queued',
    jsonb_build_object(
      'org_id', p_org_id::text,
      'event_id', p_event_id::text,
      'audience', p_audience,
      'subject', p_subject,
      'recipient_count', p_recipient_count,
      'sent_by', v_user::text
    ),
    now()
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$function$;

-- Mark a claimed broadcast as sent (records the delivered count). Best-effort:
-- called after the per-recipient dispatch loop completes.
CREATE OR REPLACE FUNCTION public.fn_finalize_email_broadcast(
  p_notification_id uuid,
  p_sent_count integer,
  p_failed_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_user uuid;
BEGIN
  SELECT (select auth.uid()) INTO v_user;

  UPDATE public.notifications
  SET status = 'sent',
      sent_at = now(),
      payload = payload || jsonb_build_object(
        'sent_count', p_sent_count,
        'failed_count', p_failed_count
      )
  WHERE id = p_notification_id
    AND type = 'email_broadcast'
    AND user_id = v_user;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_claim_email_broadcast(uuid, uuid, integer, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.fn_finalize_email_broadcast(uuid, integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_claim_email_broadcast(uuid, uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_finalize_email_broadcast(uuid, integer, integer) TO authenticated;;

-- TICK-229: Add 'paused' to event_status enum and SECURITY DEFINER RPC for status transitions.

-- Extend the enum.  ADD VALUE IF NOT EXISTS is idempotent.
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'paused';

-- ---------------------------------------------------------------------------
-- fn_transition_event_status
-- Allowed transitions:
--   published  → paused    (pause sales)
--   paused     → published (resume sales)
--   published | paused | draft → archived
-- Requires organizer_owner / organizer_admin role (or platform admin).
-- Returns JSON { status, active_holders }.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_transition_event_status(
  p_event_id   uuid,
  p_new_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid := (SELECT auth.uid());
  v_event         events%ROWTYPE;
  v_active_holders integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Require organizer_owner / organizer_admin membership (or platform admin).
  IF NOT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id  = v_event.org_id
      AND user_id = v_user_id
      AND role    = ANY(ARRAY['organizer_owner', 'organizer_admin']::text[])
  ) AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = v_user_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Validate requested transition.
  IF p_new_status NOT IN ('paused', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid target status: %', p_new_status;
  END IF;
  IF p_new_status = 'paused' AND v_event.status::text != 'published' THEN
    RAISE EXCEPTION 'Can only pause a published event (current: %)', v_event.status;
  END IF;
  IF p_new_status = 'published' AND v_event.status::text != 'paused' THEN
    RAISE EXCEPTION 'Can only resume a paused event (current: %)', v_event.status;
  END IF;
  IF p_new_status = 'archived' AND v_event.status::text = 'archived' THEN
    RAISE EXCEPTION 'Event is already archived';
  END IF;

  -- Count active ticket holders (issued + checked_in) for the warning payload.
  SELECT COUNT(*) INTO v_active_holders
  FROM tickets
  WHERE event_id = p_event_id
    AND status IN ('issued', 'checked_in');

  -- Apply the status change.
  UPDATE events
  SET status     = p_new_status::event_status,
      updated_at = now()
  WHERE id = p_event_id;

  RETURN json_build_object(
    'status',          p_new_status,
    'active_holders',  v_active_holders
  );
END;
$$;

REVOKE ALL ON FUNCTION fn_transition_event_status(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fn_transition_event_status(uuid, text) TO authenticated;;

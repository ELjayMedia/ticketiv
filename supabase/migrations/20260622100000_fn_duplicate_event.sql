-- SECURITY DEFINER RPC for duplicating an event as a new draft.
-- Copies event metadata + ticket types; clears dates and resets sales
-- state. Enforces org manager membership (owner / admin / organizer).

CREATE OR REPLACE FUNCTION fn_duplicate_event(p_event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := (SELECT auth.uid());
  v_event      events%ROWTYPE;
  v_new_id     uuid;
  v_new_slug   text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Require manager-level org membership (or platform admin).
  IF NOT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id  = v_event.org_id
      AND user_id = v_user_id
      AND role    = ANY(ARRAY['admin','organizer','organizer_owner','organizer_admin']::text[])
  ) AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = v_user_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to duplicate this event';
  END IF;

  -- Unique slug: original slug + "-copy-" + epoch seconds.
  v_new_slug := v_event.slug || '-copy-' || EXTRACT(epoch FROM now())::bigint;

  INSERT INTO events (
    org_id, venue_id, title, slug, status, visibility,
    cover_image_url, category, city, country_code, tz,
    description, refund_policy, attendee_fields,
    confirmation_message, resale_cap_bps, created_by
  )
  VALUES (
    v_event.org_id,
    v_event.venue_id,
    v_event.title || ' (Copy)',
    v_new_slug,
    'draft',
    v_event.visibility,
    v_event.cover_image_url,
    v_event.category,
    v_event.city,
    v_event.country_code,
    v_event.tz,
    v_event.description,
    v_event.refund_policy,
    v_event.attendee_fields,
    v_event.confirmation_message,
    v_event.resale_cap_bps,
    v_user_id
  )
  RETURNING id INTO v_new_id;

  -- Copy ticket types, zeroing out any sales-derived state.
  INSERT INTO ticket_types (
    event_id, name, price_cents, currency, quota, per_user_limit, sales_status
  )
  SELECT
    v_new_id, name, price_cents, currency, quota, per_user_limit, 'on_sale'
  FROM ticket_types
  WHERE event_id = p_event_id;

  RETURN json_build_object('event_id', v_new_id, 'slug', v_new_slug);
END;
$$;

REVOKE ALL ON FUNCTION fn_duplicate_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_duplicate_event(uuid) TO authenticated;

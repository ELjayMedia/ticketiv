CREATE OR REPLACE FUNCTION fn_toggle_favourite(p_event_id uuid, p_save boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_save THEN
    INSERT INTO event_favourites (user_id, event_id)
    VALUES (v_user_id, p_event_id)
    ON CONFLICT ON CONSTRAINT event_favourites_user_id_event_id_key DO NOTHING;
  ELSE
    DELETE FROM event_favourites
    WHERE user_id = v_user_id AND event_id = p_event_id;
  END IF;

  RETURN json_build_object('saved', p_save);
END;
$$;

REVOKE ALL ON FUNCTION fn_toggle_favourite(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_toggle_favourite(uuid, boolean) TO authenticated;;

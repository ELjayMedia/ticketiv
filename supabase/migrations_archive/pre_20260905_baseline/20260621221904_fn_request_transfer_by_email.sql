CREATE OR REPLACE FUNCTION fn_request_transfer_by_email(
  p_order_item_id uuid,
  p_recipient_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_user_id uuid := (SELECT auth.uid());
  v_to_user_id   uuid;
  v_transfer_id  uuid;
BEGIN
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT id INTO v_to_user_id
  FROM auth.users
  WHERE email = lower(trim(p_recipient_email))
  LIMIT 1;

  IF v_to_user_id IS NULL THEN
    RAISE EXCEPTION 'No Ticketiv account found for that email address';
  END IF;

  IF v_to_user_id = v_from_user_id THEN
    RAISE EXCEPTION 'Cannot transfer a ticket to yourself';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE id = p_order_item_id
      AND current_owner_id = v_from_user_id
      AND status = 'issued'
  ) THEN
    RAISE EXCEPTION 'Ticket is not available for transfer';
  END IF;

  INSERT INTO transfers (order_item_id, from_user_id, to_user_id, status)
  VALUES (p_order_item_id, v_from_user_id, v_to_user_id, 'pending')
  RETURNING id INTO v_transfer_id;

  RETURN json_build_object('transfer_id', v_transfer_id, 'to_user_id', v_to_user_id);
END;
$$;

REVOKE ALL ON FUNCTION fn_request_transfer_by_email(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_request_transfer_by_email(uuid, text) TO authenticated;;

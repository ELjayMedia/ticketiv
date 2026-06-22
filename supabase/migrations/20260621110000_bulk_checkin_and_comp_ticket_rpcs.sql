-- TICK-235: Bulk check-in RPC for organizer attendees table
-- TICK-237: Comp ticket issuance RPC

-- Add 'comp' to the sales_channel enum for comp-ticket orders
ALTER TYPE public.sales_channel ADD VALUE IF NOT EXISTS 'comp';

-- fn_bulk_check_in: org-member authorised bulk check-in
CREATE OR REPLACE FUNCTION public.fn_bulk_check_in(
  p_order_item_ids uuid[],
  p_org_id uuid
)
RETURNS TABLE(checked_count integer, skipped_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $$
DECLARE
  v_user uuid;
  v_bad integer;
  v_checked integer;
  v_skipped integer;
BEGIN
  SELECT (select auth.uid()) INTO v_user;

  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = v_user
      AND role IN ('organizer_owner', 'organizer_admin', 'organizer', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized for this organization';
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = ANY(p_order_item_ids)
    AND o.org_id != p_org_id;

  IF v_bad > 0 THEN
    RAISE EXCEPTION 'One or more tickets do not belong to this organization';
  END IF;

  SELECT COUNT(*) INTO v_skipped
  FROM public.order_items
  WHERE id = ANY(p_order_item_ids)
    AND checked_in_at IS NOT NULL;

  UPDATE public.order_items
  SET
    checked_in_at = now(),
    status = 'checked_in'::public.order_item_status
  WHERE id = ANY(p_order_item_ids)
    AND checked_in_at IS NULL
    AND status = 'issued'::public.order_item_status;

  GET DIAGNOSTICS v_checked = ROW_COUNT;

  RETURN QUERY SELECT v_checked, v_skipped;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_bulk_check_in(uuid[], uuid) TO authenticated;

-- issue_comp_ticket: org-owner/admin authorised complimentary ticket creation
CREATE OR REPLACE FUNCTION public.issue_comp_ticket(
  p_org_id uuid,
  p_ticket_type_id uuid,
  p_recipient_email text,
  p_qty integer DEFAULT 1,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $$
DECLARE
  v_user uuid;
  v_event_id uuid;
  v_order_id uuid;
  v_code text;
  i integer;
BEGIN
  SELECT (select auth.uid()) INTO v_user;

  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = v_user
      AND role IN ('organizer_owner', 'organizer_admin')
  ) THEN
    RAISE EXCEPTION 'Only org owners and admins can issue comp tickets';
  END IF;

  SELECT e.id INTO v_event_id
  FROM public.ticket_types tt
  JOIN public.events e ON e.id = tt.event_id
  WHERE tt.id = p_ticket_type_id
    AND e.org_id = p_org_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Ticket type not found in this organization';
  END IF;

  IF p_qty < 1 OR p_qty > 20 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 20';
  END IF;

  INSERT INTO public.orders (
    org_id, buyer_id, total_cents, currency, status, channel,
    buyer_email, subtotal_cents, item_count
  )
  VALUES (
    p_org_id, v_user, 0, 'SZL',
    'paid'::public.order_status,
    'comp'::public.sales_channel,
    p_recipient_email, 0, p_qty
  )
  RETURNING id INTO v_order_id;

  FOR i IN 1..p_qty LOOP
    v_code := upper(
      substr(encode(gen_random_bytes(3), 'hex'), 1, 3) || '-' ||
      substr(encode(gen_random_bytes(3), 'hex'), 1, 4)
    );

    INSERT INTO public.order_items (
      order_id, ticket_type_id, status, holder_email, ticket_code
    )
    VALUES (
      v_order_id, p_ticket_type_id,
      'issued'::public.order_item_status,
      p_recipient_email, v_code
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_comp_ticket(uuid, uuid, text, integer, text) TO authenticated;

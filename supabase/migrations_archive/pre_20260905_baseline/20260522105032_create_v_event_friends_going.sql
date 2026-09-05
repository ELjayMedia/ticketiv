
CREATE OR REPLACE VIEW public.v_event_friends_going AS
WITH my_friends AS (
  SELECT
    CASE
      WHEN uc.requester_id = (SELECT auth.uid()) THEN uc.recipient_id
      ELSE uc.requester_id
    END AS friend_id
  FROM public.user_connections uc
  WHERE uc.status = 'accepted'
    AND ((SELECT auth.uid()) = uc.requester_id OR (SELECT auth.uid()) = uc.recipient_id)
)
SELECT DISTINCT
  tt.event_id,
  p.user_id                 AS friend_id,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', p.name, p.surname)), ''), p.display_name) AS friend_name,
  uh.handle                 AS friend_handle
FROM public.orders o
JOIN public.order_items oi ON oi.order_id = o.id
JOIN public.ticket_types tt ON tt.id = oi.ticket_type_id
JOIN my_friends mf         ON mf.friend_id = o.buyer_id
JOIN public.profiles p     ON p.user_id = o.buyer_id
LEFT JOIN public.user_handles uh ON uh.user_id = p.user_id
WHERE o.status = 'paid'
  AND oi.revoked_at IS NULL;

COMMENT ON VIEW public.v_event_friends_going IS 'Friends of the current authenticated user (via user_connections) who hold a paid, non-revoked ticket for an event. Used by /events/[id] to render the "going" social proof.';

GRANT SELECT ON public.v_event_friends_going TO authenticated;
;

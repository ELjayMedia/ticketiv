-- 6/6: Mutual friendship graph. Direction-agnostic uniqueness; recipient accepts/declines/blocks.

CREATE TYPE public.connection_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');

CREATE TABLE public.user_connections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        public.connection_status NOT NULL DEFAULT 'pending',
  requested_at  timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  CONSTRAINT user_connections_no_self CHECK (requester_id <> recipient_id)
);

-- Pair uniqueness regardless of who initiated
CREATE UNIQUE INDEX user_connections_pair_unique
  ON public.user_connections (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));

CREATE INDEX user_connections_requester_status_idx ON public.user_connections (requester_id, status);
CREATE INDEX user_connections_recipient_status_idx ON public.user_connections (recipient_id, status);

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_connections_select_own ON public.user_connections
  FOR SELECT TO authenticated
  USING (requester_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()));

CREATE POLICY user_connections_insert_self ON public.user_connections
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = (SELECT auth.uid()) AND status = 'pending');

-- Recipient handles pending requests
CREATE POLICY user_connections_update_recipient ON public.user_connections
  FOR UPDATE TO authenticated
  USING (recipient_id = (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (recipient_id = (SELECT auth.uid()) AND status IN ('accepted','declined','blocked'));

-- Either party can later block
CREATE POLICY user_connections_update_block ON public.user_connections
  FOR UPDATE TO authenticated
  USING ((requester_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid())) AND status = 'accepted')
  WITH CHECK ((requester_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid())) AND status = 'blocked');

-- Either party can delete (un-friend)
CREATE POLICY user_connections_delete_own ON public.user_connections
  FOR DELETE TO authenticated
  USING (requester_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()));

-- Set responded_at automatically when status leaves 'pending'
CREATE OR REPLACE FUNCTION public.fn_user_connections_set_responded_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    NEW.responded_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_user_connections_set_responded_at
  BEFORE UPDATE ON public.user_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_user_connections_set_responded_at();

-- Convenience view: accepted friends from the perspective of auth.uid()
CREATE OR REPLACE VIEW public.user_friends WITH (security_invoker = true) AS
SELECT
  CASE WHEN requester_id = (SELECT auth.uid()) THEN recipient_id ELSE requester_id END AS friend_id,
  responded_at  AS connected_at,
  id            AS connection_id
FROM public.user_connections
WHERE status = 'accepted'
  AND (SELECT auth.uid()) IN (requester_id, recipient_id);

COMMENT ON TABLE public.user_connections IS
  'Mutual friendship graph. requester_id sends; recipient_id accepts/declines/blocks. Pair uniqueness enforced regardless of direction.';
COMMENT ON VIEW public.user_friends IS
  'Accepted friends from the current user perspective. security_invoker=true means RLS on user_connections still applies to readers.';;

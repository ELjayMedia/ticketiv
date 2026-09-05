-- Pass 2.E: remove profiles.org_id and profiles.role with all dependent rewrites.
-- Order: drop dependent policies, drop old fn, recreate fns, recreate policies, drop columns.

-- ============================================================================
-- 1. Drop dependent policies (so we can drop the old fn_profile_can_read signature)
-- ============================================================================

DROP POLICY IF EXISTS profiles_anon_select                       ON public.profiles;
DROP POLICY IF EXISTS transfers_select_consolidated_authenticated ON public.transfers;
DROP POLICY IF EXISTS feature_flags_select_consolidated          ON public.feature_flags;
DROP POLICY IF EXISTS refunds_select_authenticated_merged        ON public.refunds;

-- ============================================================================
-- 2. Drop old fn_profile_can_read (2-arg version) — no policies depend on it now
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_profile_can_read(uuid, uuid);

-- ============================================================================
-- 3. Rewrite helpers to source roles from org_members and admin_users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role = ANY(ARRAY['organizer_owner','organizer_admin']::public.app_role[])
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())
  );
$$;
COMMENT ON FUNCTION public.is_org_admin(uuid) IS
  'True if caller is organizer_owner/organizer_admin of the given org, or a global admin (admin_users). Behavior change vs. legacy: global admins now return true here too.';

CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT om.org_id
  FROM public.org_members om
  WHERE om.user_id = (SELECT auth.uid())
  ORDER BY om.created_at ASC
  LIMIT 1;
$$;
COMMENT ON FUNCTION public.get_user_org() IS
  'Calling user''s primary org (earliest org_members membership). Multi-org callers should use get_user_orgs().';

CREATE OR REPLACE FUNCTION public.has_app_role(r text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE
      WHEN r = 'admin' THEN
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid()))
      ELSE
        EXISTS (
          SELECT 1 FROM public.org_members om
          WHERE om.user_id = (SELECT auth.uid())
            AND om.role::text = r
        )
    END;
$$;
COMMENT ON FUNCTION public.has_app_role(text) IS
  '''admin'' = global admin (admin_users); any other role = org_members row with that role.';

CREATE OR REPLACE FUNCTION public.fn_profile_can_read(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    p_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.org_members om1
      JOIN public.org_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = (SELECT auth.uid())
        AND om2.user_id = p_user_id
    );
$$;
COMMENT ON FUNCTION public.fn_profile_can_read(uuid) IS
  'Profile is readable to the caller if it''s their own, or they share an org membership.';

-- ============================================================================
-- 4. Recreate policies using new helpers / org_members joins
-- ============================================================================

CREATE POLICY profiles_anon_select ON public.profiles
  FOR SELECT
  USING (public.fn_profile_can_read(user_id));

CREATE POLICY transfers_select_consolidated_authenticated ON public.transfers
  FOR SELECT TO authenticated
  USING (
    from_user_id = (SELECT auth.uid())
    OR to_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      WHERE oi.id = transfers.order_item_id
        AND public.is_org_admin(o.org_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.ticket_types tt ON tt.id = oi.ticket_type_id
      JOIN public.events e ON e.id = tt.event_id
      WHERE oi.id = transfers.order_item_id
        AND app.is_event_staff(e.id, ARRAY['organizer_admin','organizer_staff']::public.app_role[])
    )
  );

CREATE POLICY feature_flags_select_consolidated ON public.feature_flags
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(org_id)
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = feature_flags.org_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY refunds_select_authenticated_merged ON public.refunds
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.payments py
      JOIN public.orders o ON o.id = py.order_id
      JOIN public.org_members m ON m.org_id = o.org_id
      WHERE py.id = refunds.payment_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 5. Drop the columns
-- ============================================================================

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS org_id CASCADE;;

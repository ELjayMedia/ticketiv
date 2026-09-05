
-- ================================================================
-- 1. Fix auth_rls_initplan on event_favourites
--    Wrap auth.uid() in (select ...) to avoid per-row re-evaluation
-- ================================================================
DROP POLICY IF EXISTS "Users can view their own favourites"   ON public.event_favourites;
DROP POLICY IF EXISTS "Users can insert their own favourites" ON public.event_favourites;
DROP POLICY IF EXISTS "Users can delete their own favourites" ON public.event_favourites;

CREATE POLICY "Users can view their own favourites"
  ON public.event_favourites FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own favourites"
  ON public.event_favourites FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own favourites"
  ON public.event_favourites FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ================================================================
-- 2. Fix auth_rls_initplan on events + resolve multiple-permissive SELECT
--    Split events_select_public into anon-only (simple) + merge
--    authenticated conditions into one comprehensive policy
-- ================================================================
DROP POLICY IF EXISTS events_select_public                ON public.events;
DROP POLICY IF EXISTS events_select_authenticated_merged  ON public.events;

-- Anon: public visibility only
CREATE POLICY events_select_anon ON public.events
  FOR SELECT TO anon
  USING (visibility = 'public');

-- Authenticated: merged comprehensive policy, all auth() calls wrapped
CREATE POLICY events_select_authenticated ON public.events
  FOR SELECT TO authenticated
  USING (
    (visibility = 'public' AND (status = 'published'::event_status OR publish_at <= now()))
    OR is_global_admin((SELECT auth.uid()))
    OR is_org_member(org_id, (SELECT auth.uid()))
    OR org_id IN (SELECT current_user_org_ids())
    OR app.is_event_public_now(id)
    OR app.role_in_membership(org_id, app.current_user_id(), NULL::text[])
    OR app.role_in_event_staff(id, app.current_user_id(), NULL::text[])
    OR ((SELECT auth.jwt()) ->> 'role') = ANY (ARRAY['organizer'::text, 'admin'::text])
    OR org_id IN (
         SELECT org_members.org_id FROM org_members
         WHERE org_members.user_id = (SELECT auth.uid())
       )
    OR EXISTS (
         SELECT 1 FROM event_staff es
         WHERE es.event_id = events.id AND es.user_id = (SELECT auth.uid())
       )
  );

-- ================================================================
-- 3. Merge duplicate events DELETE policies
-- ================================================================
DROP POLICY IF EXISTS events_delete_authenticated  ON public.events;
DROP POLICY IF EXISTS events_delete_drafts_only    ON public.events;

CREATE POLICY events_delete_authenticated ON public.events
  FOR DELETE TO authenticated
  USING (
    app.can_delete_event(id)
    OR (can_manage_event(id, (SELECT auth.uid())) AND status = 'draft'::event_status)
  );

-- ================================================================
-- 4. Merge duplicate events INSERT policies
-- ================================================================
DROP POLICY IF EXISTS events_insert_by_org_member    ON public.events;
DROP POLICY IF EXISTS events_insert_for_org_manager  ON public.events;

CREATE POLICY events_insert_authenticated ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_members.org_id FROM org_members
      WHERE org_members.user_id = (SELECT auth.uid())
    )
    OR (can_manage_org(org_id, (SELECT auth.uid())) AND created_by = (SELECT auth.uid()))
  );

-- ================================================================
-- 5. Merge duplicate events UPDATE policies
-- ================================================================
DROP POLICY IF EXISTS events_update_by_org_admin      ON public.events;
DROP POLICY IF EXISTS events_update_for_event_manager ON public.events;

CREATE POLICY events_update_authenticated ON public.events
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_members.org_id FROM org_members
      WHERE org_members.user_id = (SELECT auth.uid())
        AND org_members.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role])
    )
    OR can_manage_event(id, (SELECT auth.uid()))
  )
  WITH CHECK (
    org_id IN (
      SELECT org_members.org_id FROM org_members
      WHERE org_members.user_id = (SELECT auth.uid())
        AND org_members.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role])
    )
    OR can_manage_event(id, (SELECT auth.uid()))
  );

-- ================================================================
-- 6. Drop redundant order_items SELECT policy
--    order_items_owner_select is fully covered by the consolidated policy
-- ================================================================
DROP POLICY IF EXISTS order_items_owner_select ON public.order_items;

-- ================================================================
-- 7. Merge duplicate user_connections UPDATE policies
-- ================================================================
DROP POLICY IF EXISTS user_connections_update_block     ON public.user_connections;
DROP POLICY IF EXISTS user_connections_update_recipient ON public.user_connections;

CREATE POLICY user_connections_update_authenticated ON public.user_connections
  FOR UPDATE TO authenticated
  USING (
    ((requester_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()))
      AND status = 'accepted'::connection_status)
    OR (recipient_id = (SELECT auth.uid()) AND status = 'pending'::connection_status)
  )
  WITH CHECK (
    ((requester_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()))
      AND status = 'blocked'::connection_status)
    OR (recipient_id = (SELECT auth.uid())
        AND status = ANY (ARRAY['accepted'::connection_status, 'declined'::connection_status, 'blocked'::connection_status]))
  );

-- ================================================================
-- 8. Drop duplicate index (idx_events_org = idx_events_org_id)
-- ================================================================
DROP INDEX IF EXISTS public.idx_events_org;
;

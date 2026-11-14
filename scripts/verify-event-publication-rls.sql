-- TICK-472 / TICK-473: regression checks for event publication and admin revocation.
--
-- Run with a privileged database connection (psql -v ON_ERROR_STOP=1 -f ...).
-- Each role simulation is wrapped in a transaction that ALWAYS rolls back.
-- No persistent events, users, grants, policies or admin-state changes are made.
--
-- Baseline expected public IDs are collected by the privileged role before
-- switching to anon/authenticated; compare exact ID sets, not just counts.

-- 1. Anonymous discovery must return exactly live, public, published events.
BEGIN;
  SELECT set_config(
    'security_audit.expected_public_ids',
    COALESCE((
      SELECT string_agg(id::text, ',' ORDER BY id::text)
      FROM public.events
      WHERE status = 'published'::public.event_status
        AND visibility = 'public'
        AND (publish_at IS NULL OR publish_at <= now())
        AND (unpublish_at IS NULL OR unpublish_at > now())
    ), ''),
    true
  );

  SET LOCAL ROLE anon;

  DO $test$
  DECLARE observed text;
  BEGIN
    SELECT COALESCE(string_agg(id::text, ',' ORDER BY id::text), '')
      INTO observed FROM public.events;
    IF observed IS DISTINCT FROM current_setting('security_audit.expected_public_ids', true) THEN
      RAISE EXCEPTION 'FAIL: anonymous events include a draft/scheduled/expired row or exclude a published row';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.v_events_public v
      WHERE NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = v.id
        AND e.status = 'published'::public.event_status
        AND e.visibility = 'public')
    ) THEN
      RAISE EXCEPTION 'FAIL: v_events_public exposes a nonpublished event';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.v_public_event_cards c
      WHERE NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = c.id
        AND e.status = 'published'::public.event_status
        AND e.visibility = 'public')
    ) THEN
      RAISE EXCEPTION 'FAIL: v_public_event_cards exposes a nonpublished event';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.event_catalog c
      WHERE NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = c.event_id
        AND e.status = 'published'::public.event_status
        AND e.visibility = 'public')
    ) THEN
      RAISE EXCEPTION 'FAIL: event_catalog exposes a nonpublished event';
    END IF;
  END $test$;
  SELECT 'PASS anonymous event discovery and public views' AS result;
ROLLBACK;

-- 2. An unrelated authenticated user must see the same public set, no drafts.
BEGIN;
  SELECT set_config(
    'security_audit.expected_public_ids',
    COALESCE((
      SELECT string_agg(id::text, ',' ORDER BY id::text)
      FROM public.events
      WHERE status = 'published'::public.event_status
        AND visibility = 'public'
        AND (publish_at IS NULL OR publish_at <= now())
        AND (unpublish_at IS NULL OR unpublish_at > now())
    ), ''),
    true
  );
  SELECT set_config('request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}', true);
  SET LOCAL ROLE authenticated;

  DO $test$
  DECLARE observed text;
  BEGIN
    SELECT COALESCE(string_agg(id::text, ',' ORDER BY id::text), '')
      INTO observed FROM public.events;
    IF observed IS DISTINCT FROM current_setting('security_audit.expected_public_ids', true) THEN
      RAISE EXCEPTION 'FAIL: unrelated signed-in user can see a protected event or loses public events';
    END IF;
  END $test$;
  SELECT 'PASS unrelated authenticated event read' AS result;
ROLLBACK;

-- 3. A real organizer must retain access to their draft, if one exists.
BEGIN;
  SELECT set_config('security_audit.owner_draft_id',
    COALESCE((
      SELECT e.id::text
      FROM public.events e JOIN public.org_members om ON om.org_id = e.org_id
      WHERE e.status = 'draft'::public.event_status
        AND om.role::text IN ('organizer_owner', 'organizer_admin')
      ORDER BY e.id LIMIT 1
    ), ''), true);

  SELECT set_config('request.jwt.claims',
    jsonb_build_object(
      'sub', (
        SELECT om.user_id
        FROM public.events e JOIN public.org_members om ON om.org_id = e.org_id
        WHERE e.id::text = NULLIF(current_setting('security_audit.owner_draft_id', true), '')
          AND om.role::text IN ('organizer_owner', 'organizer_admin')
        ORDER BY om.user_id LIMIT 1
      ),
      'role', 'authenticated',
      'is_anonymous', false
    )::text, true);

  SET LOCAL ROLE authenticated;

  DO $test$
  BEGIN
    IF NULLIF(current_setting('security_audit.owner_draft_id', true), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.events
        WHERE id = current_setting('security_audit.owner_draft_id', true)::uuid
          AND status = 'draft'::public.event_status
      )
    THEN RAISE EXCEPTION 'FAIL: organizer lost access to own event draft';
    END IF;
  END $test$;
  SELECT 'PASS own draft remains accessible (when seeded)' AS result;
ROLLBACK;

-- 4. Revoked admins must not authorize arbitrary org creation.
BEGIN;
  DO $test$
  BEGIN
    IF public.can_manage_org(
      (SELECT id FROM public.organizations ORDER BY id LIMIT 1),
      '11111111-1111-4111-8111-111111111111'::uuid
    ) THEN
      RAISE EXCEPTION 'FAIL: unrelated user can manage an organization';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.role::text IN ('organizer_owner', 'organizer_admin')
        AND NOT public.can_manage_org(om.org_id, om.user_id)
    ) THEN
      RAISE EXCEPTION 'FAIL: owner/admin lost organization-management access';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.admin_users au CROSS JOIN public.organizations o
      WHERE au.active IS TRUE AND NOT public.can_manage_org(o.id, au.user_id)
    ) THEN
      RAISE EXCEPTION 'FAIL: active platform admin lost intended permissions';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.admin_users au CROSS JOIN public.organizations o
      WHERE au.active IS FALSE
        AND NOT EXISTS (
          SELECT 1 FROM public.org_members om
          WHERE om.org_id = o.id AND om.user_id = au.user_id
            AND om.role::text IN ('organizer_owner', 'organizer_admin')
        )
        AND public.can_manage_org(o.id, au.user_id)
    ) THEN
      RAISE EXCEPTION 'FAIL: revoked platform admin retains organization privileges';
    END IF;
  END $test$;
  SELECT 'PASS organizer and administrator role guards' AS result;
ROLLBACK;

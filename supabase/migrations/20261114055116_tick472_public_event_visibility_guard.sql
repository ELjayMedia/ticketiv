-- TICK-472: Public event discovery must never expose unpublished drafts.
-- Applied in production via Supabase migration 20261114055116.
-- The existing SECURITY DEFINER helper is retained because it is called from RLS.

CREATE OR REPLACE FUNCTION app.is_event_public_now(p_event uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'app', 'public', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event
      AND e.status = 'published'::public.event_status
      AND e.visibility = 'public'
      AND (e.publish_at IS NULL OR e.publish_at <= now())
      AND (e.unpublish_at IS NULL OR e.unpublish_at > now())
  );
$function$;

ALTER POLICY events_select_anon ON public.events USING (
  visibility = 'public'
  AND status = 'published'::public.event_status
  AND (publish_at IS NULL OR publish_at <= now())
  AND (unpublish_at IS NULL OR unpublish_at > now())
);

ALTER POLICY events_select_authenticated ON public.events USING (
  app.is_event_public_now(id)
  OR app.is_platform_admin()
  OR app.is_org_member_of(org_id)
  OR app.is_event_staff_of(id, NULL::public.app_role[])
);

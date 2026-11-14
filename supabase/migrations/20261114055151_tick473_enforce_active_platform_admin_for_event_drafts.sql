-- TICK-473: Previously revoked platform administrators cannot create event drafts.
-- Applied in production via Supabase migration 20261114055151.
-- The existing function, signature, ownership and EXECUTE grants are preserved.

CREATE OR REPLACE FUNCTION public.can_manage_org(p_org_id uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = p_user
      AND om.role::text IN ('organizer_owner', 'organizer_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = p_user
      AND au.active IS TRUE
  );
$function$;

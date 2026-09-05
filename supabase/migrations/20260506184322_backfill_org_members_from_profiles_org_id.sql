-- 2/6: Backfill org_members from any profiles.org_id values that haven't been mirrored across.
-- This must run before any future drop of profiles.org_id (Pass 2). Additive only.

INSERT INTO public.org_members (org_id, user_id, role, created_at)
SELECT
  p.org_id,
  p.user_id,
  CASE
    WHEN p.role::text IN ('organizer_owner', 'organizer_admin', 'organizer_staff', 'organizer_scanner', 'finance')
      THEN p.role
    WHEN p.role::text = 'organizer'
      THEN 'organizer_admin'::app_role
    ELSE 'organizer_staff'::app_role
  END,
  COALESCE(p.created_at, now())
FROM public.profiles p
WHERE p.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = p.org_id AND m.user_id = p.user_id
  );;

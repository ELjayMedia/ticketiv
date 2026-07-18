-- TICK-311/TICK-320 reconciliation — restore legacy auth helper shims.
--
-- 20260628190000_drop_legacy_rls_helpers dropped public.is_org_admin(uuid)
-- and public.is_super_admin(uuid) after the RLS policies moved to the
-- canonical app.* helper family (TICK-278). But seven SECURITY DEFINER RPC
-- bodies still call them — plpgsql bodies are not validated at drop time, so
-- the breakage only shows at runtime:
--
--   fn_request_payout            (payout requests always fail)
--   is_org_finance_viewer        (finance summary fails for non-admin path)
--   fn_issue_guestlist           (guestlist issuance)
--   fn_create_membership_invite  (organizer onboarding invites)
--   fn_revoke_membership_invite
--   fn_admin_schedule_webhook_dispatch
--   fn_db_slow_queries
--
-- This restores the two helpers with their pre-drop semantics (captured in
-- supabase/schema/baseline_public_structure.sql), with one tightening:
-- is_super_admin now requires admin_users.active = true, matching how every
-- other RPC (e.g. fn_scan_ticket) gates on admin_users.
--
-- Follow-up (TICK-278 scope): migrate the seven callers onto the canonical
-- app.* helpers, then drop these shims again.

begin;

create or replace function public.is_super_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = check_user_id
      and au.active = true
  );
$function$;

revoke execute on function public.is_super_admin(uuid) from public, anon;
grant execute on function public.is_super_admin(uuid) to authenticated, service_role;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = (select auth.uid())
      and om.role = any(array['organizer_owner','organizer_admin']::public.app_role[])
  ) or exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
      and active = true
  );
$function$;

revoke execute on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_admin(uuid) to authenticated, service_role;

commit;

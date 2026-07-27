-- Restore the public.current_user_uid() shim.
--
-- 20260628190000_drop_legacy_rls_helpers dropped public.current_user_uid(), and
-- 20260718150000_restore_legacy_auth_helper_shims restored is_org_admin /
-- is_super_admin but missed this one. Eleven still-live SECURITY DEFINER
-- functions call public.current_user_uid(), so each threw
-- "function public.current_user_uid() does not exist" (42883) at runtime:
--   current_user_org_ids, get_user_orgs, user_has_org_role, get_event_kpis,
--   fn_check_in, scanner_mark_checkin, fn_is_event_scanner, fn_is_event_staff,
--   fn_get_my_order_totals, fn_get_my_order_totals_json, fn_list_my_order_totals
-- (gate scanner check-in and organizer KPIs among them).
--
-- Restored verbatim from the pre-drop definition: a thin auth.uid() shim.

create or replace function public.current_user_uid()
 returns uuid
 language sql
 stable
 set search_path to 'pg_catalog', 'public'
as $function$
  select (select auth.uid())::uuid;
$function$;

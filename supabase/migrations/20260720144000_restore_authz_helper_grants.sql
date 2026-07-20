-- Restore EXECUTE grants stripped from authz-helper functions still reached by
-- authenticated users, via either an RLS policy or an invoker RPC the app calls.
--
-- The June RLS-canonical refactor kept authenticated/anon EXECUTE on the new
-- app.* helper family but left these legacy SECURITY DEFINER helpers ungranted,
-- while live policies and RPCs still call them. Each throws 42501 for
-- authenticated at runtime:
--   * app.can_delete_event(uuid)            -> events DELETE policy (authenticated)
--   * app.can_manage_guestlist_entry(uuid)  -> guestlist_entries policy (authenticated)
--   * public.can_manage_event(uuid,uuid)    -> events policy (authenticated) + get_event_kpis()
--   * public.get_ticket_type_event(uuid)    -> ticket_type_channels policy (authenticated)
--   * public.current_user_org_ids()         -> get_organizer_kpis() (organizer dashboard)
--
-- These are boolean authz/lookup helpers (SECURITY DEFINER); granting EXECUTE
-- exposes nothing beyond what the policies/RPCs already compute. Callers that
-- reach these only through other SECURITY DEFINER functions (which run as the
-- owner) do not need a grant and are intentionally left as-is
-- (e.g. fn_create_inventory_protected_order is service-role only).

grant execute on function app.can_delete_event(uuid) to authenticated;
grant execute on function app.can_manage_guestlist_entry(uuid) to authenticated;
grant execute on function public.can_manage_event(uuid, uuid) to authenticated;
grant execute on function public.get_ticket_type_event(uuid) to authenticated;
grant execute on function public.current_user_org_ids() to authenticated;

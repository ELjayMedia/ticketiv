-- Remove direct API/RPC execution rights from SECURITY DEFINER functions flagged by Supabase Security Advisor.
-- Keep owner/postgres and service_role access intact.

revoke execute on function public.fn_quote_order(uuid, jsonb, public.sales_channel, text) from public, anon, authenticated;
revoke execute on function public.fn_quote_order(jsonb, text) from public, anon, authenticated;
revoke execute on function public.get_ticket_type_event(uuid) from public, anon, authenticated;

revoke execute on function public.can_manage_event(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.can_manage_org(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.can_update_ticket_types_by_user(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.create_event_draft(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.current_user_org_ids() from public, anon, authenticated;

revoke execute on function public.fn_check_in(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.fn_check_in(uuid) from public, anon, authenticated;
revoke execute on function public.fn_check_in(text) from public, anon, authenticated;
revoke execute on function public.fn_check_in(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.fn_check_in(text, uuid, uuid, text) from public, anon, authenticated;

revoke execute on function public.fn_get_my_order_totals(uuid) from public, anon, authenticated;
revoke execute on function public.fn_get_my_order_totals_json(uuid) from public, anon, authenticated;
revoke execute on function public.fn_issue_guestlist(uuid, integer) from public, anon, authenticated;
revoke execute on function public.fn_list_my_order_totals(integer, integer) from public, anon, authenticated;
revoke execute on function public.fn_mint_tickets(uuid) from public, anon, authenticated;

revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.is_event_staff(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_global_admin(uuid) from public, anon, authenticated;
revoke execute on function public.is_order_item_org_member(uuid) from public, anon, authenticated;
revoke execute on function public.is_org_admin(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_org_member(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_org_staff(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.scanner_mark_checkin(uuid) from public, anon, authenticated;
revoke execute on function public.user_has_org_role(uuid, text[]) from public, anon, authenticated;;

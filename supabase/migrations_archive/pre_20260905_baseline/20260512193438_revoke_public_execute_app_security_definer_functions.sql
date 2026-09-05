revoke execute on function public.fn_bootstrap_ticketiv_user(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.fn_create_inventory_protected_order(uuid, uuid, text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.fn_get_my_ticketiv_roles() from public, anon, authenticated;
revoke execute on function public.fn_get_ticketiv_effective_roles(uuid) from public, anon, authenticated;
revoke execute on function public.is_super_admin(uuid) from public, anon, authenticated;

grant execute on function public.fn_bootstrap_ticketiv_user(uuid, text, text, text) to service_role;
grant execute on function public.fn_create_inventory_protected_order(uuid, uuid, text, jsonb, text) to service_role;
grant execute on function public.fn_get_my_ticketiv_roles() to service_role;
grant execute on function public.fn_get_ticketiv_effective_roles(uuid) to service_role;
grant execute on function public.is_super_admin(uuid) to service_role;;

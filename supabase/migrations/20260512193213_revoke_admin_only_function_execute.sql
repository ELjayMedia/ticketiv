revoke execute on function public.admin_log_action(uuid, text, text, public.audit_action, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.grant_seeded_super_admin() from public, anon, authenticated;;

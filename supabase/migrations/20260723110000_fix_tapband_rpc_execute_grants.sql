-- Harden TapBand lifecycle RPC execute grants.
--
-- These functions are service_role-only by design (server actions call them with
-- the service key and supply the trusted actor/device context). The original
-- migrations revoked EXECUTE from `public`, but Supabase's default privileges
-- explicitly grant EXECUTE to `anon` and `authenticated` on new public functions,
-- so those grants survived — leaving SECURITY DEFINER lifecycle RPCs that trust a
-- caller-supplied p_actor_id reachable by anonymous and signed-in clients.
-- Revoke from anon and authenticated so only service_role can execute them.

revoke execute on function public.fn_tapband_actor_is_platform_admin(uuid) from anon, authenticated;
revoke execute on function public.fn_tapband_actor_can_manage_event(uuid, uuid) from anon, authenticated;
revoke execute on function public.fn_tapband_audit_lifecycle(uuid, uuid, text, uuid, text, jsonb) from anon, authenticated;
revoke execute on function public.fn_tapband_issue_credential(uuid, uuid, text, uuid, uuid, uuid, text, jsonb) from anon, authenticated;
revoke execute on function public.fn_tapband_activate_credential(uuid, uuid, uuid, uuid, text, jsonb) from anon, authenticated;
revoke execute on function public.fn_tapband_assign_entitlement(uuid, uuid, uuid, uuid, text, text, jsonb) from anon, authenticated;
revoke execute on function public.fn_tapband_revoke_credential(uuid, uuid, text, text, text, jsonb) from anon, authenticated;
revoke execute on function public.fn_tapband_replace_credential(uuid, uuid, text, uuid, text, jsonb) from anon, authenticated;
revoke execute on function public.fn_tapband_resolve_credential_for_event(text, uuid, uuid, uuid, uuid, text, text, timestamptz) from anon, authenticated;
revoke execute on function public.fn_tapband_customer_credentials(uuid) from anon, authenticated;

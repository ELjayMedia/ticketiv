-- Allow the client/login bootstrap path to execute the user bootstrap RPC.
-- The function is SECURITY DEFINER and owned by postgres, so callers only need EXECUTE.
grant execute on function public.fn_bootstrap_ticketiv_user(uuid, text, text, text) to anon;
grant execute on function public.fn_bootstrap_ticketiv_user(uuid, text, text, text) to authenticated;

-- Keep service role access explicit for backend/admin flows.
grant execute on function public.fn_bootstrap_ticketiv_user(uuid, text, text, text) to service_role;;

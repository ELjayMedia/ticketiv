-- Rate-limit grants hardening (control #7): defensive, idempotent revokes.
--
-- Supabase installs an event trigger that GRANTs EXECUTE on newly created public
-- functions to anon/authenticated *directly* (not via PUBLIC). The primitive
-- migration (20260720160000) only revoked fn_rate_limit / fn_rate_limit_gc from
-- PUBLIC, so on a FRESH replay (staging clone, PITR/DR restore) those two could
-- come back anon-callable, letting a browser inflate or purge rate-limit
-- counters directly. This migration revokes EXECUTE from anon/authenticated on
-- all three rate-limit functions so only service_role (and the SECURITY DEFINER
-- callers running as owner) can reach them. Runs last (dated after the wrapper
-- and the rollouts). Safe to run repeatedly.

revoke execute on function public.fn_rate_limit(text, integer, integer) from anon, authenticated;
revoke execute on function public.fn_rate_limit_gc(interval) from anon, authenticated;
revoke execute on function public.fn_rate_limit_edge(text, text, integer, integer) from anon, authenticated;

grant execute on function public.fn_rate_limit(text, integer, integer) to service_role;
grant execute on function public.fn_rate_limit_gc(interval) to service_role;
grant execute on function public.fn_rate_limit_edge(text, text, integer, integer) to service_role;

-- Resolve Supabase security advisor findings for public discovery views
-- by making the views execute with the querying user's permissions/RLS context.
alter view if exists public.v_events_public set (security_invoker = true);
alter view if exists public.v_event_public set (security_invoker = true);
alter view if exists public.v_organizer_public set (security_invoker = true);
alter view if exists public.v_organizer_events_public set (security_invoker = true);
alter view if exists public.v_artist_public set (security_invoker = true);
alter view if exists public.v_artist_events_public set (security_invoker = true);

-- Resolve authenticated SECURITY DEFINER function advisor warnings.
-- These KPI functions already perform explicit authorization checks; running as
-- SECURITY INVOKER also prevents authenticated callers from receiving elevated
-- table access through the function owner.
alter function public.get_event_kpis(uuid) security invoker;
alter function public.get_organizer_kpis(text) security invoker;

-- Keep anonymous execution closed for dashboard functions.
revoke execute on function public.get_event_kpis(uuid) from public;
revoke execute on function public.get_organizer_kpis(text) from public;

grant execute on function public.get_event_kpis(uuid) to authenticated, service_role;
grant execute on function public.get_organizer_kpis(text) to authenticated, service_role;;

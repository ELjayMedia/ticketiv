-- Fix public event browsing through curated public views.
-- These views expose only public event fields used by discovery/detail pages.

-- Ensure the public API roles can use the public schema and read the curated views.
grant usage on schema public to anon, authenticated;
grant select on public.v_events_public to anon, authenticated, service_role;
grant select on public.v_event_public to anon, authenticated, service_role;

-- Keep public access mediated by the view owner instead of caller RLS on base tables.
-- This prevents anon/authenticated requests from being denied by base-table RLS while
-- still exposing only the columns and rows defined by the views.
alter view public.v_events_public set (security_invoker = false);
alter view public.v_event_public set (security_invoker = false);

-- Refresh PostgREST schema cache so REST endpoints immediately see the grants/options.
notify pgrst, 'reload schema';;

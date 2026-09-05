-- Fix Supabase security advisor ERRORs for public event-facing views.
-- These views should execute with the querying user's permissions/RLS,
-- not the view owner's privileges.

alter view public.v_event_lineup_public set (security_invoker = true);
alter view public.v_event_friends_going set (security_invoker = true);
alter view public.v_event_public set (security_invoker = true);
alter view public.v_public_event_cards set (security_invoker = true);
;

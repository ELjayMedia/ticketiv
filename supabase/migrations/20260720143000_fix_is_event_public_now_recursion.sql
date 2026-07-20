-- Fix infinite recursion in app.is_event_public_now.
--
-- app.is_event_public_now(uuid) reads public.events, and the events /
-- ticket_types SELECT policies call app.is_event_public_now(...). Because the
-- function was SECURITY INVOKER, its read of events re-triggered the events RLS
-- policy, which called the function again -> unbounded mutual recursion ->
-- "54001 stack depth limit exceeded" on ANY authenticated read of events or
-- ticket_types (organizer dashboards, logged-in event pages, etc.).
--
-- The rest of the app.* RLS-helper family is SECURITY DEFINER (owned by
-- postgres, which bypasses RLS); this one was the outlier. Making it SECURITY
-- DEFINER lets its internal read of events bypass RLS, breaking the loop. It
-- only checks public-visibility columns and returns a boolean, so it exposes
-- nothing private.

alter function app.is_event_public_now(uuid) security definer;

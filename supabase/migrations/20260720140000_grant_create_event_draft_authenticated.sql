-- Restore EXECUTE on create_event_draft for authenticated users.
--
-- create_event_draft is a SECURITY DEFINER RPC that internally enforces
-- auth.uid() IS NOT NULL and can_manage_org(p_org_id, uid), then inserts the
-- draft event and makes the creator an event organizer_admin. It is called
-- from the client event-creation form (app/orgs/[orgId]/events/new/
-- new-event-form.tsx) with the browser (authenticated) client.
--
-- The RLS-canonical hardening left authenticated without EXECUTE on it, so
-- every event-creation attempt failed with
-- "permission denied for function create_event_draft" (42501). The function's
-- own membership check is the real enforcement layer, so granting EXECUTE to
-- authenticated is safe. anon must not create events, so it is not granted.

grant execute on function public.create_event_draft(uuid, text, text) to authenticated;

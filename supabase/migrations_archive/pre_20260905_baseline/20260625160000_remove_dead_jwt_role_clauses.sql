-- TICK-269 (S4): remove dead auth.jwt() app-role clauses from RLS policies.
--
-- There is no custom access-token/claims hook in the database, so auth.jwt() only
-- carries Supabase's built-in role ('authenticated' / 'anon' / 'service_role').
-- Clauses comparing auth.jwt()->>'role' / 'user_role' / 'org_id' against app roles
-- or org ids therefore never evaluate true — they are dead and misleading. This
-- migration strips them while leaving every legitimate membership/owner/admin path
-- intact, so grant/deny decisions are unchanged.

begin;

set local search_path = public, pg_catalog;

-- 1) events: drop the dead "(jwt->>'role') = ANY('organizer','admin')" OR branch.
alter policy events_select_authenticated on public.events
using (
  ((visibility = 'public'::text) AND ((status = 'published'::event_status) OR (publish_at <= now())))
  OR public.is_global_admin((select auth.uid()))
  OR public.is_org_member(org_id, (select auth.uid()))
  OR (org_id IN (SELECT public.current_user_org_ids()))
  OR app.is_event_public_now(id)
  OR app.role_in_membership(org_id, app.current_user_id(), NULL::text[])
  OR app.role_in_event_staff(id, app.current_user_id(), NULL::text[])
  OR (org_id IN (SELECT org_members.org_id FROM public.org_members WHERE org_members.user_id = (select auth.uid())))
  OR (EXISTS (SELECT 1 FROM public.event_staff es WHERE es.event_id = events.id AND es.user_id = (select auth.uid())))
);

-- 2) app_audit_log: drop the dead "(jwt->>'role') = 'admin'" OR branch.
alter policy audit_log_select_combined on public.app_audit_log
using (
  public.is_org_admin(changed_by)
  OR (((row_data ->> 'org_id'::text))::uuid = public.get_user_org())
);

-- 3) payout_accounts: drop the dead "org_id = (jwt->>'org_id')::uuid" OR branch,
--    keeping the real organizer_owner/organizer_admin membership check.
alter policy payout_accounts_org_delete on public.payout_accounts
using (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = payout_accounts.org_id
      AND org_members.user_id = (select auth.uid())
      AND org_members.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role])
  )
);

-- 4) transfers: drop the dead "(jwt->>'user_role') = 'admin'" branch from both
--    USING and WITH CHECK, keeping the sender/recipient owner checks.
alter policy transfers_update_authenticated on public.transfers
using (
  from_user_id = (select auth.uid())
  OR to_user_id = (select auth.uid())
)
with check (
  from_user_id = (select auth.uid())
  OR to_user_id = (select auth.uid())
);

-- 5) audit_log: the delete policy's ONLY qual was the dead
--    "(jwt->>'user_role') = 'admin'" — it granted nobody. Drop it; deletes remain
--    denied under RLS (service-role admin paths bypass RLS), preserving behaviour.
drop policy if exists audit_log_delete_admin on public.audit_log;

commit;

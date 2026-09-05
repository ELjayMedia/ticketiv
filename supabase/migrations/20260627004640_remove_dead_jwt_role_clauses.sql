begin;

set local search_path = public, pg_catalog;

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

alter policy audit_log_select_combined on public.app_audit_log
using (
  public.is_org_admin(changed_by)
  OR (((row_data ->> 'org_id'::text))::uuid = public.get_user_org())
);

alter policy payout_accounts_org_delete on public.payout_accounts
using (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = payout_accounts.org_id
      AND org_members.user_id = (select auth.uid())
      AND org_members.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role])
  )
);

alter policy transfers_update_authenticated on public.transfers
using (
  from_user_id = (select auth.uid())
  OR to_user_id = (select auth.uid())
)
with check (
  from_user_id = (select auth.uid())
  OR to_user_id = (select auth.uid())
);

drop policy if exists audit_log_delete_admin on public.audit_log;

commit;;

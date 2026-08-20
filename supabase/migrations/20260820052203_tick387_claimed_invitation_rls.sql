-- TICK-387: Ticketiv anonymous checkout identities also carry the authenticated
-- Postgres role. Social invitation reads require a claimed/permanent account.

drop policy if exists event_invitations_select_participants on public.event_invitations;
create policy event_invitations_select_participants
on public.event_invitations
for select
to authenticated
using (
  app.is_claimed_account()
  and (inviter_id = (select auth.uid()) or invitee_id = (select auth.uid()))
);

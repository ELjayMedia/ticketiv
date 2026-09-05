-- TICK-42: optimize RLS policies flagged by Supabase Performance Advisor
-- (auth_rls_initplan) and collapse the duplicate permissive SELECT policies
-- on event_live_stats.
--
-- auth_rls_initplan fires when a policy calls auth.uid() / current_setting()
-- (or a helper that takes auth.uid() as an argument) directly, because the
-- expression is re-evaluated for every candidate row. Wrapping the volatile
-- call in a scalar subquery — (select auth.uid()) — lets the planner hoist it
-- into an InitPlan that runs once per statement. Behaviour is identical.
--
-- Only the flagged policy expressions are touched. No indexes are dropped
-- (explicitly out of scope per the ticket).

begin;

-- ----------------------------------------------------------------------------
-- feature_flags
-- ----------------------------------------------------------------------------
alter policy feature_flags_delete on public.feature_flags
  using ((org_id is null) and is_super_admin((select auth.uid())));

alter policy feature_flags_insert on public.feature_flags
  with check ((org_id is null) and is_super_admin((select auth.uid())));

alter policy feature_flags_select on public.feature_flags
  using (
    ((org_id is null) and is_super_admin((select auth.uid())))
    or is_org_admin(org_id)
    or (exists (
      select 1 from org_members m
      where m.org_id = feature_flags.org_id and m.user_id = (select auth.uid())
    ))
  );

alter policy feature_flags_update on public.feature_flags
  using ((org_id is null) and is_super_admin((select auth.uid())))
  with check ((org_id is null) and is_super_admin((select auth.uid())));

-- ----------------------------------------------------------------------------
-- payment_routing_rules
-- ----------------------------------------------------------------------------
alter policy payment_routing_rules_delete on public.payment_routing_rules
  using (is_super_admin((select auth.uid())));

alter policy payment_routing_rules_insert on public.payment_routing_rules
  with check (is_super_admin((select auth.uid())));

alter policy payment_routing_rules_select on public.payment_routing_rules
  using (is_super_admin((select auth.uid())));

alter policy payment_routing_rules_update on public.payment_routing_rules
  using (is_super_admin((select auth.uid())))
  with check (is_super_admin((select auth.uid())));

-- ----------------------------------------------------------------------------
-- webhook_endpoints
-- ----------------------------------------------------------------------------
alter policy webhook_endpoints_delete on public.webhook_endpoints
  using (is_super_admin((select auth.uid())) or ((org_id is not null) and is_org_admin(org_id)));

alter policy webhook_endpoints_insert on public.webhook_endpoints
  with check (is_super_admin((select auth.uid())) or ((org_id is not null) and is_org_admin(org_id)));

alter policy webhook_endpoints_select on public.webhook_endpoints
  using (is_super_admin((select auth.uid())) or ((org_id is not null) and is_org_admin(org_id)));

alter policy webhook_endpoints_update on public.webhook_endpoints
  using (is_super_admin((select auth.uid())) or ((org_id is not null) and is_org_admin(org_id)))
  with check (is_super_admin((select auth.uid())) or ((org_id is not null) and is_org_admin(org_id)));

-- ----------------------------------------------------------------------------
-- webhook_deliveries
-- ----------------------------------------------------------------------------
alter policy webhook_deliveries_select on public.webhook_deliveries
  using (exists (
    select 1 from webhook_endpoints e
    where e.id = webhook_deliveries.endpoint_id
      and (is_super_admin((select auth.uid())) or ((e.org_id is not null) and is_org_admin(e.org_id)))
  ));

-- ----------------------------------------------------------------------------
-- waitlists — wrap auth.uid() and app.current_user_id() as InitPlans.
-- ----------------------------------------------------------------------------
alter policy waitlists_delete on public.waitlists
  using (
    (user_id = (select app.current_user_id()))
    or (exists (
      select 1 from events e
      where e.id = waitlists.event_id
        and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role])
    ))
  );

alter policy waitlists_insert on public.waitlists
  with check (
    (status = 'active'::text)
    or (((select auth.uid()) is not null) and (
      (user_id = (select app.current_user_id()))
      or (exists (
        select 1 from events e
        where e.id = waitlists.event_id
          and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role])
      ))
    ))
  );

alter policy waitlists_select on public.waitlists
  using (
    (user_id = (select app.current_user_id()))
    or (exists (
      select 1 from events e
      where e.id = waitlists.event_id
        and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role])
    ))
  );

alter policy waitlists_update on public.waitlists
  using (
    (user_id = (select app.current_user_id()))
    or (exists (
      select 1 from events e
      where e.id = waitlists.event_id
        and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role])
    ))
  )
  with check (
    (user_id = (select app.current_user_id()))
    or (exists (
      select 1 from events e
      where e.id = waitlists.event_id
        and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role])
    ))
  );

-- ----------------------------------------------------------------------------
-- event_live_stats — collapse two permissive SELECT policies into one per
-- role. anon keeps the public-events policy; authenticated gets a single
-- policy that ORs the public-events condition with the org/admin condition.
-- ----------------------------------------------------------------------------
alter policy event_live_stats_public_read on public.event_live_stats
  to anon;

alter policy event_live_stats_org_read on public.event_live_stats
  using (
    exists (
      select 1 from events e
      where e.id = event_live_stats.event_id
        and e.status::text = 'published'
        and e.visibility = 'public'
        and (e.publish_at is null or e.publish_at <= now())
        and (e.unpublish_at is null or e.unpublish_at > now())
    )
    or exists (
      select 1 from events e
      where e.id = event_live_stats.event_id
        and (
          is_org_admin(e.org_id)
          or user_has_org_role(e.org_id, array['admin'::text, 'organizer'::text, 'organizer_owner'::text, 'organizer_admin'::text, 'organizer_staff'::text, 'scanner'::text, 'pos'::text])
          or is_super_admin((select auth.uid()))
        )
    )
  );

commit;

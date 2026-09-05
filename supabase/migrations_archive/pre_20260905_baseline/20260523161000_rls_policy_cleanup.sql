drop policy if exists feature_flags_platform_write on public.feature_flags;
drop policy if exists feature_flags_platform_read on public.feature_flags;
drop policy if exists feature_flags_select_consolidated on public.feature_flags;

create policy feature_flags_select on public.feature_flags
for select to authenticated
using (
  ((org_id is null) and is_super_admin())
  or is_org_admin(org_id)
  or exists (
    select 1 from public.org_members m
    where m.org_id = feature_flags.org_id
      and m.user_id = auth.uid()
  )
);

create policy feature_flags_insert on public.feature_flags
for insert to authenticated
with check ((org_id is null) and is_super_admin());

create policy feature_flags_update on public.feature_flags
for update to authenticated
using ((org_id is null) and is_super_admin())
with check ((org_id is null) and is_super_admin());

create policy feature_flags_delete on public.feature_flags
for delete to authenticated
using ((org_id is null) and is_super_admin());

drop policy if exists payment_routing_rules_admin_write on public.payment_routing_rules;
drop policy if exists payment_routing_rules_admin_read on public.payment_routing_rules;

create policy payment_routing_rules_select on public.payment_routing_rules
for select to authenticated
using (is_super_admin());

create policy payment_routing_rules_insert on public.payment_routing_rules
for insert to authenticated
with check (is_super_admin());

create policy payment_routing_rules_update on public.payment_routing_rules
for update to authenticated
using (is_super_admin())
with check (is_super_admin());

create policy payment_routing_rules_delete on public.payment_routing_rules
for delete to authenticated
using (is_super_admin());

drop policy if exists webhook_deliveries_service_write on public.webhook_deliveries;
drop policy if exists webhook_deliveries_endpoint_visibility on public.webhook_deliveries;

create policy webhook_deliveries_select on public.webhook_deliveries
for select to authenticated
using (
  exists (
    select 1 from public.webhook_endpoints e
    where e.id = webhook_deliveries.endpoint_id
      and (is_super_admin() or ((e.org_id is not null) and is_org_admin(e.org_id)))
  )
);

drop policy if exists webhook_endpoints_org_write on public.webhook_endpoints;
drop policy if exists webhook_endpoints_platform_admin on public.webhook_endpoints;
drop policy if exists webhook_endpoints_org_read on public.webhook_endpoints;

create policy webhook_endpoints_select on public.webhook_endpoints
for select to authenticated
using (is_super_admin() or ((org_id is not null) and is_org_admin(org_id)));

create policy webhook_endpoints_insert on public.webhook_endpoints
for insert to authenticated
with check (is_super_admin() or ((org_id is not null) and is_org_admin(org_id)));

create policy webhook_endpoints_update on public.webhook_endpoints
for update to authenticated
using (is_super_admin() or ((org_id is not null) and is_org_admin(org_id)))
with check (is_super_admin() or ((org_id is not null) and is_org_admin(org_id)));

create policy webhook_endpoints_delete on public.webhook_endpoints
for delete to authenticated
using (is_super_admin() or ((org_id is not null) and is_org_admin(org_id)));

drop policy if exists self_or_staff_manage_waitlists on public.waitlists;
drop policy if exists public_join_waitlist on public.waitlists;

create policy waitlists_select on public.waitlists
for select to authenticated
using (
  (user_id = app.current_user_id())
  or exists (
    select 1 from public.events e
    where e.id = waitlists.event_id
      and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role])
  )
);

create policy waitlists_insert on public.waitlists
for insert to anon, authenticated
with check (
  (status = 'active')
  or (
    auth.uid() is not null
    and (
      user_id = app.current_user_id()
      or exists (
        select 1 from public.events e
        where e.id = waitlists.event_id
          and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role])
      )
    )
  )
);

create policy waitlists_update on public.waitlists
for update to authenticated
using (
  (user_id = app.current_user_id())
  or exists (
    select 1 from public.events e
    where e.id = waitlists.event_id
      and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role])
  )
)
with check (
  (user_id = app.current_user_id())
  or exists (
    select 1 from public.events e
    where e.id = waitlists.event_id
      and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role])
  )
);

create policy waitlists_delete on public.waitlists
for delete to authenticated
using (
  (user_id = app.current_user_id())
  or exists (
    select 1 from public.events e
    where e.id = waitlists.event_id
      and app.is_event_staff(e.id, array['organizer_admin'::app_role, 'organizer_staff'::app_role])
  )
);

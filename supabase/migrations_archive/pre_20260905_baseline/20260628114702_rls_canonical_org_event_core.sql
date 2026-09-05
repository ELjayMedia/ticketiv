begin;

-- organizations
drop policy if exists orgs_select_consolidated_authenticated on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated using (app.is_org_member_of(id));
drop policy if exists orgs_member_update on public.organizations;
create policy organizations_update on public.organizations
  for update to authenticated using (app.is_org_admin_of(id)) with check (app.is_org_admin_of(id));

-- org_members
drop policy if exists org_members_authenticated_all_merged on public.org_members;
create policy org_members_select on public.org_members
  for select to authenticated using (app.is_org_member_of(org_id));
create policy org_members_insert on public.org_members
  for insert to authenticated with check (app.is_org_admin_of(org_id));
create policy org_members_update on public.org_members
  for update to authenticated using (app.is_org_admin_of(org_id)) with check (app.is_org_admin_of(org_id));
create policy org_members_delete on public.org_members
  for delete to authenticated using (app.is_org_admin_of(org_id));

-- events
drop policy if exists events_delete_consolidated on public.events;
drop policy if exists events_insert_authenticated on public.events;
create policy events_insert_authenticated on public.events
  for insert to authenticated with check (app.is_org_manager(org_id));
drop policy if exists events_select_authenticated on public.events;
create policy events_select_authenticated on public.events
  for select to authenticated
  using (
    ((visibility = 'public') and ((status = 'published'::event_status) or (publish_at <= now())))
    or app.is_event_public_now(id)
    or app.is_platform_admin()
    or app.is_org_member_of(org_id)
    or app.is_event_staff_of(id, null::app_role[])
  );
drop policy if exists events_update_authenticated on public.events;
create policy events_update_authenticated on public.events
  for update to authenticated
  using (app.is_org_admin_of(org_id) or can_manage_event(id, app.uid()))
  with check (app.is_org_admin_of(org_id) or can_manage_event(id, app.uid()));

-- event_artists
drop policy if exists event_artists_org_rw_restrict on public.event_artists;
create policy event_artists_manage on public.event_artists
  for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_artists.event_id and app.is_org_manager(e.org_id)))
  with check (exists (select 1 from public.events e where e.id = event_artists.event_id and app.is_org_manager(e.org_id)));
drop policy if exists event_artists_public_select on public.event_artists;
create policy event_artists_public_select on public.event_artists
  for select to anon
  using (exists (select 1 from public.events e where e.id = event_artists.event_id and e.visibility = 'public'));

-- event_dates
drop policy if exists event_dates_authenticated_public_or_org_read on public.event_dates;
create policy event_dates_select_authenticated on public.event_dates
  for select to authenticated
  using (fn_event_is_public_now(event_id) or exists (select 1 from public.events e where e.id = event_dates.event_id and app.is_org_manager(e.org_id)));
drop policy if exists event_dates_public_or_org_read on public.event_dates;
create policy event_dates_select_anon on public.event_dates
  for select to anon using (fn_event_is_public_now(event_id));

-- artists
drop policy if exists artists_select_authenticated_merged on public.artists;
create policy artists_select on public.artists
  for select to authenticated
  using ((primary_user_id = app.uid()) or (org_id is not null and app.is_org_member_of(org_id)));
drop policy if exists artists_update_authenticated_merged on public.artists;
create policy artists_update on public.artists
  for update to authenticated
  using ((primary_user_id = app.uid()) or (org_id is not null and app.is_org_admin_of(org_id)))
  with check ((primary_user_id = app.uid()) or (org_id is not null and app.is_org_admin_of(org_id)));
drop policy if exists artists_delete_authenticated on public.artists;
create policy artists_delete on public.artists
  for delete to authenticated
  using ((primary_user_id = app.uid()) or (org_id is not null and app.is_org_owner(org_id)));

-- venues
drop policy if exists venues_read_authenticated_merged on public.venues;
create policy venues_select_authenticated on public.venues
  for select to authenticated
  using ((exists (select 1 from public.events e where e.venue_id = venues.id and fn_event_is_public_now(e.id))) or app.is_org_manager(org_id));
drop policy if exists venues_update_authenticated_merged on public.venues;
create policy venues_update_authenticated on public.venues
  for update to authenticated
  using (app.is_org_manager(org_id)) with check (app.is_org_manager(org_id));

commit;;

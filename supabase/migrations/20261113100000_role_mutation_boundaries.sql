-- Keep view-only platform access separate from mutation authority, and tighten
-- attendee-owned preference/waitlist writes at the database boundary.

create or replace function app.can_platform_mutate()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, app, public
as $$
  select app.is_claimed_account()
     and exists (
       select 1
       from public.admin_users au
       where au.user_id = auth.uid()
         and au.active = true
         and au.role_tier <> 'read_only_admin'
     );
$$;

revoke all on function app.can_platform_mutate() from public;
grant execute on function app.can_platform_mutate() to authenticated, service_role;

create or replace function app.is_org_admin_of(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin']::app_role[])
      or app.can_platform_mutate()
$$;

create or replace function app.is_org_manager(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin']::app_role[])
      or app.can_platform_mutate()
$$;

create or replace function app.is_org_operator(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin','organizer_staff']::app_role[])
      or app.can_platform_mutate()
$$;

drop policy if exists waitlists_insert on public.waitlists;
create policy waitlists_insert
on public.waitlists
for insert
to anon, authenticated
with check (
  status = 'active'
  and quantity_requested between 1 and 10
  and length(coalesce(email, '')) between 3 and 320
  and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  and (
    (app.uid() is null and user_id is null)
    or (app.uid() is not null and user_id = app.uid())
  )
  and (
    ticket_type_id is null
    or exists (
      select 1
      from public.ticket_types tt
      where tt.id = waitlists.ticket_type_id
        and tt.event_id = waitlists.event_id
    )
  )
);

alter table public.notification_mutes
  drop constraint if exists notification_mutes_type_format;
alter table public.notification_mutes
  add constraint notification_mutes_type_format
  check (notification_type ~ '^[a-z][a-z0-9_]{0,63}$') not valid;


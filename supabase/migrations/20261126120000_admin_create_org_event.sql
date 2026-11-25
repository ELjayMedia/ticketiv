-- Command centre: the Ticketiv owner creates organisers and events, and
-- assigns who runs them.
--
--   fn_admin_create_organization   new organisation with a named owner
--   fn_admin_create_event          new draft event for an organisation, with an
--                                  optional event admin
--   fn_admin_assign_event_admin    make someone the admin of one event
--
-- The app layer finds or invites the person's account by email (it never sees
-- or sets passwords); these functions only create records and grant access.
-- The owner is the organisation's organizer_owner. An event admin is an
-- event_staff row with role organizer_admin; event staff must belong to the
-- organisation (ensure_event_staff_in_org), so someone new to it joins as
-- organizer_staff, which on its own gives no access beyond their events.
-- Unlike create_event_draft / fn_create_organization, the calling admin is NOT
-- made a member: platform admins already reach every workspace.
--
-- Only an active super_admin (app.is_platform_owner) may call them. A note is
-- required and everything is audited. Additive only. Rollback: drop the
-- three functions.

create or replace function public.fn_admin_create_organization(
  p_name text,
  p_owner_user_id uuid,
  p_note text,
  p_currency text default 'SZL'
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_currency text := upper(coalesce(nullif(btrim(p_currency), ''), 'SZL'));
  v_base text;
  v_slug text;
  v_suffix integer := 0;
  v_org uuid;
begin
  if not app.is_platform_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_name is null then raise exception 'name_required' using errcode = 'P0001'; end if;
  if char_length(v_name) > 120 then raise exception 'name_too_long' using errcode = 'P0001'; end if;
  if v_note is null or char_length(v_note) < 5 then raise exception 'note_required' using errcode = 'P0001'; end if;
  if v_currency !~ '^[A-Z]{3}$' then raise exception 'currency_invalid' using errcode = 'P0001'; end if;
  if p_owner_user_id is null or not exists (select 1 from auth.users where id = p_owner_user_id) then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'org'; end if;
  v_slug := v_base;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix::text;
  end loop;

  insert into public.organizations (name, slug, default_currency)
  values (v_name, v_slug, v_currency)
  returning id into v_org;
  insert into public.org_members (org_id, user_id, role)
  values (v_org, p_owner_user_id, 'organizer_owner');

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (v_org, (select auth.uid()), 'organizations', v_org::text, 'insert',
          jsonb_build_object('business_action', 'admin_create_organization', 'name', v_name,
                             'owner', p_owner_user_id, 'note', v_note));
  return jsonb_build_object('id', v_org, 'slug', v_slug, 'name', v_name);
end;
$$;

-- Shared by the two event functions: make p_user the admin of p_event.
create or replace function app.admin_grant_event_admin(p_event uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.events where id = p_event;
  if v_org is null then raise exception 'event_not_found' using errcode = 'P0001'; end if;
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;
  insert into public.org_members (org_id, user_id, role)
  values (v_org, p_user, 'organizer_staff')
  on conflict do nothing;
  insert into public.event_staff (event_id, user_id, role, active)
  values (p_event, p_user, 'organizer_admin', true)
  on conflict (event_id, user_id) do update set role = 'organizer_admin', active = true;
end;
$$;
revoke all on function app.admin_grant_event_admin(uuid, uuid) from public, anon, authenticated;

create or replace function public.fn_admin_create_event(
  p_org_id uuid,
  p_title text,
  p_note text,
  p_admin_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_title text := nullif(regexp_replace(btrim(coalesce(p_title, '')), '\s+', ' ', 'g'), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_base text;
  v_event uuid;
begin
  if not app.is_platform_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_title is null then raise exception 'title_required' using errcode = 'P0001'; end if;
  if char_length(v_title) > 200 then raise exception 'title_too_long' using errcode = 'P0001'; end if;
  if v_note is null or char_length(v_note) < 5 then raise exception 'note_required' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.organizations where id = p_org_id) then
    raise exception 'organisation_not_found' using errcode = 'P0001';
  end if;

  v_base := trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'event'; end if;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, created_by)
  values (p_org_id, null, v_title, v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
          'draft', 'private', (select auth.uid()))
  returning id into v_event;

  if p_admin_user_id is not null then
    perform app.admin_grant_event_admin(v_event, p_admin_user_id);
  end if;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (p_org_id, (select auth.uid()), 'events', v_event::text, 'insert',
          jsonb_build_object('business_action', 'admin_create_event', 'title', v_title,
                             'event_admin', p_admin_user_id, 'note', v_note));
  return v_event;
end;
$$;

create or replace function public.fn_admin_assign_event_admin(p_event_id uuid, p_user_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_org uuid;
begin
  if not app.is_platform_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_note is null or char_length(v_note) < 5 then raise exception 'note_required' using errcode = 'P0001'; end if;
  select org_id into v_org from public.events where id = p_event_id;
  if v_org is null then raise exception 'event_not_found' using errcode = 'P0001'; end if;

  perform app.admin_grant_event_admin(p_event_id, p_user_id);

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (v_org, (select auth.uid()), 'event_staff', p_event_id::text || ':' || p_user_id::text, 'insert',
          jsonb_build_object('business_action', 'admin_assign_event_admin', 'event_id', p_event_id,
                             'user_id', p_user_id, 'note', v_note));
end;
$$;

revoke all on function public.fn_admin_create_organization(text, uuid, text, text) from public, anon;
revoke all on function public.fn_admin_create_event(uuid, text, text, uuid) from public, anon;
revoke all on function public.fn_admin_assign_event_admin(uuid, uuid, text) from public, anon;
grant execute on function public.fn_admin_create_organization(text, uuid, text, text) to authenticated;
grant execute on function public.fn_admin_create_event(uuid, text, text, uuid) to authenticated;
grant execute on function public.fn_admin_assign_event_admin(uuid, uuid, text) to authenticated;

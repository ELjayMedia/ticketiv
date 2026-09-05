alter table public.profiles
  add column if not exists role public.app_role not null default 'attendee'::public.app_role;

comment on column public.profiles.user_id is 'Canonical Supabase Auth UUID for this Ticketiv profile. Every app role must be derived from this UUID.';
comment on column public.profiles.role is 'Default account role. Always attendee at signup. Elevated product roles are derived from org_members, event_staff, artists.primary_user_id and events.created_by.';

create or replace function public.fn_bootstrap_ticketiv_user(
  p_user_id uuid,
  p_email text default null,
  p_phone text default null,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = 'P0001';
  end if;

  insert into public.profiles (user_id, display_name, phone, role)
  values (
    p_user_id,
    nullif(trim(coalesce(p_display_name, split_part(coalesce(p_email, ''), '@', 1), '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    'attendee'::public.app_role
  )
  on conflict (user_id) do update
    set
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      phone = coalesce(public.profiles.phone, excluded.phone),
      role = coalesce(public.profiles.role, 'attendee'::public.app_role)
  returning * into v_profile;

  return to_jsonb(v_profile);
end;
$$;

create or replace function public.fn_get_ticketiv_effective_roles(p_user_id uuid)
returns table (
  user_id uuid,
  role_key text,
  role_label text,
  source text,
  source_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select p.user_id, 'attendee'::text, 'Attendee'::text, 'profiles'::text, p.user_id
  from public.profiles p
  where p.user_id = p_user_id

  union

  select om.user_id, 'organizer'::text, 'Organizer'::text, 'org_members'::text, om.org_id
  from public.org_members om
  where om.user_id = p_user_id
    and om.role in ('organizer'::public.app_role, 'organizer_owner'::public.app_role, 'organizer_admin'::public.app_role, 'organizer_staff'::public.app_role, 'finance'::public.app_role)

  union

  select e.created_by, 'organizer'::text, 'Organizer'::text, 'events.created_by'::text, e.id
  from public.events e
  where e.created_by = p_user_id

  union

  select es.user_id, 'scanner'::text, 'Scanner'::text, 'event_staff'::text, es.event_id
  from public.event_staff es
  where es.user_id = p_user_id
    and es.active is true
    and es.role in ('scanner'::public.app_role, 'organizer_scanner'::public.app_role)

  union

  select a.primary_user_id, 'talent'::text, 'Talent'::text, 'artists.primary_user_id'::text, a.id
  from public.artists a
  where a.primary_user_id = p_user_id;
$$;

create or replace function public.fn_get_my_ticketiv_roles()
returns table (
  user_id uuid,
  role_key text,
  role_label text,
  source text,
  source_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select * from public.fn_get_ticketiv_effective_roles(auth.uid());
$$;

revoke all on function public.fn_bootstrap_ticketiv_user(uuid, text, text, text) from public;
revoke all on function public.fn_get_ticketiv_effective_roles(uuid) from public;
revoke all on function public.fn_get_my_ticketiv_roles() from public;

grant execute on function public.fn_bootstrap_ticketiv_user(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.fn_get_my_ticketiv_roles() to authenticated, service_role;
grant execute on function public.fn_get_ticketiv_effective_roles(uuid) to service_role;

comment on function public.fn_bootstrap_ticketiv_user(uuid, text, text, text)
is 'Creates or updates a Ticketiv profile for a Supabase Auth UUID. Signup default is always attendee.';

comment on function public.fn_get_ticketiv_effective_roles(uuid)
is 'Derives the four Ticketiv UI roles from UUID-linked records: Attendee, Organizer, Scanner, Talent.';;

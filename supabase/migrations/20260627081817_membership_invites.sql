begin;

create table if not exists public.membership_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  org_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  kind text not null check (kind in ('org_member', 'event_staff')),
  role public.app_role not null,
  invited_email text,
  created_by uuid not null default auth.uid(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint membership_invites_event_kind_chk check (
    (kind = 'event_staff' and event_id is not null)
    or (kind = 'org_member' and event_id is null)
  )
);

create index if not exists membership_invites_org_idx on public.membership_invites (org_id);
create index if not exists membership_invites_token_idx on public.membership_invites (token);

alter table public.membership_invites enable row level security;

drop policy if exists membership_invites_admin_select on public.membership_invites;
create policy membership_invites_admin_select on public.membership_invites
  for select to authenticated
  using (public.is_org_admin(org_id));

create or replace function public.fn_create_membership_invite(
  p_org_id uuid,
  p_kind text,
  p_role public.app_role,
  p_event_id uuid default null,
  p_invited_email text default null,
  p_expires_in interval default interval '14 days'
)
returns public.membership_invites
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_invite public.membership_invites;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_org_admin(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_kind = 'org_member' then
    if p_role not in ('organizer_owner', 'organizer_admin', 'organizer_staff', 'finance') then
      raise exception 'invalid org role' using errcode = '22023';
    end if;
    if p_event_id is not null then
      raise exception 'event_id not allowed for org_member invite' using errcode = '22023';
    end if;
  elsif p_kind = 'event_staff' then
    if p_role not in ('scanner', 'organizer_scanner') then
      raise exception 'invalid event staff role' using errcode = '22023';
    end if;
    if p_event_id is null then
      raise exception 'event_id required for event_staff invite' using errcode = '22023';
    end if;
    if not exists (select 1 from public.events e where e.id = p_event_id and e.org_id = p_org_id) then
      raise exception 'event not in org' using errcode = '22023';
    end if;
  else
    raise exception 'invalid kind' using errcode = '22023';
  end if;

  insert into public.membership_invites (org_id, event_id, kind, role, invited_email, created_by, expires_at)
  values (
    p_org_id,
    p_event_id,
    p_kind,
    p_role,
    nullif(btrim(coalesce(p_invited_email, '')), ''),
    v_user,
    now() + coalesce(p_expires_in, interval '14 days')
  )
  returning * into v_invite;

  return v_invite;
end;
$function$;

revoke execute on function public.fn_create_membership_invite(uuid, text, public.app_role, uuid, text, interval) from public, anon;
grant execute on function public.fn_create_membership_invite(uuid, text, public.app_role, uuid, text, interval) to authenticated;

create or replace function public.fn_accept_membership_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_invite public.membership_invites;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_invite
  from public.membership_invites
  where token = p_token
  for update;

  if v_invite.id is null then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'invite revoked' using errcode = 'P0001';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite already used' using errcode = 'P0001';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'invite expired' using errcode = 'P0001';
  end if;

  if v_invite.kind = 'org_member' then
    insert into public.org_members (org_id, user_id, role)
    values (v_invite.org_id, v_user, v_invite.role)
    on conflict (org_id, user_id) do update set role = excluded.role;
  else
    insert into public.event_staff (event_id, user_id, role, active)
    values (v_invite.event_id, v_user, v_invite.role, true)
    on conflict (event_id, user_id) do update set role = excluded.role, active = true;
  end if;

  update public.membership_invites
  set accepted_by = v_user, accepted_at = now()
  where id = v_invite.id;

  return jsonb_build_object(
    'kind', v_invite.kind,
    'org_id', v_invite.org_id,
    'event_id', v_invite.event_id,
    'role', v_invite.role::text
  );
end;
$function$;

revoke execute on function public.fn_accept_membership_invite(text) from public, anon;
grant execute on function public.fn_accept_membership_invite(text) to authenticated;

create or replace function public.fn_revoke_membership_invite(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_org uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select org_id into v_org from public.membership_invites where id = p_id;
  if v_org is null then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if not public.is_org_admin(v_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.membership_invites set revoked_at = now()
  where id = p_id and accepted_at is null;
end;
$function$;

revoke execute on function public.fn_revoke_membership_invite(uuid) from public, anon;
grant execute on function public.fn_revoke_membership_invite(uuid) to authenticated;

commit;;

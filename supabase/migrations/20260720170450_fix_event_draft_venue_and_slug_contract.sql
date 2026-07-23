alter table public.events
  alter column venue_id drop not null;

alter table public.events
  drop constraint if exists events_non_draft_requires_venue;

alter table public.events
  add constraint events_non_draft_requires_venue
  check (status = 'draft'::public.event_status or venue_id is not null);

create or replace function public.create_event_draft(
  p_org_id uuid,
  p_title text,
  p_visibility text default 'private'::text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_event_id uuid;
  v_user uuid;
  v_slug_base text;
  v_slug text;
begin
  v_user := auth.uid();

  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_org(p_org_id, v_user) then
    raise exception 'Not allowed for this org';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception 'Event title is required';
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(btrim(p_title)), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'event';
  end if;

  v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.events (
    org_id,
    venue_id,
    title,
    slug,
    status,
    visibility,
    created_by
  )
  values (
    p_org_id,
    null,
    btrim(p_title),
    v_slug,
    'draft',
    coalesce(nullif(btrim(p_visibility), ''), 'private'),
    v_user
  )
  returning id into v_event_id;

  insert into public.event_staff (event_id, user_id, role)
  values (v_event_id, v_user, 'organizer_admin')
  on conflict (event_id, user_id)
  do update set role = excluded.role;

  return v_event_id;
end;
$function$;

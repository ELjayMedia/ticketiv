-- Event sponsors.
--
-- One shared sponsor directory for the whole platform, like venues: a sponsor
-- (name, logo, website) is added once and any organiser can pick it for their
-- events. Each event keeps its own list, in order, and can mark sponsors as
-- featured ("Presented by" on the event page).
--
--   sponsors                  the shared sponsor directory (name unique, case/spacing ignored)
--   event_sponsors            which sponsors appear on an event, in order
--   fn_save_sponsor           organisers: find a sponsor by name or add it; may fill in a
--                             missing logo or website, never change one already set
--   fn_admin_update_sponsor   super admin only: rename, change or remove the logo, website
--   fn_event_set_sponsors     replace an event's sponsor list in one go
--   fn_public_event_sponsors  what the public event page shows (public events only)
--
-- Organiser writes: owners, admins and organisers of an organisation (the roles
-- that edit events) and platform admins except read-only. Changing an existing
-- logo is reserved to super admins, so one organiser can't alter a brand that
-- other organisers' events show.
-- Tables are not readable directly; reads go through the server or the public
-- RPC. Additive only. Rollback: drop the functions and both tables.

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text generated always as (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) stored,
  logo_url text,
  website_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_org uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsors_name_len check (char_length(btrim(name)) between 1 and 120),
  constraint sponsors_logo_url check (logo_url is null or (logo_url ~ '^https://' and char_length(logo_url) <= 1000)),
  constraint sponsors_website_url check (website_url is null or (website_url ~ '^https?://' and char_length(website_url) <= 500))
);
create unique index if not exists ux_sponsors_name on public.sponsors (name_key);
create index if not exists idx_sponsors_created_by on public.sponsors (created_by);
create index if not exists idx_sponsors_created_by_org on public.sponsors (created_by_org);

create table if not exists public.event_sponsors (
  event_id uuid not null references public.events(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (event_id, sponsor_id)
);
create index if not exists idx_event_sponsors_sponsor on public.event_sponsors (sponsor_id);

alter table public.sponsors enable row level security;
alter table public.event_sponsors enable row level security;
-- No policies: the server (service role) and the RPCs below are the only way in.
revoke all on public.sponsors, public.event_sponsors from anon, authenticated;
grant select, insert, update, delete on public.sponsors, public.event_sponsors to service_role;

drop trigger if exists t_sponsors_touch on public.sponsors;
create trigger t_sponsors_touch before update on public.sponsors
  for each row execute function public.touch_updated_at();

-- Who may manage an organisation's event sponsors (same roles that edit its events).
create or replace function app.can_manage_org_sponsors(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin','organizer','admin']::public.app_role[])
      or app.can_platform_mutate()
$$;
revoke all on function app.can_manage_org_sponsors(uuid) from public, anon;
grant execute on function app.can_manage_org_sponsors(uuid) to authenticated, service_role;

-- Shared validation: returns the cleaned website, raising on bad input.
create or replace function app.sponsor_clean_website(p_website text)
returns text
language plpgsql
immutable
set search_path to ''
as $$
declare
  v text := nullif(btrim(coalesce(p_website, '')), '');
begin
  if v is null then return null; end if;
  if v !~ '^https?://' then v := 'https://' || v; end if;
  if char_length(v) > 500 or v !~ '^https?://[^\s/]+\.[^\s]+$' then
    raise exception 'website_invalid' using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- ── organisers: find or add a sponsor ──────────────────────────────────────
-- With p_sponsor_id null: the sponsor with that name (case and spacing ignored),
-- or a new one. With p_sponsor_id: that sponsor. Either way a logo or website is
-- only filled in where none is set yet; existing ones are never changed here.
create or replace function public.fn_save_sponsor(
  p_org_id uuid,
  p_name text default null,
  p_logo_url text default null,
  p_website_url text default null,
  p_sponsor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_logo text := nullif(btrim(coalesce(p_logo_url, '')), '');
  v_site text;
  v_id uuid;
begin
  if p_org_id is null or not app.can_manage_org_sponsors(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_logo is not null and (v_logo !~ '^https://' or char_length(v_logo) > 1000) then
    raise exception 'logo_invalid' using errcode = 'P0001';
  end if;
  v_site := app.sponsor_clean_website(p_website_url);

  if p_sponsor_id is not null then
    v_id := p_sponsor_id;
    if not exists (select 1 from public.sponsors where id = v_id) then
      raise exception 'not_found' using errcode = 'P0001';
    end if;
  else
    if v_name is null then raise exception 'name_required' using errcode = 'P0001'; end if;
    if char_length(v_name) > 120 then raise exception 'name_too_long' using errcode = 'P0001'; end if;
    select id into v_id from public.sponsors where name_key = lower(v_name);
    if v_id is null then
      insert into public.sponsors (name, logo_url, website_url, created_by, created_by_org)
      values (v_name, v_logo, v_site, (select auth.uid()), p_org_id)
      on conflict (name_key) do nothing
      returning id into v_id;
      if v_id is not null then return v_id; end if;
      select id into v_id from public.sponsors where name_key = lower(v_name);
    end if;
  end if;

  update public.sponsors
     set logo_url = coalesce(logo_url, v_logo),
         website_url = coalesce(website_url, v_site)
   where id = v_id
     and ((logo_url is null and v_logo is not null) or (website_url is null and v_site is not null));
  return v_id;
end;
$$;

-- ── super admin: edit a sponsor ────────────────────────────────────────────
create or replace function public.fn_admin_update_sponsor(
  p_sponsor_id uuid,
  p_name text,
  p_logo_url text default null,
  p_website_url text default null,
  p_clear_logo boolean default false
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_logo text := nullif(btrim(coalesce(p_logo_url, '')), '');
  v_site text;
  v_before public.sponsors;
begin
  if not app.is_platform_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_name is null then raise exception 'name_required' using errcode = 'P0001'; end if;
  if char_length(v_name) > 120 then raise exception 'name_too_long' using errcode = 'P0001'; end if;
  if v_logo is not null and (v_logo !~ '^https://' or char_length(v_logo) > 1000) then
    raise exception 'logo_invalid' using errcode = 'P0001';
  end if;
  v_site := app.sponsor_clean_website(p_website_url);

  select * into v_before from public.sponsors where id = p_sponsor_id;
  if v_before.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;

  begin
    update public.sponsors
       set name = v_name,
           logo_url = case when coalesce(p_clear_logo, false) then null else coalesce(v_logo, logo_url) end,
           website_url = v_site
     where id = p_sponsor_id;
  exception when unique_violation then
    raise exception 'sponsor_exists' using errcode = 'P0001';
  end;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (null, (select auth.uid()), 'sponsors', p_sponsor_id::text, 'update',
          jsonb_build_object('business_action', 'edit_sponsor',
                             'name', jsonb_build_object('from', v_before.name, 'to', v_name),
                             'logo_changed', coalesce(p_clear_logo, false) or (v_logo is not null and v_logo is distinct from v_before.logo_url),
                             'website', jsonb_build_object('from', v_before.website_url, 'to', v_site)));
end;
$$;

-- ── an event's sponsor list ────────────────────────────────────────────────
-- p_sponsors: [{"sponsor_id": uuid, "featured": bool}, ...] in display order.
-- Replaces the whole list. Any sponsor in the shared directory may be used.
create or replace function public.fn_event_set_sponsors(p_event_id uuid, p_sponsors jsonb)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_org uuid;
  v_count integer;
begin
  select org_id into v_org from public.events where id = p_event_id;
  if v_org is null then raise exception 'event_not_found' using errcode = 'P0001'; end if;
  if not app.can_manage_org_sponsors(v_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_sponsors is null or jsonb_typeof(p_sponsors) <> 'array' then
    raise exception 'sponsors_invalid' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_sponsors) > 30 then
    raise exception 'too_many_sponsors' using errcode = 'P0001';
  end if;

  create temp table if not exists _wanted (sponsor_id uuid, featured boolean, sort_order integer) on commit drop;
  truncate _wanted;
  begin
    insert into _wanted
    select (e.value->>'sponsor_id')::uuid, coalesce((e.value->>'featured')::boolean, false), (e.ordinality - 1)::integer
      from jsonb_array_elements(p_sponsors) with ordinality as e(value, ordinality);
  exception when others then
    raise exception 'sponsors_invalid' using errcode = 'P0001';
  end;

  if exists (select 1 from _wanted where sponsor_id is null)
     or (select count(*) from _wanted) <> (select count(distinct sponsor_id) from _wanted) then
    raise exception 'sponsors_invalid' using errcode = 'P0001';
  end if;
  if exists (select 1 from _wanted w left join public.sponsors s on s.id = w.sponsor_id where s.id is null) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  delete from public.event_sponsors es
   where es.event_id = p_event_id
     and not exists (select 1 from _wanted w where w.sponsor_id = es.sponsor_id);
  insert into public.event_sponsors (event_id, sponsor_id, featured, sort_order)
  select p_event_id, w.sponsor_id, w.featured, w.sort_order from _wanted w
  on conflict (event_id, sponsor_id) do update
    set featured = excluded.featured, sort_order = excluded.sort_order;

  select count(*) into v_count from public.event_sponsors where event_id = p_event_id;
  return v_count;
end;
$$;

-- ── public read ────────────────────────────────────────────────────────────
-- Only for events the public can see (v_events_public), in display order.
create or replace function public.fn_public_event_sponsors(p_event_id uuid)
returns table (name text, logo_url text, website_url text, featured boolean)
language sql
stable
security definer
set search_path to ''
as $$
  select s.name, s.logo_url, s.website_url, es.featured
    from public.event_sponsors es
    join public.sponsors s on s.id = es.sponsor_id
   where es.event_id = p_event_id
     and exists (select 1 from public.v_events_public v where v.id = p_event_id)
   order by es.featured desc, es.sort_order, s.name
$$;

revoke all on function public.fn_save_sponsor(uuid, text, text, text, uuid) from public, anon;
revoke all on function public.fn_admin_update_sponsor(uuid, text, text, text, boolean) from public, anon;
revoke all on function app.sponsor_clean_website(text) from public, anon;
revoke all on function public.fn_event_set_sponsors(uuid, jsonb) from public, anon;
revoke all on function public.fn_public_event_sponsors(uuid) from public;
grant execute on function public.fn_save_sponsor(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.fn_admin_update_sponsor(uuid, text, text, text, boolean) to authenticated;
grant execute on function app.sponsor_clean_website(text) to authenticated, service_role;
grant execute on function public.fn_event_set_sponsors(uuid, jsonb) to authenticated;
grant execute on function public.fn_public_event_sponsors(uuid) to anon, authenticated;

comment on table public.sponsors is 'Shared sponsor directory: added once, used by any organiser. Only super admins change an existing logo.';
comment on table public.event_sponsors is 'Sponsors shown on an event, in order; featured ones lead as "Presented by".';

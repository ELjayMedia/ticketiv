-- Separate private legal/contact data from public profile identity.
-- Public profiles retain display_name/avatar_url; private fields are owner-readable only.

create table public.user_private_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  surname text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_private_profiles enable row level security;

revoke all on table public.user_private_profiles from anon, public;
grant select, insert, update on table public.user_private_profiles to authenticated;
grant all on table public.user_private_profiles to service_role;

create policy "user_private_profiles_self_select"
on public.user_private_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_private_profiles_self_insert"
on public.user_private_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_private_profiles_self_update"
on public.user_private_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into public.user_private_profiles (user_id, name, surname, phone)
select user_id, name, surname, phone
from public.profiles
on conflict (user_id) do update
set name = excluded.name,
    surname = excluded.surname,
    phone = excluded.phone,
    updated_at = now();

create or replace function public.fn_update_my_profile(
  p_display_name text default null,
  p_name text default null,
  p_surname text default null,
  p_phone text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform app.require_claimed_account();

  update public.profiles
  set display_name = nullif(btrim(coalesce(p_display_name, display_name)), '')
  where user_id = v_user;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  insert into public.user_private_profiles (user_id, name, surname, phone)
  values (
    v_user,
    nullif(btrim(coalesce(p_name, '')), ''),
    nullif(btrim(coalesce(p_surname, '')), ''),
    nullif(btrim(coalesce(p_phone, '')), '')
  )
  on conflict (user_id) do update
  set name = excluded.name,
      surname = excluded.surname,
      phone = excluded.phone,
      updated_at = now();
end;
$function$;

revoke execute on function public.fn_update_my_profile(text, text, text, text) from public, anon;
grant execute on function public.fn_update_my_profile(text, text, text, text) to authenticated, service_role;

create or replace function public.fn_update_my_profile_unchecked(
  p_display_name text default null,
  p_name text default null,
  p_surname text default null,
  p_phone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.profiles
  set display_name = nullif(btrim(coalesce(p_display_name, display_name)), '')
  where user_id = v_user;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  insert into public.user_private_profiles (user_id, name, surname, phone)
  values (
    v_user,
    nullif(btrim(coalesce(p_name, '')), ''),
    nullif(btrim(coalesce(p_surname, '')), ''),
    nullif(btrim(coalesce(p_phone, '')), '')
  )
  on conflict (user_id) do update
  set name = excluded.name,
      surname = excluded.surname,
      phone = excluded.phone,
      updated_at = now();
end;
$function$;

revoke execute on function public.fn_update_my_profile_unchecked(text, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_update_my_profile_unchecked(text, text, text, text) to service_role;

create or replace view public.v_event_friends_going
with (security_invoker = true)
as
with my_friends as (
  select case
    when uc.requester_id = (select auth.uid()) then uc.recipient_id
    else uc.requester_id
  end as friend_id
  from public.user_connections uc
  where uc.status = 'accepted'::public.connection_status
    and ((select auth.uid()) = uc.requester_id or (select auth.uid()) = uc.recipient_id)
)
select distinct
  tt.event_id,
  p.user_id as friend_id,
  coalesce(nullif(btrim(p.display_name), ''), 'Friend') as friend_name,
  uh.handle as friend_handle
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.ticket_types tt on tt.id = oi.ticket_type_id
join my_friends mf on mf.friend_id = o.buyer_id
join public.profiles p on p.user_id = o.buyer_id
left join public.user_handles uh on uh.user_id = p.user_id
where o.status = 'paid'::public.order_status
  and oi.revoked_at is null;

create or replace view public.v_inbound_transfers
with (security_invoker = true)
as
select
  t.id as transfer_id,
  t.order_item_id,
  t.from_user_id,
  t.to_user_id,
  t.status,
  t.created_at as offered_at,
  t.updated_at,
  t.created_at + interval '24 hours' as expires_at,
  coalesce(nullif(btrim(fp.display_name), ''), 'Friend') as from_name,
  fh.handle as from_handle,
  oi.ticket_code,
  oi.ticket_type_id,
  tt.name as ticket_type_name,
  tt.price_cents,
  tt.currency,
  e.id as event_id,
  e.title as event_title,
  e.starts_at as event_starts_at,
  e.cover_image_url,
  v.name as venue_name
from public.transfers t
join public.order_items oi on oi.id = t.order_item_id
left join public.ticket_types tt on tt.id = oi.ticket_type_id
left join public.events e on e.id = tt.event_id
left join public.venues v on v.id = e.venue_id
left join public.profiles fp on fp.user_id = t.from_user_id
left join public.user_handles fh on fh.user_id = t.from_user_id
where t.status = 'pending'::public.transfer_status
  and t.to_user_id = (select auth.uid());

alter table public.profiles
  drop column name,
  drop column surname,
  drop column phone;

comment on table public.user_private_profiles is
  'Owner-only legal name and contact details. Never use for public profile reads.';

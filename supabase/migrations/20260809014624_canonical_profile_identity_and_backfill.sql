-- Canonical identity model for Ticketiv.
-- Auth owns credentials/email. public.profiles owns editable identity fields.
-- Existing non-empty profile values always win over Auth metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_surname text;
  v_display_name text;
  v_phone text;
  v_handle_base text;
  v_handle text;
begin
  v_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'given_name',
    new.raw_user_meta_data ->> 'name'
  )), '');

  v_surname := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'surname',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'family_name'
  )), '');

  v_display_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    concat_ws(' ', v_name, v_surname)
  )), '');

  v_phone := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'phone_number',
    new.phone::text
  )), '');

  insert into public.profiles (user_id, name, surname, display_name, phone)
  values (new.id, v_name, v_surname, v_display_name, v_phone)
  on conflict (user_id) do nothing;

  insert into public.user_notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  v_handle_base := lower(regexp_replace(
    coalesce(
      nullif(new.raw_user_meta_data ->> 'preferred_username', ''),
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'user'
    ),
    '[^a-zA-Z0-9_]+', '', 'g'
  ));
  v_handle_base := left(coalesce(nullif(v_handle_base, ''), 'user'), 21);
  if length(v_handle_base) < 3 then
    v_handle_base := rpad(v_handle_base, 3, 'x');
  end if;
  v_handle := v_handle_base || '_' || left(replace(new.id::text, '-', ''), 8);

  insert into public.user_handles (user_id, handle)
  values (new.id, v_handle)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists tr_mirror_user_phone_to_profile on auth.users;
drop function if exists public.fn_mirror_user_phone_to_profile();

insert into public.profiles (user_id, name, surname, display_name, phone)
select
  u.id,
  nullif(btrim(coalesce(
    u.raw_user_meta_data ->> 'first_name',
    u.raw_user_meta_data ->> 'given_name',
    u.raw_user_meta_data ->> 'name'
  )), ''),
  nullif(btrim(coalesce(
    u.raw_user_meta_data ->> 'surname',
    u.raw_user_meta_data ->> 'last_name',
    u.raw_user_meta_data ->> 'family_name'
  )), ''),
  nullif(btrim(coalesce(
    u.raw_user_meta_data ->> 'display_name',
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  )), ''),
  nullif(btrim(coalesce(
    u.raw_user_meta_data ->> 'phone',
    u.raw_user_meta_data ->> 'phone_number',
    u.phone::text
  )), '')
from auth.users u
on conflict (user_id) do update
set
  name = coalesce(nullif(btrim(public.profiles.name), ''), excluded.name),
  surname = coalesce(nullif(btrim(public.profiles.surname), ''), excluded.surname),
  display_name = coalesce(nullif(btrim(public.profiles.display_name), ''), excluded.display_name),
  phone = coalesce(nullif(btrim(public.profiles.phone), ''), excluded.phone);

insert into public.user_notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

with missing as (
  select
    u.id,
    left(
      coalesce(
        nullif(lower(regexp_replace(
          coalesce(
            nullif(u.raw_user_meta_data ->> 'preferred_username', ''),
            nullif(u.raw_user_meta_data ->> 'user_name', ''),
            split_part(coalesce(u.email, ''), '@', 1),
            'user'
          ),
          '[^a-zA-Z0-9_]+', '', 'g'
        )), ''),
        'user'
      ),
      21
    ) as base
  from auth.users u
  left join public.user_handles h on h.user_id = u.id
  where h.user_id is null
),
normalized as (
  select
    id,
    case when length(base) < 3 then rpad(base, 3, 'x') else base end as base
  from missing
)
insert into public.user_handles (user_id, handle)
select id, base || '_' || left(replace(id::text, '-', ''), 8)
from normalized
on conflict (user_id) do nothing;
;

-- Sign-up creates the whole account in the database, so login doesn't have to.
--
-- Before: the on_auth_user_created trigger (handle_new_user) created profiles,
-- notification preferences and the handle, but not user_private_profiles. To
-- fill the gap every web login, email-link callback and sign-up called
-- fn_bootstrap_ticketiv_user from the app: an extra getUser + RPC round trip on
-- each login. 8 of 12 accounts still had no private profile. The trigger also
-- wrote the sign-up phone number into public.profiles, which the organizer
-- sign-up RPC deliberately keeps empty (phone is private).
--
-- After:
--   * handle_new_user also creates user_private_profiles (name, surname, phone)
--     and no longer writes the phone to public.profiles.
--   * Backfill: every existing account gets a private profile.
--   * fn_bootstrap_ticketiv_user stays (idempotent, older app versions call it).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
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
    concat_ws(' ', v_name, v_surname),
    split_part(coalesce(new.email, ''), '@', 1)
  )), '');

  v_phone := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'phone_number',
    new.phone::text
  )), '');

  -- Public profile: no phone (private).
  insert into public.profiles (user_id, name, surname, display_name, phone)
  values (new.id, v_name, v_surname, v_display_name, null)
  on conflict (user_id) do nothing;

  insert into public.user_private_profiles (user_id, name, surname, phone, updated_at)
  values (new.id, v_name, v_surname, v_phone, now())
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
$function$;

-- Backfill existing accounts (what the per-login bootstrap would have done).
insert into public.user_private_profiles (user_id, name, surname, phone, updated_at)
select
  u.id,
  coalesce(p.name, nullif(btrim(u.raw_user_meta_data ->> 'first_name'), '')),
  coalesce(p.surname, nullif(btrim(u.raw_user_meta_data ->> 'surname'), '')),
  nullif(btrim(coalesce(p.phone, u.raw_user_meta_data ->> 'phone', u.phone::text)), ''),
  now()
from auth.users u
left join public.profiles p on p.user_id = u.id
on conflict (user_id) do nothing;

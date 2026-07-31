-- Organizer registration profile completion.
--
-- Required contact fields are written to public.profiles only after the
-- organizer has verified the email OTP. The optional identity number is kept
-- in a non-exposed schema and is never returned by the client-callable RPC.

begin;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.organizer_identity_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  id_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizer_identity_details_id_number_length
    check (id_number is null or char_length(id_number) between 4 and 64)
);

alter table private.organizer_identity_details enable row level security;

revoke all on table private.organizer_identity_details from public, anon, authenticated;
grant select, insert, update, delete on table private.organizer_identity_details to service_role;

create or replace function public.fn_complete_organizer_signup(
  p_first_name text,
  p_surname text,
  p_phone text,
  p_id_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'app', 'public', 'private'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_first_name text := nullif(btrim(p_first_name), '');
  v_surname text := nullif(btrim(p_surname), '');
  v_phone text := regexp_replace(coalesce(btrim(p_phone), ''), '[^0-9+]', '', 'g');
  v_id_number text := nullif(btrim(p_id_number), '');
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  perform app.require_claimed_account();

  if v_first_name is null then
    raise exception 'first_name_required' using errcode = '22023';
  end if;
  if char_length(v_first_name) > 100 then
    raise exception 'first_name_too_long' using errcode = '22023';
  end if;

  if v_surname is null then
    raise exception 'surname_required' using errcode = '22023';
  end if;
  if char_length(v_surname) > 100 then
    raise exception 'surname_too_long' using errcode = '22023';
  end if;

  if v_phone !~ '^\+?[0-9]{7,15}$' then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;

  if v_id_number is not null and char_length(v_id_number) not between 4 and 64 then
    raise exception 'invalid_id_number_length' using errcode = '22023';
  end if;

  insert into public.profiles (
    user_id,
    display_name,
    name,
    surname,
    phone
  )
  values (
    v_user_id,
    concat_ws(' ', v_first_name, v_surname),
    v_first_name,
    v_surname,
    v_phone
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        name = excluded.name,
        surname = excluded.surname,
        phone = excluded.phone
  returning * into v_profile;

  if v_id_number is not null then
    insert into private.organizer_identity_details (
      user_id,
      id_number
    )
    values (
      v_user_id,
      v_id_number
    )
    on conflict (user_id) do update
      set id_number = excluded.id_number,
          updated_at = now();
  end if;

  return jsonb_build_object(
    'user_id', v_profile.user_id,
    'display_name', v_profile.display_name,
    'phone', v_profile.phone,
    'has_id_number', v_id_number is not null
  );
end;
$function$;

revoke execute on function public.fn_complete_organizer_signup(text, text, text, text)
  from public, anon;
grant execute on function public.fn_complete_organizer_signup(text, text, text, text)
  to authenticated;

comment on function public.fn_complete_organizer_signup(text, text, text, text) is
  'Completes the signed-in user organizer profile after email OTP verification; optional ID is stored privately.';

comment on table private.organizer_identity_details is
  'Sensitive optional organizer identity details; not exposed through the Data API.';

commit;

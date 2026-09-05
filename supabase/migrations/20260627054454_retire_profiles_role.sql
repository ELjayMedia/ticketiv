begin;

create or replace function public.fn_bootstrap_ticketiv_user(
  p_user_id uuid,
  p_email text default null,
  p_phone text default null,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_profile public.profiles%rowtype;
  v_caller uuid := auth.uid();
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = 'P0001';
  end if;

  if v_caller is null or v_caller <> p_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.profiles (user_id, display_name, phone)
  values (
    p_user_id,
    nullif(trim(coalesce(p_display_name, split_part(coalesce(p_email, ''), '@', 1), '')), ''),
    nullif(trim(coalesce(p_phone, '')), '')
  )
  on conflict (user_id) do update
    set
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      phone = coalesce(public.profiles.phone, excluded.phone)
  returning * into v_profile;

  return to_jsonb(v_profile);
end;
$function$;

alter table public.profiles drop column if exists role;

comment on type public.app_role is
  'Role enum. Standardized org-membership values: organizer_owner, organizer_admin, organizer_staff, finance. Any other historical values are FROZEN — retained only for legacy data, not for new membership rows. Postgres cannot easily drop enum values. Per-context effective roles come from fn_get_ticketiv_effective_roles. (TICK-268)';

commit;;

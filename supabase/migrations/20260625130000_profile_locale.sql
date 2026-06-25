-- TICK-248: per-user language preference.
--
-- Adds profiles.locale (default 'en') and a SECURITY DEFINER RPC so the language
-- page can persist a locale without a raw client-side update on profiles.

begin;

alter table public.profiles
  add column if not exists locale text not null default 'en';

create or replace function public.fn_set_my_locale(p_locale text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_locale is null or btrim(p_locale) = '' then
    raise exception 'locale required' using errcode = '22023';
  end if;

  update public.profiles
  set locale = btrim(p_locale)
  where user_id = v_user;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end;
$function$;

revoke execute on function public.fn_set_my_locale(text) from public, anon;
grant execute on function public.fn_set_my_locale(text) to authenticated;

commit;

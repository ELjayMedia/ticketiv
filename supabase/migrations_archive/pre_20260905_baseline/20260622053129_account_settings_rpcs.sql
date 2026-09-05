begin;

create or replace function public.fn_update_my_profile(
  p_display_name text default null,
  p_name text default null,
  p_surname text default null,
  p_phone text default null
)
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

  update public.profiles
  set
    display_name = nullif(btrim(coalesce(p_display_name, display_name)), ''),
    name = nullif(btrim(coalesce(p_name, name)), ''),
    surname = nullif(btrim(coalesce(p_surname, surname)), ''),
    phone = nullif(btrim(coalesce(p_phone, phone)), '')
  where user_id = v_user;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end;
$function$;

grant execute on function public.fn_update_my_profile(text, text, text, text) to authenticated;

create or replace function public.fn_update_my_notification_preferences(
  p_email_opt_in boolean default null,
  p_sms_opt_in boolean default null,
  p_push_opt_in boolean default null,
  p_in_app_opt_in boolean default null
)
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

  insert into public.user_notification_preferences as p (
    user_id, email_opt_in, sms_opt_in, push_opt_in, in_app_opt_in, updated_at
  )
  values (
    v_user,
    coalesce(p_email_opt_in, true),
    coalesce(p_sms_opt_in, true),
    coalesce(p_push_opt_in, true),
    coalesce(p_in_app_opt_in, true),
    now()
  )
  on conflict (user_id) do update set
    email_opt_in = coalesce(p_email_opt_in, p.email_opt_in),
    sms_opt_in = coalesce(p_sms_opt_in, p.sms_opt_in),
    push_opt_in = coalesce(p_push_opt_in, p.push_opt_in),
    in_app_opt_in = coalesce(p_in_app_opt_in, p.in_app_opt_in),
    updated_at = now();
end;
$function$;

grant execute on function public.fn_update_my_notification_preferences(boolean, boolean, boolean, boolean) to authenticated;

commit;;

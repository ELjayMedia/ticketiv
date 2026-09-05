-- TICK-246: buyer-facing payment method management RPCs.
begin;

create or replace function public.fn_set_default_payment_method(p_id uuid)
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

  if not exists (
    select 1 from public.payment_methods
    where id = p_id and user_id = v_user and is_active
  ) then
    raise exception 'payment method not found' using errcode = 'P0002';
  end if;

  update public.payment_methods
  set is_default = (id = p_id),
      updated_at = now()
  where user_id = v_user;
end;
$function$;

grant execute on function public.fn_set_default_payment_method(uuid) to authenticated;

create or replace function public.fn_deactivate_payment_method(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := (select auth.uid());
  v_was_default boolean;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select is_default into v_was_default
  from public.payment_methods
  where id = p_id and user_id = v_user and is_active;

  if v_was_default is null then
    raise exception 'payment method not found' using errcode = 'P0002';
  end if;

  update public.payment_methods
  set is_active = false,
      is_default = false,
      updated_at = now()
  where id = p_id and user_id = v_user;

  if v_was_default then
    update public.payment_methods
    set is_default = true,
        updated_at = now()
    where id = (
      select id from public.payment_methods
      where user_id = v_user and is_active
      order by created_at desc
      limit 1
    );
  end if;
end;
$function$;

grant execute on function public.fn_deactivate_payment_method(uuid) to authenticated;

commit;;

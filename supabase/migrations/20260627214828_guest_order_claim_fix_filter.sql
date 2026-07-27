create or replace function public.fn_find_claimable_guest_orders()
returns table (
  order_id uuid, created_at timestamptz, total_cents integer,
  currency text, item_count integer, event_title text
)
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_email text;
  v_phone text;
begin
  if v_user is null then return; end if;
  select case when u.email_confirmed_at is not null then public.fn_normalize_email(u.email) end,
         case when u.phone_confirmed_at is not null then public.fn_normalize_phone(u.phone) end
  into v_email, v_phone
  from auth.users u where u.id = v_user;
  if v_email is null and v_phone is null then return; end if;
  return query
  select o.id, o.created_at, o.total_cents, o.currency, o.item_count,
         (select e.title from public.order_items oi
            join public.ticket_types tt on tt.id = oi.ticket_type_id
            join public.events e on e.id = tt.event_id
            where oi.order_id = o.id limit 1) as event_title
  from public.orders o
  join auth.users bu on bu.id = o.buyer_id
  where bu.is_anonymous is true
    and o.buyer_id <> v_user
    and o.status <> 'pending'
    and (
      (v_email is not null and public.fn_normalize_email(coalesce(o.buyer_email, o.email)) = v_email)
      or (v_phone is not null and public.fn_normalize_phone(coalesce(o.buyer_phone, o.phone)) = v_phone)
    )
  order by o.created_at desc;
end;
$function$;

create or replace function public.fn_claim_guest_orders()
returns integer
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_email text;
  v_phone text;
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select case when u.email_confirmed_at is not null then public.fn_normalize_email(u.email) end,
         case when u.phone_confirmed_at is not null then public.fn_normalize_phone(u.phone) end
  into v_email, v_phone
  from auth.users u where u.id = v_user;
  if v_email is null and v_phone is null then return 0; end if;

  create temp table _claimable on commit drop as
  select o.id, o.buyer_id as old_buyer
  from public.orders o
  join auth.users bu on bu.id = o.buyer_id
  where bu.is_anonymous is true
    and o.buyer_id <> v_user
    and o.status <> 'pending'
    and (
      (v_email is not null and public.fn_normalize_email(coalesce(o.buyer_email, o.email)) = v_email)
      or (v_phone is not null and public.fn_normalize_phone(coalesce(o.buyer_phone, o.phone)) = v_phone)
    );

  update public.order_items oi
  set current_owner_id = v_user
  from _claimable c
  where oi.order_id = c.id and oi.current_owner_id = c.old_buyer;

  update public.orders o
  set buyer_id = v_user
  from _claimable c
  where o.id = c.id;

  select count(*)::integer into v_count from _claimable;
  return v_count;
end;
$function$;

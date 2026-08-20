-- TICK-388: exact, rate-limited recipient resolution for manual transfer flows.
-- Returns only public profile identity; email/phone are never returned.

create or replace function public.fn_lookup_transfer_recipient(p_identifier text)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  match_kind text
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'app', 'public'
as $$
declare
  v_actor_id uuid := auth.uid();
  v_input text := trim(coalesce(p_identifier, ''));
  v_digits text;
  v_user_id uuid;
  v_kind text;
begin
  perform app.require_claimed_account();

  if length(v_input) < 3 then return; end if;

  if not public.fn_rate_limit(
    'transfer_lookup:' || v_actor_id::text,
    60,
    3600
  ) then
    raise exception 'rate_limited: too many recipient lookups, please try again later'
      using errcode = 'P0001';
  end if;

  if left(v_input, 1) = '@' then
    select uh.user_id into v_user_id
    from public.user_handles uh
    join auth.users u on u.id = uh.user_id
    where lower(uh.handle) = lower(substr(v_input, 2))
      and coalesce(u.is_anonymous, false) = false
    limit 1;
    v_kind := 'handle';
  elsif position('@' in v_input) > 1 then
    select u.id into v_user_id
    from auth.users u
    where lower(u.email) = lower(v_input)
      and coalesce(u.is_anonymous, false) = false
    limit 1;
    v_kind := 'email';
  else
    v_digits := regexp_replace(v_input, '[^0-9]', '', 'g');
    if length(v_digits) >= 8 then
      select u.id into v_user_id
      from auth.users u
      where regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = v_digits
        and coalesce(u.is_anonymous, false) = false
      limit 1;
      v_kind := 'phone';
    end if;
  end if;

  if v_user_id is null or v_user_id = v_actor_id then return; end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_actor_id and b.blocked_id = v_user_id)
       or (b.blocker_id = v_user_id and b.blocked_id = v_actor_id)
  ) then
    return;
  end if;

  return query
  select
    v_user_id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(concat_ws(' ', p.name, p.surname)), ''),
      uh.handle,
      'Ticketiv user'
    )::text,
    uh.handle::text,
    v_kind
  from (select 1) seed
  left join public.profiles p on p.user_id = v_user_id
  left join public.user_handles uh on uh.user_id = v_user_id;
end;
$$;

revoke all on function public.fn_lookup_transfer_recipient(text)
  from public, anon;
grant execute on function public.fn_lookup_transfer_recipient(text)
  to authenticated, service_role;

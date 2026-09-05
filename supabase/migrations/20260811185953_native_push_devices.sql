do $$
begin
  if not exists (select 1 from pg_type where typname = 'push_service') then
    create type public.push_service as enum ('fcm', 'apns', 'hms');
  end if;
end;
$$;

create table if not exists public.push_devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  service      public.push_service not null,
  token        text not null,
  device_id    text not null,
  app_id       text,
  platform_version text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disabled_at  timestamptz,
  disabled_reason text,
  constraint push_devices_token_not_blank check (btrim(token) <> ''),
  constraint push_devices_device_id_not_blank check (btrim(device_id) <> ''),
  unique (user_id, service, device_id)
);

create unique index if not exists push_devices_service_token_key
  on public.push_devices (service, token);

create index if not exists push_devices_user_active_idx
  on public.push_devices (user_id) where disabled_at is null;

comment on table public.push_devices is
  'Native push registrations (FCM/APNs/HMS) for the React Native apps. Web Push lives separately in push_subscriptions. Writes go through SECURITY DEFINER RPCs only.';

alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;

drop policy if exists "push_devices_select_own" on public.push_devices;
create policy "push_devices_select_own"
  on public.push_devices
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.fn_register_push_device(
  p_service          text,
  p_token            text,
  p_device_id        text,
  p_app_id           text default null,
  p_platform_version text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_service public.push_service;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  begin
    v_service := lower(btrim(p_service))::public.push_service;
  exception when invalid_text_representation then
    raise exception 'unsupported_push_service: %', p_service using errcode = 'P0001';
  end;

  if coalesce(btrim(p_token), '') = '' or coalesce(btrim(p_device_id), '') = '' then
    raise exception 'token_and_device_id_required' using errcode = 'P0001';
  end if;

  delete from public.push_devices
   where service = v_service
     and token = btrim(p_token)
     and user_id <> v_user;

  insert into public.push_devices (user_id, service, token, device_id, app_id, platform_version)
  values (v_user, v_service, btrim(p_token), btrim(p_device_id), nullif(btrim(p_app_id), ''), nullif(btrim(p_platform_version), ''))
  on conflict (user_id, service, device_id) do update
     set token            = excluded.token,
         app_id           = coalesce(excluded.app_id, public.push_devices.app_id),
         platform_version = coalesce(excluded.platform_version, public.push_devices.platform_version),
         last_seen_at     = now(),
         disabled_at      = null,
         disabled_reason  = null
  returning id into v_id;

  return v_id;
end;
$function$;

revoke execute on function public.fn_register_push_device(text, text, text, text, text)
  from public, anon;
grant execute on function public.fn_register_push_device(text, text, text, text, text)
  to authenticated, service_role;

create or replace function public.fn_unregister_push_device(p_service text, p_device_id text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_removed integer;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  with gone as (
    delete from public.push_devices
     where user_id = v_user
       and service = lower(btrim(p_service))::public.push_service
       and device_id = btrim(p_device_id)
    returning 1
  )
  select count(*) from gone into v_removed;

  return v_removed;
end;
$function$;

revoke execute on function public.fn_unregister_push_device(text, text) from public, anon;
grant execute on function public.fn_unregister_push_device(text, text) to authenticated, service_role;

create or replace function public.fn_disable_push_device_token(
  p_service text,
  p_token   text,
  p_reason  text default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_disabled integer;
begin
  with gone as (
    update public.push_devices
       set disabled_at = now(),
           disabled_reason = nullif(btrim(p_reason), '')
     where service = lower(btrim(p_service))::public.push_service
       and token = btrim(p_token)
       and disabled_at is null
    returning 1
  )
  select count(*) from gone into v_disabled;

  return v_disabled;
end;
$function$;

revoke execute on function public.fn_disable_push_device_token(text, text, text)
  from public, anon, authenticated;
grant execute on function public.fn_disable_push_device_token(text, text, text) to service_role;

create or replace function public.fn_push_targets_for_user(
  p_user_id uuid,
  p_notification_type text
)
returns table (service text, token text, device_id text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select d.service::text, d.token, d.device_id
  from public.push_devices d
  where d.user_id = p_user_id
    and d.disabled_at is null
    and not exists (
      select 1
      from public.notification_mutes m
      where m.user_id = p_user_id
        and m.notification_type = p_notification_type
    )
  order by d.last_seen_at desc;
$function$;

revoke execute on function public.fn_push_targets_for_user(uuid, text)
  from public, anon, authenticated;
grant execute on function public.fn_push_targets_for_user(uuid, text) to service_role;;

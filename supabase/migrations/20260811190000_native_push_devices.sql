-- TICK-324: native push device registry (FCM / APNs / HMS).
--
-- Why not extend push_subscriptions
-- ---------------------------------
-- That table is Web Push shaped: an endpoint URL plus the p256dh/auth key pair
-- the VAPID sender needs. A native registration is a bare token plus the
-- service that issued it. Folding both into one table would mean four nullable
-- columns whose validity depends on a discriminator, on a table the browser
-- delivery path already reads. Two tables, one query surface (see
-- fn_push_targets_for_user below), keeps each shape honest.
--
-- The app must never depend unconditionally on one vendor (packaging ADR,
-- TICK-313), so `service` is data rather than a schema decision: adding a rail
-- is a new enum value, not a new column.

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
  -- The provider-issued registration token. Rotates on reinstall, restore and
  -- periodically at the provider's discretion.
  token        text not null,
  -- Stable per install, so a rotated token updates the existing row instead of
  -- accumulating dead registrations for the same handset.
  device_id    text not null,
  app_id       text,
  platform_version text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Set when the provider reports the token permanently gone (FCM
  -- UNREGISTERED, APNs 410). Kept rather than deleted so a device that
  -- re-registers is recognised as the same install.
  disabled_at  timestamptz,
  disabled_reason text,

  constraint push_devices_token_not_blank check (btrim(token) <> ''),
  constraint push_devices_device_id_not_blank check (btrim(device_id) <> ''),
  -- One row per install per rail: re-registering the same handset updates.
  unique (user_id, service, device_id)
);

-- A given token belongs to exactly one registration, whoever last claimed it.
-- Handsets change hands and accounts get switched; without this the previous
-- owner keeps receiving the new owner's notifications.
create unique index if not exists push_devices_service_token_key
  on public.push_devices (service, token);

create index if not exists push_devices_user_active_idx
  on public.push_devices (user_id) where disabled_at is null;

comment on table public.push_devices is
  'Native push registrations (FCM/APNs/HMS) for the React Native apps. Web Push lives separately in push_subscriptions. Writes go through SECURITY DEFINER RPCs only.';

alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;

-- SELECT is granted back deliberately, and only SELECT. `revoke all` strips the
-- table privilege the RLS policy sits on top of, so without this the
-- select_own policy below is dead code — RLS narrows an existing privilege, it
-- does not create one. Writes stay revoked so they can only go through the
-- SECURITY DEFINER RPCs.
grant select on public.push_devices to authenticated;

-- Owners may read their own registrations (the app shows "this device receives
-- notifications").
create policy "push_devices_select_own"
  on public.push_devices
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Register or refresh the calling user's device. Idempotent per (user, service,
-- device_id), so a rotated token refreshes in place.
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

  -- Claim the token first. If another account registered this exact token on
  -- this rail, the handset has changed hands and the old row must go, or the
  -- previous owner keeps receiving this user's notifications.
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

-- Sign-out / "stop notifying this device". Scoped to the caller's own rows.
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

-- Retire a token the provider told us is dead (FCM UNREGISTERED, APNs 410).
-- Service-role only: it is driven by send results, never by a client.
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

-- The sender's one query: which live device tokens should receive this
-- notification type for this user?
--
-- The mute check lives here rather than in the caller because the mute rule is
-- the reason a send is suppressed, and putting it beside the token lookup makes
-- it impossible for a new sender to forget it. notification_mutes rows are
-- opt-out: a row means muted (TICK-206).
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
grant execute on function public.fn_push_targets_for_user(uuid, text) to service_role;

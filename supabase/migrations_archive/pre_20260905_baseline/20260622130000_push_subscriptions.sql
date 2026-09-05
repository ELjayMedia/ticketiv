-- TICK-214: browser push subscriptions for waitlist offer notifications.
--
-- Stores Web Push subscriptions (endpoint + p256dh/auth keys) captured from the
-- browser Push API after a buyer grants notification permission. One row per
-- (user, endpoint); the endpoint is the unique handle the push service issues.
--
-- This migration lands the STORAGE + opt-in half of the feature. The server-side
-- sender (VAPID-signed Web Push request fired when a waitlist offer is created)
-- is intentionally NOT included here: it requires VAPID key provisioning and a
-- product decision on the sending mechanism (see the function TODO and the Jira
-- comment on TICK-214). Subscriptions captured here are ready to be consumed by
-- that sender once it exists.

begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

comment on table public.push_subscriptions is
  'Web Push subscriptions captured via the browser Push API. Consumed by the (TODO) VAPID-signed sender to deliver waitlist-offer push notifications. See TICK-214.';

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Reads are scoped to the owner. Writes go exclusively through the RPCs below
-- (SECURITY DEFINER), so no INSERT/UPDATE/DELETE policies are granted to clients.
create policy "push_subscriptions_select_own"
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Store (upsert) the calling user's push subscription. Idempotent on endpoint so
-- re-subscribing the same browser refreshes the keys / last_seen_at instead of
-- duplicating. Also flips the user's push_opt_in preference on.
create or replace function public.fn_store_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
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
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_endpoint is null or btrim(p_endpoint) = ''
     or p_p256dh is null or btrim(p_p256dh) = ''
     or p_auth is null or btrim(p_auth) = '' then
    raise exception 'incomplete push subscription' using errcode = '22023';
  end if;

  insert into public.push_subscriptions as s (
    user_id, endpoint, p256dh, auth, user_agent, created_at, last_seen_at
  )
  values (
    v_user, p_endpoint, p_p256dh, p_auth, p_user_agent, now(), now()
  )
  on conflict (user_id, endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = coalesce(excluded.user_agent, s.user_agent),
    last_seen_at = now();

  -- Keep the per-channel preference in sync so other surfaces (account settings,
  -- the future sender) see push as opted-in.
  insert into public.user_notification_preferences as p (
    user_id, email_opt_in, sms_opt_in, push_opt_in, in_app_opt_in, updated_at
  )
  values (v_user, true, true, true, true, now())
  on conflict (user_id) do update set
    push_opt_in = true,
    updated_at = now();
end;
$function$;

revoke all on function public.fn_store_push_subscription(text, text, text, text) from public;
grant execute on function public.fn_store_push_subscription(text, text, text, text) to authenticated;

-- Remove a subscription (e.g. permission revoked / unsubscribed in-browser).
create or replace function public.fn_remove_push_subscription(
  p_endpoint text
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
    raise exception 'authentication required' using errcode = '28000';
  end if;

  delete from public.push_subscriptions
  where user_id = v_user
    and endpoint = p_endpoint;
end;
$function$;

revoke all on function public.fn_remove_push_subscription(text) from public;
grant execute on function public.fn_remove_push_subscription(text) to authenticated;

commit;

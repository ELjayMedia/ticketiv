-- Table to store per-user per-type notification mute preferences
create table if not exists public.notification_mutes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  muted_at timestamptz not null default now(),
  unique(user_id, notification_type)
);

alter table public.notification_mutes enable row level security;

create policy "user_own_mutes"
  on public.notification_mutes
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- RPC: toggle mute for a notification type
create or replace function public.fn_toggle_notification_mute(p_type text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_muted boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Toggle: if muted, unmute; if not muted, mute
  if exists (
    select 1 from public.notification_mutes
    where user_id = v_user_id and notification_type = p_type
  ) then
    delete from public.notification_mutes
    where user_id = v_user_id and notification_type = p_type;
    v_muted := false;
  else
    insert into public.notification_mutes(user_id, notification_type)
    values(v_user_id, p_type)
    on conflict(user_id, notification_type) do nothing;
    v_muted := true;
  end if;

  return json_build_object('type', p_type, 'muted', v_muted);
end;
$$;

-- RPC: get my muted types
create or replace function public.fn_get_my_notification_mutes()
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(array_agg(notification_type), '{}')
  from public.notification_mutes
  where user_id = (select auth.uid());
$$;

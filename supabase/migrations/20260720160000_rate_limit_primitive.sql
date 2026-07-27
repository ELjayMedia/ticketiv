-- Rate-limit primitive (operational control #7).
--
-- A fixed-window counter shared in Postgres so it works for both PostgREST RPCs
-- and server actions (Vercel edge middleware is stateless). Callers pass a
-- bucket key (e.g. 'invite:' || auth.uid()), a max count, and a window in
-- seconds; fn_rate_limit increments the current window and returns whether the
-- call is ALLOWED (true) or should be rejected (false).
--
-- Usage inside a SECURITY DEFINER RPC:
--   if not public.fn_rate_limit('invite:' || v_user::text, 30, 3600) then
--     raise exception 'rate_limited' using errcode = 'P0001';
--   end if;
--
-- fn_rate_limit is only called by trusted SECURITY DEFINER RPCs (which run as
-- the owner) or service-role code, so EXECUTE is revoked from PUBLIC — clients
-- cannot inflate counters directly.

create table if not exists public.rate_limits (
  bucket        text        not null,
  window_start  timestamptz not null,
  hits          integer     not null default 0,
  primary key (bucket, window_start)
);

-- Deny-by-default: only SECURITY DEFINER functions (run as owner) touch this.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.fn_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  -- Misconfiguration fails open: never block legitimate traffic on a bad param.
  if p_key is null or coalesce(p_max, 0) <= 0 or coalesce(p_window_seconds, 0) <= 0 then
    return true;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (bucket, window_start, hits)
  values (p_key, v_window_start, 1)
  on conflict (bucket, window_start)
    do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  return v_hits <= p_max;  -- true = allowed
end;
$function$;

-- Housekeeping: drop expired windows so the table stays small. Call from the
-- ops cron (or pg_cron) periodically.
create or replace function public.fn_rate_limit_gc(p_older_than interval default interval '1 day')
returns integer
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  with d as (
    delete from public.rate_limits where window_start < now() - p_older_than returning 1
  )
  select count(*)::integer from d;
$function$;

revoke execute on function public.fn_rate_limit(text, integer, integer) from public;
revoke execute on function public.fn_rate_limit_gc(interval) from public;

-- First consumer: membership invitations (spam / enumeration guard), 30/hour
-- per inviter. Same pattern applies to the other entry points (promo preview,
-- checkout creation, transfers, resale publish, scans, org creation) — see
-- docs/OPERATIONS.md. Body is otherwise unchanged.
create or replace function public.fn_create_membership_invite(p_org_id uuid, p_kind text, p_role app_role, p_event_id uuid DEFAULT NULL::uuid, p_invited_email text DEFAULT NULL::text, p_expires_in interval DEFAULT '14 days'::interval)
 returns membership_invites
 language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_invite public.membership_invites;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_org_admin(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Rate limit: 30 invitations per inviter per hour.
  if not public.fn_rate_limit('invite:' || v_user::text, 30, 3600) then
    raise exception 'rate_limited: too many invitations, please try again later' using errcode = 'P0001';
  end if;

  if p_kind = 'org_member' then
    if p_role not in ('organizer_owner', 'organizer_admin', 'organizer_staff', 'finance') then
      raise exception 'invalid org role' using errcode = '22023';
    end if;
    if p_event_id is not null then
      raise exception 'event_id not allowed for org_member invite' using errcode = '22023';
    end if;
  elsif p_kind = 'event_staff' then
    if p_role not in ('scanner', 'organizer_scanner') then
      raise exception 'invalid event staff role' using errcode = '22023';
    end if;
    if p_event_id is null then
      raise exception 'event_id required for event_staff invite' using errcode = '22023';
    end if;
    if not exists (select 1 from public.events e where e.id = p_event_id and e.org_id = p_org_id) then
      raise exception 'event not in org' using errcode = '22023';
    end if;
  else
    raise exception 'invalid kind' using errcode = '22023';
  end if;

  insert into public.membership_invites (org_id, event_id, kind, role, invited_email, created_by, expires_at)
  values (
    p_org_id, p_event_id, p_kind, p_role,
    nullif(btrim(coalesce(p_invited_email, '')), ''),
    v_user,
    now() + coalesce(p_expires_in, interval '14 days')
  )
  returning * into v_invite;

  return v_invite;
end;
$function$;

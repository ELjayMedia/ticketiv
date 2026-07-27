-- Durable edge rate-limit wrapper (operational control #7).
--
-- lib/rate-limit.ts prefers Upstash Redis but DEGRADES TO A NO-OP when Upstash
-- is unconfigured, which leaves the anon / edge endpoints unenforced in that
-- mode (promo preview, payment attempt, auth resend, waitlist join, scanner
-- provision/validate, search suggest, tapband telemetry). This wrapper lets
-- those routes fall back to the same durable Postgres fixed-window counter used
-- by the SECURITY DEFINER RPCs, keyed by client IP / user.
--
-- Called ONLY server-side via the service-role admin client, so EXECUTE is
-- granted to service_role and revoked from anon / authenticated / public — a
-- browser cannot poke the counter. Buckets are namespaced under 'edge:' so they
-- can never collide with the internal RPC buckets ('checkout:', 'org_create:',
-- 'invite:', 'transfer:', 'resale_publish:').
--
-- Returns jsonb { allowed, remaining, retry_after } so the route can populate
-- the standard Retry-After / X-RateLimit-* headers.

create or replace function public.fn_rate_limit_edge(
  p_bucket text, p_key text, p_max integer, p_window_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_bucket text := 'edge:' || coalesce(p_bucket, '') || ':' || coalesce(p_key, '');
  v_allowed boolean;
  v_window_start timestamptz;
  v_hits integer;
begin
  -- Misconfiguration fails open (mirrors fn_rate_limit): never block on bad params.
  if p_key is null or coalesce(p_max, 0) <= 0 or coalesce(p_window_seconds, 0) <= 0 then
    return jsonb_build_object('allowed', true, 'remaining', coalesce(p_max, 0), 'retry_after', 0);
  end if;

  -- Single source of truth for the counter: the primitive owns the increment.
  v_allowed := public.fn_rate_limit(v_bucket, p_max, p_window_seconds);

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );
  select hits into v_hits from public.rate_limits
   where bucket = v_bucket and window_start = v_window_start;

  return jsonb_build_object(
    'allowed', v_allowed,
    'remaining', greatest(0, p_max - coalesce(v_hits, 0)),
    'retry_after', greatest(1, ceil(
      extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - clock_timestamp()))
    ))::integer
  );
end;
$function$;

-- Supabase's default privileges GRANT EXECUTE to anon/authenticated directly
-- (not via PUBLIC), so revoke from those roles explicitly, not just PUBLIC.
revoke execute on function public.fn_rate_limit_edge(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.fn_rate_limit_edge(text, text, integer, integer) to service_role;

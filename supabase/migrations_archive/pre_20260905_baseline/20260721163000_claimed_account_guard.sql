-- TICK-338: canonical claimed-account boundary for protected workflows.
--
-- Supabase anonymous sign-ins use the `authenticated` Postgres role, just like
-- permanent accounts. Protected workflows must therefore inspect the trusted
-- `is_anonymous` JWT claim rather than relying on `auth.uid()` or role checks
-- alone.

create schema if not exists app;

create or replace function app.is_claimed_account()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    auth.uid() is not null
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false;
$$;

comment on function app.is_claimed_account() is
  'Returns true only for an authenticated, non-anonymous Supabase identity. Missing is_anonymous claims fail closed.';

create or replace function app.require_claimed_account()
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not app.is_claimed_account() then
    raise exception using
      errcode = '42501',
      message = 'claimed_account_required',
      detail = 'This operation requires a permanent Ticketiv account.',
      hint = 'Claim the anonymous session with a verified email or phone, then retry.';
  end if;
end;
$$;

comment on function app.require_claimed_account() is
  'Raises claimed_account_required unless the current JWT represents a permanent account.';

revoke all on function app.is_claimed_account() from public;
revoke all on function app.require_claimed_account() from public;

-- These helpers are intentionally callable by authenticated sessions so RLS
-- policies and user-facing RPCs can use them. Anonymous Supabase users still
-- receive the authenticated database role, but the trusted JWT claim makes
-- app.is_claimed_account() return false for them.
grant execute on function app.is_claimed_account() to authenticated;
grant execute on function app.require_claimed_account() to authenticated;

-- Server-side maintenance functions may compose the same guard when acting on
-- behalf of a user. Service-role-only operations should continue to enforce
-- their own explicit caller boundary.
grant execute on function app.is_claimed_account() to service_role;
grant execute on function app.require_claimed_account() to service_role;

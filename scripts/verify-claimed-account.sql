-- TICK-338 verification harness for the canonical claimed-account guard.
-- Run after migrations against a non-production or rolled-back session:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-claimed-account.sql

begin;

set local role authenticated;

-- Anonymous Supabase identity: authenticated database role, anonymous JWT.
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);

do $$
begin
  if app.is_claimed_account() then
    raise exception 'anonymous identity was incorrectly treated as claimed';
  end if;

  begin
    perform app.require_claimed_account();
    raise exception 'anonymous identity was not rejected';
  exception
    when insufficient_privilege then
      if sqlerrm <> 'claimed_account_required' then
        raise;
      end if;
  end;
end;
$$;

-- Permanent account: same database role, trusted JWT claim is false.
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);

do $$
begin
  if not app.is_claimed_account() then
    raise exception 'permanent identity was incorrectly rejected';
  end if;

  perform app.require_claimed_account();
end;
$$;

-- Missing claim must fail closed rather than treating an ambiguous token as a
-- permanent account.
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

do $$
begin
  if app.is_claimed_account() then
    raise exception 'JWT without is_anonymous claim did not fail closed';
  end if;
end;
$$;

rollback;

\echo 'claimed-account guard verification passed'

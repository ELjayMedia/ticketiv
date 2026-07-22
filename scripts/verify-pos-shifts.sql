-- TICK-347 POS shift and reconciliation regression harness.
--
-- Run after applying migrations against a seeded staging database:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--   -v cashier_user='<uuid>' \
--   -v outsider_user='<uuid>' \
--   -v org_a='<uuid>' \
--   -v org_b='<uuid>' \
--   -v event_a='<uuid>' \
--   -v event_b='<uuid>' \
--   -f scripts/verify-pos-shifts.sql
--
-- Required fixtures:
-- * cashier_user has a POS-capable role in org_a and no role in org_b.
-- * outsider_user has no POS-capable role in org_a.
-- * event_a belongs to org_a; event_b belongs to org_b.

begin;
set local role authenticated;

select set_config('tickiv.test.cashier_user', :'cashier_user', true);
select set_config('tickiv.test.outsider_user', :'outsider_user', true);
select set_config('tickiv.test.org_a', :'org_a', true);
select set_config('tickiv.test.org_b', :'org_b', true);
select set_config('tickiv.test.event_a', :'event_a', true);
select set_config('tickiv.test.event_b', :'event_b', true);

-- Anonymous Supabase identities share the authenticated DB role but must fail
-- before organization or fixture lookup.
select set_config(
  'request.jwt.claims',
  format(
    '{"sub":"%s","role":"authenticated","is_anonymous":true}',
    current_setting('tickiv.test.cashier_user')
  ),
  true
);

do $$
begin
  begin
    perform public.fn_open_pos_shift(
      current_setting('tickiv.test.org_a')::uuid,
      null,
      null,
      10000,
      'anonymous-denial'
    );
    raise exception 'anonymous identity opened a POS shift';
  exception when insufficient_privilege then
    if sqlerrm <> 'claimed_account_required' then raise; end if;
  end;
end;
$$;

-- A claimed user without an approved organization role must be denied.
select set_config(
  'request.jwt.claims',
  format(
    '{"sub":"%s","role":"authenticated","is_anonymous":false}',
    current_setting('tickiv.test.outsider_user')
  ),
  true
);

do $$
begin
  begin
    perform public.fn_open_pos_shift(
      current_setting('tickiv.test.org_a')::uuid,
      null,
      null,
      10000,
      'outsider-denial'
    );
    raise exception 'unauthorized user opened a POS shift';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;
end;
$$;

-- Authorized cashier opens a shift.
select set_config(
  'request.jwt.claims',
  format(
    '{"sub":"%s","role":"authenticated","is_anonymous":false}',
    current_setting('tickiv.test.cashier_user')
  ),
  true
);

select (public.fn_open_pos_shift(
  current_setting('tickiv.test.org_a')::uuid,
  null,
  null,
  10000,
  'regression shift'
)).id as shift_id
\gset

select set_config('tickiv.test.shift_id', :'shift_id', true);

-- The same cashier cannot open a second shift in the same organization.
do $$
begin
  begin
    perform public.fn_open_pos_shift(
      current_setting('tickiv.test.org_a')::uuid,
      null,
      null,
      0,
      'duplicate-open'
    );
    raise exception 'duplicate POS shift was opened';
  exception when unique_violation then
    if sqlerrm <> 'pos_shift_already_open' then raise; end if;
  end;
end;
$$;

-- Cross-organization event use must fail before order/payment creation.
do $$
begin
  begin
    perform public.fn_pos_charge_with_shift(
      current_setting('tickiv.test.shift_id')::uuid,
      current_setting('tickiv.test.event_b')::uuid,
      '[]'::jsonb,
      'cash',
      'Cross Org Test',
      null,
      null
    );
    raise exception 'org A shift charged an org B event';
  exception when insufficient_privilege then
    if sqlerrm <> 'event_not_in_shift_org' then raise; end if;
  end;
end;
$$;

-- Empty shift summary is deterministic and starts from the opening float.
do $$
declare
  v_summary jsonb;
begin
  v_summary := public.fn_pos_shift_summary(
    current_setting('tickiv.test.shift_id')::uuid
  );

  if (v_summary ->> 'order_count')::integer <> 0 then
    raise exception 'new shift has unexpected orders';
  end if;

  if (v_summary ->> 'expected_cash_cents')::integer <> 10000 then
    raise exception 'opening cash was not reflected in expected cash';
  end if;
end;
$$;

-- Closing records the counted cash and variance.
select public.fn_close_pos_shift(
  current_setting('tickiv.test.shift_id')::uuid,
  9950,
  'E0.50 short'
);

do $$
declare
  v_summary jsonb;
begin
  v_summary := public.fn_pos_shift_summary(
    current_setting('tickiv.test.shift_id')::uuid
  );

  if v_summary ->> 'status' <> 'closed' then
    raise exception 'shift did not close';
  end if;

  if (v_summary ->> 'cash_variance_cents')::integer <> -50 then
    raise exception 'cash variance was not calculated correctly';
  end if;
end;
$$;

-- Closed shifts cannot accept further sales.
do $$
begin
  begin
    perform public.fn_pos_charge_with_shift(
      current_setting('tickiv.test.shift_id')::uuid,
      current_setting('tickiv.test.event_a')::uuid,
      '[]'::jsonb,
      'cash',
      'Closed Shift Test',
      null,
      null
    );
    raise exception 'closed shift accepted a sale';
  exception when object_not_in_prerequisite_state then
    if sqlerrm <> 'pos_shift_closed' then raise; end if;
  end;
end;
$$;

rollback;
\echo 'POS shift authorization and reconciliation verification passed'

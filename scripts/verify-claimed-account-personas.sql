-- TICK-338 claimed-account persona and cross-organization regression suite.
--
-- Run against a seeded staging database after all migrations:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--   -v buyer_user='<uuid>' \
--   -v organizer_a_user='<uuid>' -v org_a='<uuid>' \
--   -v organizer_b_user='<uuid>' -v org_b='<uuid>' \
--   -v finance_a_user='<uuid>' \
--   -v platform_admin_user='<uuid>' \
--   -v buyer_payment_id='<uuid>' \
--   -f scripts/verify-claimed-account-personas.sql

begin;
set local role authenticated;

-- Persist psql fixture arguments as transaction-local settings so they are
-- safely available inside dollar-quoted DO blocks.
select set_config('tickiv.test.buyer_user', :'buyer_user', true);
select set_config('tickiv.test.organizer_a_user', :'organizer_a_user', true);
select set_config('tickiv.test.organizer_b_user', :'organizer_b_user', true);
select set_config('tickiv.test.finance_a_user', :'finance_a_user', true);
select set_config('tickiv.test.platform_admin_user', :'platform_admin_user', true);
select set_config('tickiv.test.org_a', :'org_a', true);
select set_config('tickiv.test.org_b', :'org_b', true);
select set_config('tickiv.test.buyer_payment_id', :'buyer_payment_id', true);

-- 1. Anonymous authenticated-role identity must be denied before any lookup.
select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":true}', current_setting('tickiv.test.buyer_user')),
  true
);

do $$
begin
  begin
    perform public.fn_register_device(current_setting('tickiv.test.org_a')::uuid, null, 'anonymous-test', 'scanner_unassigned');
    raise exception 'anonymous identity registered a device';
  exception when insufficient_privilege then
    if sqlerrm <> 'claimed_account_required' then raise; end if;
  end;

  begin
    perform public.fn_transition_payout(gen_random_uuid(), 'paid', null);
    raise exception 'anonymous identity transitioned a payout';
  exception when insufficient_privilege then
    if sqlerrm <> 'claimed_account_required' then raise; end if;
  end;
end;
$$;

-- 2. Claimed buyer may request a refund for their own payment.
select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', current_setting('tickiv.test.buyer_user')),
  true
);

insert into public.refunds(payment_id, amount_cents, currency, status, initiated_by)
select p.id, least(p.amount_cents, 1), p.currency, 'requested', current_setting('tickiv.test.buyer_user')::uuid
from public.payments p
where p.id = current_setting('tickiv.test.buyer_payment_id')::uuid;

do $$
begin
  begin
    perform public.fn_register_device(current_setting('tickiv.test.org_a')::uuid, null, 'buyer-test', 'scanner_unassigned');
    raise exception 'plain buyer registered an organizer device';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;
end;
$$;

-- 3. Organizer A can provision inside A but not Organization B.
select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', current_setting('tickiv.test.organizer_a_user')),
  true
);

select public.fn_register_device(current_setting('tickiv.test.org_a')::uuid, null, 'org-a-test', 'scanner_unassigned');

do $$
begin
  begin
    perform public.fn_register_device(current_setting('tickiv.test.org_b')::uuid, null, 'cross-org-test', 'scanner_unassigned');
    raise exception 'organizer A provisioned a device in organization B';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;
end;
$$;

-- 4. Finance A can transition an org-A refund, but Organization B cannot.
select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', current_setting('tickiv.test.finance_a_user')),
  true
);

select public.fn_transition_refund(
  (select r.id from public.refunds r where r.payment_id=current_setting('tickiv.test.buyer_payment_id')::uuid order by r.created_at desc limit 1),
  'processing', null, null
);

select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', current_setting('tickiv.test.organizer_b_user')),
  true
);

do $$
begin
  begin
    perform public.fn_transition_refund(
      (select r.id from public.refunds r where r.payment_id=current_setting('tickiv.test.buyer_payment_id')::uuid order by r.created_at desc limit 1),
      'cancelled', null, null
    );
    raise exception 'organization B changed organization A refund';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;
end;
$$;

-- 5. Only a claimed platform admin can transition payouts.
select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', current_setting('tickiv.test.organizer_a_user')),
  true
);

do $$
begin
  begin
    perform public.fn_transition_payout(gen_random_uuid(), 'paid', null);
    raise exception 'organizer transitioned a platform payout';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;
end;
$$;

select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', current_setting('tickiv.test.platform_admin_user')),
  true
);

do $$
begin
  begin
    perform public.fn_transition_payout(gen_random_uuid(), 'paid', null);
    raise exception 'missing payout unexpectedly transitioned';
  exception when no_data_found then
    if sqlerrm <> 'payout_not_found' then raise; end if;
  end;
end;
$$;

-- 6. Policy inventory assertions.
do $$
declare v_missing text;
begin
  select string_agg(t.table_name, ', ')
  into v_missing
  from (values
    ('refunds','claimed_refunds_mutation'),
    ('refund_items','claimed_refund_items_mutation'),
    ('payout_accounts','claimed_payout_accounts_mutation'),
    ('payouts','claimed_payouts_mutation'),
    ('devices','claimed_devices_access'),
    ('device_sessions','claimed_device_sessions_access'),
    ('admin_users','claimed_admin_users_access'),
    ('org_members','claimed_org_members_update'),
    ('profiles','claimed_profiles_update'),
    ('guestlist_entries','claimed_guestlist_mutation')
  ) as t(table_name, policy_name)
  where not exists (
    select 1 from pg_policies p
    where p.schemaname='public'
      and p.tablename=t.table_name
      and p.policyname=t.policy_name
      and p.permissive='RESTRICTIVE'
  );

  if v_missing is not null then
    raise exception 'missing restrictive claimed-account policies: %', v_missing;
  end if;
end;
$$;

rollback;
\echo 'claimed-account persona and cross-org regression suite passed'

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
--
-- Required fixtures:
-- * organizer_a_user is owner/admin of org_a and has no role in org_b.
-- * organizer_b_user is owner/admin of org_b and has no role in org_a.
-- * finance_a_user has finance access in org_a only.
-- * platform_admin_user is active in admin_users.
-- * buyer_payment_id belongs to buyer_user and is in org_a.

begin;
set local role authenticated;

-- 1. Anonymous authenticated-role identity must be denied before any lookup.
select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":true}', :'buyer_user'),
  true
);

do $$
begin
  begin
    perform public.fn_register_device(:'org_a'::uuid, null, 'anonymous-test', 'scanner_unassigned');
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
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', :'buyer_user'),
  true
);

insert into public.refunds(payment_id, amount_cents, currency, status, initiated_by)
select p.id, least(p.amount_cents, 1), p.currency, 'requested', :'buyer_user'::uuid
from public.payments p
where p.id = :'buyer_payment_id'::uuid;

-- Claimed buyer still cannot provision an organizer device.
do $$
begin
  begin
    perform public.fn_register_device(:'org_a'::uuid, null, 'buyer-test', 'scanner_unassigned');
    raise exception 'plain buyer registered an organizer device';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;
end;
$$;

-- 3. Organizer A can provision inside A but not Organization B.
select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', :'organizer_a_user'),
  true
);

select public.fn_register_device(:'org_a'::uuid, null, 'org-a-test', 'scanner_unassigned');

do $$
begin
  begin
    perform public.fn_register_device(:'org_b'::uuid, null, 'cross-org-test', 'scanner_unassigned');
    raise exception 'organizer A provisioned a device in organization B';
  exception when insufficient_privilege then
    if sqlerrm <> 'not_authorized' then raise; end if;
  end;
end;
$$;

-- 4. Finance A can view/transition an org-A refund, but Organization B's
-- organizer cannot operate on that refund.
select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', :'finance_a_user'),
  true
);

select public.fn_transition_refund(
  (select r.id from public.refunds r where r.payment_id = :'buyer_payment_id'::uuid order by r.created_at desc limit 1),
  'processing',
  null,
  null
);

select set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', :'organizer_b_user'),
  true
);

do $$
begin
  begin
    perform public.fn_transition_refund(
      (select r.id from public.refunds r where r.payment_id = :'buyer_payment_id'::uuid order by r.created_at desc limit 1),
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
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', :'organizer_a_user'),
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
  format('{"sub":"%s","role":"authenticated","is_anonymous":false}', :'platform_admin_user'),
  true
);

-- A nonexistent ID proves the admin boundary passed and the resource boundary
-- was reached; expected result is payout_not_found rather than not_authorized.
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

-- 6. Policy inventory assertions: every protected table must have the
-- restrictive claimed-account policy installed.
do $$
declare
  v_missing text;
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

-- TICK-338 verification for the second operational claimed-account batch.
-- Run after migrations against a non-production database.

begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);

do $$
begin
  begin
    perform public.fn_pos_charge(
      '00000000-0000-0000-0000-000000000010',
      '[]'::jsonb,
      'cash'
    );
    raise exception 'anonymous POS charge was allowed';
  exception when insufficient_privilege then
    if sqlerrm <> 'claimed_account_required' then raise; end if;
  end;

  begin
    perform public.fn_accept_membership_invite('dummy');
    raise exception 'anonymous invite acceptance was allowed';
  exception when insufficient_privilege then
    if sqlerrm <> 'claimed_account_required' then raise; end if;
  end;

  begin
    perform public.fn_update_my_profile('Guest', null, null, null);
    raise exception 'anonymous profile update was allowed';
  exception when insufficient_privilege then
    if sqlerrm <> 'claimed_account_required' then raise; end if;
  end;

  begin
    perform public.fn_publish_resale_listing(
      '00000000-0000-0000-0000-000000000020',
      100,
      24
    );
    raise exception 'anonymous resale publication was allowed';
  exception when insufficient_privilege then
    if sqlerrm <> 'claimed_account_required' then raise; end if;
  end;

  if has_function_privilege(
    'authenticated',
    'public.fn_pos_charge_unchecked(uuid,jsonb,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can bypass guarded POS RPC';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.fn_scan_ticket_unchecked(text,uuid,uuid,uuid,uuid,text,timestamp with time zone,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can bypass guarded scan RPC';
  end if;
end;
$$;

rollback;
\echo 'claimed-account operational RPC verification passed'

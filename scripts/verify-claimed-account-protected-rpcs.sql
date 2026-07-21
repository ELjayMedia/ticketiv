-- TICK-338 verification for protected direct user-facing RPCs.
-- Run after migrations against a non-production database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-claimed-account-protected-rpcs.sql

begin;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);

-- Each call uses harmless dummy identifiers. The claimed-account guard must
-- reject before any identifier lookup, authorization query or mutation occurs.
do $$
declare
  v_failed boolean;
begin
  v_failed := false;
  begin perform public.fn_create_organization('Anonymous org', 'SZL');
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'fn_create_organization did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.create_event_draft('00000000-0000-0000-0000-000000000010', 'Anonymous event', 'private');
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'create_event_draft did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.fn_delete_organization('00000000-0000-0000-0000-000000000010', 'Anonymous org');
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'fn_delete_organization did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.fn_duplicate_event('00000000-0000-0000-0000-000000000020');
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'fn_duplicate_event did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.fn_transition_event_status('00000000-0000-0000-0000-000000000020', 'paused');
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'fn_transition_event_status did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.fn_link_event_artist_by_name('00000000-0000-0000-0000-000000000020', 'Anonymous artist');
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'fn_link_event_artist_by_name did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.fn_org_finance_summary('00000000-0000-0000-0000-000000000010', null, null);
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'fn_org_finance_summary did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.fn_request_payout('00000000-0000-0000-0000-000000000010', 100);
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'fn_request_payout did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.fn_request_transfer_by_email('00000000-0000-0000-0000-000000000030', 'nobody@example.com');
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'fn_request_transfer_by_email did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.fn_complete_transfer('00000000-0000-0000-0000-000000000040');
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'fn_complete_transfer did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.get_organizer_kpis('30d');
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'get_organizer_kpis did not reject anonymous identity'; end if;

  v_failed := false;
  begin perform public.get_event_kpis('00000000-0000-0000-0000-000000000020');
  exception when insufficient_privilege then v_failed := sqlerrm = 'claimed_account_required'; end;
  if not v_failed then raise exception 'get_event_kpis did not reject anonymous identity'; end if;
end;
$$;

-- Verify the unchecked implementations are not directly executable by the
-- authenticated role, preventing bypass of the wrappers.
do $$
declare
  v_name text;
  v_signature text;
  v_specs text[][] := array[
    array['fn_create_organization_unchecked','text, text'],
    array['create_event_draft_unchecked','uuid, text, text'],
    array['fn_delete_organization_unchecked','uuid, text'],
    array['fn_duplicate_event_unchecked','uuid'],
    array['fn_transition_event_status_unchecked','uuid, text'],
    array['fn_link_event_artist_by_name_unchecked','uuid, text, text, text, text'],
    array['fn_org_finance_summary_unchecked','uuid, timestamp with time zone, timestamp with time zone'],
    array['fn_request_payout_unchecked','uuid, integer'],
    array['fn_request_transfer_by_email_unchecked','uuid, text'],
    array['fn_complete_transfer_unchecked','uuid'],
    array['get_organizer_kpis_unchecked','text'],
    array['get_event_kpis_unchecked','uuid']
  ];
begin
  foreach v_specs slice 1 in array v_specs loop
    v_name := v_specs[1];
    v_signature := v_specs[2];
    if has_function_privilege('authenticated', format('public.%I(%s)', v_name, v_signature), 'EXECUTE') then
      raise exception 'authenticated can bypass wrapper via %', v_name;
    end if;
  end loop;
end;
$$;

rollback;

\echo 'claimed-account protected RPC verification passed'

-- Payout accounts: a real primary account, and removing accounts.
--
-- Before: the payout accounts page labelled every account "Primary" (the flag
-- did not exist), payouts silently went to the oldest account
-- (fn_request_payout_unchecked: order by created_at limit 1), accounts could
-- not be removed, and the page inserted rows directly instead of through an RPC.
--
-- After:
--   * payout_accounts.is_primary, at most one per org (partial unique index).
--     Backfill: each org's oldest account, which is where payouts went before,
--     so no destination changes.
--   * fn_add_payout_account / fn_set_primary_payout_account /
--     fn_delete_payout_account: SECURITY DEFINER, org owner/admin (or platform
--     admin) only, claimed accounts only, audited. The first account of an org
--     is always primary; removing the primary promotes the oldest remaining
--     one; the primary can't be removed while a payout is in flight.
--   * fn_request_payout_unchecked pays out to the primary account.

-- 1. Primary flag -------------------------------------------------------------
alter table public.payout_accounts
  add column if not exists is_primary boolean not null default false;

update public.payout_accounts pa
set is_primary = true
where pa.id in (
  select distinct on (org_id) id
  from public.payout_accounts
  order by org_id, created_at, id
)
and not exists (
  select 1 from public.payout_accounts other
  where other.org_id = pa.org_id and other.is_primary
);

create unique index if not exists payout_accounts_one_primary_per_org
  on public.payout_accounts (org_id)
  where is_primary;

comment on column public.payout_accounts.is_primary is
  'The account payouts are sent to. Exactly one per org once the org has any account.';

-- 2. Add ----------------------------------------------------------------------
create or replace function public.fn_add_payout_account(
  p_org_id uuid,
  p_provider text,
  p_details_encrypted text,
  p_make_primary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'app', 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_provider text := lower(trim(coalesce(p_provider, '')));
  v_has_primary boolean;
  v_primary boolean;
  v_id uuid;
begin
  perform app.require_claimed_account();
  if p_org_id is null or not app.is_org_admin_of(p_org_id) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if v_provider = '' or coalesce(p_details_encrypted, '') = '' then
    raise exception 'invalid_payout_account' using errcode = 'P0001';
  end if;

  -- One change at a time per org keeps the single-primary rule simple.
  perform 1 from public.organizations where id = p_org_id for update;

  select exists (
    select 1 from public.payout_accounts where org_id = p_org_id and is_primary
  ) into v_has_primary;
  v_primary := coalesce(p_make_primary, false) or not v_has_primary;

  if v_primary and v_has_primary then
    update public.payout_accounts set is_primary = false where org_id = p_org_id and is_primary;
  end if;

  insert into public.payout_accounts (org_id, provider, details_encrypted, is_primary)
  values (p_org_id, v_provider, p_details_encrypted, v_primary)
  returning id into v_id;

  -- Never log account details (holder, number, branch or ciphertext).
  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (p_org_id, v_actor, 'payout_accounts', v_id::text, 'insert',
    jsonb_build_object('business_action', 'add_payout_account', 'provider', v_provider, 'is_primary', v_primary));

  return v_id;
end;
$function$;

-- 3. Set primary ----------------------------------------------------------------
create or replace function public.fn_set_primary_payout_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'app', 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_org uuid;
  v_provider text;
  v_was_primary boolean;
begin
  perform app.require_claimed_account();
  select org_id, provider, is_primary into v_org, v_provider, v_was_primary
  from public.payout_accounts where id = p_account_id;
  if v_org is null or not app.is_org_admin_of(v_org) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if v_was_primary then
    return;
  end if;

  perform 1 from public.organizations where id = v_org for update;
  update public.payout_accounts set is_primary = false where org_id = v_org and is_primary;
  update public.payout_accounts set is_primary = true where id = p_account_id;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (v_org, v_actor, 'payout_accounts', p_account_id::text, 'update',
    jsonb_build_object('business_action', 'set_primary_payout_account', 'provider', v_provider));
end;
$function$;

-- 4. Delete ---------------------------------------------------------------------
create or replace function public.fn_delete_payout_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'app', 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_org uuid;
  v_provider text;
  v_was_primary boolean;
  v_promoted uuid;
begin
  perform app.require_claimed_account();
  select org_id, provider, is_primary into v_org, v_provider, v_was_primary
  from public.payout_accounts where id = p_account_id;
  if v_org is null or not app.is_org_admin_of(v_org) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  perform 1 from public.organizations where id = v_org for update;

  -- A requested or processing payout is being paid to the primary account.
  if v_was_primary and exists (
    select 1 from public.payouts where org_id = v_org and status in ('requested', 'processing')
  ) then
    raise exception 'payout_in_progress' using errcode = 'P0001';
  end if;

  delete from public.payout_accounts where id = p_account_id;

  if v_was_primary then
    select id into v_promoted
    from public.payout_accounts
    where org_id = v_org
    order by created_at, id
    limit 1;
    if v_promoted is not null then
      update public.payout_accounts set is_primary = true where id = v_promoted;
    end if;
  end if;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (v_org, v_actor, 'payout_accounts', p_account_id::text, 'delete',
    jsonb_build_object('business_action', 'delete_payout_account', 'provider', v_provider,
      'was_primary', v_was_primary, 'promoted_account_id', v_promoted));
end;
$function$;

revoke all on function public.fn_add_payout_account(uuid, text, text, boolean) from public, anon;
revoke all on function public.fn_set_primary_payout_account(uuid) from public, anon;
revoke all on function public.fn_delete_payout_account(uuid) from public, anon;
grant execute on function public.fn_add_payout_account(uuid, text, text, boolean) to authenticated, service_role;
grant execute on function public.fn_set_primary_payout_account(uuid) to authenticated, service_role;
grant execute on function public.fn_delete_payout_account(uuid) to authenticated, service_role;

-- 5. Payouts go to the primary account -------------------------------------------
do $migration$
declare
  v_old text := pg_get_functiondef('public.fn_request_payout_unchecked(uuid, integer)'::regprocedure);
  v_new text;
begin
  v_new := regexp_replace(
    v_old,
    '(from public\.payout_accounts\s+where org_id = p_org_id\s+)order by created_at(\s+limit 1)',
    '\1order by is_primary desc, created_at\2'
  );
  if v_new = v_old then
    raise exception 'payout accounts: fn_request_payout_unchecked account selection not found';
  end if;
  execute v_new;
end
$migration$;

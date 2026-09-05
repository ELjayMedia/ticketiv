-- TICK-376: replace a payout detail value only when the operator's hash still
-- matches the stored value. This prevents a re-encryption pass from
-- overwriting a concurrent organizer update. The function is service-role
-- only and records no bank details, ciphertext, or hashes in the audit log.

create or replace function public.admin_reencrypt_payout_account(
  p_account_id uuid,
  p_expected_sha256 text,
  p_encrypted_details text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_org_id uuid;
begin
  if p_account_id is null then
    raise exception 'Payout account id is required';
  end if;

  if p_expected_sha256 is null or p_expected_sha256 !~ '^[a-fA-F0-9]{64}$' then
    raise exception 'Expected payout detail hash is invalid';
  end if;

  if p_encrypted_details is null
    or p_encrypted_details !~ '^enc:v2:[A-Za-z0-9_-]+:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$'
  then
    raise exception 'Replacement payout details must use the encrypted v2 envelope';
  end if;

  update public.payout_accounts
  set details_encrypted = p_encrypted_details
  where id = p_account_id
    and encode(
      extensions.digest(pg_catalog.convert_to(details_encrypted, 'UTF8'), 'sha256'),
      'hex'
    ) = pg_catalog.lower(p_expected_sha256)
  returning org_id into v_org_id;

  if not found then
    return false;
  end if;

  insert into public.audit_log (
    org_id,
    actor_id,
    table_name,
    record_id,
    action,
    changes
  ) values (
    v_org_id,
    null,
    'payout_accounts',
    p_account_id::text,
    'update'::public.audit_action,
    pg_catalog.jsonb_build_object(
      'business_action', 'reencrypt_payout_account',
      'storage_format', 'enc:v2'
    )
  );

  return true;
end;
$function$;

revoke all on function public.admin_reencrypt_payout_account(uuid, text, text) from public;
revoke execute on function public.admin_reencrypt_payout_account(uuid, text, text) from anon, authenticated;
grant execute on function public.admin_reencrypt_payout_account(uuid, text, text) to service_role;

comment on function public.admin_reencrypt_payout_account(uuid, text, text) is
  'TICK-376 service-role-only compare-and-swap writer for payout detail re-encryption. Audits metadata only.';

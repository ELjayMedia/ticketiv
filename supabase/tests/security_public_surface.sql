-- TICK-467: run against an isolated database after applying all migrations.
-- No fixture data or production secrets required.
do $$
declare
  v_file_limit bigint;
  v_types text[];
  v_security_definer boolean;
  v_function text;
begin
  select file_size_limit, allowed_mime_types into v_file_limit, v_types
  from storage.buckets where id = 'avatars';
  if v_file_limit is distinct from 5242880 or v_types is distinct from array['image/jpeg','image/png','image/webp','image/gif']::text[] then
    raise exception 'avatar Storage restrictions are not enforced';
  end if;

  if has_function_privilege('anon', 'public.fn_preview_promo_code(uuid,text,public.sales_channel)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.fn_preview_promo_code(uuid,text,public.sales_channel)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.fn_preview_promo_code(uuid,text,public.sales_channel)', 'EXECUTE') then
    raise exception 'promo preview RPC must be service-role only';
  end if;

  select prosecdef, pg_get_functiondef(oid) into v_security_definer, v_function
  from pg_proc where oid = 'public.get_public_profile(text)'::regprocedure;
  if v_security_definer or position('get_social_public_profile' in v_function) = 0 then
    raise exception 'legacy public profile must delegate to privacy-aware lookup';
  end if;

  select pg_get_functiondef(oid) into v_function
  from pg_proc where oid = 'public.fn_match_friend_contacts(text[])'::regprocedure;
  if position('app.require_claimed_account' in v_function) = 0 then
    raise exception 'contact matching permits anonymous guest accounts';
  end if;

  raise notice 'TICK-467 security public surface checks passed';
end;
$$;

create or replace function public.fn_create_organization(p_name text, p_currency text default 'SZL')
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := (select auth.uid());
  v_name text := nullif(trim(p_name), '');
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'SZL'));
  v_base_slug text;
  v_slug text;
  v_suffix integer := 0;
  v_org_id uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if v_name is null then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  v_base_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug = '' then
    v_base_slug := 'org';
  end if;

  v_slug := v_base_slug;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.organizations (name, slug, default_currency)
  values (v_name, v_slug, v_currency)
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, v_user, 'organizer_owner');

  return jsonb_build_object('id', v_org_id, 'slug', v_slug, 'name', v_name, 'currency', v_currency);
end;
$function$;

revoke execute on function public.fn_create_organization(text, text) from public, anon;
grant execute on function public.fn_create_organization(text, text) to authenticated;;

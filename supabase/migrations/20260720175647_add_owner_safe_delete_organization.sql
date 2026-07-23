create or replace function public.fn_delete_organization(p_org_id uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_role public.app_role;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select o.name, om.role
    into v_name, v_role
  from public.organizations o
  join public.org_members om on om.org_id = o.id and om.user_id = v_user_id
  where o.id = p_org_id;

  if v_name is null then
    raise exception 'Organization not found';
  end if;

  if v_role <> 'organizer_owner'::public.app_role then
    raise exception 'Only the organization owner can delete this workspace';
  end if;

  if trim(coalesce(p_confirm_name, '')) <> v_name then
    raise exception 'Organization name does not match';
  end if;

  if exists (select 1 from public.events where org_id = p_org_id)
     or exists (select 1 from public.orders where org_id = p_org_id)
     or exists (select 1 from public.payout_accounts where org_id = p_org_id)
     or exists (select 1 from public.payouts where org_id = p_org_id)
     or exists (select 1 from public.resale_listings where org_id = p_org_id)
  then
    raise exception 'This workspace has events, orders, payouts, or resale activity and cannot be permanently deleted';
  end if;

  delete from public.audit_log where org_id = p_org_id;
  delete from public.organizations where id = p_org_id;
end;
$$;

revoke all on function public.fn_delete_organization(uuid, text) from public, anon;
grant execute on function public.fn_delete_organization(uuid, text) to authenticated;

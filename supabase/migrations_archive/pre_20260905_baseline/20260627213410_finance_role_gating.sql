create or replace function public.is_org_finance_viewer(p_org_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select exists (
    select 1 from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = (select auth.uid())
      and om.role = any (array['organizer_owner', 'admin', 'organizer', 'finance']::public.app_role[])
  ) or public.is_super_admin((select auth.uid()));
$function$;

revoke execute on function public.is_org_finance_viewer(uuid) from public, anon;
grant execute on function public.is_org_finance_viewer(uuid) to authenticated;

drop policy if exists ledger_org_read on public.ledger_entries;
create policy ledger_org_read on public.ledger_entries
  for select using (public.is_org_finance_viewer(org_id));;

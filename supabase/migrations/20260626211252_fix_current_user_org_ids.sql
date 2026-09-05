create or replace function public.current_user_org_ids()
returns setof uuid
language sql
security definer
set search_path to 'pg_catalog', 'public', 'extensions'
as $function$
  select org_id
  from public.org_members
  where user_id = public.current_user_uid()
    and role = any (array['organizer_owner','organizer_admin','organizer_staff']::public.app_role[]);
$function$;;

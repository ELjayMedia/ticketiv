-- TICK-337 — make the privileged RPC surface auditable, and its drift
-- detectable, without handing anyone a database connection string.
--
-- The permission matrix committed at supabase/permissions/rpc-grants.json is
-- generated from this function, and scripts/check-rpc-permissions.mjs calls it
-- to diff the live surface against that snapshot. A new EXECUTE grant to anon
-- or authenticated, a definer function losing its pinned search_path, or a new
-- privileged function appearing therefore fails the check instead of shipping
-- unnoticed.
--
-- Scope is the two schemas that carry Ticketiv logic: `public` (published by
-- PostgREST, so its grants are the external attack surface) and `app` (the
-- internal helper schema, not exposed, whose anon/authenticated grants exist
-- only so SECURITY INVOKER RLS policies can call the helpers).
--
-- Reports metadata only: names, argument types, security mode, search_path and
-- grantees. No function bodies, no data.

create or replace function public.fn_export_rpc_permissions()
returns table (
  schema_name text,
  function_name text,
  arguments text,
  security_definer boolean,
  search_path_pinned boolean,
  grantees text[]
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    n.nspname::text,
    p.proname::text,
    pg_get_function_identity_arguments(p.oid),
    p.prosecdef,
    coalesce(
      exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'),
      false
    ),
    coalesce(
      (
        select array_agg(distinct grantee_name order by grantee_name)
        from (
          select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee_name
          from aclexplode(p.proacl) a
          where a.privilege_type = 'EXECUTE'
        ) g
      ),
      array[]::text[]
    )
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'app')
    and p.prokind = 'f'
  order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid);
$function$;

revoke execute on function public.fn_export_rpc_permissions() from public, anon, authenticated;
grant execute on function public.fn_export_rpc_permissions() to service_role;

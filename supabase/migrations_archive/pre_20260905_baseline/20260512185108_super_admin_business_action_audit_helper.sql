create or replace function public.admin_log_action(
  p_actor_id uuid,
  p_table_name text,
  p_record_id text,
  p_action audit_action,
  p_changes jsonb default '{}'::jsonb,
  p_org_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (p_org_id, p_actor_id, p_table_name, p_record_id, p_action, p_changes);
end;
$$;;

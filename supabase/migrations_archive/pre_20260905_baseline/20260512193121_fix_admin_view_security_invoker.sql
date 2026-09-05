alter view if exists public.admin_attention_queue set (security_invoker = true);
alter view if exists public.admin_workspace_operating_counts set (security_invoker = true);
alter view if exists public.admin_workspace_actions set (security_invoker = true);
alter view if exists public.admin_command_centre_metrics set (security_invoker = true);
alter view if exists public.admin_recent_operations set (security_invoker = true);;

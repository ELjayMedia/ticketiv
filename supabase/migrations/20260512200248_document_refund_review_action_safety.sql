comment on table public.admin_action_catalog is 'Super-admin action registry for Ticketiv operational workspaces. Protected by RLS; action rows describe UI/business actions and do not by themselves execute provider-side operations.';

comment on view public.admin_workspace_actions is 'Read model for super-admin workspace actions. Refund action entries are internal review/status controls only and must not be treated as payment-provider execution.';;

insert into public.admin_action_catalog (key, workspace_key, label, description, target_table, backend_function, is_enabled)
values
  ('mark_ticket_type_sold_out', 'ticket-inventory', 'Set ticket type sold out', 'Mark a ticket type as sold out without changing original quota or historical orders.', 'ticket_types', 'markTicketTypeSoldOutAction', true),
  ('hide_ticket_type', 'ticket-inventory', 'Hide ticket type', 'Hide a ticket type from buyer-facing purchase flows without deleting it.', 'ticket_types', 'hideTicketTypeAction', true)
on conflict (key) do update
set workspace_key = excluded.workspace_key,
    label = excluded.label,
    description = excluded.description,
    target_table = excluded.target_table,
    backend_function = excluded.backend_function,
    is_enabled = excluded.is_enabled;;

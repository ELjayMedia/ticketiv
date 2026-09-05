insert into public.admin_action_catalog (key, workspace_key, label, description, target_table, backend_function, is_enabled)
values
  ('mark_refund_processing', 'payments-finance', 'Mark refund processing', 'Record that a refund has moved into finance/provider review. This does not initiate external money movement.', 'refunds', 'markRefundProcessingAction', true),
  ('mark_refund_processed', 'payments-finance', 'Mark refund processed', 'Record that a refund has been completed after provider confirmation or finance review.', 'refunds', 'markRefundProcessedAction', true),
  ('mark_refund_failed', 'payments-finance', 'Mark refund failed', 'Record that a refund failed and capture a review reason.', 'refunds', 'markRefundFailedAction', true),
  ('cancel_refund', 'payments-finance', 'Cancel refund', 'Cancel a refund request and preserve the reason in the audit trail.', 'refunds', 'cancelRefundAction', true)
on conflict (key) do update
set workspace_key = excluded.workspace_key,
    label = excluded.label,
    description = excluded.description,
    target_table = excluded.target_table,
    backend_function = excluded.backend_function,
    is_enabled = excluded.is_enabled;;

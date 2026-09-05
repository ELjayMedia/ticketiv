alter table public.notifications drop constraint if exists check_notifications_type_channel;

alter table public.notifications add constraint check_notifications_type_channel check (
  type = any (array[
    'email_confirmation',
    'ticket_delivery',
    'transfer_notification',
    'refund_alert',
    'generic',
    'ticket_purchase_succeeded',
    'payment_succeeded',
    'payment_failed',
    'event_published',
    'event_changed',
    'refund_updated',
    'payout_updated',
    'ticket_transfer_updated',
    'tapband_credential_lost'
  ])
  and (channel is null or channel = any (array['email', 'sms', 'push', 'in_app']))
);;

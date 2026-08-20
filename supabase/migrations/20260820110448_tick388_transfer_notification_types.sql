-- TICK-388: allow the transfer lifecycle notification types emitted by the
-- authoritative transfer RPCs while preserving the existing channel allow-list.

alter table public.notifications
  drop constraint if exists check_notifications_type_channel;

alter table public.notifications
  add constraint check_notifications_type_channel check (
    type = any (array[
      'email_confirmation'::text,
      'ticket_delivery'::text,
      'transfer_notification'::text,
      'refund_alert'::text,
      'generic'::text,
      'ticket_purchase_succeeded'::text,
      'payment_succeeded'::text,
      'payment_failed'::text,
      'event_published'::text,
      'event_changed'::text,
      'event_invite'::text,
      'refund_updated'::text,
      'payout_updated'::text,
      'ticket_transfer_updated'::text,
      'tapband_credential_lost'::text,
      'ticket_transfer'::text,
      'ticket_transfer_accepted'::text,
      'ticket_transfer_declined'::text
    ])
    and (
      channel is null
      or channel = any (array[
        'email'::text,
        'sms'::text,
        'push'::text,
        'in_app'::text
      ])
    )
  );

-- TICK-333 (found while wiring payment completion) — make the notifications
-- type constraint match the vocabulary the application actually writes.
--
-- ============================================================================
-- The bug
-- ============================================================================
--
-- check_notifications_type_channel permitted exactly five types:
--
--   email_confirmation, ticket_delivery, transfer_notification,
--   refund_alert, generic
--
-- lib/notifications.ts declares and writes nine entirely different ones:
--
--   ticket_purchase_succeeded, payment_succeeded, payment_failed,
--   event_published, event_changed, refund_updated, payout_updated,
--   ticket_transfer_updated, tapband_credential_lost
--
-- The two sets do not intersect. Every notification the application has ever
-- tried to emit violated the check constraint and was rejected by Postgres --
-- across 13 call sites in the payment webhook, event publish and event dates
-- routes.
--
-- It went unnoticed because emitNotification() logs the error and returns:
--
--     if (error) { console.error("Failed to emit notification", error) }
--
-- so every caller sees a normal return. public.notifications is empty, which
-- reads as "no orders yet" but is in fact "no insert has ever succeeded".
--
-- This surfaced when fn_complete_order_payment (TICK-333) tried to write its
-- payment_succeeded notification inside the completion transaction. There the
-- failure is not swallowed -- it aborts the transaction -- so the money path
-- would have failed outright for every signed-in buyer. An unhandled write
-- error in a swallowed path became a hard failure once the write moved
-- somewhere correctness depended on it.
--
-- ============================================================================
-- The fix
-- ============================================================================
--
-- Widen the constraint to the union of both vocabularies. The five legacy
-- values are retained rather than dropped: they cost nothing, and nothing has
-- yet proven no code path or fixture still uses them.
--
-- The channel half of the constraint is unchanged.

alter table public.notifications drop constraint if exists check_notifications_type_channel;

alter table public.notifications add constraint check_notifications_type_channel check (
  type = any (array[
    -- Legacy vocabulary, retained.
    'email_confirmation',
    'ticket_delivery',
    'transfer_notification',
    'refund_alert',
    'generic',
    -- What lib/notifications.ts actually emits.
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
);

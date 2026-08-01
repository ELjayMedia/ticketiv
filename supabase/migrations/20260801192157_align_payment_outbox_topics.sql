-- Superseded by 20260801194213_restore_external_only_payment_outbox.sql.
-- This migration remains versioned because it was applied while diagnosing
-- TICK-357. The parity review established that the one-topic production check
-- was intentional and the stale completion function was the real defect.

alter table public.payment_outbox
  drop constraint if exists payment_outbox_topic_check;

alter table public.payment_outbox
  add constraint payment_outbox_topic_check
  check (topic in ('ticket_delivery', 'payment_succeeded'));

-- TICK-357: production's payment_outbox predates the transactional payment
-- completion migration. CREATE TABLE IF NOT EXISTS did not widen its legacy
-- one-topic check, so the payment_succeeded outbox write aborted completion.

alter table public.payment_outbox
  drop constraint if exists payment_outbox_topic_check;

alter table public.payment_outbox
  add constraint payment_outbox_topic_check
  check (topic in ('ticket_delivery', 'payment_succeeded'));
;

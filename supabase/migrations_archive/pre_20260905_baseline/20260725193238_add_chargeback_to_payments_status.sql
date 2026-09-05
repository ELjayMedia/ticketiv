-- TICK-258 — payments.status uses payments_status (succeeded|failed|pending|
-- refunded), which cannot express a chargeback. Added in its own migration
-- because a new enum value cannot be used in the transaction that adds it.
alter type public.payments_status add value if not exists 'chargeback';;

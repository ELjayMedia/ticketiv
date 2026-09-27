-- TICK-415: Persist cancellation as a first-class terminal event state.
-- Keep this enum addition in its own migration so later migrations can safely
-- reference the new value after this transaction commits.

alter type public.event_status add value if not exists 'cancelled';

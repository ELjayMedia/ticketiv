-- TICK-388: expired requests must leave the live transfer set so a sender can
-- make a new request after the 24-hour acceptance window closes.
alter type public.transfer_status add value if not exists 'expired';

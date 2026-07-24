-- Remove a broken, launch-blocking trigger on the payment-success path.
--
-- app.mint_on_payment_success() (trigger trg_mint_on_payment_success, AFTER
-- UPDATE on public.payments) calls app.fn_mint_tickets(new.order_id). That
-- function does not exist — the only fn_mint_tickets is a no-op stub in `public`
-- with a different signature (order_item_id). So the FIRST time any payment
-- transitions to 'succeeded', the trigger raises
--   "function app.fn_mint_tickets(uuid) does not exist"
-- and the whole completion rolls back. It has never surfaced only because no
-- payment has succeeded yet (0 rows in public.payments).
--
-- Ticket issuance is already handled by issue_order_items_when_order_paid, which
-- flips pending order_items to 'issued' when the order is marked paid (verified:
-- payment -> succeeded then order -> paid issues the ticket). This mint path was
-- a never-completed placeholder, so drop the broken trigger and its orphan
-- function. The public.fn_mint_tickets stub is left in place (unreferenced,
-- harmless) for a separate cleanup.

drop trigger if exists trg_mint_on_payment_success on public.payments;
drop function if exists app.mint_on_payment_success();

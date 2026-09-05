-- The payment-success trigger app.mint_on_payment_success() calls
-- app.fn_mint_tickets(order_id), which does not exist (the only fn_mint_tickets
-- is a no-op stub in public with a different signature). So every payment
-- transition to 'succeeded' would raise "function app.fn_mint_tickets(uuid) does
-- not exist" and roll back the completion. Never surfaced because no payment has
-- succeeded yet (0 payments in the table).
--
-- Ticket issuance is already handled by issue_order_items_when_order_paid, which
-- flips pending order_items to 'issued' when the order is marked paid. This mint
-- path was a never-completed placeholder, so remove the broken trigger and its
-- orphan function. The public.fn_mint_tickets stub is left in place (harmless,
-- unreferenced) for a separate cleanup.

drop trigger if exists trg_mint_on_payment_success on public.payments;
drop function if exists app.mint_on_payment_success();;

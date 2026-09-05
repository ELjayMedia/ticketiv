-- Pass 2.D: separate transfers (free P2P gifts) from resale_listings (paid marketplace).
-- transfers loses its pricing columns; resale_listings gains a transfer_id link
-- (set when a listing is sold and a transfer is created from it).
-- Also drops a broken duplicate trigger on transfers.

-- 1. Drop the broken duplicate trigger (function references non-existent seller_id column)
DROP TRIGGER IF EXISTS trg_transfers_ensure_seller_owns_item ON public.transfers;
DROP FUNCTION IF EXISTS public.ensure_transfer_seller_owns_item();

-- 2. Strip pricing columns from transfers (currently 0 rows; no functions reference these)
ALTER TABLE public.transfers
  DROP COLUMN price_cents,
  DROP COLUMN transfer_fee_cents,
  DROP COLUMN listing_expires_at;

-- 3. Add transfer link on resale_listings (NULL until listing is sold)
ALTER TABLE public.resale_listings
  ADD COLUMN transfer_id uuid REFERENCES public.transfers(id) ON DELETE SET NULL;

CREATE INDEX resale_listings_transfer_id_idx
  ON public.resale_listings (transfer_id)
  WHERE transfer_id IS NOT NULL;

-- 4. Document the boundary
COMMENT ON TABLE public.transfers IS
  'Free peer-to-peer ticket gifts. For paid resale, use resale_listings; selling a listing creates a transfer linked via resale_listings.transfer_id.';

COMMENT ON TABLE public.resale_listings IS
  'Paid marketplace ticket resale. price_cents is the listing price. transfer_id links to the transfer created when the listing was sold (NULL while active/cancelled/expired).';

COMMENT ON COLUMN public.resale_listings.transfer_id IS
  'Transfer created when this listing was sold. NULL while listing is active/cancelled/expired.';;

-- Payouts sent through a provider (DeltaPay wallet → Eswatini Payment Switch).
--
-- Before: payouts were status records only; finance moved the money by hand
-- and clicked "Mark paid". Nothing tied a payout to a provider transaction.
--
-- After: a payout sent through DeltaPay records which rail sent it, our
-- reference on the DeltaPay transaction (metadata "ticketiv-payout:<id>",
-- unique, so a payout can never be sent twice under the same reference), the
-- blockchain tracking ID, DeltaPay's transaction ID and status, the fee, and
-- why it failed. Manual payouts leave these columns null.
--
-- Writes come from server-side finance actions and the signed DeltaPay
-- callback (service role). No browser access changes: payouts stay readable
-- by org finance viewers and platform admins only.

alter table public.payouts
  add column if not exists provider_rail text,
  add column if not exists provider_reference text,
  add column if not exists provider_tracking_id text,
  add column if not exists provider_transaction_id bigint,
  add column if not exists provider_status text,
  add column if not exists provider_fee_cents integer,
  add column if not exists failure_reason text,
  add column if not exists submitted_at timestamptz;

alter table public.payouts
  drop constraint if exists payouts_provider_rail_check;
alter table public.payouts
  add constraint payouts_provider_rail_check check (provider_rail is null or provider_rail in ('deltapay'));

alter table public.payouts
  drop constraint if exists payouts_provider_fee_cents_check;
alter table public.payouts
  add constraint payouts_provider_fee_cents_check check (provider_fee_cents is null or provider_fee_cents >= 0);

create unique index if not exists payouts_provider_reference_key
  on public.payouts (provider_reference)
  where provider_reference is not null;

create unique index if not exists payouts_provider_transaction_key
  on public.payouts (provider_rail, provider_transaction_id)
  where provider_transaction_id is not null;

comment on column public.payouts.provider_rail is 'Rail that moved the money (deltapay), or null for a manual payout.';
comment on column public.payouts.provider_reference is 'Our reference on the provider transaction (DeltaPay metadata "ticketiv-payout:<id>").';
comment on column public.payouts.provider_tracking_id is 'DeltaPay blockchain transaction ID returned when the transfer was submitted.';
comment on column public.payouts.provider_transaction_id is 'DeltaPay business transaction ID (from the signed callback or a lookup).';
comment on column public.payouts.provider_status is 'Last DeltaPay transaction status seen (pending, initiated, approved, succeeded, failed, reversed).';
comment on column public.payouts.failure_reason is 'Why the provider rejected or failed the payout (shown to finance).';
comment on column public.payouts.submitted_at is 'When the payout was submitted to the provider.';

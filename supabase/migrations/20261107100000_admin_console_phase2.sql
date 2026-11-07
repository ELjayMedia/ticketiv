-- Admin console, phase 2: work queues.
--
-- The Home page lists things that need a person (failed payments, failed
-- ticket emails, refunds waiting for approval, payouts, reconciliation
-- issues, scanners offline before an event). Items are computed from the
-- existing tables each time the page loads. The only new state is who has
-- taken an item, so two admins don't work the same problem.
--
-- item_key is "<queue>:<record id>", e.g. "refund:6b1f…". A claim is removed
-- when the admin lets it go; a stale claim on an item that has left its queue
-- is harmless and simply never shows.
--
-- RLS on, no policies: only the admin console's server code (service role)
-- reads or writes it.

create table if not exists public.admin_queue_claims (
  item_key text primary key check (char_length(item_key) between 3 and 200),
  admin_id uuid not null references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now()
);

create index if not exists admin_queue_claims_admin_idx on public.admin_queue_claims (admin_id);
alter table public.admin_queue_claims enable row level security;
revoke all on public.admin_queue_claims from anon, authenticated;

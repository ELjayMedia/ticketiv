-- Provider settlement reconciliation (operational control #1).
--
-- Until now reconciliation was internal-only: our ledger vs our orders. That
-- catches our own bugs but cannot catch a discrepancy between what the payment
-- provider actually settled and what we believe we earned — which is the
-- difference that costs real money (provider fees we did not model, a
-- transaction the provider reversed, a settlement that never arrived).
--
-- These tables hold what the provider says, kept deliberately separate from our
-- own money tables so the two can be compared rather than conflated:
--   provider_settlements       — one row per settlement batch the provider paid
--   provider_settlement_items  — the transactions inside a batch, matched to
--                                public.payments by the provider reference
--
-- Both are provider-reported facts, so they are service-role only: ingestion
-- writes them from the server, and nothing in a browser session can read or
-- forge them.
--
-- Amounts are integer cents, matching the rest of the money path. Paystack
-- reports in the smallest currency unit already, so values map across directly.

create table if not exists public.provider_settlements (
  id                uuid primary key default gen_random_uuid(),
  provider          text        not null,
  ext_settlement_id text        not null,
  status            text,
  currency          text,
  gross_cents       integer     not null default 0,
  fees_cents        integer     not null default 0,
  net_cents         integer     not null default 0,
  settled_at        timestamptz,
  payload           jsonb,
  ingested_at       timestamptz not null default now(),
  constraint provider_settlements_provider_ext_key unique (provider, ext_settlement_id)
);

create table if not exists public.provider_settlement_items (
  id             uuid primary key default gen_random_uuid(),
  settlement_id  uuid        not null references public.provider_settlements(id) on delete cascade,
  ext_payment_id text        not null,
  payment_id     uuid        references public.payments(id) on delete set null,
  amount_cents   integer     not null default 0,
  fee_cents      integer     not null default 0,
  payload        jsonb,
  constraint provider_settlement_items_settlement_ext_key unique (settlement_id, ext_payment_id)
);

create index if not exists ix_provider_settlement_items_payment
  on public.provider_settlement_items (payment_id);
create index if not exists ix_provider_settlements_settled_at
  on public.provider_settlements (settled_at);

alter table public.provider_settlements enable row level security;
alter table public.provider_settlement_items enable row level security;
revoke all on public.provider_settlements from anon, authenticated;
revoke all on public.provider_settlement_items from anon, authenticated;

-- Idempotent ingestion. Re-running for the same settlement updates the batch and
-- its items in place rather than duplicating, so the ingest job is safe to retry
-- and safe to run on an overlapping date window.
--
-- Items are matched to our payments by (provider, ext_payment_id) — the same key
-- the webhook path writes and the ui_payments_provider_ext unique index enforces.
-- A NULL payment_id therefore means "the provider settled something we have no
-- payment row for", which is exactly the anomaly worth alerting on, so it is
-- recorded rather than rejected.
create or replace function public.fn_upsert_provider_settlement(
  p_provider text,
  p_ext_settlement_id text,
  p_status text,
  p_currency text,
  p_gross_cents integer,
  p_fees_cents integer,
  p_net_cents integer,
  p_settled_at timestamptz,
  p_payload jsonb default null,
  p_items jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_settlement_id uuid;
  v_item_count integer := 0;
  v_matched integer := 0;
begin
  if coalesce(trim(p_provider), '') = '' then
    raise exception 'provider_required' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_ext_settlement_id), '') = '' then
    raise exception 'ext_settlement_id_required' using errcode = 'P0001';
  end if;

  insert into public.provider_settlements (
    provider, ext_settlement_id, status, currency,
    gross_cents, fees_cents, net_cents, settled_at, payload, ingested_at
  ) values (
    p_provider, p_ext_settlement_id, p_status, p_currency,
    coalesce(p_gross_cents, 0), coalesce(p_fees_cents, 0), coalesce(p_net_cents, 0),
    p_settled_at, p_payload, now()
  )
  on conflict (provider, ext_settlement_id) do update
    set status      = excluded.status,
        currency    = excluded.currency,
        gross_cents = excluded.gross_cents,
        fees_cents  = excluded.fees_cents,
        net_cents   = excluded.net_cents,
        settled_at  = excluded.settled_at,
        payload     = excluded.payload,
        ingested_at = now()
  returning id into v_settlement_id;

  if p_items is not null and jsonb_typeof(p_items) = 'array' then
    insert into public.provider_settlement_items (
      settlement_id, ext_payment_id, payment_id, amount_cents, fee_cents, payload
    )
    select
      v_settlement_id,
      item->>'extPaymentId',
      (select p.id from public.payments p
        where p.provider = p_provider and p.ext_payment_id = item->>'extPaymentId'
        limit 1),
      coalesce((item->>'amountCents')::integer, 0),
      coalesce((item->>'feeCents')::integer, 0),
      item
    from jsonb_array_elements(p_items) as item
    where coalesce(item->>'extPaymentId', '') <> ''
    on conflict (settlement_id, ext_payment_id) do update
      set payment_id   = excluded.payment_id,
          amount_cents = excluded.amount_cents,
          fee_cents    = excluded.fee_cents,
          payload      = excluded.payload;

    select count(*), count(*) filter (where payment_id is not null)
      into v_item_count, v_matched
    from public.provider_settlement_items where settlement_id = v_settlement_id;
  end if;

  return jsonb_build_object(
    'settlement_id', v_settlement_id,
    'items', v_item_count,
    'matched_payments', v_matched,
    'unmatched_items', v_item_count - v_matched
  );
end;
$function$;

revoke execute on function public.fn_upsert_provider_settlement(text, text, text, text, integer, integer, integer, timestamptz, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.fn_upsert_provider_settlement(text, text, text, text, integer, integer, integer, timestamptz, jsonb, jsonb) to service_role;

-- Read-only comparison of provider-reported settlement against our records.
-- Returns counts (0 = healthy), in the same shape as the other ops checks.
create or replace function public.fn_provider_settlement_counts()
returns jsonb
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select jsonb_build_object(
    -- The provider settled a transaction we have no payment row for.
    'settlement_items_unmatched', (
      select count(*) from public.provider_settlement_items where payment_id is null),

    -- Provider's amount for a transaction disagrees with the amount we recorded.
    'settlement_amount_mismatch', (
      select count(*) from public.provider_settlement_items si
      join public.payments p on p.id = si.payment_id
      where si.amount_cents <> p.amount_cents),

    -- A batch that does not internally balance: gross - fees <> net.
    'settlement_internal_imbalance', (
      select count(*) from public.provider_settlements
      where (gross_cents - fees_cents) <> net_cents),

    -- Money we booked as succeeded but the provider has never settled. Given a
    -- 7-day grace so normal settlement lag is not reported as a problem. Only
    -- counted once at least one settlement has been ingested, otherwise every
    -- payment would look unsettled before the first ingest run.
    'succeeded_payments_never_settled', (
      select case when (select count(*) from public.provider_settlements) = 0 then 0 else (
        select count(*) from public.payments p
        where p.status = 'succeeded'
          and p.created_at < now() - interval '7 days'
          and not exists (
            select 1 from public.provider_settlement_items si where si.payment_id = p.id)
      ) end),

    -- Freshness: how long since we last ingested settlement data at all.
    'hours_since_last_settlement_ingest', (
      select coalesce(
        floor(extract(epoch from (now() - max(ingested_at))) / 3600)::integer, -1)
      from public.provider_settlements)
  );
$function$;

revoke execute on function public.fn_provider_settlement_counts() from public, anon, authenticated;
grant execute on function public.fn_provider_settlement_counts() to service_role;

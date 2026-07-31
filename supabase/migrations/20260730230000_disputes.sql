-- Dispute queue (operational control #5).
--
-- Refund disputes and chargebacks were handled as a sequence of manual steps
-- with no object tying them together: an admin found the payment, issued a
-- refund or revoked tickets, and the fact that a customer had disputed anything
-- survived only in someone's memory. That makes "what is outstanding right now?"
-- unanswerable, which is the question support actually needs.
--
-- A dispute is the case, not the money movement. It references the order and
-- payment, carries its own lifecycle, and links to the refund that resolved it
-- (if one did). Refunds remain the money record; disputes are the workflow.

do $do$ begin
  if not exists (select 1 from pg_type where typname = 'dispute_kind') then
    create type public.dispute_kind as enum (
      'refund_request', 'chargeback', 'duplicate_charge', 'not_received', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'dispute_status') then
    create type public.dispute_status as enum (
      'open', 'investigating', 'awaiting_customer', 'resolved', 'rejected');
  end if;
end $do$;

create table if not exists public.disputes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references public.organizations(id) on delete set null,
  order_id       uuid references public.orders(id) on delete set null,
  payment_id     uuid references public.payments(id) on delete set null,
  raised_by      uuid,
  kind           public.dispute_kind   not null default 'other',
  status         public.dispute_status not null default 'open',
  reason         text,
  amount_cents   integer,
  currency       text,
  assigned_to    uuid,
  resolution     text,
  refund_id      uuid references public.refunds(id) on delete set null,
  -- One dispute per payment per kind: a redelivered chargeback webhook must not
  -- spawn a second case for the same event.
  dedupe_key     text unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

create index if not exists ix_disputes_status  on public.disputes (status, created_at desc);
create index if not exists ix_disputes_org     on public.disputes (org_id);
create index if not exists ix_disputes_payment on public.disputes (payment_id);

alter table public.disputes enable row level security;
revoke all on public.disputes from anon, authenticated;

create or replace function public.fn_disputes_touch_updated_at()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists trg_disputes_updated_at on public.disputes;
create trigger trg_disputes_updated_at before update on public.disputes
  for each row execute function public.fn_disputes_touch_updated_at();

-- Open a dispute. Idempotent on dedupe_key so webhook redelivery or a
-- double-clicked admin action cannot create duplicate cases.
create or replace function public.fn_open_dispute(
  p_kind public.dispute_kind,
  p_order_id uuid default null,
  p_payment_id uuid default null,
  p_reason text default null,
  p_amount_cents integer default null,
  p_raised_by uuid default null,
  p_dedupe_key text default null
) returns public.disputes
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_row public.disputes;
  v_org uuid; v_currency text; v_amount integer := p_amount_cents;
  v_order_id uuid := p_order_id;
  v_key text := nullif(trim(coalesce(p_dedupe_key, '')), '');
begin
  if p_order_id is null and p_payment_id is null then
    raise exception 'order_or_payment_required' using errcode = 'P0001';
  end if;

  -- Derive the order from the payment when only the payment is known, so the
  -- queue always has an order to link to.
  if v_order_id is null and p_payment_id is not null then
    select order_id into v_order_id from public.payments where id = p_payment_id;
  end if;

  select o.org_id, o.currency, coalesce(v_amount, o.total_cents)
    into v_org, v_currency, v_amount
  from public.orders o where o.id = v_order_id;

  if v_key is not null then
    select * into v_row from public.disputes where dedupe_key = v_key;
    if found then return v_row; end if;
  end if;

  insert into public.disputes (
    org_id, order_id, payment_id, raised_by, kind, status,
    reason, amount_cents, currency, dedupe_key
  ) values (
    v_org, v_order_id, p_payment_id, p_raised_by, p_kind, 'open',
    nullif(trim(coalesce(p_reason, '')), ''), v_amount, v_currency, v_key
  )
  on conflict (dedupe_key) do update set updated_at = now()
  returning * into v_row;

  return v_row;
end;
$function$;

-- Move a dispute through its lifecycle. Terminal states stamp resolved_at and
-- may carry the refund that settled it, so the case and the money stay linked.
create or replace function public.fn_transition_dispute(
  p_dispute_id uuid,
  p_status public.dispute_status,
  p_resolution text default null,
  p_refund_id uuid default null,
  p_assigned_to uuid default null
) returns public.disputes
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_row public.disputes;
begin
  if p_dispute_id is null then
    raise exception 'dispute_id_required' using errcode = 'P0001';
  end if;

  select * into v_row from public.disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'dispute_not_found' using errcode = 'P0002';
  end if;
  if v_row.status in ('resolved', 'rejected') and p_status <> v_row.status then
    raise exception 'dispute_already_closed' using errcode = 'P0001';
  end if;

  update public.disputes
  set status      = p_status,
      resolution  = coalesce(nullif(trim(coalesce(p_resolution, '')), ''), resolution),
      refund_id   = coalesce(p_refund_id, refund_id),
      assigned_to = coalesce(p_assigned_to, assigned_to),
      resolved_at = case when p_status in ('resolved', 'rejected') then now() else null end
  where id = p_dispute_id
  returning * into v_row;

  return v_row;
end;
$function$;

revoke execute on function public.fn_open_dispute(public.dispute_kind, uuid, uuid, text, integer, uuid, text) from public, anon, authenticated;
grant execute on function public.fn_open_dispute(public.dispute_kind, uuid, uuid, text, integer, uuid, text) to service_role;
revoke execute on function public.fn_transition_dispute(uuid, public.dispute_status, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_transition_dispute(uuid, public.dispute_status, text, uuid, uuid) to service_role;

-- A chargeback IS a dispute — and one already decided against us — so record it
-- in the queue automatically. Without this the queue would miss exactly the
-- cases with money already clawed back. Body is otherwise unchanged from the
-- deployed version; the dispute insert is appended before the return, keyed so
-- a redelivered chargeback does not open a second case.
create or replace function public.fn_record_chargeback(
  p_payment_id uuid, p_provider_ref text DEFAULT NULL::text,
  p_amount_cents integer DEFAULT NULL::integer, p_payload jsonb DEFAULT '{}'::jsonb)
returns TABLE(chargeback_payment_id uuid, chargeback_order_id uuid, already_recorded boolean, revoked_item_count integer)
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_payment public.payments%rowtype;
  v_order   public.orders%rowtype;
  v_amount  integer;
  v_revoked integer := 0;
begin
  if p_payment_id is null then
    raise exception 'payment_id_required' using errcode = 'P0001';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;

  select * into v_order from public.orders where id = v_payment.order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if v_payment.status = 'chargeback' then
    select count(*)::integer into v_revoked
    from public.order_items oi where oi.order_id = v_order.id and oi.status = 'revoked';
    return query select v_payment.id, v_order.id, true, v_revoked;
    return;
  end if;

  v_amount := coalesce(p_amount_cents, v_payment.amount_cents);

  update public.payments
  set status = 'chargeback',
      payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('chargeback', coalesce(p_payload, '{}'::jsonb))
  where id = v_payment.id;

  update public.order_items oi
  set status = 'revoked'
  where oi.order_id = v_order.id
    and oi.status in ('pending', 'issued', 'transferred');
  get diagnostics v_revoked = row_count;

  update public.orders set status = 'refunded' where id = v_order.id;

  insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
  values (v_order.org_id, v_order.id, v_payment.id, 'reversal', v_amount, v_order.currency,
          jsonb_build_object('source', 'chargeback', 'provider_ref', p_provider_ref));

  if v_order.buyer_id is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (v_order.buyer_id, 'refund_alert',
            jsonb_build_object('orderId', v_order.id, 'paymentId', v_payment.id,
                               'amountCents', v_amount, 'currency', v_order.currency,
                               'kind', 'chargeback'),
            'pending', 'email', 'chargeback:' || v_payment.id::text)
    on conflict do nothing;
  end if;

  perform public.fn_open_dispute(
    'chargeback'::public.dispute_kind,
    v_order.id,
    v_payment.id,
    'Provider chargeback' || coalesce(' (' || p_provider_ref || ')', ''),
    v_amount,
    v_order.buyer_id,
    'chargeback:' || v_payment.id::text
  );

  return query select v_payment.id, v_order.id, false, v_revoked;
end;
$function$;

-- Queue counts for the ops surface / alerting.
create or replace function public.fn_dispute_counts()
returns jsonb language sql security definer set search_path to 'public', 'pg_temp'
as $function$
  select jsonb_build_object(
    'open',              (select count(*) from public.disputes where status = 'open'),
    'investigating',     (select count(*) from public.disputes where status = 'investigating'),
    'awaiting_customer', (select count(*) from public.disputes where status = 'awaiting_customer'),
    'unassigned_open',   (select count(*) from public.disputes
                           where status in ('open','investigating') and assigned_to is null),
    'stale_open',        (select count(*) from public.disputes
                           where status in ('open','investigating','awaiting_customer')
                             and created_at < now() - interval '7 days')
  );
$function$;

revoke execute on function public.fn_dispute_counts() from public, anon, authenticated;
grant execute on function public.fn_dispute_counts() to service_role;

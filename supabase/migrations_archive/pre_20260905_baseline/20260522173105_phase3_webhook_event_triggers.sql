-- Reference triggers that enqueue webhooks for the most useful platform
-- events. Each fires after the relevant write and calls fn_enqueue_webhook
-- with the org context so per-org subscribers get scoped, platform-level
-- subscribers always get a copy.

-- order.paid: fires when orders.status transitions to a paid state.
create or replace function public.fn_trg_emit_order_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status::text in ('paid', 'completed', 'fulfilled')
     and (tg_op = 'INSERT' or old.status::text <> new.status::text)
  then
    perform public.fn_enqueue_webhook(
      'order.paid',
      jsonb_build_object(
        'order_id', new.id,
        'org_id', new.org_id,
        'buyer_id', new.buyer_id,
        'total_cents', new.total_cents,
        'currency', new.currency,
        'channel', new.channel,
        'status', new.status
      ),
      new.org_id
    );
  end if;
  return new;
end
$$;

drop trigger if exists trg_emit_order_paid on public.orders;
create trigger trg_emit_order_paid
  after insert or update of status on public.orders
  for each row execute function public.fn_trg_emit_order_paid();

-- ticket.transferred: fires when a transfer.status transitions to accepted.
create or replace function public.fn_trg_emit_ticket_transferred()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_org_id uuid;
begin
  if new.status::text = 'accepted'
     and (tg_op = 'INSERT' or old.status::text <> 'accepted')
  then
    select tt.event_id, e.org_id
      into v_event_id, v_org_id
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      join public.events e on e.id = tt.event_id
     where oi.id = new.order_item_id;

    perform public.fn_enqueue_webhook(
      'ticket.transferred',
      jsonb_build_object(
        'transfer_id', new.id,
        'order_item_id', new.order_item_id,
        'from_user_id', new.from_user_id,
        'to_user_id', new.to_user_id,
        'event_id', v_event_id
      ),
      v_org_id
    );
  end if;
  return new;
end
$$;

drop trigger if exists trg_emit_ticket_transferred on public.transfers;
create trigger trg_emit_ticket_transferred
  after insert or update of status on public.transfers
  for each row execute function public.fn_trg_emit_ticket_transferred();

-- payout.paid: fires when payouts.status transitions to paid.
create or replace function public.fn_trg_emit_payout_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status::text in ('paid', 'completed')
     and (tg_op = 'INSERT' or old.status::text <> new.status::text)
  then
    perform public.fn_enqueue_webhook(
      'payout.paid',
      jsonb_build_object(
        'payout_id', new.id,
        'org_id', new.org_id,
        'amount_cents', new.amount_cents,
        'currency', new.currency,
        'provider', new.provider,
        'destination_ref', new.destination_ref
      ),
      new.org_id
    );
  end if;
  return new;
end
$$;

drop trigger if exists trg_emit_payout_paid on public.payouts;
create trigger trg_emit_payout_paid
  after insert or update of status on public.payouts
  for each row execute function public.fn_trg_emit_payout_paid();
;

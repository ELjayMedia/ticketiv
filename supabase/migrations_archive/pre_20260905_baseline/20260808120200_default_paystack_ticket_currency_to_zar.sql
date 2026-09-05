-- Paystack's South African rail charges in ZAR. Make that the default for
-- newly-created ticket types while keeping SZL available as an explicit choice
-- for MTN MoMo events.
alter table public.ticket_types
  alter column currency set default 'ZAR';

-- This event was created before the wizard default changed. It has no orders or
-- issued tickets, so changing only the currency code preserves the organiser's
-- nominal ticket prices and cannot rewrite historical money.
do $$
declare
  v_event_id uuid;
begin
  select id
    into v_event_id
    from public.events
   where slug = 'me-and-my-fam-session-a3a2ddc9';

  if v_event_id is null then
    raise exception 'Expected event me-and-my-fam-session-a3a2ddc9 was not found';
  end if;

  if exists (
    select 1
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
     where tt.event_id = v_event_id
  ) then
    raise exception 'Refusing to change ticket currency after an order item exists';
  end if;

  update public.ticket_types
     set currency = 'ZAR',
         updated_at = now()
   where event_id = v_event_id
     and upper(currency) = 'SZL';

  if exists (
    select 1
      from public.ticket_types
     where event_id = v_event_id
       and upper(currency) <> 'ZAR'
  ) then
    raise exception 'Event still contains a non-ZAR ticket type';
  end if;
end
$$;
;

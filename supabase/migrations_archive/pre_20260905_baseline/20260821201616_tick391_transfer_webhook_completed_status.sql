create or replace function public.fn_trg_emit_ticket_transferred()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_event_id uuid;
  v_org_id uuid;
begin
  if new.status::text in ('accepted', 'completed')
     and (
       tg_op = 'INSERT'
       or old.status::text not in ('accepted', 'completed')
     )
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

revoke all on function public.fn_trg_emit_ticket_transferred() from public, anon, authenticated;;

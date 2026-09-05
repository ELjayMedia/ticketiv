do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'order_item_status'
      and e.enumlabel = 'pending'
  ) then
    alter type public.order_item_status add value 'pending' before 'issued';
  end if;
end $$;

comment on type public.order_item_status is 'Ticket/order item lifecycle. pending means reserved for an unpaid order and must not scan as valid until payment confirmation marks it issued.';;

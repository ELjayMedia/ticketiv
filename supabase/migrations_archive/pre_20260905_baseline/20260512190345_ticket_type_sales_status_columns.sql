do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_type_sales_status') then
    create type public.ticket_type_sales_status as enum ('on_sale', 'paused', 'sold_out', 'hidden');
  end if;
end $$;

alter table public.ticket_types add column if not exists sales_status public.ticket_type_sales_status not null default 'on_sale';
alter table public.ticket_types add column if not exists sales_paused_at timestamp with time zone;
alter table public.ticket_types add column if not exists sales_pause_reason text;;

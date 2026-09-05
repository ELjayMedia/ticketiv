create or replace function app.current_user_owns_order_item(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.current_owner_id = (select auth.uid())
  );
$$;

revoke all on function app.current_user_owns_order_item(uuid) from public;
grant execute on function app.current_user_owns_order_item(uuid) to authenticated;

alter policy orders_select on public.orders
using (
  buyer_id = app.uid()
  or app.is_org_manager(org_id)
  or app.current_user_owns_order_item(id)
);

grant select on public.v_my_tickets to anon, authenticated;

comment on function app.current_user_owns_order_item(uuid) is
  'RLS helper: true only when auth.uid() is the canonical current_owner_id of an order_item in the supplied order.';;

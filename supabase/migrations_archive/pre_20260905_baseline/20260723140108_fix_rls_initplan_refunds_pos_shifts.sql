drop policy if exists refunds_insert on public.refunds;
create policy refunds_insert on public.refunds
  for insert to authenticated
  with check (
    app.is_claimed_account()
    and (initiated_by = (select auth.uid()))
    and (status = 'requested'::refund_status)
    and (processed_at is null)
    and (provider_ref is null)
    and exists (
      select 1
      from payments py
      join orders o on o.id = py.order_id
      where py.id = refunds.payment_id
        and (
          (o.buyer_id = (select auth.uid()))
          or app.is_org_finance_viewer(o.org_id)
          or app.is_org_admin_of(o.org_id)
        )
    )
  );

drop policy if exists pos_shifts_select on public.pos_shifts;
create policy pos_shifts_select on public.pos_shifts
  for select to authenticated
  using (
    app.is_claimed_account()
    and (
      (cashier_user_id = (select auth.uid()))
      or app.is_org_manager(org_id)
      or app.is_org_finance_viewer(org_id)
      or app.is_platform_admin()
    )
  );;

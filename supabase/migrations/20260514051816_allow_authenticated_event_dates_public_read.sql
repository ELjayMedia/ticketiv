do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_dates'
      and policyname = 'event_dates_authenticated_public_or_org_read'
  ) then
    create policy event_dates_authenticated_public_or_org_read
    on public.event_dates
    for select
    to authenticated
    using (
      fn_event_is_public_now(event_id)
      or exists (
        select 1
        from public.events e
        where e.id = event_dates.event_id
          and fn_is_org_member(e.org_id)
      )
    );
  end if;
end $$;;

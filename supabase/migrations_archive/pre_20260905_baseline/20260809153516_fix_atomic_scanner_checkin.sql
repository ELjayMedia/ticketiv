-- Consolidate scanner check-in into fn_scan_ticket_unchecked.
drop trigger if exists scans_validate_and_checkin_trig on public.scans;

create or replace function public.guard_scanner_checkin_only()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  -- The scanner RPC may transition an eligible ticket to checked_in and may
  -- change only the status, check-in timestamp, and audit timestamp.
  if old.status in ('issued'::public.order_item_status, 'transferred'::public.order_item_status)
     and new.status = 'checked_in'::public.order_item_status
     and old.checked_in_at is null
     and new.checked_in_at is not null
     and (to_jsonb(new) - array['status', 'checked_in_at', 'updated_at'])
         = (to_jsonb(old) - array['status', 'checked_in_at', 'updated_at'])
  then
    return new;
  end if;

  -- Preserve service-role access for trusted operational workflows.
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  raise exception 'Scanners may only perform an eligible ticket check-in';
end;
$function$;

revoke all on function public.guard_scanner_checkin_only() from public, anon, authenticated;
grant execute on function public.guard_scanner_checkin_only() to service_role;

drop policy if exists device_sessions_select on public.device_sessions;
create policy device_sessions_select
on public.device_sessions
for select
to authenticated
using (
  (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and ended_at is null
  )
  or exists (
    select 1
    from public.devices d
    where d.id = device_sessions.device_id
      and app.is_org_manager(d.org_id)
  )
);

notify pgrst, 'reload schema';;

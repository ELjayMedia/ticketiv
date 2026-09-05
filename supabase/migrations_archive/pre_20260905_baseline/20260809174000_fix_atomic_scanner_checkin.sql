-- Fix production scanner check-ins by keeping one atomic transition path.
--
-- Root cause:
-- 1. A valid scan insert fired scans_validate_and_checkin_trig, which updated
--    the ticket before fn_scan_ticket_unchecked performed its own update.
-- 2. trg_guard_scanner_checkin_only rejected the legitimate status and
--    updated_at changes.
-- 3. Authorized scanner staff could not read their own active device session.

drop trigger if exists scans_validate_and_checkin_trig on public.scans;

create or replace function public.guard_scanner_checkin_only()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  -- Permit only the exact scanner check-in transition and its audit fields.
  if old.status in ('issued'::public.order_item_status, 'transferred'::public.order_item_status)
     and new.status = 'checked_in'::public.order_item_status
     and old.checked_in_at is null
     and new.checked_in_at is not null
     and (to_jsonb(new) - array['status', 'checked_in_at', 'updated_at'])
         = (to_jsonb(old) - array['status', 'checked_in_at', 'updated_at'])
  then
    return new;
  end if;

  -- Preserve trusted backend operational workflows.
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

notify pgrst, 'reload schema';

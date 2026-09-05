-- Harden exposed SECURITY DEFINER surface flagged by Supabase Security Advisor.
--
-- Source: TICK-36. Reclassifies each flagged function by intended caller and
-- revokes EXECUTE from anon/authenticated where the function is trigger-only,
-- an internal helper, ops/admin-only, or only ever invoked via the service_role
-- admin client. Switches public discovery views to security_invoker = true so
-- their rows respect the querying role's RLS, and adds the narrow anon SELECT
-- policies that the invoker views need on venues/organizations.

begin;

-- ----------------------------------------------------------------------------
-- 1. Trigger-only functions. Bodies run as the table owner when the trigger
--    fires; no public RPC entry point is needed.
-- ----------------------------------------------------------------------------
revoke execute on function public.fn_recalculate_event_live_stats_from_order()           from public, anon, authenticated;
revoke execute on function public.fn_recalculate_event_live_stats_from_order_item()      from public, anon, authenticated;
revoke execute on function public.fn_recalculate_event_live_stats_from_payment()         from public, anon, authenticated;
revoke execute on function public.fn_recalculate_event_live_stats_from_scan()            from public, anon, authenticated;
revoke execute on function public.fn_recalculate_event_live_stats_from_ticket_type()     from public, anon, authenticated;
revoke execute on function public.fn_touch_event_live_stats_updated_at()                 from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Internal helper called from other SECURITY DEFINER functions and from
--    triggers. SECURITY DEFINER callers inherit the definer privileges, so
--    revoking from the API roles does not break internal use.
-- ----------------------------------------------------------------------------
revoke execute on function public.fn_enqueue_webhook(text, jsonb, uuid)                  from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Ops / admin-only RPCs. All call sites use the service_role admin client
--    (createAdminClient) which bypasses these grants.
-- ----------------------------------------------------------------------------
revoke execute on function public.fn_backfill_event_live_stats()                         from public, anon, authenticated;
revoke execute on function public.fn_recalculate_event_live_stats(uuid)                  from public, anon, authenticated;
revoke execute on function public.fn_admin_schedule_webhook_dispatch(text, text, text)   from public, anon, authenticated;
revoke execute on function public.fn_db_slow_queries(integer, numeric)                   from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. User-facing bootstrap RPC: harden the function body to require that the
--    caller owns the profile being bootstrapped, then narrow grants to
--    authenticated only. anon never has a verified user, so it has no
--    legitimate reason to invoke this surface.
-- ----------------------------------------------------------------------------
create or replace function public.fn_bootstrap_ticketiv_user(
  p_user_id uuid,
  p_email text default null,
  p_phone text default null,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_caller uuid := auth.uid();
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = 'P0001';
  end if;

  if v_caller is null or v_caller <> p_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.profiles (user_id, display_name, phone, role)
  values (
    p_user_id,
    nullif(trim(coalesce(p_display_name, split_part(coalesce(p_email, ''), '@', 1), '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    'attendee'::public.app_role
  )
  on conflict (user_id) do update
    set
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      phone = coalesce(public.profiles.phone, excluded.phone),
      role = coalesce(public.profiles.role, 'attendee'::public.app_role)
  returning * into v_profile;

  return to_jsonb(v_profile);
end;
$$;

revoke execute on function public.fn_bootstrap_ticketiv_user(uuid, text, text, text) from public, anon;
grant  execute on function public.fn_bootstrap_ticketiv_user(uuid, text, text, text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. Other user-facing SECURITY DEFINER RPCs already grant authenticated only
--    and validate auth.uid() / row ownership internally (verified via source):
--      fn_create_resale_checkout_order, fn_complete_resale_after_payment,
--      fn_create_waitlist_checkout_order, fn_complete_waitlist_after_payment,
--      fn_publish_resale_listing, fn_pos_charge.
--    No grant changes required; advisor surfaces them as intentional.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 6. Public discovery views: switch to security_invoker so the querying role's
--    RLS applies. This removes the security_definer_view advisor finding.
-- ----------------------------------------------------------------------------
alter view public.v_events_public      set (security_invoker = true);
alter view public.v_public_event_cards set (security_invoker = true);

-- ----------------------------------------------------------------------------
-- 7. Narrow anon SELECT policies on the join targets the invoker views need.
--    Without these, anonymous discovery would lose venue and organizer fields
--    once the views stop running as the definer. Each policy only exposes rows
--    that are already reachable via a published, currently-public event.
-- ----------------------------------------------------------------------------
drop policy if exists venues_anon_public_event_read on public.venues;
create policy venues_anon_public_event_read on public.venues
  for select to anon
  using (
    exists (
      select 1
      from public.events e
      where e.venue_id = venues.id
        and e.status = 'published'::event_status
        and e.visibility = 'public'
        and (e.publish_at is null or e.publish_at <= now())
        and (e.unpublish_at is null or e.unpublish_at > now())
    )
  );

drop policy if exists organizations_anon_public_event_read on public.organizations;
create policy organizations_anon_public_event_read on public.organizations
  for select to anon
  using (
    exists (
      select 1
      from public.events e
      where e.org_id = organizations.id
        and e.status = 'published'::event_status
        and e.visibility = 'public'
        and (e.publish_at is null or e.publish_at <= now())
        and (e.unpublish_at is null or e.unpublish_at > now())
    )
  );

commit;

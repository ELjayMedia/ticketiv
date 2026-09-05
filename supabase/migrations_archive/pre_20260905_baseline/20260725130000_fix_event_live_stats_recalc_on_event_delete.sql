-- Fix event deletion, which aborted for any event that had ticket types or scans.
--
-- fn_recalculate_event_live_stats(p_event_id) ends with:
--
--   returning * into v_stats;
--   if not found then raise exception 'event % not found', p_event_id; end if;
--
-- and its driving select is `from public.events e where e.id = p_event_id`, so
-- "not found" means "no such event". That is the right contract for a direct
-- call with a bogus id, but it is wrong for the AFTER DELETE triggers, because
-- PostgreSQL deletes the parent row *before* firing the ON DELETE CASCADE
-- triggers for its children. So `delete from events where id = X` would:
--
--   1. delete the event row,
--   2. cascade to ticket_types, firing trg_recalc_event_live_stats_ticket_types,
--   3. which called fn_recalculate_event_live_stats(old.event_id),
--   4. which matched no event (already gone) and raised, aborting the whole
--      statement.
--
-- Net effect: events with ticket types could not be deleted at all, through the
-- organizer delete-event path as much as through raw SQL. Events with no ticket
-- types and no scans deleted fine, which is why this went unnoticed.
-- 20260725120000_cleanup_seeded_orgs_for_uat.sql worked around it by deleting
-- scans and ticket_types explicitly first; this removes the need for that.
--
-- The fix guards the two wrappers that pass an event id straight through, so
-- they recalculate only while the event still exists and no-op once it is gone.
-- fn_recalculate_event_live_stats itself is deliberately left strict: a direct
-- call for a non-existent event should still raise. Because the guard reads the
-- same snapshot as the recalc, an event visible to the guard is visible to the
-- recalc, so the check cannot pass and then fail inside.
--
-- The other three wrappers (_from_order, _from_order_item, _from_payment) need
-- no guard: each derives event_id by joining through ticket_types, and
-- ticket_types.event_id is a FK to events, so a surviving ticket type implies a
-- surviving event. When a cascade removes the ticket type first they simply
-- resolve no rows and skip.

create or replace function public.fn_recalculate_event_live_stats_from_ticket_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'DELETE' and new.event_id is not null
     and exists (select 1 from public.events where id = new.event_id) then
    perform public.fn_recalculate_event_live_stats(new.event_id);
  end if;

  -- Skipped when the event is already gone: this trigger also fires as part of
  -- the cascade that deletes the event itself.
  if tg_op <> 'INSERT' and old.event_id is not null
     and exists (select 1 from public.events where id = old.event_id) then
    perform public.fn_recalculate_event_live_stats(old.event_id);
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.fn_recalculate_event_live_stats_from_scan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'DELETE' and new.event_id is not null
     and exists (select 1 from public.events where id = new.event_id) then
    perform public.fn_recalculate_event_live_stats(new.event_id);
  end if;

  if tg_op <> 'INSERT' and old.event_id is not null
     and exists (select 1 from public.events where id = old.event_id) then
    perform public.fn_recalculate_event_live_stats(old.event_id);
  end if;

  return coalesce(new, old);
end;
$$;

-- create or replace preserves the existing ACL, but re-assert the revokes from
-- 20260524190000_harden_security_definer_surface.sql so the hardened surface
-- stays explicit at the point these definitions change. Both are trigger-only
-- and must never be directly callable from the browser.
revoke execute on function public.fn_recalculate_event_live_stats_from_ticket_type() from public, anon, authenticated;
revoke execute on function public.fn_recalculate_event_live_stats_from_scan()        from public, anon, authenticated;

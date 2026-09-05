-- TICK-337 (found by the cross-org authorization harness) — repair two RPCs
-- that could never run for anyone.
--
-- ============================================================================
-- The bug
-- ============================================================================
--
-- fn_transition_event_status_unchecked and fn_duplicate_event_unchecked both
-- gate on org membership with:
--
--   AND role = ANY(ARRAY['organizer_owner', 'organizer_admin']::text[])
--
-- public.org_members.role is of type app_role, not text. Postgres has no
-- app_role = text operator, so this raises before any authorization decision
-- is reached:
--
--   42883: operator does not exist: app_role = text
--
-- It therefore fails for the org's own owner exactly as it fails for a
-- stranger. Both RPCs are reachable from the organizer workspace
-- (app/orgs/[orgId]/events/actions.ts), which means "duplicate event" and
-- every event status change -- publish, pause, cancel -- have never worked
-- through this path.
--
-- Found while building supabase/tests/cross_org_authorization.sql: the harness
-- flagged both as refused-but-not-for-authorization-reasons, and re-running
-- them as the legitimate owner of the event confirmed the same error. That
-- distinction is the whole reason the harness reports a ???? category instead
-- of counting every refusal as a pass.
--
-- ============================================================================
-- The fix
-- ============================================================================
--
-- Cast the array to app_role[] rather than the column to text. Two working
-- patterns already exist in this database -- app.is_org_manager casts the
-- array (`array[...]::app_role[]`) and public.can_manage_event casts the
-- column (`om.role::text in (...)`). The array cast is preferred here: it
-- keeps the comparison inside the enum type, so an invalid role name becomes
-- an error at definition time instead of silently never matching.
--
-- Every listed value is a real app_role label, verified against pg_enum:
-- admin, organizer, organizer_owner, organizer_admin.
--
-- Applied by rewriting the stored definitions in place, so this migration
-- cannot drift from whatever else those bodies contain.

do $$
declare
  v_def text;
  v_new text;
  v_fixed integer := 0;
begin
  for v_def in
    select pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('fn_transition_event_status_unchecked', 'fn_duplicate_event_unchecked')
  loop
    v_new := replace(
      v_def,
      $bad$ANY(ARRAY['organizer_owner', 'organizer_admin']::text[])$bad$,
      $good$ANY(ARRAY['organizer_owner', 'organizer_admin']::app_role[])$good$
    );
    v_new := replace(
      v_new,
      $bad$ANY(ARRAY['admin','organizer','organizer_owner','organizer_admin']::text[])$bad$,
      $good$ANY(ARRAY['admin','organizer','organizer_owner','organizer_admin']::app_role[])$good$
    );

    if v_new <> v_def then
      execute v_new;
      v_fixed := v_fixed + 1;
    end if;
  end loop;

  if v_fixed <> 2 then
    raise exception 'expected to repair 2 functions, repaired %; the text[] comparison may have changed shape', v_fixed;
  end if;
end $$;

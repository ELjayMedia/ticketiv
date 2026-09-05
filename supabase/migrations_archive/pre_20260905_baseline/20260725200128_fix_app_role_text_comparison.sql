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
end $$;;

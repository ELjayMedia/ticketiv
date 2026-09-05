-- Extend fn_create_seat_hold to accept an optional ticket_type_id so the
-- event detail page can record the buyer's selection in the hold row.
-- The parameter is nullable — callers that don't supply it get the same
-- behaviour as before (ticket_type_id stored as NULL).

create or replace function fn_create_seat_hold(
  p_event_id        uuid,
  p_quantity        int  default 1,
  p_ticket_type_id  uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold_code text;
begin
  v_hold_code := replace(gen_random_uuid()::text, '-', '');

  insert into seat_holds (event_id, hold_code, quantity, ticket_type_id, expires_at, created_by)
  values (
    p_event_id,
    v_hold_code,
    p_quantity,
    p_ticket_type_id,
    now() + interval '10 minutes',
    (select auth.uid())
  );

  return v_hold_code;
end;
$$;

-- Re-grant for both old and new signature (Postgres matches on arg count, but
-- explicit grants on all overloads keeps USAGE correct for anon/authenticated).
grant execute on function fn_create_seat_hold(uuid, int, uuid) to anon, authenticated;

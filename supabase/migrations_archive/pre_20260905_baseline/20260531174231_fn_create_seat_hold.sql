
create or replace function fn_create_seat_hold(
  p_event_id  uuid,
  p_quantity  int default 1
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

  insert into seat_holds (event_id, hold_code, quantity, expires_at, created_by)
  values (
    p_event_id,
    v_hold_code,
    p_quantity,
    now() + interval '10 minutes',
    (select auth.uid())
  );

  return v_hold_code;
end;
$$;

grant execute on function fn_create_seat_hold(uuid, int) to anon, authenticated;
;

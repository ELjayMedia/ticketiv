-- Restore anon EXECUTE on fn_ticket_type_remaining.
--
-- The TICK-176 anon-EXECUTE revocation swept this function even though it is
-- the intended public availability surface: event detail and checkout call it
-- for signed-out visitors and guest buyers (lib/data/public/event-detail.ts
-- explicitly relies on it being anon-callable). Since the revocation, every
-- anonymous render logged `42501 permission denied for function
-- fn_ticket_type_remaining` and guests saw no remaining counts, no
-- "Only N left" scarcity labels, and no sold-out states.
--
-- The function is SECURITY DEFINER, read-only, and returns only aggregate
-- remaining counts per ticket type — no PII.

begin;

grant execute on function public.fn_ticket_type_remaining(uuid) to anon;

commit;

-- Returns the queue position for each of the current user's active waitlist entries.
-- Position is rank by joined_at within (event_id, ticket_type_id) among 'waiting' status entries.
create or replace function public.fn_my_waitlist_positions()
returns table(
  waitlist_id uuid,
  "position" bigint,
  queue_length bigint
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      id,
      row_number() over (
        partition by event_id, ticket_type_id
        order by joined_at asc
      ) as position,
      count(*) over (
        partition by event_id, ticket_type_id
      ) as queue_length
    from public.waitlists
    where status = 'waiting'
  )
  select
    r.id as waitlist_id,
    r.position,
    r.queue_length
  from ranked r
  inner join public.waitlists w on w.id = r.id
  where w.user_id = (select auth.uid())
    and w.status = 'waiting';
$$;

-- TICK-366: make organizer purchase limits optional and keep the public
-- availability count aligned with the online-channel guard used at checkout.

alter table public.ticket_types
  alter column per_user_limit drop default;

create or replace function public.fn_ticket_type_remaining(p_event_id uuid)
returns table(ticket_type_id uuid, remaining integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    tt.id,
    greatest(
      0,
      least(
        tt.quota - coalesce(reserved.all_channels, 0),
        case
          when channels.has_channels and online.ticket_type_id is null then 0
          when online.quota is null then tt.quota - coalesce(reserved.all_channels, 0)
          else online.quota - coalesce(reserved.online, 0)
        end
      )
    )::integer
  from public.ticket_types tt
  left join public.ticket_type_channels online
    on online.ticket_type_id = tt.id
   and online.channel = 'online'::public.sales_channel
  left join lateral (
    select exists (
      select 1
      from public.ticket_type_channels configured
      where configured.ticket_type_id = tt.id
    ) as has_channels
  ) channels on true
  left join lateral (
    select
      count(*)::integer as all_channels,
      count(*) filter (where o.channel = 'online'::public.sales_channel)::integer as online
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = tt.id
      and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
      and (
        o.status = 'paid'
        or (
          o.status = 'pending'
          and (o.hold_expires_at is null or o.hold_expires_at > now())
        )
      )
  ) reserved on true
  where tt.event_id = p_event_id;
$function$;

comment on function public.fn_ticket_type_remaining(uuid) is
  'Public online availability by ticket type, bounded by total and online-channel quota.';

revoke execute on function public.fn_ticket_type_remaining(uuid) from public;
grant execute on function public.fn_ticket_type_remaining(uuid) to anon, authenticated, service_role;

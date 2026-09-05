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

revoke execute on function public.fn_recalculate_event_live_stats_from_ticket_type() from public, anon, authenticated;
revoke execute on function public.fn_recalculate_event_live_stats_from_scan()        from public, anon, authenticated;;

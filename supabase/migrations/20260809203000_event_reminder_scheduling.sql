-- Make attendee event reminders explicit, schedulable and idempotent.

alter table public.user_notification_preferences
  add column if not exists event_reminders_enabled boolean not null default true,
  add column if not exists remind_24h boolean not null default true,
  add column if not exists remind_2h boolean not null default true;

create or replace function public.fn_update_my_reminder_preferences(
  p_enabled boolean,
  p_remind_24h boolean,
  p_remind_2h boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.user_notification_preferences as p (
    user_id,
    event_reminders_enabled,
    remind_24h,
    remind_2h,
    updated_at
  )
  values (
    v_user,
    coalesce(p_enabled, true),
    coalesce(p_remind_24h, true),
    coalesce(p_remind_2h, true),
    now()
  )
  on conflict (user_id) do update
  set event_reminders_enabled = excluded.event_reminders_enabled,
      remind_24h = excluded.remind_24h,
      remind_2h = excluded.remind_2h,
      updated_at = now();
end;
$function$;

revoke execute on function public.fn_update_my_reminder_preferences(boolean, boolean, boolean)
  from public, anon;
grant execute on function public.fn_update_my_reminder_preferences(boolean, boolean, boolean)
  to authenticated, service_role;

create schema if not exists app;

create or replace function app.fn_enqueue_event_reminders(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_inserted integer := 0;
  v_count integer := 0;
begin
  with ticket_events as (
    select distinct
      oi.id as order_item_id,
      coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) as user_id,
      e.id as event_id,
      e.title as event_title,
      e.slug as event_slug,
      coalesce(e.starts_at, next_date.starts_at) as event_starts_at,
      coalesce(p.event_reminders_enabled, true) as reminders_enabled,
      coalesce(p.remind_24h, true) as remind_24h,
      coalesce(p.remind_2h, true) as remind_2h,
      coalesce(p.email_opt_in, true) as email_enabled,
      coalesce(p.in_app_opt_in, true) as in_app_enabled
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.events e on e.id = tt.event_id
    left join lateral (
      select ed.starts_at
      from public.event_dates ed
      where ed.event_id = e.id and ed.starts_at > p_now
      order by ed.starts_at
      limit 1
    ) next_date on true
    left join public.user_notification_preferences p
      on p.user_id = coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id)
    where o.status = 'paid'::public.order_status
      and oi.status = 'issued'::public.order_item_status
      and oi.revoked_at is null
      and oi.refunded_at is null
      and coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) is not null
      and e.status = 'published'::public.event_status
  ),
  due as (
    select te.*, reminder.label, reminder.offset_value
    from ticket_events te
    cross join lateral (
      values
        ('24h'::text, interval '24 hours', te.remind_24h),
        ('2h'::text, interval '2 hours', te.remind_2h)
    ) reminder(label, offset_value, enabled)
    where te.reminders_enabled
      and reminder.enabled
      and te.event_starts_at is not null
      and te.event_starts_at > p_now
      and te.event_starts_at - reminder.offset_value <= p_now
      and te.event_starts_at - reminder.offset_value > p_now - interval '10 minutes'
  )
  insert into public.notifications (
    user_id, type, payload, status, channel, dedupe_key,
    scheduled_at, sent_at, delivered_at
  )
  select
    d.user_id,
    'event_reminder',
    jsonb_build_object(
      'title', case when d.label = '24h' then 'Your event is tomorrow' else 'Your event starts soon' end,
      'message', case when d.label = '24h'
        then d.event_title || ' starts in about 24 hours.'
        else d.event_title || ' starts in about 2 hours.'
      end,
      'eventId', d.event_id,
      'eventTitle', d.event_title,
      'eventSlug', d.event_slug,
      'eventStartsAt', d.event_starts_at,
      'reminderWindow', d.label
    ),
    'delivered',
    'in_app',
    'event-reminder:' || d.order_item_id || ':' || extract(epoch from d.event_starts_at)::bigint || ':' || d.label || ':in_app',
    p_now,
    p_now,
    p_now
  from due d
  where d.in_app_enabled
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;

  with ticket_events as (
    select distinct
      oi.id as order_item_id,
      coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) as user_id,
      e.id as event_id,
      e.title as event_title,
      e.slug as event_slug,
      coalesce(e.starts_at, next_date.starts_at) as event_starts_at,
      coalesce(p.event_reminders_enabled, true) as reminders_enabled,
      coalesce(p.remind_24h, true) as remind_24h,
      coalesce(p.remind_2h, true) as remind_2h,
      coalesce(p.email_opt_in, true) as email_enabled
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.events e on e.id = tt.event_id
    left join lateral (
      select ed.starts_at
      from public.event_dates ed
      where ed.event_id = e.id and ed.starts_at > p_now
      order by ed.starts_at
      limit 1
    ) next_date on true
    left join public.user_notification_preferences p
      on p.user_id = coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id)
    where o.status = 'paid'::public.order_status
      and oi.status = 'issued'::public.order_item_status
      and oi.revoked_at is null
      and oi.refunded_at is null
      and coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) is not null
      and e.status = 'published'::public.event_status
  ),
  due as (
    select te.*, reminder.label, reminder.offset_value
    from ticket_events te
    cross join lateral (
      values
        ('24h'::text, interval '24 hours', te.remind_24h),
        ('2h'::text, interval '2 hours', te.remind_2h)
    ) reminder(label, offset_value, enabled)
    where te.reminders_enabled
      and reminder.enabled
      and te.email_enabled
      and te.event_starts_at is not null
      and te.event_starts_at > p_now
      and te.event_starts_at - reminder.offset_value <= p_now
      and te.event_starts_at - reminder.offset_value > p_now - interval '10 minutes'
  )
  insert into public.notifications (
    user_id, type, payload, status, channel, dedupe_key, scheduled_at
  )
  select
    d.user_id,
    'event_reminder',
    jsonb_build_object(
      'title', case when d.label = '24h' then 'Your event is tomorrow' else 'Your event starts soon' end,
      'message', case when d.label = '24h'
        then d.event_title || ' starts in about 24 hours.'
        else d.event_title || ' starts in about 2 hours.'
      end,
      'eventId', d.event_id,
      'eventTitle', d.event_title,
      'eventSlug', d.event_slug,
      'eventStartsAt', d.event_starts_at,
      'reminderWindow', d.label
    ),
    'pending',
    'email',
    'event-reminder:' || d.order_item_id || ':' || extract(epoch from d.event_starts_at)::bigint || ':' || d.label || ':email',
    p_now
  from due d
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;
  return v_inserted;
end;
$function$;

revoke all on function app.fn_enqueue_event_reminders(timestamptz)
  from public, anon, authenticated;
grant execute on function app.fn_enqueue_event_reminders(timestamptz)
  to postgres, service_role;

drop policy if exists notifications_insert_per_user on public.notifications;
revoke insert on table public.notifications from anon, authenticated;

do $block$
begin
  if exists (select 1 from cron.job where jobname = 'ticketiv-event-reminders') then
    perform cron.unschedule('ticketiv-event-reminders');
  end if;
  perform cron.schedule(
    'ticketiv-event-reminders',
    '*/5 * * * *',
    'select app.fn_enqueue_event_reminders();'
  );
end;
$block$;

comment on function app.fn_enqueue_event_reminders(timestamptz) is
  'Queues idempotent in-app and email reminders for valid upcoming attendee tickets.';

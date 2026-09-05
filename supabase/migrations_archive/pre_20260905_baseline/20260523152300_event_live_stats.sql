create table if not exists public.event_live_stats (
  event_id uuid primary key references public.events(id) on delete cascade,
  tickets_sold integer not null default 0 check (tickets_sold >= 0),
  tickets_available integer not null default 0 check (tickets_available >= 0),
  gross_sales_cents bigint not null default 0 check (gross_sales_cents >= 0),
  successful_payments integer not null default 0 check (successful_payments >= 0),
  failed_payments integer not null default 0 check (failed_payments >= 0),
  checked_in_count integer not null default 0 check (checked_in_count >= 0),
  last_order_at timestamptz,
  last_scan_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.event_live_stats enable row level security;

grant select on public.event_live_stats to anon;
grant select on public.event_live_stats to authenticated;

drop policy if exists event_live_stats_public_read on public.event_live_stats;
drop policy if exists event_live_stats_org_read on public.event_live_stats;

create policy event_live_stats_public_read
on public.event_live_stats
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_live_stats.event_id
      and e.status::text = 'published'
      and e.visibility = 'public'
      and (e.publish_at is null or e.publish_at <= now())
      and (e.unpublish_at is null or e.unpublish_at > now())
  )
);

create policy event_live_stats_org_read
on public.event_live_stats
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_live_stats.event_id
      and (
        public.is_org_admin(e.org_id)
        or public.user_has_org_role(
          e.org_id,
          array['admin','organizer','organizer_owner','organizer_admin','organizer_staff','scanner','pos']::text[]
        )
        or public.is_super_admin(auth.uid())
      )
  )
);

create or replace function public.fn_touch_event_live_stats_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_touch_event_live_stats_updated_at
before update on public.event_live_stats
for each row
execute function public.fn_touch_event_live_stats_updated_at();

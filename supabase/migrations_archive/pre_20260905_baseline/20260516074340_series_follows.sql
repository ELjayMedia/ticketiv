create table public.series_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null references public.event_series(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, series_id)
);

create index series_follows_series_id_idx on public.series_follows (series_id);

alter table public.series_follows enable row level security;

create policy "Users can view their own series follows"
  on public.series_follows for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own series follows"
  on public.series_follows for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own series follows"
  on public.series_follows for delete
  using ((select auth.uid()) = user_id);;

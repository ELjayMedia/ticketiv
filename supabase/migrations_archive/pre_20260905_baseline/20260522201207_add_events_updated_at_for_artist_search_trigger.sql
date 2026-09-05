alter table public.events add column if not exists updated_at timestamp with time zone default now();
update public.events set updated_at = coalesce(updated_at, now()) where updated_at is null;;

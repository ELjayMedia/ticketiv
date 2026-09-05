alter table public.notifications
add column if not exists read_at timestamp with time zone;

create index if not exists idx_notifications_user_read_created
on public.notifications (user_id, read_at, created_at desc);;

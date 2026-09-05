
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  method_type text not null default 'card',
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  token text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_methods enable row level security;

create index if not exists payment_methods_user_id_idx on public.payment_methods(user_id);

create policy "own_payment_methods_select" on public.payment_methods
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own_payment_methods_insert" on public.payment_methods
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own_payment_methods_update" on public.payment_methods
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own_payment_methods_delete" on public.payment_methods
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger payment_methods_set_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();
;

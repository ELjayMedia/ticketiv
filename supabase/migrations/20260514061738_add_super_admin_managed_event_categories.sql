begin;

create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  icon text,
  color text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_categories_name_not_blank check (length(trim(name)) > 0),
  constraint event_categories_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' and length(slug) between 2 and 80)
);

create unique index if not exists event_categories_slug_unique on public.event_categories (slug);
create unique index if not exists event_categories_name_unique on public.event_categories (lower(trim(name)));
create index if not exists event_categories_active_sort_idx on public.event_categories (is_active, sort_order, name);

create or replace function public.set_event_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_event_categories_updated_at on public.event_categories;
create trigger trg_event_categories_updated_at
before update on public.event_categories
for each row execute function public.set_event_categories_updated_at();

alter table public.event_categories enable row level security;

drop policy if exists event_categories_public_read_active on public.event_categories;
create policy event_categories_public_read_active
on public.event_categories
for select
to anon, authenticated
using (is_active = true or public.is_global_admin(auth.uid()));

drop policy if exists event_categories_super_admin_write on public.event_categories;
create policy event_categories_super_admin_write
on public.event_categories
for all
to authenticated
using (public.is_global_admin(auth.uid()))
with check (public.is_global_admin(auth.uid()));

insert into public.event_categories (name, slug, description, sort_order, is_active)
values
  ('Music', 'music', 'Concerts, festivals, DJs and live performances.', 10, true),
  ('Comedy', 'comedy', 'Stand-up comedy and comedy showcases.', 20, true),
  ('Sports', 'sports', 'Sports fixtures, tournaments and fitness events.', 30, true),
  ('Business', 'business', 'Business, networking, expos and professional events.', 40, true),
  ('Conference', 'conference', 'Conferences, seminars and workshops.', 50, true),
  ('Theatre', 'theatre', 'Theatre, stage productions and performing arts.', 60, true),
  ('Lifestyle', 'lifestyle', 'Lifestyle, food, fashion and social experiences.', 70, true),
  ('Hospitality', 'hospitality', 'Hospitality packages and premium experiences.', 80, true),
  ('Other', 'other', 'Events that do not fit another category.', 999, true)
on conflict (slug) do update set
  name = excluded.name,
  description = coalesce(public.event_categories.description, excluded.description),
  sort_order = excluded.sort_order,
  is_active = true;

create or replace function public.fn_event_category_slug_exists(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_categories
    where slug = p_slug
      and is_active = true
  )
$$;

grant execute on function public.fn_event_category_slug_exists(text) to authenticated;

commit;;

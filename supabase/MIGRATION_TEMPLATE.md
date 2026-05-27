# Supabase migration template

Use this pattern for every new table created in the public schema.

Supabase now requires explicit grants for tables exposed through the Data API. These grants do not replace Row Level Security (RLS). Always enable RLS and add policies that match the feature.

## Required pattern

```sql
create table public.example_table (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.example_table enable row level security;

grant select on public.example_table to anon;
grant select, insert, update, delete on public.example_table to authenticated;
grant all privileges on public.example_table to service_role;
```

## Sequence grants

```sql
grant usage, select on sequence public.example_table_id_seq to anon;
grant usage, select, update on sequence public.example_table_id_seq to authenticated;
grant all privileges on sequence public.example_table_id_seq to service_role;
```

## Notes

- RLS remains mandatory for user-facing tables.
- Avoid broad RPC execution grants.
- Avoid anon write access unless specifically required.

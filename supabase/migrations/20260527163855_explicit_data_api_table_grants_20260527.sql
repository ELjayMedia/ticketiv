-- Supabase Data API compatibility grants for existing and future public tables.
-- This does not bypass RLS. RLS policies still decide which rows each role can access.

-- Allow API roles to use the exposed public schema.
grant usage on schema public to anon, authenticated, service_role;

-- Existing tables/views in public.
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;

-- Existing sequences used by identity/serial columns.
grant usage, select on all sequences in schema public to anon;
grant usage, select, update on all sequences in schema public to authenticated;
grant all privileges on all sequences in schema public to service_role;

-- Future tables/views created in public by the migration/database owner.
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all privileges on tables to service_role;

-- Future sequences created in public by the migration/database owner.
alter default privileges in schema public grant usage, select on sequences to anon;
alter default privileges in schema public grant usage, select, update on sequences to authenticated;
alter default privileges in schema public grant all privileges on sequences to service_role;;

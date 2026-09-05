begin;

-- Lock down helper functions created during recent category/venue/artist work.
-- These should be called from trusted server-side routes/actions, not directly from anon/browser clients.

create or replace function public.slugify_text(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'))
$$;

create or replace function public.set_event_categories_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.fn_event_category_slug_exists(p_slug text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.event_categories
    where slug = p_slug
      and is_active = true
  )
$$;

revoke execute on function public.slugify_text(text) from public, anon, authenticated;
revoke execute on function public.set_event_categories_updated_at() from public, anon, authenticated;
revoke execute on function public.fn_event_category_slug_exists(text) from public, anon, authenticated;
revoke execute on function public.fn_get_or_create_venue(text, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.fn_get_or_create_artist(text, text, text) from public, anon, authenticated;
revoke execute on function public.fn_link_event_artist_by_name(uuid, text, text, text, text) from public, anon, authenticated;

grant execute on function public.slugify_text(text) to service_role;
grant execute on function public.set_event_categories_updated_at() to service_role;
grant execute on function public.fn_event_category_slug_exists(text) to service_role;
grant execute on function public.fn_get_or_create_venue(text, text, text, text, integer) to service_role;
grant execute on function public.fn_get_or_create_artist(text, text, text) to service_role;
grant execute on function public.fn_link_event_artist_by_name(uuid, text, text, text, text) to service_role;

-- Event categories: keep reads public for active rows and restrict writes to super admins,
-- using initplan-friendly checks to avoid per-row auth function re-evaluation.
drop policy if exists event_categories_public_read_active on public.event_categories;
drop policy if exists event_categories_super_admin_write on public.event_categories;

create policy event_categories_read_active_or_super_admin
on public.event_categories
for select
to anon, authenticated
using (
  is_active = true
  or public.is_global_admin((select auth.uid()))
);

create policy event_categories_super_admin_insert
on public.event_categories
for insert
to authenticated
with check (public.is_global_admin((select auth.uid())));

create policy event_categories_super_admin_update
on public.event_categories
for update
to authenticated
using (public.is_global_admin((select auth.uid())))
with check (public.is_global_admin((select auth.uid())));

create policy event_categories_super_admin_delete
on public.event_categories
for delete
to authenticated
using (public.is_global_admin((select auth.uid())));

commit;;

-- Privacy-safe public profile lookup for /@username.
-- The RPC exposes only identity fields; private account/profile columns remain
-- protected by the existing table RLS policies.

create or replace function public.get_public_profile(p_handle text)
returns table (
  handle text,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  is_owner boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    h.handle,
    coalesce(
      nullif(btrim(p.display_name), ''),
      nullif(btrim(concat_ws(' ', p.name, p.surname)), ''),
      h.handle
    ) as display_name,
    p.avatar_url,
    p.created_at as joined_at,
    (select auth.uid()) = h.user_id as is_owner
  from public.user_handles h
  join public.profiles p on p.user_id = h.user_id
  where lower(h.handle) = lower(btrim(p_handle))
    and btrim(p_handle) ~ '^[A-Za-z0-9_]{3,30}$'
  limit 1;
$$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

comment on function public.get_public_profile(text) is
  'Privacy-safe public profile lookup by permanent handle. Returns identity fields only.';

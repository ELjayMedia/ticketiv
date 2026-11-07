-- TICK-467: backend enforcement for public profile, promo and avatar surfaces.
-- Production migration-history drift (TICK-466) must be reconciled before
-- deploying this file to the shared production database.

begin;

-- The original avatar bucket/policies were deployed in an archived migration
-- that is not part of the compacted baseline. Reconstruct them in a fresh
-- database, without overwriting existing production policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Avatar images are publicly readable') then
    create policy "Avatar images are publicly readable" on storage.objects for select
      using (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can upload their own avatar') then
    create policy "Users can upload their own avatar" on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can update their own avatar') then
    create policy "Users can update their own avatar" on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can delete their own avatar') then
    create policy "Users can delete their own avatar" on storage.objects for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
end;
$$;

-- Promo previews remain available to guests through the Next.js endpoint,
-- where the caller is rate-limited. Do not permit an anonymous user to call
-- this SECURITY DEFINER RPC directly and bypass that limiter.
revoke all on function public.fn_preview_promo_code(uuid, text, public.sales_channel)
  from public, anon, authenticated;
grant execute on function public.fn_preview_promo_code(uuid, text, public.sales_channel)
  to service_role;

-- The public-handle legacy RPC used to bypass profile discoverability and
-- block rules. Keep its response shape while delegating visibility to the
-- existing privacy-aware social profile lookup.
create or replace function public.get_public_profile(p_handle text)
returns table(
  handle text,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  is_owner boolean
)
language sql stable security invoker
set search_path = ''
as $$
  select s.handle, s.display_name, s.avatar_url, s.joined_at, s.is_owner
  from public.get_social_public_profile(p_handle) s;
$$;

-- Authenticated is also the database role used by anonymous Supabase guest
-- sessions. Contact matching should only be available to claimed accounts.
create or replace function public.fn_match_friend_contacts(p_phones text[])
returns table(
  input_index integer,
  handle text,
  display_name text,
  avatar_url text,
  relationship_state text,
  can_request boolean
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_count integer := coalesce(array_length(p_phones, 1), 0);
begin
  if v_me is null then raise exception 'authentication required' using errcode = '42501'; end if;
  perform app.require_claimed_account();
  if v_count = 0 then return; end if;
  if v_count > 100 then raise exception 'too many contacts; select at most 100 phone numbers' using errcode = '22023'; end if;
  if not public.fn_rate_limit('friend-contact-match:' || v_me::text, 12, 3600) then raise exception 'rate_limited: too many contact matching attempts' using errcode = 'P0001'; end if;
  return query
  with inputs as (
    select u.ordinality::integer as input_index, public.fn_contact_phone_key(u.phone) as phone_key
    from unnest(p_phones) with ordinality as u(phone, ordinality)
    where u.phone is not null and length(u.phone) <= 64
  ), eligible as (
    select i.input_index, h.user_id, h.handle,
      coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(concat_ws(' ', p.name, p.surname)), ''), h.handle) as display_name,
      p.avatar_url, coalesce(s.allow_friend_requests, true) as allow_friend_requests
    from inputs i
    join public.user_private_profiles pp on i.phone_key is not null and public.fn_contact_phone_key(pp.phone) = i.phone_key
    join public.profiles p on p.user_id = pp.user_id
    join public.user_handles h on h.user_id = p.user_id
    left join public.user_privacy_settings s on s.user_id = p.user_id
    where p.user_id <> v_me and coalesce(s.discover_by_phone, false)
      and (coalesce(s.profile_discoverability, 'everyone') = 'everyone' or exists (
        select 1 from public.user_connections uc where uc.status = 'accepted'::public.connection_status
          and ((uc.requester_id = v_me and uc.recipient_id = p.user_id) or (uc.requester_id = p.user_id and uc.recipient_id = v_me))
      ))
      and not exists (
        select 1 from public.user_blocks b where (b.blocker_id = v_me and b.blocked_id = p.user_id) or (b.blocker_id = p.user_id and b.blocked_id = v_me)
      )
  ), unambiguous as (
    select e.* from eligible e where 1 = (select count(*) from eligible e2 where e2.input_index = e.input_index)
  )
  select u.input_index, u.handle, u.display_name, u.avatar_url,
    case
      when exists (select 1 from public.user_connections uc where uc.status = 'accepted'::public.connection_status and ((uc.requester_id = v_me and uc.recipient_id = u.user_id) or (uc.requester_id = u.user_id and uc.recipient_id = v_me))) then 'friends'
      when exists (select 1 from public.user_connections uc where uc.status = 'pending'::public.connection_status and uc.requester_id = v_me and uc.recipient_id = u.user_id) then 'outgoing_pending'
      when exists (select 1 from public.user_connections uc where uc.status = 'pending'::public.connection_status and uc.requester_id = u.user_id and uc.recipient_id = v_me) then 'incoming_pending'
      else 'none'
    end,
    u.allow_friend_requests and not exists (
      select 1 from public.user_connections uc where uc.status in ('accepted'::public.connection_status, 'pending'::public.connection_status)
        and ((uc.requester_id = v_me and uc.recipient_id = u.user_id) or (uc.requester_id = u.user_id and uc.recipient_id = v_me))
    )
  from unambiguous u order by u.input_index;
end;
$$;

commit;

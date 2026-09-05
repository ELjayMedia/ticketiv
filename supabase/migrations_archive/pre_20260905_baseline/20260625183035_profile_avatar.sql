begin;

alter table public.profiles
  add column if not exists avatar_url text;

create or replace function public.fn_set_my_avatar_url(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.profiles
  set avatar_url = nullif(btrim(coalesce(p_url, '')), '')
  where user_id = v_user;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end;
$function$;

revoke execute on function public.fn_set_my_avatar_url(text) from public, anon;
grant execute on function public.fn_set_my_avatar_url(text) to authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;;

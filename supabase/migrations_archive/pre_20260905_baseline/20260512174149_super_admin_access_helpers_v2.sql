create or replace function public.is_super_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = check_user_id
  );
$$;

alter function public.is_super_admin(uuid) owner to postgres;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_users_user_id_fkey'
      and conrelid = 'public.admin_users'::regclass
  ) then
    alter table public.admin_users
      add constraint admin_users_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_users'
      and policyname = 'Super admins can read admin users'
  ) then
    create policy "Super admins can read admin users"
      on public.admin_users
      for select
      using (public.is_super_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_users'
      and policyname = 'Super admins can manage admin users'
  ) then
    create policy "Super admins can manage admin users"
      on public.admin_users
      for all
      using (public.is_super_admin(auth.uid()))
      with check (public.is_super_admin(auth.uid()));
  end if;
end $$;

create or replace function public.grant_seeded_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if lower(new.email) = lower('eljaymediainc@gmail.com') then
    insert into public.profiles (user_id, display_name, role)
    values (new.id, 'Eljay Media Super Admin', 'admin')
    on conflict (user_id) do update
      set display_name = coalesce(public.profiles.display_name, excluded.display_name),
          role = 'admin';

    insert into public.admin_users (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists grant_seeded_super_admin_on_auth_user on auth.users;

create trigger grant_seeded_super_admin_on_auth_user
after insert or update of email on auth.users
for each row
execute function public.grant_seeded_super_admin();

do $$
declare
  existing_user_id uuid;
begin
  select id into existing_user_id
  from auth.users
  where lower(email) = lower('eljaymediainc@gmail.com')
  limit 1;

  if existing_user_id is not null then
    insert into public.profiles (user_id, display_name, role)
    values (existing_user_id, 'Eljay Media Super Admin', 'admin')
    on conflict (user_id) do update
      set display_name = coalesce(public.profiles.display_name, excluded.display_name),
          role = 'admin';

    insert into public.admin_users (user_id)
    values (existing_user_id)
    on conflict (user_id) do nothing;
  end if;
end $$;;

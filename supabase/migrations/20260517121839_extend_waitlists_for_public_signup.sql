
alter table public.waitlists
  alter column user_id drop not null,
  alter column ticket_type_id drop not null;

alter table public.waitlists
  add column if not exists email text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists quantity_requested integer not null default 1 check (quantity_requested > 0),
  add column if not exists status text not null default 'active'
    check (status in ('active','offered','converted','expired','cancelled')),
  add column if not exists offer_expires_at timestamptz,
  add column if not exists notified_at timestamptz,
  add column if not exists joined_at timestamptz not null default now();

alter table public.waitlists
  add constraint waitlists_identity_present check (email is not null or user_id is not null);

create unique index if not exists waitlists_event_email_uniq
  on public.waitlists (event_id, lower(email)) where email is not null;

create policy "public_join_waitlist" on public.waitlists
  for insert to anon, authenticated
  with check (status = 'active');
;

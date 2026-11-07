-- Admin console, phase 1: find a customer's problem and fix it from the console.
--
-- Adds:
--   * admin_notes: internal notes on an order or a person (admins only).
--   * payment_support_references: the PAY-XXXXXXXX code shown on a payment
--     error screen, saved so support can search for it. Before this the code
--     only reached logs and Sentry.
--   * admin_search_people(text): finds accounts by email, name or phone
--     (emails live in auth.users, which the app cannot query directly).
--   * admin_search_orders(text): finds orders by order id prefix, buyer email,
--     buyer phone or ticket code.
--   * admin_revoke_user_sessions(uuid): "sign out of all devices".
--   * admin_reissue_ticket_code(uuid): a new ticket code for a ticket. The old
--     QR stops scanning.
--
-- All tables have RLS on with no policies, and all functions can only be run
-- by service_role: only the admin console's server code (service-role client,
-- behind requireAdminRole) can reach them. Each console action writes its own
-- audit_log row with the admin's reason.

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('order', 'person', 'event', 'organization')),
  subject_id text not null,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists admin_notes_subject_idx on public.admin_notes (subject_type, subject_id, created_at desc);
alter table public.admin_notes enable row level security;
revoke all on public.admin_notes from anon, authenticated;

create table if not exists public.payment_support_references (
  ref text primary key check (ref ~ '^PAY-[0-9A-F]{8}$'),
  order_id uuid references public.orders (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  reason text not null,
  provider text,
  diagnostic jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_support_references_order_idx on public.payment_support_references (order_id, created_at desc);
alter table public.payment_support_references enable row level security;
revoke all on public.payment_support_references from anon, authenticated;

create or replace function public.admin_search_people(p_query text, p_limit integer default 10)
returns table (
  user_id uuid,
  email text,
  display_name text,
  name text,
  surname text,
  phone text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
stable
security definer
set search_path to ''
as $function$
  with q as (
    select
      lower(btrim(coalesce(p_query, ''))) as term,
      regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g') as digits
  )
  select
    u.id,
    u.email::text,
    p.display_name,
    coalesce(pp.name, p.name),
    coalesce(pp.surname, p.surname),
    pp.phone,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  cross join q
  left join public.profiles p on p.user_id = u.id
  left join public.user_private_profiles pp on pp.user_id = u.id
  where char_length(q.term) >= 2
    and (
      lower(u.email) like '%' || q.term || '%'
      or lower(coalesce(p.display_name, '')) like '%' || q.term || '%'
      or lower(concat_ws(' ', coalesce(pp.name, p.name), coalesce(pp.surname, p.surname))) like '%' || q.term || '%'
      or (char_length(q.digits) >= 6 and regexp_replace(coalesce(pp.phone, u.phone::text, ''), '[^0-9]', '', 'g') like '%' || q.digits || '%')
      or u.id::text = q.term
    )
  order by u.last_sign_in_at desc nulls last
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$function$;

create or replace function public.admin_search_orders(p_query text, p_limit integer default 10)
returns table (
  order_id uuid,
  status text,
  total_cents integer,
  currency text,
  buyer_email text,
  buyer_id uuid,
  event_id uuid,
  event_title text,
  item_count integer,
  created_at timestamptz,
  matched_ticket_code text
)
language sql
stable
security definer
set search_path to ''
as $function$
  with q as (
    select
      lower(btrim(coalesce(p_query, ''))) as term,
      upper(btrim(coalesce(p_query, ''))) as code,
      regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g') as digits
  ),
  hits as (
    select o.id, null::text as code
    from public.orders o, q
    where char_length(q.term) >= 3
      and (
        (q.term ~ '^[0-9a-f-]{8,36}$' and o.id::text like q.term || '%')
        or lower(coalesce(o.buyer_email, o.email, '')) like '%' || q.term || '%'
        or (char_length(q.digits) >= 6 and regexp_replace(coalesce(o.buyer_phone, o.phone, ''), '[^0-9]', '', 'g') like '%' || q.digits || '%')
      )
    union
    select oi.order_id, oi.ticket_code
    from public.order_items oi, q
    where char_length(q.code) >= 4 and oi.ticket_code like q.code || '%'
  )
  select
    o.id,
    o.status::text,
    o.total_cents,
    o.currency,
    coalesce(o.buyer_email, o.email),
    o.buyer_id,
    e.id,
    e.title,
    o.item_count,
    o.created_at,
    max(h.code)
  from hits h
  join public.orders o on o.id = h.id
  left join lateral (
    select tt.event_id
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    where oi.order_id = o.id
    limit 1
  ) first_item on true
  left join public.events e on e.id = first_item.event_id
  group by o.id, e.id
  order by o.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$function$;

create or replace function public.admin_revoke_user_sessions(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_count integer;
begin
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_count = row_count;
  -- Refresh tokens normally cascade from sessions; clear any strays too.
  delete from auth.refresh_tokens where user_id = p_user_id::text;
  return v_count;
end;
$function$;

create or replace function public.admin_reissue_ticket_code(p_order_item_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_code text;
begin
  update public.order_items
     set ticket_code = app.gen_ticket_code(),
         updated_at = now()
   where id = p_order_item_id
     and status = 'issued'
     and checked_in_at is null
  returning ticket_code into v_code;

  if v_code is null then
    raise exception 'ticket_not_reissuable' using errcode = 'P0001';
  end if;
  return v_code;
end;
$function$;

revoke all on function public.admin_search_people(text, integer) from public, anon, authenticated;
revoke all on function public.admin_search_orders(text, integer) from public, anon, authenticated;
revoke all on function public.admin_revoke_user_sessions(uuid) from public, anon, authenticated;
revoke all on function public.admin_reissue_ticket_code(uuid) from public, anon, authenticated;
grant execute on function public.admin_search_people(text, integer) to service_role;
grant execute on function public.admin_search_orders(text, integer) to service_role;
grant execute on function public.admin_revoke_user_sessions(uuid) to service_role;
grant execute on function public.admin_reissue_ticket_code(uuid) to service_role;

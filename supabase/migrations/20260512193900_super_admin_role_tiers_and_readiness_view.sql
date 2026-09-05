do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role_tier') then
    create type public.admin_role_tier as enum ('super_admin', 'finance_admin', 'support_admin', 'event_ops_admin', 'read_only_admin');
  end if;
end $$;

alter table public.admin_users
  add column if not exists role_tier public.admin_role_tier not null default 'super_admin';

alter table public.admin_users
  add column if not exists active boolean not null default true;

alter table public.admin_users
  add column if not exists notes text;

create or replace view public.admin_event_readiness
with (security_invoker = true)
as
select
  e.id as event_id,
  e.org_id,
  e.title,
  e.status,
  e.visibility,
  e.starts_at,
  e.ends_at,
  e.cover_image_url,
  e.description,
  e.venue_id,
  count(tt.id) filter (where coalesce(tt.sales_status::text, 'on_sale') = 'on_sale' and tt.quota > 0) as on_sale_ticket_types,
  exists (
    select 1
    from public.pricing_plans pp
    where pp.org_id = e.org_id
      and pp.active is true
  ) as has_active_pricing_plan,
  exists (
    select 1
    from public.payout_accounts pa
    where pa.org_id = e.org_id
  ) as has_payout_account,
  jsonb_build_object(
    'has_organization', e.org_id is not null,
    'has_venue', e.venue_id is not null,
    'has_title', nullif(trim(coalesce(e.title, '')), '') is not null,
    'has_slug', nullif(trim(coalesce(e.slug, '')), '') is not null,
    'has_start_date', e.starts_at is not null,
    'has_valid_date_range', e.ends_at is null or e.starts_at is null or e.ends_at > e.starts_at,
    'has_cover_image', nullif(trim(coalesce(e.cover_image_url, '')), '') is not null,
    'has_description', nullif(trim(coalesce(e.description, '')), '') is not null,
    'has_on_sale_ticket_type', count(tt.id) filter (where coalesce(tt.sales_status::text, 'on_sale') = 'on_sale' and tt.quota > 0) > 0,
    'has_active_pricing_plan', exists (select 1 from public.pricing_plans pp where pp.org_id = e.org_id and pp.active is true),
    'has_payout_account', exists (select 1 from public.payout_accounts pa where pa.org_id = e.org_id)
  ) as checks
from public.events e
left join public.ticket_types tt on tt.event_id = e.id
group by e.id;

comment on view public.admin_event_readiness is 'Super-admin event readiness checklist read model. Security invoker view used by backend dashboard only.';;

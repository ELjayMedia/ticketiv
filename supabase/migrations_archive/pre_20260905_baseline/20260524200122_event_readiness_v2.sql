create or replace view public.admin_event_readiness as
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
  count(tt.id) filter (
    where coalesce(tt.sales_status::text, 'on_sale') = 'on_sale' and tt.quota > 0
  ) as on_sale_ticket_types,
  exists (
    select 1 from public.pricing_plans pp
    where pp.org_id = e.org_id and pp.active is true
  ) as has_active_pricing_plan,
  exists (
    select 1 from public.payout_accounts pa
    where pa.org_id = e.org_id
  ) as has_payout_account,
  jsonb_build_object(
    'has_organization',          e.org_id is not null,
    'has_venue',                 e.venue_id is not null,
    'has_title',                 nullif(trim(coalesce(e.title, '')), '') is not null,
    'has_slug',                  nullif(trim(coalesce(e.slug, '')), '') is not null,
    'has_start_date',            e.starts_at is not null,
    'has_valid_date_range',      e.ends_at is null or e.starts_at is null or e.ends_at > e.starts_at,
    'has_cover_image',           nullif(trim(coalesce(e.cover_image_url, '')), '') is not null,
    'has_description',           nullif(trim(coalesce(e.description, '')), '') is not null,
    'has_on_sale_ticket_type',   count(tt.id) filter (
                                   where coalesce(tt.sales_status::text, 'on_sale') = 'on_sale' and tt.quota > 0
                                 ) > 0,
    'has_active_pricing_plan',   exists (
                                   select 1 from public.pricing_plans pp
                                   where pp.org_id = e.org_id and pp.active is true
                                 ),
    'has_payout_account',        exists (
                                   select 1 from public.payout_accounts pa
                                   where pa.org_id = e.org_id
                                 ),
    'has_online_sales_channel',  exists (
                                   select 1
                                   from public.ticket_types tt2
                                   join public.ticket_type_channels ttc on ttc.ticket_type_id = tt2.id
                                   where tt2.event_id = e.id
                                     and ttc.channel = 'online'
                                     and coalesce(tt2.sales_status::text, 'on_sale') in ('on_sale', 'paused')
                                 ),
    'has_refund_or_support',     (
                                   case
                                     when e.refund_policy is null then false
                                     when jsonb_typeof(e.refund_policy) = 'object'
                                       then (e.refund_policy <> '{}'::jsonb)
                                     when jsonb_typeof(e.refund_policy) = 'array'
                                       then (jsonb_array_length(e.refund_policy) > 0)
                                     when jsonb_typeof(e.refund_policy) = 'string'
                                       then (length(trim(e.refund_policy #>> '{}')) > 0)
                                     else true
                                   end
                                 ) or nullif(trim(coalesce(e.confirmation_message, '')), '') is not null,
    'has_active_staff',          exists (
                                   select 1 from public.event_staff es
                                   where es.event_id = e.id and coalesce(es.active, true) = true
                                 ),
    'has_live_stats_row',        exists (
                                   select 1 from public.event_live_stats els
                                   where els.event_id = e.id
                                 )
  ) as checks
from public.events e
left join public.ticket_types tt on tt.event_id = e.id
group by e.id;;

create or replace function public.admin_create_pricing_plan_version(
  p_org_id uuid,
  p_platform_percent_bps integer,
  p_processor_percent_bps integer,
  p_processor_fixed_cents integer,
  p_min_platform_fee_cents integer,
  p_currency text,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_previous public.pricing_plans%rowtype;
  v_new_id uuid;
  v_now timestamptz := clock_timestamp();
  v_currency text := upper(trim(coalesce(p_currency, '')));
begin
  if p_org_id is null then
    raise exception 'Organization is required';
  end if;

  if p_actor_id is null then
    raise exception 'Admin actor is required';
  end if;

  if p_platform_percent_bps is null or p_platform_percent_bps < 0 or p_platform_percent_bps > 10000 then
    raise exception 'Platform commission must be between 0 and 10000 basis points';
  end if;

  if p_processor_percent_bps is null or p_processor_percent_bps < 0 or p_processor_percent_bps > 10000 then
    raise exception 'Processor percentage must be between 0 and 10000 basis points';
  end if;

  if p_processor_fixed_cents is null or p_processor_fixed_cents < 0 then
    raise exception 'Processor fixed fee cannot be negative';
  end if;

  if p_min_platform_fee_cents is null or p_min_platform_fee_cents < 0 then
    raise exception 'Minimum platform fee cannot be negative';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a three-letter ISO code';
  end if;

  if not exists (select 1 from public.organizations where id = p_org_id) then
    raise exception 'Organization not found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_org_id::text, 0));

  select *
    into v_previous
  from public.pricing_plans
  where org_id = p_org_id
    and active is true
  order by effective_from desc, created_at desc
  limit 1
  for update;

  if v_previous.id is not null then
    update public.pricing_plans
      set active = false
    where id = v_previous.id;
  end if;

  insert into public.pricing_plans (
    org_id,
    platform_percent_bps,
    platform_fixed_cents,
    processor_percent_bps,
    processor_fixed_cents,
    platform_fee_payer,
    processor_fee_payer,
    min_platform_fee_cents,
    max_platform_fee_cents,
    currency,
    active,
    effective_from
  ) values (
    p_org_id,
    p_platform_percent_bps,
    0,
    p_processor_percent_bps,
    p_processor_fixed_cents,
    'organizer'::public.fee_payer,
    'organizer'::public.fee_payer,
    p_min_platform_fee_cents,
    v_previous.max_platform_fee_cents,
    v_currency,
    true,
    v_now
  )
  returning id into v_new_id;

  insert into public.audit_log (
    org_id,
    actor_id,
    table_name,
    record_id,
    action,
    changes
  ) values (
    p_org_id,
    p_actor_id,
    'pricing_plans',
    v_new_id::text,
    case
      when v_previous.id is null then 'insert'::public.audit_action
      else 'update'::public.audit_action
    end,
    jsonb_build_object(
      'business_action', 'create_pricing_plan_version',
      'previous_plan_id', v_previous.id,
      'new_plan_id', v_new_id,
      'effective_from', v_now,
      'previous', case when v_previous.id is null then null else jsonb_build_object(
        'platform_percent_bps', v_previous.platform_percent_bps,
        'processor_percent_bps', v_previous.processor_percent_bps,
        'processor_fixed_cents', v_previous.processor_fixed_cents,
        'min_platform_fee_cents', v_previous.min_platform_fee_cents,
        'currency', v_previous.currency
      ) end,
      'next', jsonb_build_object(
        'platform_percent_bps', p_platform_percent_bps,
        'processor_percent_bps', p_processor_percent_bps,
        'processor_fixed_cents', p_processor_fixed_cents,
        'min_platform_fee_cents', p_min_platform_fee_cents,
        'platform_fee_payer', 'organizer',
        'currency', v_currency
      )
    )
  );

  return v_new_id;
end;
$function$;

revoke all on function public.admin_create_pricing_plan_version(uuid, integer, integer, integer, integer, text, uuid) from public;
revoke execute on function public.admin_create_pricing_plan_version(uuid, integer, integer, integer, integer, text, uuid) from anon, authenticated;
grant execute on function public.admin_create_pricing_plan_version(uuid, integer, integer, integer, integer, text, uuid) to service_role;

comment on function public.admin_create_pricing_plan_version(uuid, integer, integer, integer, integer, text, uuid) is
  'TICK-351 service-role-only atomic pricing-plan version writer. Retires the current active organization plan, inserts a new effective-dated organizer-paid plan, and writes an audit_log entry.';

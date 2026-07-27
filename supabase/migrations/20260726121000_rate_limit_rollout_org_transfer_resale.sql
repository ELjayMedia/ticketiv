-- Rate-limit rollout (control #7): organization creation, ticket transfers,
-- resale publication.
--
-- Dated after main's latest migration on purpose (see the checkout migration's
-- header): main's claimed-account refactor split these into a thin checked shim
-- (app.require_claimed_account() -> *_unchecked worker). We add the guard where
-- it survives that architecture:
--   * Organizations: in the _unchecked WORKER (which holds the real body), so
--     the shim -> worker path is limited. 5 per creator per hour.
--   * Transfers / resale: in the SHIM, between the auth check and the worker
--     delegation, keyed by auth.uid() (fully qualified — 'auth' is off these
--     functions' search_path). 20 per user per hour each.
-- Limits chosen to sit comfortably above legitimate use while blocking spam /
-- recipient-email enumeration / listing floods. Bodies are otherwise verbatim
-- from the deployed versions.

-- Organizations: 5 per creator per hour (spam guard) — guard the worker.
create or replace function public.fn_create_organization_unchecked(p_name text, p_currency text DEFAULT 'SZL'::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_name text := nullif(trim(p_name), '');
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'SZL'));
  v_base_slug text; v_slug text; v_suffix integer := 0; v_org_id uuid;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if v_name is null then raise exception 'name_required' using errcode = 'P0001'; end if;

  if not public.fn_rate_limit('org_create:' || v_user::text, 5, 3600) then
    raise exception 'rate_limited: too many organizations created, please try again later' using errcode = 'P0001';
  end if;

  v_base_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug = '' then v_base_slug := 'org'; end if;
  v_slug := v_base_slug;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.organizations (name, slug, default_currency)
  values (v_name, v_slug, v_currency) returning id into v_org_id;
  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, v_user, 'organizer_owner');

  return jsonb_build_object('id', v_org_id, 'slug', v_slug, 'name', v_name, 'currency', v_currency);
end;
$function$;

-- Ticket transfers: 20 per user per hour — guard the shim.
create or replace function public.fn_request_transfer_by_email(p_order_item_id uuid, p_recipient_email text)
 returns json
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'app', 'public'
as $function$
begin
  perform app.require_claimed_account();
  if not public.fn_rate_limit('transfer:' || (select auth.uid())::text, 20, 3600) then
    raise exception 'rate_limited: too many transfer requests, please try again later' using errcode = 'P0001';
  end if;
  return public.fn_request_transfer_by_email_unchecked(p_order_item_id, p_recipient_email);
end;
$function$;

-- Resale publication: 20 per user per hour — guard the shim.
create or replace function public.fn_publish_resale_listing(p_order_item_id uuid, p_price_cents integer, p_listing_hours integer DEFAULT 24)
 returns TABLE(listing_id uuid, order_item_id uuid, price_cents integer, currency text, listing_expires_at timestamp with time zone, transfer_fee_cents integer)
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'app', 'public'
as $function$
begin
  perform app.require_claimed_account();
  if not public.fn_rate_limit('resale_publish:' || (select auth.uid())::text, 20, 3600) then
    raise exception 'rate_limited: too many resale listings, please try again later' using errcode = 'P0001';
  end if;
  return query select * from public.fn_publish_resale_listing_unchecked(p_order_item_id, p_price_cents, p_listing_hours);
end;
$function$;

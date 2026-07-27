-- Rate-limit rollout (control #7, batch 3): ticket transfers + resale publish.
--
-- Both are thin "checked" shims that run app.require_claimed_account() and then
-- delegate to the *_unchecked worker. We add the fn_rate_limit guard between the
-- auth check and the delegation, keyed by the caller (auth.uid()). Bodies are
-- otherwise unchanged from the deployed versions. auth.uid() is fully qualified
-- because 'auth' is not on these functions' search_path.
--
-- Limits: 20 per user per hour each — comfortably above any legitimate use
-- (a buyer transfers/relists a handful of tickets) while blocking recipient-
-- email enumeration and listing spam.

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

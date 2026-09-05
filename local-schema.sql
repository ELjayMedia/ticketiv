


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "_internal";


ALTER SCHEMA "_internal" OWNER TO "postgres";


COMMENT ON SCHEMA "_internal" IS 'Internal operational artifacts (policy backups, design notes). Not part of the public API.';



CREATE SCHEMA IF NOT EXISTS "app";


ALTER SCHEMA "app" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "monitoring";


ALTER SCHEMA "monitoring" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "ops_backup";


ALTER SCHEMA "ops_backup" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."admin_role_tier" AS ENUM (
    'super_admin',
    'finance_admin',
    'support_admin',
    'event_ops_admin',
    'read_only_admin'
);


ALTER TYPE "public"."admin_role_tier" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'organizer',
    'venue',
    'artist',
    'attendee',
    'scanner',
    'pos',
    'organizer_owner',
    'organizer_admin',
    'organizer_staff',
    'finance',
    'organizer_scanner',
    'device'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


COMMENT ON TYPE "public"."app_role" IS 'Role enum. Standardized org-membership values: organizer_owner, organizer_admin, organizer_staff, finance. Any other historical values are FROZEN — retained only for legacy data, not for new membership rows. Postgres cannot easily drop enum values. Per-context effective roles come from fn_get_ticketiv_effective_roles. (TICK-268)';



CREATE TYPE "public"."audit_action" AS ENUM (
    'insert',
    'update',
    'delete',
    'login',
    'logout',
    'other'
);


ALTER TYPE "public"."audit_action" OWNER TO "postgres";


CREATE TYPE "public"."connection_status" AS ENUM (
    'pending',
    'accepted',
    'declined',
    'blocked'
);


ALTER TYPE "public"."connection_status" OWNER TO "postgres";


CREATE TYPE "public"."device_role" AS ENUM (
    'organizer_pos',
    'organizer_scanner',
    'organizer_kiosk',
    'scanner_unassigned'
);


ALTER TYPE "public"."device_role" OWNER TO "postgres";


CREATE TYPE "public"."dispute_kind" AS ENUM (
    'refund_request',
    'chargeback',
    'duplicate_charge',
    'not_received',
    'other'
);


ALTER TYPE "public"."dispute_kind" OWNER TO "postgres";


CREATE TYPE "public"."dispute_status" AS ENUM (
    'open',
    'investigating',
    'awaiting_customer',
    'resolved',
    'rejected'
);


ALTER TYPE "public"."dispute_status" OWNER TO "postgres";


CREATE TYPE "public"."event_format" AS ENUM (
    'single_day',
    'multi_day'
);


ALTER TYPE "public"."event_format" OWNER TO "postgres";


CREATE TYPE "public"."event_status" AS ENUM (
    'draft',
    'published',
    'archived',
    'paused'
);


ALTER TYPE "public"."event_status" OWNER TO "postgres";


CREATE TYPE "public"."fee_payer" AS ENUM (
    'buyer',
    'organizer'
);


ALTER TYPE "public"."fee_payer" OWNER TO "postgres";


CREATE TYPE "public"."order_item_status" AS ENUM (
    'pending',
    'issued',
    'transferred',
    'checked_in',
    'revoked',
    'refunded'
);


ALTER TYPE "public"."order_item_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."order_item_status" IS 'Ticket/order item lifecycle. pending means reserved for an unpaid order and must not scan as valid until payment confirmation marks it issued.';



CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."order_totals" AS (
	"order_id" "uuid",
	"currency" "text",
	"item_count" integer,
	"subtotal_cents" integer,
	"platform_fee_cents" integer,
	"processor_fee_cents" integer,
	"total_cents" integer,
	"totals_computed_at" timestamp with time zone
);


ALTER TYPE "public"."order_totals" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'authorized',
    'succeeded',
    'failed',
    'refunded',
    'partially_refunded',
    'chargeback',
    'void'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."payments_status" AS ENUM (
    'succeeded',
    'failed',
    'pending',
    'refunded',
    'chargeback'
);


ALTER TYPE "public"."payments_status" OWNER TO "postgres";


CREATE TYPE "public"."payout_status" AS ENUM (
    'requested',
    'processing',
    'paid',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."payout_status" OWNER TO "postgres";


CREATE TYPE "public"."price_rule_type" AS ENUM (
    'absolute_discount',
    'percent_discount',
    'abs_fee',
    'percent_fee',
    'tax'
);


ALTER TYPE "public"."price_rule_type" OWNER TO "postgres";


CREATE TYPE "public"."push_service" AS ENUM (
    'fcm',
    'apns',
    'hms'
);


ALTER TYPE "public"."push_service" OWNER TO "postgres";


CREATE TYPE "public"."refund_status" AS ENUM (
    'requested',
    'processing',
    'processed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."refund_status" OWNER TO "postgres";


CREATE TYPE "public"."refund_type" AS ENUM (
    'full',
    'partial'
);


ALTER TYPE "public"."refund_type" OWNER TO "postgres";


CREATE TYPE "public"."sales_channel" AS ENUM (
    'online',
    'pos',
    'reseller',
    'import',
    'comp'
);


ALTER TYPE "public"."sales_channel" OWNER TO "postgres";


CREATE TYPE "public"."seat_hold_status" AS ENUM (
    'active',
    'released',
    'expired'
);


ALTER TYPE "public"."seat_hold_status" OWNER TO "postgres";


CREATE TYPE "public"."series_type" AS ENUM (
    'tour',
    'recurring',
    'season'
);


ALTER TYPE "public"."series_type" OWNER TO "postgres";


CREATE TYPE "public"."ticket_type_sales_status" AS ENUM (
    'on_sale',
    'paused',
    'sold_out',
    'hidden'
);


ALTER TYPE "public"."ticket_type_sales_status" OWNER TO "postgres";


CREATE TYPE "public"."transfer_status" AS ENUM (
    'requested',
    'pending',
    'accepted',
    'declined',
    'cancelled',
    'completed',
    'expired'
);


ALTER TYPE "public"."transfer_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_administer_tapband_event"("p_event" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p_event is not null
    and (
      app.is_platform_admin()
      or app.is_event_staff_of(p_event, array['organizer_admin','organizer_staff']::app_role[])
      or exists (
        select 1 from public.events e
        where e.id = p_event
          and app.is_org_manager(e.org_id)
      )
    )
$$;


ALTER FUNCTION "app"."can_administer_tapband_event"("p_event" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_delete_event"("event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'app', 'public'
    AS $$
  select app.is_org_admin_of(org_id) from public.events where id = event_id;
$$;


ALTER FUNCTION "app"."can_delete_event"("event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_manage_guestlist_entry"("p_event" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'app', 'public'
    AS $$
  select app.is_event_staff_of(p_event, array['organizer_admin','organizer_staff']::app_role[])
    or exists (select 1 from public.events e where e.id = p_event and app.is_org_manager(e.org_id));
$$;


ALTER FUNCTION "app"."can_manage_guestlist_entry"("p_event" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_read_tapband_credential"("p_credential" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.physical_credentials pc
    where pc.id = p_credential
      and (
        app.is_platform_admin()
        or pc.user_id = app.uid()
        or exists (
          select 1
          from public.credential_entitlements ce
          join public.events e on e.id = ce.event_id
          left join public.order_items oi on oi.id = ce.order_item_id
          left join public.orders o on o.id = oi.order_id
          where ce.credential_id = pc.id
            and (
              ce.holder_user_id = app.uid()
              or oi.current_owner_id = app.uid()
              or oi.holder_user_id = app.uid()
              or o.buyer_id = app.uid()
              or app.is_event_staff_of(e.id, null::app_role[])
              or app.is_org_manager(e.org_id)
            )
        )
      )
  )
$$;


ALTER FUNCTION "app"."can_read_tapband_credential"("p_credential" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_read_tapband_entitlement"("p_entitlement" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.credential_entitlements ce
    join public.events e on e.id = ce.event_id
    left join public.order_items oi on oi.id = ce.order_item_id
    left join public.orders o on o.id = oi.order_id
    where ce.id = p_entitlement
      and (
        app.is_platform_admin()
        or ce.holder_user_id = app.uid()
        or oi.current_owner_id = app.uid()
        or oi.holder_user_id = app.uid()
        or o.buyer_id = app.uid()
        or app.is_event_staff_of(e.id, null::app_role[])
        or app.is_org_manager(e.org_id)
        or app.can_read_tapband_credential(ce.credential_id)
      )
  )
$$;


ALTER FUNCTION "app"."can_read_tapband_entitlement"("p_entitlement" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_read_tapband_event"("p_event" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p_event is not null
    and (
      app.is_platform_admin()
      or app.is_event_staff_of(p_event, null::app_role[])
      or exists (
        select 1 from public.events e
        where e.id = p_event
          and app.is_org_member_of(e.org_id)
      )
    )
$$;


ALTER FUNCTION "app"."can_read_tapband_event"("p_event" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_read_tapband_inventory"("p_inventory" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.credential_inventory ci
    left join public.events e on e.id = ci.event_id
    where ci.id = p_inventory
      and (
        app.is_platform_admin()
        or (ci.org_id is not null and app.is_org_manager(ci.org_id))
        or (ci.event_id is not null and app.can_read_tapband_event(ci.event_id))
        or exists (
          select 1
          from public.physical_credentials pc
          where pc.inventory_id = ci.id
            and app.can_read_tapband_credential(pc.id)
        )
        or (e.id is not null and app.is_org_member_of(e.org_id))
      )
  )
$$;


ALTER FUNCTION "app"."can_read_tapband_inventory"("p_inventory" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_read_tapband_order_item"("p_order_item" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.events e on e.id = tt.event_id
    where oi.id = p_order_item
      and (
        app.is_platform_admin()
        or oi.current_owner_id = app.uid()
        or oi.holder_user_id = app.uid()
        or o.buyer_id = app.uid()
        or app.is_event_staff_of(e.id, null::app_role[])
        or app.is_org_manager(e.org_id)
      )
  )
$$;


ALTER FUNCTION "app"."can_read_tapband_order_item"("p_order_item" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_read_tapband_tap"("p_tap" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.credential_taps ct
    where ct.id = p_tap
      and (
        app.is_platform_admin()
        or (ct.event_id is not null and app.can_read_tapband_event(ct.event_id))
        or (ct.order_item_id is not null and app.can_read_tapband_order_item(ct.order_item_id))
        or (ct.credential_id is not null and app.can_read_tapband_credential(ct.credential_id))
        or (ct.inventory_id is not null and app.can_read_tapband_inventory(ct.inventory_id))
      )
  )
$$;


ALTER FUNCTION "app"."can_read_tapband_tap"("p_tap" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_record_tapband_event_tap"("p_event" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p_event is not null
    and (
      app.is_platform_admin()
      or app.is_event_staff_of(p_event, array['organizer_admin','organizer_staff','scanner','organizer_scanner']::app_role[])
      or exists (
        select 1 from public.events e
        where e.id = p_event
          and app.is_org_manager(e.org_id)
      )
    )
$$;


ALTER FUNCTION "app"."can_record_tapband_event_tap"("p_event" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."can_update_guestlist_entry"("p_uid" "uuid", "p_event_id" "uuid", "p_created_by" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'app', 'public', 'pg_temp'
    AS $$
  select (p_uid is not null and p_uid = p_created_by)
    or app.is_event_staff_of(p_event_id, array['organizer_admin','organizer_staff']::app_role[])
    or exists (select 1 from public.events e where e.id = p_event_id and app.is_org_manager(e.org_id));
$$;


ALTER FUNCTION "app"."can_update_guestlist_entry"("p_uid" "uuid", "p_event_id" "uuid", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."fn_check_in"("p_event_id" "uuid", "p_code" "text", "p_device_id" "uuid" DEFAULT NULL::"uuid", "p_gate" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public', 'extensions'
    AS $$
DECLARE
  v_norm     text := app.normalize_ticket_code(p_code);
  v_item     public.order_items%ROWTYPE;
  v_ev_id    uuid;
  v_outcome  text;
  v_now      timestamptz := now();
  v_scan_id  uuid;
  v_rows     int;
BEGIN
  -- Find the item by normalized code
  SELECT oi.*
  INTO v_item
  FROM public.order_items oi
  WHERE app.normalize_ticket_code(oi.ticket_code) = v_norm
  LIMIT 1;

  IF NOT FOUND THEN
    v_outcome := 'invalid';
    INSERT INTO public.scans(event_id, order_item_id, ticket_code, outcome, scanned_at, device_id, gate, notes)
    VALUES (p_event_id, NULL, v_norm, v_outcome, v_now, p_device_id, p_gate, p_notes)
    RETURNING id INTO v_scan_id;

    RETURN jsonb_build_object('outcome', v_outcome, 'code', v_norm, 'scanned_at', v_now, 'scan_id', v_scan_id);
  END IF;

  -- Get the item's event
  SELECT tt.event_id INTO v_ev_id
  FROM public.ticket_types tt
  WHERE tt.id = v_item.ticket_type_id;

  -- Determine outcome (without writing yet)
  IF v_ev_id IS DISTINCT FROM p_event_id THEN
    v_outcome := 'wrong_event';

  ELSIF v_item.revoked_at IS NOT NULL THEN
    v_outcome := 'revoked';

  ELSE
    -- Try to mark checked in atomically (prevents double scans)
    UPDATE public.order_items
    SET checked_in_at = v_now
    WHERE id = v_item.id
      AND checked_in_at IS NULL
    RETURNING 1 INTO v_rows;

    IF v_rows = 1 THEN
      v_outcome := 'valid';
    ELSE
      -- Someone else already checked it in
      v_outcome := 'already_used';
    END IF;
  END IF;

  INSERT INTO public.scans(event_id, order_item_id, ticket_code, outcome, scanned_at, device_id, gate, notes)
  VALUES (p_event_id, v_item.id, v_norm, v_outcome, v_now, p_device_id, p_gate, p_notes)
  RETURNING id INTO v_scan_id;

  RETURN jsonb_build_object(
    'outcome', v_outcome,
    'order_item_id', v_item.id,
    'code', v_norm,
    'scanned_at', v_now,
    'scan_id', v_scan_id
  );
END;
$$;


ALTER FUNCTION "app"."fn_check_in"("p_event_id" "uuid", "p_code" "text", "p_device_id" "uuid", "p_gate" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."fn_purchase_items"("p_buyer" "uuid", "p_ticket_type" "uuid", "p_qty" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'app'
    AS $$
declare
  v_event uuid;
  v_org uuid;
  v_order uuid := gen_random_uuid();
  v_quota int;
  v_sold int;
begin
  if p_qty <= 0 then raise exception 'qty must be > 0'; end if;

  select tt.event_id, e.org_id, tt.quota
    into v_event, v_org, v_quota
  from public.ticket_types tt
  join public.events e on e.id = tt.event_id
  where tt.id = p_ticket_type
  for update;

  select count(*) into v_sold
  from public.order_items oi
  where oi.ticket_type_id = p_ticket_type
    and oi.revoked_at is null;

  if v_sold + p_qty > v_quota then
    raise exception 'sold out: available %, requested %', (v_quota - v_sold), p_qty;
  end if;

  insert into public.orders(id, org_id, buyer_id, status, currency, channel)
  values (v_order, v_org, p_buyer, 'pending', 'SZL', 'online');

  insert into public.order_items (order_id, ticket_type_id, ticket_code)
  select v_order, p_ticket_type, null
  from generate_series(1, p_qty);

  -- totals trigger will run
  update public.orders set totals_computed_at = now() where id = v_order;

  return v_order;
end$$;


ALTER FUNCTION "app"."fn_purchase_items"("p_buyer" "uuid", "p_ticket_type" "uuid", "p_qty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."fn_revoke_item"("p_order_item" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'app'
    AS $$
  update public.order_items set revoked_at = now() where id = p_order_item;
$$;


ALTER FUNCTION "app"."fn_revoke_item"("p_order_item" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."gen_ticket_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'app', 'public', 'extensions'
    AS $$
declare
  v_code text;
begin
  loop
    -- 12 base32 chars without confusing chars, then hyphenate 4-4-4
    select regexp_replace(upper(encode(gen_random_bytes(8),'base32')), '[=]+','','g')
    into v_code;

    v_code := substr(v_code,1,4) || '-' || substr(v_code,5,4) || '-' || substr(v_code,9,4);

    exit when not exists (
      select 1 from public.order_items oi where oi.ticket_code = v_code
    );
  end loop;
  return v_code;
end;
$$;


ALTER FUNCTION "app"."gen_ticket_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_claimed_account"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select auth.uid() is not null
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false;
$$;


ALTER FUNCTION "app"."is_claimed_account"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."is_claimed_account"() IS 'Returns true only for an authenticated, non-anonymous Supabase identity. Missing is_anonymous claims fail closed.';



CREATE OR REPLACE FUNCTION "app"."is_event_public_now"("p_event" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event
      AND e.visibility = 'public'
      AND COALESCE(e.publish_at, now()) <= now()
      AND (e.unpublish_at IS NULL OR e.unpublish_at > now())
  );
$$;


ALTER FUNCTION "app"."is_event_public_now"("p_event" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_event_staff_of"("p_event" "uuid", "p_roles" "public"."app_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.event_staff es
    where es.event_id = p_event and es.user_id = app.uid()
      and es.active is true and (p_roles is null or es.role = any (p_roles))
  )
$$;


ALTER FUNCTION "app"."is_event_staff_of"("p_event" "uuid", "p_roles" "public"."app_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_org_admin_of"("p_org" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin']::app_role[])
      or app.is_platform_admin()
$$;


ALTER FUNCTION "app"."is_org_admin_of"("p_org" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_org_finance_viewer"("p_org" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select app.org_has_role(p_org, array['organizer_owner','finance']::app_role[])
      or app.is_platform_admin()
$$;


ALTER FUNCTION "app"."is_org_finance_viewer"("p_org" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_org_manager"("p_org" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select app.org_has_role(p_org, array['organizer_owner','organizer_admin','organizer_staff']::app_role[])
      or app.is_platform_admin()
$$;


ALTER FUNCTION "app"."is_org_manager"("p_org" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_org_member_of"("p_org" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select app.org_has_role(p_org, null)
$$;


ALTER FUNCTION "app"."is_org_member_of"("p_org" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_org_owner"("p_org" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select app.org_has_role(p_org, array['organizer_owner']::app_role[])
$$;


ALTER FUNCTION "app"."is_org_owner"("p_org" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
  select app.is_claimed_account()
     and exists (
       select 1 from public.admin_users au
       where au.user_id = auth.uid() and au.active = true
     );
$$;


ALTER FUNCTION "app"."is_platform_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "venue_id" "uuid",
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "status" "public"."event_status" DEFAULT 'draft'::"public"."event_status" NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "tz" "text" DEFAULT 'Africa/Mbabane'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "publish_at" timestamp with time zone,
    "unpublish_at" timestamp with time zone,
    "visibility" "text" DEFAULT 'public'::"text" NOT NULL,
    "cover_image_url" "text",
    "category" "text",
    "city" "text",
    "country_code" "text",
    "created_by" "uuid",
    "published_at" timestamp with time zone,
    "description" "text",
    "event_format" "public"."event_format" DEFAULT 'single_day'::"public"."event_format" NOT NULL,
    "series_id" "uuid",
    "refund_policy" "jsonb",
    "attendee_fields" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "confirmation_message" "text",
    "resale_cap_bps" integer,
    "featured_priority" integer,
    "search_text" "text",
    "search_tsv" "tsvector",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_providers" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "events_featured_priority_check" CHECK ((("featured_priority" IS NULL) OR (("featured_priority" >= 0) AND ("featured_priority" <= 1000)))),
    CONSTRAINT "events_multi_day_requires_dates" CHECK ((("event_format" = 'single_day'::"public"."event_format") OR (("starts_at" IS NOT NULL) AND ("ends_at" IS NOT NULL) AND ("ends_at" > "starts_at")))),
    CONSTRAINT "events_non_draft_requires_venue" CHECK ((("status" = 'draft'::"public"."event_status") OR ("venue_id" IS NOT NULL))),
    CONSTRAINT "events_payment_providers_known" CHECK (("payment_providers" <@ ARRAY['paystack'::"text", 'flutterwave'::"text", 'manual'::"text", 'momo'::"text", 'deltapay'::"text"])),
    CONSTRAINT "events_publish_unpublish_chk" CHECK ((("publish_at" IS NULL) OR ("unpublish_at" IS NULL) OR ("publish_at" <= "unpublish_at"))),
    CONSTRAINT "events_publish_window" CHECK ((("publish_at" IS NULL) OR ("unpublish_at" IS NULL) OR ("publish_at" <= "unpublish_at"))),
    CONSTRAINT "events_publish_window_chk" CHECK ((("publish_at" IS NULL) OR ("unpublish_at" IS NULL) OR ("publish_at" < "unpublish_at"))),
    CONSTRAINT "events_resale_cap_bps_check" CHECK ((("resale_cap_bps" IS NULL) OR (("resale_cap_bps" >= 0) AND ("resale_cap_bps" <= 100000)))),
    CONSTRAINT "events_slug_not_blank_chk" CHECK (("length"(TRIM(BOTH FROM "slug")) > 0)),
    CONSTRAINT "events_starts_before_ends" CHECK ((("starts_at" IS NULL) OR ("ends_at" IS NULL) OR ("starts_at" < "ends_at"))),
    CONSTRAINT "events_starts_ends_chk" CHECK ((("starts_at" IS NULL) OR ("ends_at" IS NULL) OR ("starts_at" <= "ends_at"))),
    CONSTRAINT "events_time_order" CHECK ((("starts_at" IS NULL) OR ("ends_at" IS NULL) OR ("starts_at" <= "ends_at"))),
    CONSTRAINT "events_time_range" CHECK ((("starts_at" IS NULL) OR ("ends_at" IS NULL) OR ("ends_at" > "starts_at"))),
    CONSTRAINT "events_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'unlisted'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."event_format" IS 'single_day = one occurrence (default). multi_day = spans multiple days (festival). Day passes are modeled as ticket_tiers on the same row, not as child events.';



COMMENT ON COLUMN "public"."events"."series_id" IS 'Nullable FK to event_series. NULL means standalone event. Set on tour stops, recurring occurrences, or season events.';



COMMENT ON COLUMN "public"."events"."refund_policy" IS 'Refund policy as JSON. Supports two shapes:
  1. Preset:  {"kind": "flexible" | "moderate" | "strict" | "none"}
  2. Custom:  {"kind": "custom", "bands": [{"hours_before": 48, "refund_bps": 10000}, {"hours_before": 24, "refund_bps": 5000}]}
The TS helper lib/refund-policy.ts resolves either shape into bands.';



COMMENT ON COLUMN "public"."events"."attendee_fields" IS 'JSON array of extra attendee field labels requested during checkout.';



COMMENT ON COLUMN "public"."events"."confirmation_message" IS 'Organizer-defined message shown after successful purchase.';



COMMENT ON COLUMN "public"."events"."resale_cap_bps" IS 'Per-event override for the resale price cap, expressed in basis points of face value (10000 = 100%, 11000 = 110%). NULL falls back to the platform default in app config (RESALE_CAP_BPS_DEFAULT).';



COMMENT ON COLUMN "public"."events"."featured_priority" IS 'Editorial curation rank. NULL = not featured. Higher value = higher rank.';



COMMENT ON COLUMN "public"."events"."payment_providers" IS 'Allowed payment providers for this event. Empty = all enabled providers (no lock). Enforced server-side in createPaymentAttempt + checkout.';



CREATE OR REPLACE FUNCTION "app"."is_published"("e" "public"."events") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'app', 'public', 'extensions'
    AS $$
  select e.status = 'published'
     and e.visibility = 'public'
     and coalesce(e.publish_at, e.created_at) <= now()
     and (e.unpublish_at is null or e.unpublish_at > now());
$$;


ALTER FUNCTION "app"."is_published"("e" "public"."events") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."normalize_code"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'app', 'public', 'extensions'
    AS $$
  select nullif(upper(btrim(p)), '');
$$;


ALTER FUNCTION "app"."normalize_code"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."normalize_ticket_code"("code_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'app', 'public', 'extensions'
    AS $$
  SELECT regexp_replace(upper(coalesce(code_text,'')), '[^A-Z0-9]', '', 'g')
$$;


ALTER FUNCTION "app"."normalize_ticket_code"("code_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."org_has_role"("p_org" "uuid", "p_roles" "public"."app_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = app.uid()
      and (p_roles is null or m.role = any (p_roles))
  )
$$;


ALTER FUNCTION "app"."org_has_role"("p_org" "uuid", "p_roles" "public"."app_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."recompute_order_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'app'
    AS $$
declare
  v_subtotal integer := 0;
  v_count integer := 0;
  v_adjustments integer := 0;
  v_snap jsonb := new.pricing_plan_snapshot;
  v_plan public.pricing_plans%rowtype;
  v_platform_bps integer; v_processor_bps integer; v_processor_fixed integer;
  v_min integer; v_max integer;
  v_payer public.fee_payer;
  v_money record;
begin
  -- Only standard ticket sales are priced by the platform-commission model.
  if new.channel is distinct from 'online'::public.sales_channel
     and new.channel is distinct from 'pos'::public.sales_channel then
    return new;
  end if;

  select coalesce(sum(tt.price_cents),0), count(*)
    into v_subtotal, v_count
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  where oi.order_id = new.id and oi.revoked_at is null;

  -- Nothing to price yet (e.g. waitlist order before fulfilment): keep RPC totals.
  if v_count = 0 then
    return new;
  end if;

  select coalesce(sum(amount_cents),0) into v_adjustments
  from public.order_adjustments where order_id = new.id;

  if v_snap is null then
    select * into v_plan
    from public.pricing_plans
    where id = coalesce(new.pricing_plan_id,
                        (select pp.id from public.pricing_plans pp
                          where pp.org_id = new.org_id and pp.active
                          order by effective_from desc limit 1))
    limit 1;

    v_platform_bps    := coalesce(v_plan.platform_percent_bps, 0);
    v_processor_bps   := coalesce(v_plan.processor_percent_bps, 0);
    v_processor_fixed := coalesce(v_plan.processor_fixed_cents, 0);
    v_min             := v_plan.min_platform_fee_cents;
    v_max             := v_plan.max_platform_fee_cents;
    v_payer           := coalesce(new.fees_paid_by, v_plan.platform_fee_payer, 'organizer'::public.fee_payer);

    new.pricing_plan_id := coalesce(new.pricing_plan_id, v_plan.id);
    new.fees_paid_by    := v_payer;
    new.pricing_plan_snapshot := jsonb_build_object(
      'plan_id', v_plan.id,
      'platform_percent_bps', v_platform_bps,
      'processor_percent_bps', v_processor_bps,
      'processor_fixed_cents', v_processor_fixed,
      'min_platform_fee_cents', v_min,
      'max_platform_fee_cents', v_max,
      'fees_paid_by', v_payer,
      'snapshot_at', now()
    );
  else
    v_platform_bps    := coalesce((v_snap->>'platform_percent_bps')::integer, 0);
    v_processor_bps   := coalesce((v_snap->>'processor_percent_bps')::integer, 0);
    v_processor_fixed := coalesce((v_snap->>'processor_fixed_cents')::integer, 0);
    v_min             := (v_snap->>'min_platform_fee_cents')::integer;
    v_max             := (v_snap->>'max_platform_fee_cents')::integer;
    v_payer           := coalesce(new.fees_paid_by, (v_snap->>'fees_paid_by')::public.fee_payer, 'organizer'::public.fee_payer);
  end if;

  select * into v_money
  from public.fn_compute_order_money(
    v_subtotal, v_adjustments, v_platform_bps, v_processor_bps, v_processor_fixed, v_min, v_max, v_payer
  );

  new.subtotal_cents       := v_subtotal;
  new.item_count           := v_count;
  new.total_cents          := v_money.buyer_total_cents;
  new.platform_fee_cents   := v_money.platform_fee_cents;
  new.processor_fee_cents  := v_money.processor_fee_cents;
  new.organizer_net_cents  := v_money.organizer_net_cents;
  new.currency             := coalesce(new.currency, 'SZL');
  new.order_price_cents         := v_subtotal + v_adjustments;
  new.order_platform_fee_cents  := v_money.platform_fee_cents;
  new.order_processor_fee_cents := v_money.processor_fee_cents;
  new.order_currency            := coalesce(new.order_currency, new.currency, 'SZL');
  new.totals_computed_at        := now();

  return new;
end;
$$;


ALTER FUNCTION "app"."recompute_order_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."require_claimed_account"() RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
begin
  if not app.is_claimed_account() then
    raise exception using
      errcode = '42501',
      message = 'claimed_account_required',
      detail = 'This operation requires a permanent Ticketiv account.',
      hint = 'Claim the anonymous session with a verified email or phone, then retry.';
  end if;
end;
$$;


ALTER FUNCTION "app"."require_claimed_account"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."require_claimed_account"() IS 'Raises claimed_account_required unless the current JWT represents a permanent account.';



CREATE OR REPLACE FUNCTION "app"."ticket_order_context"("p_order_item_id" "uuid") RETURNS TABLE("order_id" "uuid", "buyer_id" "uuid", "order_status" "public"."order_status", "ordered_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select o.id, o.buyer_id, o.status, o.created_at
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = p_order_item_id
    and (
      oi.current_owner_id = (select auth.uid())
      or (oi.current_owner_id is null and o.buyer_id = (select auth.uid()))
    );
$$;


ALTER FUNCTION "app"."ticket_order_context"("p_order_item_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."ticket_order_context"("p_order_item_id" "uuid") IS 'Ticket-scoped order metadata for My Tickets. Returns only when auth.uid() owns the supplied order_item (or is the legacy buyer when current_owner_id is null), avoiding broader orders-table access for transferred recipients.';



CREATE OR REPLACE FUNCTION "app"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog'
    AS $$
  select (select auth.uid())::uuid
$$;


ALTER FUNCTION "app"."uid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."upcase_ticket_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'app', 'public', 'extensions'
    AS $$
begin
  if new.ticket_code is not null then
    new.ticket_code := upper(new.ticket_code);
  end if;
  return new;
end$$;


ALTER FUNCTION "app"."upcase_ticket_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."validate_scan_org"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'app'
    AS $$
declare
  v_event_org uuid;
  v_device_org uuid;
begin
  if new.device_id is not null then
    select org_id into v_device_org from public.devices where id = new.device_id;
  end if;
  select org_id into v_event_org from public.events where id = new.event_id;

  if v_event_org is not null and v_device_org is not null and v_event_org <> v_device_org then
    raise exception 'device org mismatch';
  end if;

  return new;
end$$;


ALTER FUNCTION "app"."validate_scan_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "monitoring"."capture_slow_queries"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'monitoring', 'extensions'
    AS $$
BEGIN
  INSERT INTO monitoring.slow_query_snapshots (query, calls, total_exec_time, mean_exec_time, rows)
  SELECT query, calls, total_exec_time, mean_exec_time, rows
  FROM extensions.pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 50;
END;
$$;


ALTER FUNCTION "monitoring"."capture_slow_queries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "monitoring"."estimate_index_bloat"() RETURNS TABLE("schemaname" "text", "tablename" "text", "indexname" "text", "table_bytes" bigint, "index_bytes" bigint, "bloat_ratio" double precision)
    LANGUAGE "sql"
    SET "search_path" TO 'pg_catalog', 'monitoring', 'extensions'
    AS $$
SELECT
  ns.nspname::text as schemaname,
  t.relname::text as tablename,
  i.relname::text as indexname,
  pg_relation_size(t.oid) as table_bytes,
  pg_relation_size(i.oid) as index_bytes,
  CASE WHEN pg_relation_size(t.oid) = 0 THEN 0 ELSE pg_relation_size(i.oid)::double precision / pg_relation_size(t.oid)::double precision END as bloat_ratio
FROM pg_class t
JOIN pg_namespace ns ON ns.oid = t.relnamespace
JOIN pg_index ix ON ix.indrelid = t.oid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE ns.nspname NOT IN ('pg_catalog','information_schema')
AND pg_relation_size(i.oid) > 0
ORDER BY bloat_ratio DESC
LIMIT 200;
$$;


ALTER FUNCTION "monitoring"."estimate_index_bloat"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_pricing_plan_version"("p_org_id" "uuid", "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_fee_cents" integer, "p_currency" "text", "p_actor_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
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
$_$;


ALTER FUNCTION "public"."admin_create_pricing_plan_version"("p_org_id" "uuid", "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_fee_cents" integer, "p_currency" "text", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_create_pricing_plan_version"("p_org_id" "uuid", "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_fee_cents" integer, "p_currency" "text", "p_actor_id" "uuid") IS 'TICK-351 service-role-only atomic pricing-plan version writer. Retires the current active organization plan, inserts a new effective-dated organizer-paid plan, and writes an audit_log entry.';



CREATE OR REPLACE FUNCTION "public"."admin_log_action"("p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "text", "p_action" "public"."audit_action", "p_changes" "jsonb" DEFAULT '{}'::"jsonb", "p_org_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (p_org_id, p_actor_id, p_table_name, p_record_id, p_action, p_changes);
end;
$$;


ALTER FUNCTION "public"."admin_log_action"("p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "text", "p_action" "public"."audit_action", "p_changes" "jsonb", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_reencrypt_payout_account"("p_account_id" "uuid", "p_expected_sha256" "text", "p_encrypted_details" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
declare
  v_org_id uuid;
begin
  if p_account_id is null then
    raise exception 'Payout account id is required';
  end if;

  if p_expected_sha256 is null or p_expected_sha256 !~ '^[a-fA-F0-9]{64}$' then
    raise exception 'Expected payout detail hash is invalid';
  end if;

  if p_encrypted_details is null
    or p_encrypted_details !~ '^enc:v2:[A-Za-z0-9_-]+:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$'
  then
    raise exception 'Replacement payout details must use the encrypted v2 envelope';
  end if;

  update public.payout_accounts
  set details_encrypted = p_encrypted_details
  where id = p_account_id
    and encode(
      extensions.digest(pg_catalog.convert_to(details_encrypted, 'UTF8'), 'sha256'),
      'hex'
    ) = pg_catalog.lower(p_expected_sha256)
  returning org_id into v_org_id;

  if not found then
    return false;
  end if;

  insert into public.audit_log (
    org_id,
    actor_id,
    table_name,
    record_id,
    action,
    changes
  ) values (
    v_org_id,
    null,
    'payout_accounts',
    p_account_id::text,
    'update'::public.audit_action,
    pg_catalog.jsonb_build_object(
      'business_action', 'reencrypt_payout_account',
      'storage_format', 'enc:v2'
    )
  );

  return true;
end;
$_$;


ALTER FUNCTION "public"."admin_reencrypt_payout_account"("p_account_id" "uuid", "p_expected_sha256" "text", "p_encrypted_details" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_reencrypt_payout_account"("p_account_id" "uuid", "p_expected_sha256" "text", "p_encrypted_details" "text") IS 'TICK-376 service-role-only compare-and-swap writer for payout detail re-encryption. Audits metadata only.';



CREATE OR REPLACE FUNCTION "public"."app_audit_if_table_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  v_user uuid;
BEGIN
  BEGIN
    v_user := NULLIF(current_setting('jwt.claims.user_id', true),'')::uuid;
  EXCEPTION WHEN others THEN
    v_user := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.app_audit_log(schema_name, table_name, operation, row_data, changed_by, change_query)
    VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, to_jsonb(NEW), v_user, NULL);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.app_audit_log(schema_name, table_name, operation, row_data, changed_by, change_query)
    VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)), v_user, NULL);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.app_audit_log(schema_name, table_name, operation, row_data, changed_by, change_query)
    VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, to_jsonb(OLD), v_user, NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."app_audit_if_table_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attach_app_audit"("table_schema" "text", "table_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS app_audit_trigger ON %I.%I', table_schema, table_name);
  EXECUTE format('CREATE TRIGGER app_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.app_audit_if_table_changes()', table_schema, table_name);
END;
$$;


ALTER FUNCTION "public"."attach_app_audit"("table_schema" "text", "table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_event"("p_event_id" "uuid", "p_user" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    (
      p_user = auth.uid()
      or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    )
    and (
      exists (
        select 1 from public.admin_users au
        where au.user_id = p_user and au.active = true
      )
      or exists (
        select 1 from public.event_staff es
        where es.event_id = p_event_id
          and es.user_id = p_user
          and es.active = true
          and es.role::text in ('organizer_admin','organizer_staff')
      )
      or exists (
        select 1
        from public.events e
        join public.org_members om on om.org_id = e.org_id
        where e.id = p_event_id
          and om.user_id = p_user
          and om.role::text in ('organizer_owner','organizer_admin')
      )
    );
$$;


ALTER FUNCTION "public"."can_manage_event"("p_event_id" "uuid", "p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_org"("p_org_id" "uuid", "p_user" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = p_user
      and om.role::text in ('organizer_owner', 'organizer_admin')
  ) or exists (
    select 1
    from public.admin_users au
    where au.user_id = p_user
  );
$$;


ALTER FUNCTION "public"."can_manage_org"("p_org_id" "uuid", "p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_update_ticket_types_by_user"("p_user" "uuid", "p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
  select exists (select 1 from public.events e where e.id = p_event_id and app.is_org_manager(e.org_id))
    or app.is_event_staff_of(p_event_id, array['organizer_admin','organizer_staff']::app_role[])
    or (((select auth.jwt()) ->> 'can_manage_ticket_types')::boolean is true);
$$;


ALTER FUNCTION "public"."can_update_ticket_types_by_user"("p_user" "uuid", "p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_order_payment_status"("p_order_id" "uuid") RETURNS TABLE("expected_total_cents" integer, "net_cents" bigint, "derived_status" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT
    public.orders.total_cents AS expected_total_cents,
    COALESCE(public.order_ledger_summary.net_cents,0)::bigint AS net_cents,
    CASE
      WHEN COALESCE(public.order_ledger_summary.net_cents,0) >= public.orders.total_cents THEN 'paid'
      WHEN COALESCE(public.order_ledger_summary.net_cents,0) <= 0 THEN 'pending'
      WHEN COALESCE(public.order_ledger_summary.net_cents,0) < public.orders.total_cents
           AND COALESCE(public.order_ledger_summary.net_cents,0) > 0 THEN 'partial'
      ELSE 'pending'
    END AS derived_status
  FROM public.orders
  LEFT JOIN public.order_ledger_summary ON public.order_ledger_summary.order_id = public.orders.id
  WHERE public.orders.id = p_order_id;
$$;


ALTER FUNCTION "public"."compute_order_payment_status"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_event_draft"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text" DEFAULT 'private'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.create_event_draft_unchecked(p_org_id, p_title, p_visibility); end; $$;


ALTER FUNCTION "public"."create_event_draft"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_event_draft_unchecked"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text" DEFAULT 'private'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_user uuid;
  v_slug_base text;
  v_slug text;
begin
  v_user := auth.uid();

  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_org(p_org_id, v_user) then
    raise exception 'Not allowed for this org';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception 'Event title is required';
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(btrim(p_title)), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'event';
  end if;

  v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.events (
    org_id,
    venue_id,
    title,
    slug,
    status,
    visibility,
    created_by
  )
  values (
    p_org_id,
    null,
    btrim(p_title),
    v_slug,
    'draft',
    coalesce(nullif(btrim(p_visibility), ''), 'private'),
    v_user
  )
  returning id into v_event_id;

  insert into public.event_staff (event_id, user_id, role)
  values (v_event_id, v_user, 'organizer_admin')
  on conflict (event_id, user_id)
  do update set role = excluded.role;

  return v_event_id;
end;
$$;


ALTER FUNCTION "public"."create_event_draft_unchecked"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_org_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
  select org_id
  from public.org_members
  where user_id = public.current_user_uid()
    and role = any (array['organizer_owner','organizer_admin','organizer_staff']::public.app_role[]);
$$;


ALTER FUNCTION "public"."current_user_org_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select (select auth.uid())::uuid;
$$;


ALTER FUNCTION "public"."current_user_uid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_order_currency_matches_pricing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  plan_currency text;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.pricing_plan_id IS NOT NULL THEN
      SELECT currency INTO plan_currency FROM public.pricing_plans WHERE id = NEW.pricing_plan_id LIMIT 1;
      IF plan_currency IS NOT NULL AND NEW.order_currency IS NOT NULL AND plan_currency <> NEW.order_currency THEN
        -- If creating/updating a paid order with mismatched currency, block.
        IF (NEW.status = 'paid') THEN
          RAISE EXCEPTION 'Order currency (%) does not match pricing plan currency (%)', NEW.order_currency, plan_currency;
        END IF;
        -- Otherwise, just set order_currency to plan currency for determinism if missing
        IF NEW.order_currency IS NULL THEN
          NEW.order_currency := plan_currency;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_order_currency_matches_pricing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_pricing_plan_org_cohesion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
BEGIN
  IF NEW.pricing_plan_id IS NOT NULL THEN
    IF (SELECT org_id FROM public.pricing_plans WHERE id = NEW.pricing_plan_id) IS DISTINCT FROM NEW.org_id THEN
      RAISE EXCEPTION 'pricing_plan.org_id does not match order.org_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_pricing_plan_org_cohesion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_event_metrics_org"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
  evt_org uuid;
BEGIN
  SELECT org_id INTO evt_org FROM public.events WHERE id = NEW.event_id;
  IF evt_org IS DISTINCT FROM NEW.org_id THEN
    RAISE EXCEPTION 'org_id mismatch for event_metrics_daily row for event %', NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_event_metrics_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_event_staff_in_org"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  evt_org uuid;
BEGIN
  SELECT org_id INTO evt_org FROM public.events WHERE id = NEW.event_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = evt_org AND om.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'User % must be an org_member of org % to be event_staff', NEW.user_id, evt_org;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_event_staff_in_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_transfer_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE v_buyer uuid;
BEGIN
  SELECT o.buyer_id INTO v_buyer
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = COALESCE(NEW.order_item_id, OLD.order_item_id);

  IF v_buyer IS NULL OR COALESCE(NEW.from_user_id, OLD.from_user_id) IS DISTINCT FROM v_buyer THEN
    RAISE EXCEPTION 'from_user does not own this ticket';
  END IF;

  RETURN NEW;
END $$;


ALTER FUNCTION "public"."ensure_transfer_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."event_series_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."event_series_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_accept_membership_invite"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_accept_membership_invite_unchecked(p_token); end; $$;


ALTER FUNCTION "public"."fn_accept_membership_invite"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_accept_membership_invite_unchecked"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_invite public.membership_invites;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_invite
  from public.membership_invites
  where token = p_token
  for update;

  if v_invite.id is null then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'invite revoked' using errcode = 'P0001';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite already used' using errcode = 'P0001';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'invite expired' using errcode = 'P0001';
  end if;

  if v_invite.kind = 'org_member' then
    insert into public.org_members (org_id, user_id, role)
    values (v_invite.org_id, v_user, v_invite.role)
    on conflict (org_id, user_id) do update set role = excluded.role;
  else
    insert into public.event_staff (event_id, user_id, role, active)
    values (v_invite.event_id, v_user, v_invite.role, true)
    on conflict (event_id, user_id) do update set role = excluded.role, active = true;
  end if;

  update public.membership_invites
  set accepted_by = v_user, accepted_at = now()
  where id = v_invite.id;

  return jsonb_build_object(
    'kind', v_invite.kind,
    'org_id', v_invite.org_id,
    'event_id', v_invite.event_id,
    'role', v_invite.role::text
  );
end;
$$;


ALTER FUNCTION "public"."fn_accept_membership_invite_unchecked"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_admin_schedule_webhook_dispatch"("p_function_url" "text", "p_anon_jwt" "text", "p_schedule" "text" DEFAULT '* * * * *'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $_$
declare
  v_job_id bigint;
  v_command text;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  v_command := format(
    $cmd$ select net.http_post(url := %L, headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'), body := '{}'::jsonb) $cmd$,
    p_function_url,
    'Bearer ' || p_anon_jwt
  );

  -- Replace any existing schedule with the same name so this is idempotent.
  perform cron.unschedule('webhook-dispatch') from cron.job where jobname = 'webhook-dispatch';
  select cron.schedule('webhook-dispatch', p_schedule, v_command) into v_job_id;

  return jsonb_build_object('job_id', v_job_id, 'schedule', p_schedule);
end
$_$;


ALTER FUNCTION "public"."fn_admin_schedule_webhook_dispatch"("p_function_url" "text", "p_anon_jwt" "text", "p_schedule" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_admin_schedule_webhook_dispatch"("p_function_url" "text", "p_anon_jwt" "text", "p_schedule" "text") IS 'One-time setup helper: schedules pg_cron to POST the webhook-dispatch edge function every minute. Super-admin only.';



CREATE OR REPLACE FUNCTION "public"."fn_anon_users_to_delete"() RETURNS TABLE("user_id" "uuid", "reason" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- Tier 1: no orders at all, created more than 7 days ago
  select u.id as user_id,
         'no_orders_7d' as reason
  from auth.users u
  where u.is_anonymous = true
    and u.created_at < now() - interval '7 days'
    and not exists (
      select 1 from public.orders o where o.buyer_id = u.id
    )

  union all

  -- Tier 2: has orders but none are paid/refunded, created more than 30 days ago
  select u.id as user_id,
         'unpaid_orders_30d' as reason
  from auth.users u
  where u.is_anonymous = true
    and u.created_at < now() - interval '30 days'
    and exists (
      select 1 from public.orders o where o.buyer_id = u.id
    )
    and not exists (
      select 1 from public.orders o
      where o.buyer_id = u.id
        and o.status in ('paid', 'refunded')
    )
;
$$;


ALTER FUNCTION "public"."fn_anon_users_to_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_apply_pricing_to_order"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Reprice-trigger helper only. A direct PostgREST/RPC call has depth 0; a
  -- call from one of the reprice triggers has depth >= 1.
  if pg_trigger_depth() = 0 then
    raise exception using
      errcode = '42501',
      message = 'internal_helper_not_directly_callable',
      detail  = 'fn_apply_pricing_to_order is a reprice-trigger helper, not a public RPC.',
      hint    = 'Order totals recompute automatically when order_items, order_adjustments or orders.status change.';
  end if;

  update public.orders set totals_computed_at = now() where id = p_order_id;
end;
$$;


ALTER FUNCTION "public"."fn_apply_pricing_to_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_apply_promo_code_to_order"("p_order_id" "uuid", "p_code" "text", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order public.orders%ROWTYPE;
  v_event_id uuid;
  v_subtotal integer := 0;
  v_rule public.price_rules%ROWTYPE;
  v_per_user_redemptions integer;
  v_total_redemptions integer;
  v_adjustment_cents integer;
  v_label text;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('applied', false, 'reason', 'code_required');
  end if;
  if p_user_id is null then
    return jsonb_build_object('applied', false, 'reason', 'user_required');
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then return jsonb_build_object('applied', false, 'reason', 'order_not_found'); end if;
  if v_order.buyer_id <> p_user_id then return jsonb_build_object('applied', false, 'reason', 'order_not_owned'); end if;
  if v_order.status <> 'pending' then return jsonb_build_object('applied', false, 'reason', 'order_not_pending'); end if;

  select e.id, coalesce(sum(tt.price_cents), 0)
    into v_event_id, v_subtotal
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.events e on e.id = tt.event_id
  where oi.order_id = p_order_id
  group by e.id;

  if v_event_id is null then return jsonb_build_object('applied', false, 'reason', 'order_has_no_items'); end if;

  select * into v_rule
  from public.price_rules
  where org_id = v_order.org_id
    and lower(code) = lower(trim(p_code))
    and coalesce(is_active, true) = true
    and (event_id is null or event_id = v_event_id)
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and (channel is null or cardinality(channel) = 0 or v_order.channel = any(channel))
  order by created_at desc
  limit 1;

  if not found then return jsonb_build_object('applied', false, 'reason', 'code_invalid'); end if;

  if v_rule.max_redemptions is not null and v_rule.max_redemptions > 0 then
    select count(*)::integer into v_total_redemptions
    from public.price_rule_redemptions
    where price_rule_id = v_rule.id;
    if v_total_redemptions >= v_rule.max_redemptions then
      return jsonb_build_object('applied', false, 'reason', 'code_exhausted');
    end if;
  end if;

  if v_rule.per_user_limit is not null and v_rule.per_user_limit > 0 then
    select count(*)::integer into v_per_user_redemptions
    from public.price_rule_redemptions
    where price_rule_id = v_rule.id and user_id = p_user_id;
    if v_per_user_redemptions >= v_rule.per_user_limit then
      return jsonb_build_object('applied', false, 'reason', 'code_already_used');
    end if;
  end if;

  if exists (
    select 1 from public.order_adjustments
    where order_id = p_order_id and price_rule_id = v_rule.id
  ) then
    return jsonb_build_object('applied', false, 'reason', 'code_already_applied');
  end if;

  v_adjustment_cents := case v_rule.type
    when 'absolute_discount' then -1 * abs(v_rule.value_numeric)::integer
    when 'percent_discount'  then -1 * round(v_subtotal * (v_rule.value_numeric / 100.0))::integer
    when 'abs_fee'           then abs(v_rule.value_numeric)::integer
    when 'percent_fee'       then round(v_subtotal * (v_rule.value_numeric / 100.0))::integer
    when 'tax'               then round(v_subtotal * (v_rule.value_numeric / 100.0))::integer
    else 0
  end;

  if v_adjustment_cents = 0 then
    return jsonb_build_object('applied', false, 'reason', 'rule_has_no_effect');
  end if;

  v_label := upper(trim(p_code));

  insert into public.order_adjustments (
    order_id, price_rule_id, type, scope, amount_cents, label
  ) values (
    p_order_id, v_rule.id, v_rule.type, coalesce(v_rule.applies_to, 'item'), v_adjustment_cents, v_label
  );

  insert into public.price_rule_redemptions (price_rule_id, user_id, order_id, redeemed_at)
  values (v_rule.id, p_user_id, p_order_id, now());

  return jsonb_build_object(
    'applied', true,
    'rule_id', v_rule.id,
    'rule_type', v_rule.type,
    'adjustment_cents', v_adjustment_cents,
    'label', v_label
  );
end;
$$;


ALTER FUNCTION "public"."fn_apply_promo_code_to_order"("p_order_id" "uuid", "p_code" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_archive_audit_log"("p_retention" interval DEFAULT '2 years'::interval, "p_batch_limit" integer DEFAULT 10000) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_cutoff timestamptz := now() - coalesce(p_retention, interval '24 months');
  v_batch integer := greatest(1, coalesce(p_batch_limit, 10000));
  v_pruned integer := 0;
begin
  with victims as (
    select id from public.audit_log
    where created_at < v_cutoff
    order by created_at
    limit v_batch
  ),
  archived as (
    insert into public.audit_log_archive (
      id, org_id, actor_id, table_name, record_id, action, changes, ip, user_agent, created_at
    )
    select a.id, a.org_id, a.actor_id, a.table_name, a.record_id, a.action, a.changes, a.ip, a.user_agent, a.created_at
    from public.audit_log a
    join victims v on v.id = a.id
    on conflict (id) do nothing
  ),
  pruned as (
    delete from public.audit_log a using victims v where a.id = v.id
    returning a.id
  )
  select count(*) from pruned into v_pruned;

  return jsonb_build_object('cutoff', v_cutoff, 'batch_limit', v_batch, 'pruned', v_pruned);
end;
$$;


ALTER FUNCTION "public"."fn_archive_audit_log"("p_retention" interval, "p_batch_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_archive_scans"("p_retention" interval DEFAULT '1 year'::interval, "p_batch_limit" integer DEFAULT 10000) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_cutoff timestamptz := now() - coalesce(p_retention, interval '12 months');
  v_batch integer := greatest(1, coalesce(p_batch_limit, 10000));
  v_pruned integer := 0;
begin
  with victims as (
    select s.id from public.scans s
    join public.events e on e.id = s.event_id
    where s.scanned_at < v_cutoff and coalesce(e.ends_at, e.starts_at) < now()
    order by s.scanned_at limit v_batch
  ),
  archived as (
    insert into public.scans_archive (
      id, event_id, order_item_id, ticket_code, outcome, scanned_at,
      device_id, device_session_id, gate, notes, request_hash, source_ip)
    select s.id, s.event_id, s.order_item_id, s.ticket_code, s.outcome, s.scanned_at,
           s.device_id, s.device_session_id, s.gate, s.notes, s.request_hash, s.source_ip
    from public.scans s join victims v on v.id = s.id
    on conflict (id) do nothing
  ),
  pruned as (
    delete from public.scans s using victims v where s.id = v.id returning s.id
  )
  select count(*) from pruned into v_pruned;
  return jsonb_build_object('cutoff', v_cutoff, 'batch_limit', v_batch, 'pruned', v_pruned);
end;
$$;


ALTER FUNCTION "public"."fn_archive_scans"("p_retention" interval, "p_batch_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_array_has_dups"("anyarray") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $_$
DECLARE
  total int;
  distinct_count int;
BEGIN
  IF $1 IS NULL THEN
    RETURN false;
  END IF;
  SELECT count(*) INTO total FROM unnest($1) as t(v);
  SELECT count(distinct v) INTO distinct_count FROM unnest($1) as t(v);
  RETURN total <> distinct_count;
END;
$_$;


ALTER FUNCTION "public"."fn_array_has_dups"("anyarray") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_backfill_event_live_stats"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event record;
  v_count integer := 0;
begin
  for v_event in select id from public.events loop
    perform public.fn_recalculate_event_live_stats(v_event.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;


ALTER FUNCTION "public"."fn_backfill_event_live_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_bootstrap_ticketiv_user"("p_user_id" "uuid", "p_email" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_display_name" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_profile public.profiles%rowtype;
  v_caller uuid := auth.uid();
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if p_user_id is null then raise exception 'user_id_required' using errcode = 'P0001'; end if;
  if v_caller is null or v_caller <> p_user_id then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.profiles (user_id, display_name)
  values (p_user_id, nullif(trim(coalesce(p_display_name, split_part(coalesce(p_email, ''), '@', 1), '')), ''))
  on conflict (user_id) do update set display_name = coalesce(public.profiles.display_name, excluded.display_name)
  returning * into v_profile;
  insert into public.user_private_profiles (user_id, name, surname, phone, updated_at)
  values (p_user_id, v_profile.name, v_profile.surname, v_phone, now())
  on conflict (user_id) do update set
    name = coalesce(public.user_private_profiles.name, excluded.name),
    surname = coalesce(public.user_private_profiles.surname, excluded.surname),
    phone = coalesce(public.user_private_profiles.phone, excluded.phone),
    updated_at = now();
  return jsonb_build_object('user_id', v_profile.user_id, 'display_name', v_profile.display_name, 'avatar_url', v_profile.avatar_url);
end;
$$;


ALTER FUNCTION "public"."fn_bootstrap_ticketiv_user"("p_user_id" "uuid", "p_email" "text", "p_phone" "text", "p_display_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_bootstrap_ticketiv_user"("p_user_id" "uuid", "p_email" "text", "p_phone" "text", "p_display_name" "text") IS 'Bootstrap helper restricted to service_role so it cannot be called directly from anon/authenticated clients.';



CREATE OR REPLACE FUNCTION "public"."fn_bulk_check_in"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") RETURNS TABLE("checked_count" integer, "skipped_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return query select * from public.fn_bulk_check_in_unchecked(p_order_item_ids, p_org_id); end; $$;


ALTER FUNCTION "public"."fn_bulk_check_in"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_bulk_check_in_unchecked"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") RETURNS TABLE("checked_count" integer, "skipped_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  v_user uuid;
  v_bad integer;
  v_checked integer;
  v_skipped integer;
BEGIN
  SELECT (select auth.uid()) INTO v_user;

  -- Verify caller is an org member with at least organizer role
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = v_user
      AND role IN ('organizer_owner', 'organizer_admin', 'organizer', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized for this organization';
  END IF;

  -- Validate all items belong to this org
  SELECT COUNT(*) INTO v_bad
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = ANY(p_order_item_ids)
    AND o.org_id != p_org_id;

  IF v_bad > 0 THEN
    RAISE EXCEPTION 'One or more tickets do not belong to this organization';
  END IF;

  -- Count already checked in (will be skipped)
  SELECT COUNT(*) INTO v_skipped
  FROM public.order_items
  WHERE id = ANY(p_order_item_ids)
    AND checked_in_at IS NOT NULL;

  -- Bulk check-in those not yet checked in
  UPDATE public.order_items
  SET
    checked_in_at = now(),
    status = 'checked_in'::public.order_item_status
  WHERE id = ANY(p_order_item_ids)
    AND checked_in_at IS NULL
    AND status = 'issued'::public.order_item_status;

  GET DIAGNOSTICS v_checked = ROW_COUNT;

  RETURN QUERY SELECT v_checked, v_skipped;
END;
$$;


ALTER FUNCTION "public"."fn_bulk_check_in_unchecked"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_cancel_event_invitation"("p_invitation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_changed boolean := false;
begin
  perform app.require_claimed_account();
  update public.event_invitations
  set status = 'cancelled', updated_at = now(), responded_at = now()
  where id = p_invitation_id and inviter_id = v_me and status = 'pending';
  v_changed := found;
  return v_changed;
end;
$$;


ALTER FUNCTION "public"."fn_cancel_event_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_cancel_transfer"("p_transfer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare v_transfer public.transfers;
begin
  perform app.require_claimed_account();
  select * into v_transfer from public.transfers where id=p_transfer_id for update;
  if not found then raise exception 'transfer_not_found'; end if;
  if v_transfer.from_user_id is distinct from auth.uid() then raise exception 'transfer_unauthorized'; end if;
  if v_transfer.status not in ('pending'::public.transfer_status,'requested'::public.transfer_status) then raise exception 'transfer_invalid_state'; end if;
  update public.transfers set status='cancelled'::public.transfer_status,updated_at=now() where id=p_transfer_id;
  return jsonb_build_object('transfer_id',p_transfer_id,'status','cancelled');
end;
$$;


ALTER FUNCTION "public"."fn_cancel_transfer"("p_transfer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_check_in"("p_ticket_code" "text") RETURNS TABLE("ok" boolean, "message" "text", "checked_in_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
declare
  v_item public.order_items%rowtype;
  v_event uuid;
  v_user uuid;
begin
  select * into v_item from public.order_items where ticket_code = p_ticket_code;
  if v_item.id is null then
    return query select false, 'Ticket not found', null;
    return;
  end if;

  select e.id into v_event
  from public.ticket_types tt
  join public.events e on e.id = tt.event_id
  where tt.id = v_item.ticket_type_id;

  -- Must be active scanner for this event
  SELECT public.current_user_uid() INTO v_user;
  if not exists (
    select 1
    from public.scanner_users s
    where s.user_id = v_user
      and s.event_id = v_event
      and s.active = true
  ) then
    return query select false, 'Not authorized for this event', null;
    return;
  end if;

  if v_item.checked_in_at is not null then
    return query select false, 'Already checked in', v_item.checked_in_at;
  end if;

  update public.order_items
     set checked_in_at = now()
   where id = v_item.id;

  return query select true, 'Check-in successful', now();
end
$$;


ALTER FUNCTION "public"."fn_check_in"("p_ticket_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_check_in"("p_scan_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
BEGIN
  -- stub: check-in logic placeholder
  RETURN;
END; $$;


ALTER FUNCTION "public"."fn_check_in"("p_scan_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_check_in"("p_order_item_id" "uuid", "p_device_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  v_order_item public.order_items%ROWTYPE;
  v_scan_id uuid := gen_random_uuid();
BEGIN
  SELECT * INTO v_order_item FROM public.order_items WHERE id = p_order_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_item_not_found');
  END IF;

  IF v_order_item.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_checked_in');
  END IF;

  UPDATE public.order_items SET checked_in_at = now() WHERE id = p_order_item_id;

  INSERT INTO public.scans (id, event_id, order_item_id, ticket_code, outcome, device_id, scanned_at)
  VALUES (v_scan_id, (SELECT tt.event_id FROM public.ticket_types tt WHERE tt.id = v_order_item.ticket_type_id), p_order_item_id, v_order_item.ticket_code, 'valid', p_device_id, now());

  RETURN jsonb_build_object('ok', true, 'scan_id', v_scan_id);
END;
$$;


ALTER FUNCTION "public"."fn_check_in"("p_order_item_id" "uuid", "p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_device_id" "uuid", "p_gate" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
declare
  v_item record;
  v_event uuid;
  v_device_event uuid;
  v_updated_ts timestamptz;
begin
  -- Resolve ticket and its event
  select oi.id as order_item_id, oi.checked_in_at, tt.event_id
    into v_item
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  where oi.ticket_code = p_ticket_code
  limit 1;

  if v_item is null then
    insert into public.scans(event_id, order_item_id, ticket_code, outcome, device_id, gate, notes)
    values (null, null, p_ticket_code, 'invalid', p_device_id, p_gate, 'code not found');
    return jsonb_build_object('ok', false, 'outcome', 'invalid');
  end if;

  v_event := v_item.event_id;

  -- Verify device binding
  select event_id into v_device_event from public.devices where id = p_device_id;

  if v_device_event is not null and v_device_event <> v_event then
    insert into public.scans(event_id, order_item_id, ticket_code, outcome, device_id, gate, notes)
    values (v_event, v_item.order_item_id, p_ticket_code, 'wrong_event', p_device_id, p_gate, 'device bound to different event');
    return jsonb_build_object('ok', false, 'outcome', 'wrong_event');
  end if;

  -- Atomic update: only set checked_in_at if null
  update public.order_items
    set checked_in_at = now()
  where id = v_item.order_item_id and checked_in_at is null
  returning checked_in_at into v_updated_ts;

  if v_updated_ts is null then
    -- already used
    insert into public.scans(event_id, order_item_id, ticket_code, outcome, device_id, gate)
    values (v_event, v_item.order_item_id, p_ticket_code, 'already_used', p_device_id, p_gate);
    return jsonb_build_object('ok', false, 'outcome', 'already_used', 'checked_in_at', v_item.checked_in_at);
  end if;

  -- Valid
  insert into public.scans(event_id, order_item_id, ticket_code, outcome, device_id, gate)
  values (v_event, v_item.order_item_id, p_ticket_code, 'valid', p_device_id, p_gate);

  return jsonb_build_object('ok', true, 'outcome', 'valid', 'order_item_id', v_item.order_item_id, 'checked_in_at', v_updated_ts);
end$$;


ALTER FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_device_id" "uuid", "p_gate" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_event_id" "uuid", "p_device_id" "uuid", "p_gate" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  v_outcome text := 'invalid';
  v_order_item_id uuid;
BEGIN
  SELECT id INTO v_order_item_id FROM public.order_items WHERE ticket_code = p_ticket_code LIMIT 1;

  IF v_order_item_id IS NULL THEN
    v_outcome := 'invalid';
  ELSE
    -- check event match
    IF NOT EXISTS (SELECT 1 FROM public.ticket_types tt JOIN public.order_items oi ON tt.id = oi.ticket_type_id WHERE oi.id = v_order_item_id AND tt.event_id = p_event_id) THEN
      v_outcome := 'wrong_event';
    ELSE
      -- check revoked
      IF (SELECT revoked_at IS NOT NULL FROM public.order_items WHERE id = v_order_item_id) THEN
        v_outcome := 'revoked';
      ELSIF (SELECT checked_in_at IS NOT NULL FROM public.order_items WHERE id = v_order_item_id) THEN
        v_outcome := 'already_used';
      ELSE
        v_outcome := 'valid';
      END IF;
    END IF;
  END IF;

  -- Insert scans log (immutable)
  INSERT INTO public.scans (event_id, order_item_id, ticket_code, outcome, device_id, gate)
  VALUES (p_event_id, v_order_item_id, p_ticket_code, v_outcome, p_device_id, p_gate);

  -- Idempotently set checked_in_at on the order_item if outcome valid and not set
  IF v_outcome = 'valid' THEN
    UPDATE public.order_items
    SET checked_in_at = coalesce(checked_in_at, now())
    WHERE id = v_order_item_id;
  END IF;

  RETURN jsonb_build_object('outcome', v_outcome, 'order_item_id', v_order_item_id);
END $$;


ALTER FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_event_id" "uuid", "p_device_id" "uuid", "p_gate" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_check_reserved_handle"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  reserved_list text[] := ARRAY[
    'admin','administrator','root','support','help','about','terms','privacy','contact',
    'login','signup','signin','signout','logout','register','password','settings','profile',
    'search','my','home','app','api','www','mail','email','news','blog','docs','status',
    'ticketiv','eljaymedia','eljay','newsonafrica','eljaytunes','gudumart',
    'event','events','venue','venues','artist','artists','organizer','organizers',
    'ticket','tickets','order','orders','payment','payments','checkout','cart',
    'staff','team','company','careers','jobs','press','legal','cookies','sitemap'
  ];
BEGIN
  IF lower(NEW.handle) = ANY(reserved_list) THEN
    RAISE EXCEPTION 'Handle "%" is reserved', NEW.handle USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_check_reserved_handle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_claim_email_broadcast"("p_org_id" "uuid", "p_event_id" "uuid", "p_recipient_count" integer, "p_audience" "text", "p_subject" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  v_user uuid;
  v_event_ok boolean;
  v_notification_id uuid;
BEGIN
  SELECT (select auth.uid()) INTO v_user;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only org owner or admin may broadcast (AC: send gated to owner/admin).
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = v_user
      AND role IN ('organizer_owner', 'organizer_admin')
  ) THEN
    RAISE EXCEPTION 'Only org owners and admins can email attendees';
  END IF;

  -- Event must belong to this org.
  SELECT true INTO v_event_ok
  FROM public.events
  WHERE id = p_event_id AND org_id = p_org_id;

  IF v_event_ok IS NOT TRUE THEN
    RAISE EXCEPTION 'Event not found in this organization';
  END IF;

  IF p_recipient_count < 1 THEN
    RAISE EXCEPTION 'No recipients for the selected audience';
  END IF;

  -- Rate limit: max 1 broadcast per event per rolling hour. The partial unique
  -- guard below would also catch this, but an explicit check yields a clean
  -- message. Counts only successfully-claimed broadcasts (status = 'queued').
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE type = 'email_broadcast'
      AND channel = 'email'
      AND status = 'queued'
      AND payload->>'event_id' = p_event_id::text
      AND created_at > (now() - interval '1 hour')
  ) THEN
    RAISE EXCEPTION 'Rate limit: only one attendee broadcast per event per hour';
  END IF;

  INSERT INTO public.notifications (
    user_id, type, channel, status, payload, created_at
  )
  VALUES (
    v_user,
    'email_broadcast',
    'email',
    'queued',
    jsonb_build_object(
      'org_id', p_org_id::text,
      'event_id', p_event_id::text,
      'audience', p_audience,
      'subject', p_subject,
      'recipient_count', p_recipient_count,
      'sent_by', v_user::text
    ),
    now()
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."fn_claim_email_broadcast"("p_org_id" "uuid", "p_event_id" "uuid", "p_recipient_count" integer, "p_audience" "text", "p_subject" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_claim_guest_orders"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_email text;
  v_phone text;
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select case when u.email_confirmed_at is not null then public.fn_normalize_email(u.email) end,
         case when u.phone_confirmed_at is not null then public.fn_normalize_phone(u.phone) end
  into v_email, v_phone
  from auth.users u where u.id = v_user;
  if v_email is null and v_phone is null then return 0; end if;

  create temp table _claimable on commit drop as
  select o.id, o.buyer_id as old_buyer
  from public.orders o
  join auth.users bu on bu.id = o.buyer_id
  where bu.is_anonymous is true
    and o.buyer_id <> v_user
    and o.status <> 'pending'
    and (
      (v_email is not null and public.fn_normalize_email(coalesce(o.buyer_email, o.email)) = v_email)
      or (v_phone is not null and public.fn_normalize_phone(coalesce(o.buyer_phone, o.phone)) = v_phone)
    );

  update public.order_items oi
  set current_owner_id = v_user
  from _claimable c
  where oi.order_id = c.id and oi.current_owner_id = c.old_buyer;

  update public.orders o
  set buyer_id = v_user
  from _claimable c
  where o.id = c.id;

  select count(*)::integer into v_count from _claimable;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."fn_claim_guest_orders"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "payment_id" "uuid",
    "topic" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "available_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "locked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_outbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'done'::"text", 'failed'::"text"]))),
    CONSTRAINT "payment_outbox_topic_check" CHECK (("topic" = 'ticket_delivery'::"text"))
);


ALTER TABLE "public"."payment_outbox" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_claim_payment_outbox"("p_limit" integer DEFAULT 20) RETURNS SETOF "public"."payment_outbox"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  with claimed as (
    select id from public.payment_outbox
    where status in ('pending', 'processing')
      and available_at <= now()
      and attempts < 8
    order by available_at
    limit greatest(coalesce(p_limit, 20), 1)
    for update skip locked
  )
  update public.payment_outbox o
  set status = 'processing', attempts = o.attempts + 1, locked_at = now()
  from claimed
  where o.id = claimed.id
  returning o.*;
end;
$$;


ALTER FUNCTION "public"."fn_claim_payment_outbox"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_cleanup_anon_users"("p_dry_run" boolean DEFAULT false) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_no_order_ids  uuid[];
  v_stale_ids     uuid[];
  v_deleted_no_orders  int := 0;
  v_deleted_stale      int := 0;
  v_skipped_paid       int := 0;
begin
  -- ── Tier 1: anon users with zero orders, created > 7 days ago ────────
  select array_agg(u.id)
  into v_no_order_ids
  from auth.users u
  where u.is_anonymous = true
    and u.created_at < now() - interval '7 days'
    and not exists (
      select 1 from public.orders o where o.buyer_id = u.id
    );

  v_deleted_no_orders := coalesce(array_length(v_no_order_ids, 1), 0);

  if not p_dry_run and v_deleted_no_orders > 0 then
    delete from auth.users where id = any(v_no_order_ids);
  end if;

  -- ── Tier 2: anon users with only unpaid orders, created > 30 days ago ─
  -- Never touches users who have any paid or refunded order.
  select array_agg(u.id)
  into v_stale_ids
  from auth.users u
  where u.is_anonymous = true
    and u.created_at < now() - interval '30 days'
    and exists (
      select 1 from public.orders o where o.buyer_id = u.id
    )
    and not exists (
      select 1 from public.orders o
      where o.buyer_id = u.id
        and o.status in ('paid', 'refunded')
    );

  v_deleted_stale := coalesce(array_length(v_stale_ids, 1), 0);

  if not p_dry_run and v_deleted_stale > 0 then
    delete from auth.users where id = any(v_stale_ids);
  end if;

  -- ── Count: anon users with paid orders (always kept) ──────────────────
  select count(*)::int
  into v_skipped_paid
  from auth.users u
  where u.is_anonymous = true
    and exists (
      select 1 from public.orders o
      where o.buyer_id = u.id
        and o.status in ('paid', 'refunded')
    );

  -- ── Audit log entry (written on dry-run too for observability) ────────
  insert into public.audit_log
    (org_id, actor_id, table_name, record_id, action, changes)
  values (
    null, null, 'auth.users', null, 'delete',
    jsonb_build_object(
      'job',                   'anon_user_cleanup',
      'dry_run',               p_dry_run,
      'deleted_no_orders',     v_deleted_no_orders,
      'deleted_stale_orders',  v_deleted_stale,
      'skipped_paid',          v_skipped_paid,
      'ran_at',                now()
    )
  );

  return row_to_json(
    row(
      p_dry_run,
      v_deleted_no_orders,
      v_deleted_stale,
      v_skipped_paid,
      now()
    )
  );
end;
$$;


ALTER FUNCTION "public"."fn_cleanup_anon_users"("p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_cleanup_anonymous_users"("p_dry_run" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_no_order_ids  uuid[];
  v_stale_ids     uuid[];
  v_deleted_no_orders  int := 0;
  v_deleted_stale      int := 0;
  v_skipped_paid       int := 0;
begin
  -- Tier 1: anon users with zero orders, created > 7 days ago
  select array_agg(u.id)
  into v_no_order_ids
  from auth.users u
  where u.is_anonymous = true
    and u.created_at < now() - interval '7 days'
    and not exists (
      select 1 from public.orders o where o.buyer_id = u.id
    );

  v_deleted_no_orders := coalesce(array_length(v_no_order_ids, 1), 0);

  if not p_dry_run and v_deleted_no_orders > 0 then
    delete from auth.users where id = any(v_no_order_ids);
  end if;

  -- Tier 2: anon users with only failed/pending orders, > 30 days
  -- Never touches users who have any paid or refunded order.
  select array_agg(u.id)
  into v_stale_ids
  from auth.users u
  where u.is_anonymous = true
    and u.created_at < now() - interval '30 days'
    and exists (
      select 1 from public.orders o where o.buyer_id = u.id
    )
    and not exists (
      select 1 from public.orders o
      where o.buyer_id = u.id
        and o.status in ('paid', 'refunded')
    );

  v_deleted_stale := coalesce(array_length(v_stale_ids, 1), 0);

  if not p_dry_run and v_deleted_stale > 0 then
    delete from auth.users where id = any(v_stale_ids);
  end if;

  -- Skipped: anon users with at least one paid/refunded order
  select count(*)::int
  into v_skipped_paid
  from auth.users u
  where u.is_anonymous = true
    and exists (
      select 1 from public.orders o
      where o.buyer_id = u.id
        and o.status in ('paid', 'refunded')
    );

  -- Audit entry (always written, even on dry run)
  insert into public.audit_log
    (org_id, actor_id, table_name, record_id, action, changes)
  values (
    null, null, 'auth.users', null, 'delete',
    jsonb_build_object(
      'job',                   'anon_user_hygiene',
      'dry_run',               p_dry_run,
      'deleted_no_orders',     v_deleted_no_orders,
      'deleted_stale_orders',  v_deleted_stale,
      'skipped_paid',          v_skipped_paid,
      'ran_at',                now()
    )
  );

  return jsonb_build_object(
    'dry_run',               p_dry_run,
    'deleted_no_orders',     v_deleted_no_orders,
    'deleted_stale_orders',  v_deleted_stale,
    'skipped_paid',          v_skipped_paid,
    'ran_at',                now()
  );
end;
$$;


ALTER FUNCTION "public"."fn_cleanup_anonymous_users"("p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_close_pos_shift"("p_shift_id" "uuid", "p_closing_cash_cents" integer, "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_shift public.pos_shifts;
  v_summary jsonb;
  v_expected_cash integer;
  v_actor uuid := auth.uid();
begin
  perform app.require_claimed_account();

  if p_closing_cash_cents is null or p_closing_cash_cents < 0 then
    raise exception 'invalid_closing_cash' using errcode = '22023';
  end if;

  select * into v_shift
  from public.pos_shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'pos_shift_not_found' using errcode = 'P0002';
  end if;

  if v_shift.status <> 'open' then
    raise exception 'pos_shift_already_closed' using errcode = '55000';
  end if;

  if not (
    v_shift.cashier_user_id = v_actor
    or app.is_org_manager(v_shift.org_id)
    or app.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  v_summary := public.fn_pos_shift_summary(p_shift_id);
  v_expected_cash := coalesce((v_summary ->> 'expected_cash_cents')::integer, v_shift.opening_cash_cents);

  update public.pos_shifts
  set status = 'closed',
      expected_cash_cents = v_expected_cash,
      closing_cash_cents = p_closing_cash_cents,
      cash_variance_cents = p_closing_cash_cents - v_expected_cash,
      closed_at = now(),
      closed_by = v_actor,
      closing_notes = nullif(btrim(coalesce(p_notes, '')), ''),
      updated_at = now()
  where id = p_shift_id
  returning * into v_shift;

  insert into public.audit_log(org_id, actor_id, table_name, record_id, action, changes)
  values (
    v_shift.org_id,
    v_actor,
    'pos_shifts',
    v_shift.id::text,
    'other',
    jsonb_build_object(
      'event_type', 'pos_shift_close',
      'expected_cash_cents', v_shift.expected_cash_cents,
      'closing_cash_cents', v_shift.closing_cash_cents,
      'cash_variance_cents', v_shift.cash_variance_cents
    )
  );

  return public.fn_pos_shift_summary(p_shift_id);
end;
$$;


ALTER FUNCTION "public"."fn_close_pos_shift"("p_shift_id" "uuid", "p_closing_cash_cents" integer, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_complete_order_payment"("p_order_id" "uuid", "p_provider" "text", "p_ext_payment_id" "text", "p_amount_cents" integer DEFAULT NULL::integer, "p_currency" "text" DEFAULT NULL::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("completed_order_id" "uuid", "completed_payment_id" "uuid", "already_completed" boolean, "issued_item_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order    public.orders%rowtype;
  v_payment  public.payments%rowtype;
  v_platform integer;
  v_gross    integer;
  v_net      integer;
  v_issued   integer := 0;
begin
  if p_order_id is null then
    raise exception 'order_id_required' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_ext_payment_id), '') = '' then
    raise exception 'provider_reference_required' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if v_order.status = 'paid' then
    select * into v_payment from public.payments p
    where p.order_id = v_order.id and p.status = 'succeeded'
    order by p.created_at desc limit 1;

    select count(*)::integer into v_issued
    from public.order_items oi where oi.order_id = v_order.id and oi.status = 'issued';

    return query select v_order.id, v_payment.id, true, v_issued;
    return;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order_not_payable_from_status_%', v_order.status using errcode = 'P0001';
  end if;

  if p_amount_cents is not null and p_amount_cents <> v_order.total_cents then
    raise exception 'amount_mismatch_expected_%_got_%', v_order.total_cents, p_amount_cents using errcode = 'P0001';
  end if;
  if p_currency is not null and upper(p_currency) <> upper(v_order.currency) then
    raise exception 'currency_mismatch_expected_%_got_%', v_order.currency, p_currency using errcode = 'P0001';
  end if;

  insert into public.payments (order_id, provider, amount_cents, currency, ext_payment_id, payload, status, channel)
  values (v_order.id, p_provider, v_order.total_cents, v_order.currency,
          p_ext_payment_id, coalesce(p_payload, '{}'::jsonb), 'succeeded', 'online')
  on conflict (provider, ext_payment_id) where ext_payment_id is not null
  do update set status = 'succeeded', payload = excluded.payload
  returning * into v_payment;

  if v_payment.order_id <> v_order.id then
    raise exception 'payment_reference_belongs_to_order_%', v_payment.order_id using errcode = 'P0001';
  end if;

  update public.payment_attempts pa
  set status = 'succeeded', payment_id = v_payment.id
  where pa.order_id = v_order.id and pa.provider = p_provider and pa.status = 'pending';

  -- Settlement has one organizer deduction. The processor cost remains on the
  -- order snapshot for Paystack reconciliation and never reduces payment_net.
  if not exists (select 1 from public.ledger_entries le where le.payment_id = v_payment.id) then
    v_gross    := v_order.total_cents;
    v_platform := coalesce(v_order.platform_fee_cents, 0);
    v_net      := coalesce(v_order.organizer_net_cents, v_gross - v_platform);

    insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
    values (v_order.org_id, v_order.id, v_payment.id, 'order_gross', v_gross, v_order.currency,
            jsonb_build_object('source', 'payment_completion'));

    if v_platform > 0 then
      insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
      values (v_order.org_id, v_order.id, v_payment.id, 'fee', -v_platform, v_order.currency,
              jsonb_build_object('fee_type', 'platform'));
    end if;

    insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
    values (v_order.org_id, v_order.id, v_payment.id, 'payment_net', v_net, v_order.currency,
            jsonb_build_object('source', 'payment_completion'));
  end if;

  update public.order_items oi set status = 'issued'
  where oi.order_id = v_order.id and oi.status = 'pending';
  get diagnostics v_issued = row_count;

  update public.orders o set status = 'paid' where o.id = v_order.id;

  if v_order.buyer_id is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (v_order.buyer_id, 'payment_succeeded',
            jsonb_build_object('orderId', v_order.id, 'paymentId', v_payment.id,
                               'amountCents', v_order.total_cents, 'currency', v_order.currency),
            'pending', 'in_app', 'payment_succeeded:' || v_payment.id::text)
    on conflict do nothing;
  end if;

  insert into public.payment_outbox as ob (order_id, payment_id, topic, payload)
  values (v_order.id, v_payment.id, 'ticket_delivery',
          jsonb_build_object('orderId', v_order.id))
  on conflict (order_id, topic) do nothing;

  return query select v_order.id, v_payment.id, false, v_issued;
end;
$$;


ALTER FUNCTION "public"."fn_complete_order_payment"("p_order_id" "uuid", "p_provider" "text", "p_ext_payment_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_complete_order_payment"("p_order_id" "uuid", "p_provider" "text", "p_ext_payment_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_payload" "jsonb") IS 'Atomically completes a verified payment. Settlement deducts one platform commission; payment_outbox carries only external ticket delivery.';



CREATE OR REPLACE FUNCTION "public"."fn_complete_organizer_signup"("p_first_name" "text", "p_surname" "text", "p_phone" "text", "p_id_number" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public', 'private'
    AS $_$
declare
  v_user_id uuid := (select auth.uid());
  v_first_name text := nullif(btrim(p_first_name), '');
  v_surname text := nullif(btrim(p_surname), '');
  v_phone text := regexp_replace(coalesce(btrim(p_phone), ''), '[^0-9+]', '', 'g');
  v_id_number text := nullif(btrim(p_id_number), '');
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  perform app.require_claimed_account();
  if v_first_name is null then raise exception 'first_name_required' using errcode = '22023'; end if;
  if char_length(v_first_name) > 100 then raise exception 'first_name_too_long' using errcode = '22023'; end if;
  if v_surname is null then raise exception 'surname_required' using errcode = '22023'; end if;
  if char_length(v_surname) > 100 then raise exception 'surname_too_long' using errcode = '22023'; end if;
  if v_phone !~ '^\+?[0-9]{7,15}$' then raise exception 'invalid_phone' using errcode = '22023'; end if;
  if v_id_number is not null and char_length(v_id_number) not between 4 and 64 then raise exception 'invalid_id_number_length' using errcode = '22023'; end if;
  insert into public.profiles (user_id, display_name, name, surname, phone)
  values (v_user_id, concat_ws(' ', v_first_name, v_surname), v_first_name, v_surname, null)
  on conflict (user_id) do update set display_name = excluded.display_name, name = excluded.name, surname = excluded.surname, phone = null
  returning * into v_profile;
  insert into public.user_private_profiles (user_id, name, surname, phone, updated_at)
  values (v_user_id, v_first_name, v_surname, v_phone, now())
  on conflict (user_id) do update set name = excluded.name, surname = excluded.surname, phone = excluded.phone, updated_at = now();
  if v_id_number is not null then
    insert into private.organizer_identity_details (user_id, id_number) values (v_user_id, v_id_number)
    on conflict (user_id) do update set id_number = excluded.id_number, updated_at = now();
  end if;
  return jsonb_build_object('user_id', v_profile.user_id, 'display_name', v_profile.display_name, 'phone', v_phone, 'has_id_number', v_id_number is not null);
end;
$_$;


ALTER FUNCTION "public"."fn_complete_organizer_signup"("p_first_name" "text", "p_surname" "text", "p_phone" "text", "p_id_number" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_complete_organizer_signup"("p_first_name" "text", "p_surname" "text", "p_phone" "text", "p_id_number" "text") IS 'Completes the signed-in user organizer profile after email OTP verification; optional ID is stored privately.';



CREATE OR REPLACE FUNCTION "public"."fn_complete_resale_after_payment"("p_listing_id" "uuid", "p_payment_id" "uuid") RETURNS TABLE("listing_id" "uuid", "transfer_id" "uuid", "buyer_order_id" "uuid", "buyer_order_item_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_buyer_id uuid := auth.uid();
  v_listing public.resale_listings%rowtype;
  v_source_item public.order_items%rowtype;
  v_payment public.payments%rowtype;
  v_buyer_order public.orders%rowtype;
  v_transfer_id uuid;
  v_new_item_id uuid;
begin
  if v_buyer_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_listing
  from public.resale_listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'listing is not active' using errcode = 'P0001';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status <> 'succeeded' then
    raise exception 'payment has not succeeded' using errcode = 'P0001';
  end if;

  if v_payment.payload ->> 'kind' is distinct from 'resale_checkout'
     or (v_payment.payload ->> 'listing_id')::uuid is distinct from v_listing.id then
    raise exception 'payment is not linked to this resale listing' using errcode = 'P0001';
  end if;

  select * into v_buyer_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if not found then
    raise exception 'buyer order not found' using errcode = 'P0002';
  end if;

  if v_buyer_order.buyer_id <> v_buyer_id then
    raise exception 'payment order does not belong to buyer' using errcode = 'P0001';
  end if;

  select * into v_source_item
  from public.order_items
  where id = v_listing.order_item_id
  for update;

  if not found then
    raise exception 'source ticket not found' using errcode = 'P0002';
  end if;

  if v_source_item.status <> 'issued' then
    raise exception 'source ticket is not eligible for transfer' using errcode = 'P0001';
  end if;

  if v_source_item.checked_in_at is not null or v_source_item.revoked_at is not null or v_source_item.refunded_at is not null then
    raise exception 'source ticket is no longer eligible for transfer' using errcode = 'P0001';
  end if;

  insert into public.transfers (
    order_item_id,
    from_user_id,
    to_user_id,
    status,
    metadata
  ) values (
    v_source_item.id,
    v_listing.seller_id,
    v_buyer_id,
    'completed',
    jsonb_build_object('kind', 'paid_resale', 'listing_id', v_listing.id, 'payment_id', v_payment.id)
  ) returning id into v_transfer_id;

  -- Transfer ownership by moving the ticket into a buyer-owned reseller order.
  -- The same ticket_code remains unique and valid; ownership follows the new order.
  update public.order_items
  set order_id = v_buyer_order.id,
      status = 'issued',
      transferred_from_order_item_id = v_source_item.id,
      updated_at = now()
  where id = v_source_item.id
  returning id into v_new_item_id;

  update public.orders
  set status = 'paid'
  where id = v_buyer_order.id;

  update public.payment_attempts
  set status = 'succeeded'
  where payment_id = v_payment.id;

  update public.resale_listings
  set status = 'sold',
      transfer_id = v_transfer_id,
      updated_at = now()
  where id = v_listing.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values
    (v_buyer_id, 'resale_purchase_completed', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_purchase_completed:' || v_listing.id::text || ':' || v_buyer_id::text),
    (v_listing.seller_id, 'resale_listing_sold', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_listing_sold:' || v_listing.id::text || ':' || v_listing.seller_id::text)
  on conflict do nothing;

  return query select v_listing.id, v_transfer_id, v_buyer_order.id, v_new_item_id;
end;
$$;


ALTER FUNCTION "public"."fn_complete_resale_after_payment"("p_listing_id" "uuid", "p_payment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_complete_resale_after_payment_webhook"("p_payment_id" "uuid") RETURNS TABLE("listing_id" "uuid", "transfer_id" "uuid", "buyer_order_id" "uuid", "buyer_order_item_id" "uuid", "already_completed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_payment public.payments%rowtype;
  v_listing public.resale_listings%rowtype;
  v_listing_id uuid;
  v_buyer_id uuid;
  v_source_item public.order_items%rowtype;
  v_buyer_order public.orders%rowtype;
  v_transfer_id uuid;
  v_new_item_id uuid;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'payment not found' using errcode = 'P0002'; end if;
  if v_payment.status <> 'succeeded' then raise exception 'payment has not succeeded' using errcode = 'P0001'; end if;
  if v_payment.payload ->> 'kind' is distinct from 'resale_checkout' then raise exception 'payment is not a resale checkout' using errcode = 'P0001'; end if;

  v_listing_id := (v_payment.payload ->> 'listing_id')::uuid;

  select * into v_listing from public.resale_listings where id = v_listing_id for update;
  if not found then raise exception 'listing not found' using errcode = 'P0002'; end if;

  select * into v_buyer_order from public.orders where id = v_payment.order_id for update;
  if not found then raise exception 'buyer order not found' using errcode = 'P0002'; end if;
  v_buyer_id := v_buyer_order.buyer_id;

  if v_listing.status = 'sold' then
    select id into v_new_item_id from public.order_items
    where order_id = v_buyer_order.id and transferred_from_order_item_id = v_listing.order_item_id
    limit 1;
    return query select v_listing.id, v_listing.transfer_id, v_buyer_order.id, v_new_item_id, true;
    return;
  end if;

  if v_listing.status <> 'active' then raise exception 'listing is not active' using errcode = 'P0001'; end if;

  select * into v_source_item from public.order_items where id = v_listing.order_item_id for update;
  if not found then raise exception 'source ticket not found' using errcode = 'P0002'; end if;
  if v_source_item.status <> 'issued'
     or v_source_item.checked_in_at is not null
     or v_source_item.revoked_at is not null
     or v_source_item.refunded_at is not null then
    raise exception 'source ticket is no longer eligible for transfer' using errcode = 'P0001';
  end if;

  insert into public.transfers (order_item_id, from_user_id, to_user_id, status, metadata)
  values (
    v_source_item.id, v_listing.seller_id, v_buyer_id, 'completed',
    jsonb_build_object('kind', 'paid_resale', 'listing_id', v_listing.id, 'payment_id', v_payment.id, 'via', 'webhook')
  ) returning id into v_transfer_id;

  update public.order_items
  set order_id = v_buyer_order.id, status = 'issued', transferred_from_order_item_id = v_source_item.id, updated_at = now()
  where id = v_source_item.id
  returning id into v_new_item_id;

  update public.orders set status = 'paid' where id = v_buyer_order.id;
  update public.payment_attempts set status = 'succeeded' where payment_id = v_payment.id;
  update public.resale_listings set status = 'sold', transfer_id = v_transfer_id, updated_at = now() where id = v_listing.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values
    (v_buyer_id, 'resale_purchase_completed', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_purchase_completed:' || v_listing.id::text || ':' || v_buyer_id::text),
    (v_listing.seller_id, 'resale_listing_sold', jsonb_build_object('listingId', v_listing.id, 'transferId', v_transfer_id, 'ticketId', v_new_item_id), 'pending', 'in_app', 'resale_listing_sold:' || v_listing.id::text || ':' || v_listing.seller_id::text)
  on conflict do nothing;

  return query select v_listing.id, v_transfer_id, v_buyer_order.id, v_new_item_id, false;
end;
$$;


ALTER FUNCTION "public"."fn_complete_resale_after_payment_webhook"("p_payment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_complete_transfer"("p_transfer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_complete_transfer_unchecked(p_transfer_id); end; $$;


ALTER FUNCTION "public"."fn_complete_transfer"("p_transfer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_complete_transfer_unchecked"("p_transfer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_transfer public.transfers;
  v_actor_id uuid := auth.uid();
  v_owner_id uuid;
  v_item_status public.order_item_status;
  v_checked_in_at timestamptz;
  v_revoked_at timestamptz;
  v_refunded_at timestamptz;
  v_order_status public.order_status;
begin
  select * into v_transfer
  from public.transfers
  where id = p_transfer_id
  for update;

  if not found then raise exception 'transfer_not_found'; end if;
  if v_transfer.to_user_id is distinct from v_actor_id then
    raise exception 'transfer_unauthorized';
  end if;
  if v_transfer.status not in (
    'pending'::public.transfer_status,
    'requested'::public.transfer_status
  ) then
    raise exception 'transfer_invalid_state';
  end if;

  if v_transfer.expires_at <= now() then
    update public.transfers
    set status = 'expired'::public.transfer_status,
        updated_at = now()
    where id = p_transfer_id;

    return jsonb_build_object(
      'transfer_id', v_transfer.id,
      'order_item_id', v_transfer.order_item_id,
      'status', 'expired'
    );
  end if;

  select oi.current_owner_id,
         oi.status,
         oi.checked_in_at,
         oi.revoked_at,
         oi.refunded_at,
         o.status
    into v_owner_id,
         v_item_status,
         v_checked_in_at,
         v_revoked_at,
         v_refunded_at,
         v_order_status
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = v_transfer.order_item_id
  for update of oi;

  if not found
     or v_owner_id is distinct from v_transfer.from_user_id
     or v_order_status <> 'paid'::public.order_status
     or v_item_status not in ('issued'::public.order_item_status, 'transferred'::public.order_item_status)
     or v_checked_in_at is not null
     or v_revoked_at is not null
     or v_refunded_at is not null
  then raise exception 'ticket_not_transferable'; end if;

  update public.order_items
  set current_owner_id = v_transfer.to_user_id,
      status = 'transferred'::public.order_item_status,
      updated_at = now()
  where id = v_transfer.order_item_id;

  update public.transfers
  set status = 'completed'::public.transfer_status,
      updated_at = now()
  where id = p_transfer_id
  returning * into v_transfer;

  insert into public.notifications (
    user_id, type, payload, status, channel, dedupe_key
  ) values (
    v_transfer.from_user_id,
    'ticket_transfer_accepted',
    jsonb_build_object(
      'transfer_id', v_transfer.id,
      'to_user_id', v_transfer.to_user_id,
      'href', '/transfers'
    ),
    'pending',
    'in_app',
    'ticket-transfer-accepted:' || v_transfer.id::text
  ) on conflict do nothing;

  return jsonb_build_object(
    'transfer_id', v_transfer.id,
    'order_item_id', v_transfer.order_item_id,
    'new_owner_id', v_transfer.to_user_id,
    'status', 'completed'
  );
end;
$$;


ALTER FUNCTION "public"."fn_complete_transfer_unchecked"("p_transfer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_complete_waitlist_after_payment"("p_waitlist_id" "uuid", "p_payment_id" "uuid") RETURNS TABLE("waitlist_id" "uuid", "order_id" "uuid", "issued_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_buyer_id uuid := auth.uid();
  v_waitlist public.waitlists%rowtype;
  v_ticket_type public.ticket_types%rowtype;
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_quantity integer;
  v_i integer;
  v_issued_count integer := 0;
begin
  if v_buyer_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_waitlist
  from public.waitlists
  where id = p_waitlist_id
  for update;

  if not found then
    raise exception 'waitlist offer not found' using errcode = 'P0002';
  end if;

  if v_waitlist.user_id <> v_buyer_id then
    raise exception 'waitlist offer does not belong to buyer' using errcode = 'P0001';
  end if;

  if lower(v_waitlist.status) not in ('checkout_pending', 'offered', 'offer_available', 'notified') then
    raise exception 'waitlist offer is not eligible for completion' using errcode = 'P0001';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status <> 'succeeded' then
    raise exception 'payment has not succeeded' using errcode = 'P0001';
  end if;

  if v_payment.payload ->> 'kind' is distinct from 'waitlist_checkout'
     or (v_payment.payload ->> 'waitlist_id')::uuid is distinct from v_waitlist.id then
    raise exception 'payment is not linked to this waitlist offer' using errcode = 'P0001';
  end if;

  select * into v_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.buyer_id <> v_buyer_id then
    raise exception 'payment order does not belong to buyer' using errcode = 'P0001';
  end if;

  if v_waitlist.ticket_type_id is null then
    raise exception 'waitlist offer has no ticket type' using errcode = 'P0001';
  end if;

  select * into v_ticket_type
  from public.ticket_types
  where id = v_waitlist.ticket_type_id;

  if not found then
    raise exception 'ticket type not found' using errcode = 'P0002';
  end if;

  v_quantity := greatest(1, coalesce(v_waitlist.quantity_requested, 1));

  -- Idempotency guard: if this order already has issued items, do not issue duplicates.
  select count(*)::integer into v_issued_count
  from public.order_items
  where order_id = v_order.id
    and ticket_type_id = v_ticket_type.id;

  if v_issued_count = 0 then
    for v_i in 1..v_quantity loop
      insert into public.order_items (
        order_id,
        ticket_type_id,
        ticket_code,
        status,
        name,
        holder_name,
        holder_email
      ) values (
        v_order.id,
        v_ticket_type.id,
        upper(replace(gen_random_uuid()::text, '-', '')),
        'issued',
        v_ticket_type.name,
        trim(coalesce(v_waitlist.first_name, '') || ' ' || coalesce(v_waitlist.last_name, '')),
        coalesce(v_waitlist.email, v_order.buyer_email)
      );
      v_issued_count := v_issued_count + 1;
    end loop;
  end if;

  update public.orders
  set status = 'paid'
  where id = v_order.id;

  update public.payment_attempts
  set status = 'succeeded'
  where payment_id = v_payment.id;

  update public.waitlists
  set status = 'fulfilled'
  where id = v_waitlist.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values (
    v_buyer_id,
    'waitlist_offer_fulfilled',
    jsonb_build_object('waitlistId', v_waitlist.id, 'orderId', v_order.id, 'eventId', v_waitlist.event_id),
    'pending',
    'in_app',
    'waitlist_offer_fulfilled:' || v_waitlist.id::text || ':' || v_buyer_id::text
  )
  on conflict do nothing;

  return query select v_waitlist.id, v_order.id, v_issued_count;
end;
$$;


ALTER FUNCTION "public"."fn_complete_waitlist_after_payment"("p_waitlist_id" "uuid", "p_payment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_complete_waitlist_after_payment_webhook"("p_payment_id" "uuid") RETURNS TABLE("waitlist_id" "uuid", "order_id" "uuid", "issued_count" integer, "already_completed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_payment public.payments%rowtype;
  v_waitlist public.waitlists%rowtype;
  v_waitlist_id uuid;
  v_ticket_type public.ticket_types%rowtype;
  v_order public.orders%rowtype;
  v_quantity integer;
  v_i integer;
  v_issued_count integer := 0;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'payment not found' using errcode = 'P0002'; end if;
  if v_payment.status <> 'succeeded' then raise exception 'payment has not succeeded' using errcode = 'P0001'; end if;
  if v_payment.payload ->> 'kind' is distinct from 'waitlist_checkout' then raise exception 'payment is not a waitlist checkout' using errcode = 'P0001'; end if;

  v_waitlist_id := (v_payment.payload ->> 'waitlist_id')::uuid;

  select * into v_waitlist from public.waitlists where id = v_waitlist_id for update;
  if not found then raise exception 'waitlist offer not found' using errcode = 'P0002'; end if;

  select * into v_order from public.orders where id = v_payment.order_id for update;
  if not found then raise exception 'order not found' using errcode = 'P0002'; end if;

  if lower(v_waitlist.status) = 'fulfilled' then
    select count(*)::integer into v_issued_count from public.order_items where order_id = v_order.id;
    return query select v_waitlist.id, v_order.id, v_issued_count, true;
    return;
  end if;

  if v_waitlist.ticket_type_id is null then raise exception 'waitlist offer has no ticket type' using errcode = 'P0001'; end if;

  select * into v_ticket_type from public.ticket_types where id = v_waitlist.ticket_type_id;
  if not found then raise exception 'ticket type not found' using errcode = 'P0002'; end if;

  v_quantity := greatest(1, coalesce(v_waitlist.quantity_requested, 1));

  select count(*)::integer into v_issued_count
  from public.order_items where order_id = v_order.id and ticket_type_id = v_ticket_type.id;

  if v_issued_count = 0 then
    for v_i in 1..v_quantity loop
      insert into public.order_items (order_id, ticket_type_id, ticket_code, status, name, holder_name, holder_email)
      values (
        v_order.id, v_ticket_type.id, upper(replace(gen_random_uuid()::text, '-', '')), 'issued',
        v_ticket_type.name,
        trim(coalesce(v_waitlist.first_name, '') || ' ' || coalesce(v_waitlist.last_name, '')),
        coalesce(v_waitlist.email, v_order.buyer_email)
      );
      v_issued_count := v_issued_count + 1;
    end loop;
  end if;

  update public.orders set status = 'paid' where id = v_order.id;
  update public.payment_attempts set status = 'succeeded' where payment_id = v_payment.id;
  update public.waitlists set status = 'fulfilled' where id = v_waitlist.id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values (
    v_order.buyer_id, 'waitlist_offer_fulfilled',
    jsonb_build_object('waitlistId', v_waitlist.id, 'orderId', v_order.id, 'eventId', v_waitlist.event_id),
    'pending', 'in_app',
    'waitlist_offer_fulfilled:' || v_waitlist.id::text || ':' || v_order.buyer_id::text
  )
  on conflict do nothing;

  return query select v_waitlist.id, v_order.id, v_issued_count, false;
end;
$$;


ALTER FUNCTION "public"."fn_complete_waitlist_after_payment_webhook"("p_payment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_compute_order_money"("p_subtotal_cents" integer, "p_adjustments_cents" integer, "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_cents" integer, "p_max_platform_cents" integer, "p_fees_paid_by" "public"."fee_payer") RETURNS TABLE("buyer_total_cents" integer, "platform_fee_cents" integer, "processor_fee_cents" integer, "organizer_net_cents" integer)
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
declare
  v_priced   integer := greatest(coalesce(p_subtotal_cents,0) + coalesce(p_adjustments_cents,0), 0);
  v_payer    public.fee_payer := coalesce(p_fees_paid_by, 'organizer'::public.fee_payer);
  v_platform integer;
  v_buyer    integer;
  v_processor integer;
begin
  v_platform := round((v_priced::numeric * coalesce(p_platform_percent_bps,0)) / 10000)::integer;
  if p_min_platform_cents is not null then v_platform := greatest(v_platform, p_min_platform_cents); end if;
  if p_max_platform_cents is not null then v_platform := least(v_platform, p_max_platform_cents); end if;

  v_buyer := v_priced + case when v_payer = 'buyer' then v_platform else 0 end;

  v_processor := (round((v_buyer::numeric * coalesce(p_processor_percent_bps,0)) / 10000)
                  + coalesce(p_processor_fixed_cents,0))::integer;

  buyer_total_cents   := v_buyer;
  platform_fee_cents  := v_platform;
  processor_fee_cents := v_processor;
  organizer_net_cents := v_buyer - v_platform;
  return next;
end;
$$;


ALTER FUNCTION "public"."fn_compute_order_money"("p_subtotal_cents" integer, "p_adjustments_cents" integer, "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_cents" integer, "p_max_platform_cents" integer, "p_fees_paid_by" "public"."fee_payer") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_compute_order_money"("p_subtotal_cents" integer, "p_adjustments_cents" integer, "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_cents" integer, "p_max_platform_cents" integer, "p_fees_paid_by" "public"."fee_payer") IS 'TICK-336 canonical order-money calculator. Buyer pays face value (organizer-paid default); one platform commission fee; processor cost absorbed in platform % but returned for reconciliation; round half up; organizer_net = buyer paid - platform.';



CREATE OR REPLACE FUNCTION "public"."fn_contact_phone_key"("p_phone" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    SET "search_path" TO ''
    AS $$
declare v_digits text;
begin
  v_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  if left(v_digits, 2) = '00' then v_digits := substr(v_digits, 3); end if;
  if length(v_digits) = 8 then v_digits := '268' || v_digits; end if;
  if length(v_digits) < 8 or length(v_digits) > 15 then return null; end if;
  return v_digits;
end;
$$;


ALTER FUNCTION "public"."fn_contact_phone_key"("p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_inventory_protected_order"("p_event_id" "uuid", "p_buyer_id" "uuid", "p_buyer_email" "text", "p_items" "jsonb", "p_holder_name" "text" DEFAULT NULL::"text") RETURNS TABLE("order_row" "jsonb", "order_items" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order_id uuid; v_org_id uuid; v_currency text;
  v_subtotal_cents integer := 0; v_total_cents integer := 0; v_item_count integer := 0;
  v_ticket_type record; v_requested_qty integer; v_reserved_qty integer; v_existing_user_qty integer;
  v_channel_row record; v_hold_window interval := interval '10 minutes';
  v_order_row jsonb; v_order_items jsonb;
begin
  if p_event_id is null then raise exception 'event_id_required' using errcode = 'P0001'; end if;
  if p_buyer_id is null then raise exception 'buyer_id_required' using errcode = 'P0001'; end if;
  if p_buyer_email is null or length(trim(p_buyer_email)) = 0 then
    raise exception 'buyer_email_required' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items_required' using errcode = 'P0001';
  end if;

  if not public.fn_rate_limit('checkout:' || p_buyer_id::text, 10, 60) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  create temporary table if not exists pg_temp.checkout_items (
    ticket_type_id uuid primary key,
    quantity integer not null check (quantity > 0)
  ) on commit drop;
  truncate table pg_temp.checkout_items;

  insert into pg_temp.checkout_items(ticket_type_id, quantity)
  select (item->>'ticketTypeId')::uuid,
         greatest(1, floor(coalesce(nullif(item->>'quantity', '')::numeric, 1))::integer)
  from jsonb_array_elements(p_items) as item
  where item ? 'ticketTypeId'
  on conflict (ticket_type_id) do update
    set quantity = pg_temp.checkout_items.quantity + excluded.quantity;

  if not exists (select 1 from pg_temp.checkout_items) then
    raise exception 'items_required' using errcode = 'P0001';
  end if;

  perform 1 from public.ticket_types tt
  join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
  where tt.event_id = p_event_id order by tt.id for update of tt;

  if (select count(*) from pg_temp.checkout_items) <> (
    select count(*) from public.ticket_types tt
    join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
    where tt.event_id = p_event_id
  ) then
    raise exception 'ticket_type_not_found' using errcode = 'P0001';
  end if;

  for v_ticket_type in
    select tt.id, tt.event_id, tt.name, tt.price_cents, tt.currency, tt.quota, tt.per_user_limit,
           coalesce(tt.sales_status::text, 'on_sale') as sales_status,
           e.org_id, e.status as event_status, ci.quantity
    from public.ticket_types tt
    join public.events e on e.id = tt.event_id
    join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
    where tt.event_id = p_event_id order by tt.id
  loop
    v_requested_qty := v_ticket_type.quantity;
    if v_ticket_type.event_status <> 'published' then
      raise exception 'event_not_available' using errcode = 'P0001';
    end if;
    if v_ticket_type.sales_status <> 'on_sale' then
      raise exception 'ticket_type_not_on_sale:%', v_ticket_type.name using errcode = 'P0001';
    end if;

    select count(*)::integer into v_existing_user_qty
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = v_ticket_type.id and o.buyer_id = p_buyer_id
      and oi.status in ('pending','issued','transferred','checked_in')
      and (o.status = 'paid' or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now())));

    if v_ticket_type.per_user_limit is not null and v_ticket_type.per_user_limit > 0
       and (v_existing_user_qty + v_requested_qty) > v_ticket_type.per_user_limit then
      raise exception 'per_user_limit_exceeded:%', v_ticket_type.name using errcode = 'P0001';
    end if;

    if exists (select 1 from public.ticket_type_channels c where c.ticket_type_id = v_ticket_type.id) then
      select c.quota, c.per_order_limit into v_channel_row
      from public.ticket_type_channels c
      where c.ticket_type_id = v_ticket_type.id and c.channel = 'online'::public.sales_channel;
      if not found then
        raise exception 'channel_not_available:%', v_ticket_type.name using errcode = 'P0001';
      end if;
      if v_channel_row.per_order_limit is not null and v_channel_row.per_order_limit > 0
         and v_requested_qty > v_channel_row.per_order_limit then
        raise exception 'channel_per_order_limit_exceeded:%', v_ticket_type.name using errcode = 'P0001';
      end if;
      if v_channel_row.quota is not null and v_channel_row.quota >= 0 then
        select count(*)::integer into v_reserved_qty
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where oi.ticket_type_id = v_ticket_type.id and o.channel = 'online'::public.sales_channel
          and oi.status in ('pending','issued','transferred','checked_in')
          and (o.status = 'paid' or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now())));
        if (v_reserved_qty + v_requested_qty) > v_channel_row.quota then
          raise exception 'channel_sold_out:%', v_ticket_type.name using errcode = 'P0001';
        end if;
      end if;
    end if;

    select count(*)::integer into v_reserved_qty
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = v_ticket_type.id
      and oi.status in ('pending','issued','transferred','checked_in')
      and (o.status = 'paid' or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now())));

    if v_ticket_type.quota is not null and v_ticket_type.quota >= 0 and (v_reserved_qty + v_requested_qty) > v_ticket_type.quota then
      raise exception 'sold_out:%', v_ticket_type.name using errcode = 'P0001';
    end if;

    v_org_id := coalesce(v_org_id, v_ticket_type.org_id);
    v_currency := coalesce(v_currency, v_ticket_type.currency, 'SZL');
    v_subtotal_cents := v_subtotal_cents + (v_ticket_type.price_cents * v_requested_qty);
    v_item_count := v_item_count + v_requested_qty;
  end loop;

  v_total_cents := v_subtotal_cents;

  insert into public.orders (
    org_id, buyer_id, email, buyer_email, total_cents, subtotal_cents, item_count,
    platform_fee_cents, processor_fee_cents, currency, order_currency,
    order_price_cents, order_platform_fee_cents, order_processor_fee_cents,
    status, channel, hold_expires_at
  ) values (
    v_org_id, p_buyer_id, p_buyer_email, p_buyer_email, v_total_cents, v_subtotal_cents, v_item_count,
    0, 0, v_currency, v_currency, v_subtotal_cents, 0, 0, 'pending', 'online', now() + v_hold_window
  ) returning id into v_order_id;

  insert into public.order_items (order_id, ticket_type_id, ticket_code, status, holder_name, holder_email)
  select v_order_id, ci.ticket_type_id, gen_random_uuid()::text, 'pending',
         nullif(trim(coalesce(p_holder_name, '')), ''), p_buyer_email
  from pg_temp.checkout_items ci
  cross join lateral generate_series(1, ci.quantity);

  select to_jsonb(o.*) into v_order_row from public.orders o where o.id = v_order_id;
  select coalesce(jsonb_agg(to_jsonb(oi.*) order by oi.created_at, oi.id), '[]'::jsonb) into v_order_items
  from public.order_items oi where oi.order_id = v_order_id;

  return query select v_order_row, v_order_items;
end;
$$;


ALTER FUNCTION "public"."fn_create_inventory_protected_order"("p_event_id" "uuid", "p_buyer_id" "uuid", "p_buyer_email" "text", "p_items" "jsonb", "p_holder_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_create_inventory_protected_order"("p_event_id" "uuid", "p_buyer_id" "uuid", "p_buyer_email" "text", "p_items" "jsonb", "p_holder_name" "text") IS 'Creates a pending order and pending order_items atomically. Locks selected ticket_types and prevents quota oversell by counting pending/paid reservations.';



CREATE TABLE IF NOT EXISTS "public"."membership_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" DEFAULT ("replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text") || "replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text")) NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "kind" "text" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "invited_email" "text",
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '14 days'::interval) NOT NULL,
    "accepted_by" "uuid",
    "accepted_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "membership_invites_event_kind_chk" CHECK (((("kind" = 'event_staff'::"text") AND ("event_id" IS NOT NULL)) OR (("kind" = 'org_member'::"text") AND ("event_id" IS NULL)))),
    CONSTRAINT "membership_invites_kind_check" CHECK (("kind" = ANY (ARRAY['org_member'::"text", 'event_staff'::"text"])))
);


ALTER TABLE "public"."membership_invites" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_membership_invite"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid" DEFAULT NULL::"uuid", "p_invited_email" "text" DEFAULT NULL::"text", "p_expires_in" interval DEFAULT '14 days'::interval) RETURNS "public"."membership_invites"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_create_membership_invite_unchecked(p_org_id, p_kind, p_role, p_event_id, p_invited_email, p_expires_in); end; $$;


ALTER FUNCTION "public"."fn_create_membership_invite"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid", "p_invited_email" "text", "p_expires_in" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_membership_invite_unchecked"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid" DEFAULT NULL::"uuid", "p_invited_email" "text" DEFAULT NULL::"text", "p_expires_in" interval DEFAULT '14 days'::interval) RETURNS "public"."membership_invites"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_user uuid := (select auth.uid()); v_invite public.membership_invites;
begin
  if v_user is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not public.is_org_admin(p_org_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if not public.fn_rate_limit('invite:' || v_user::text, 30, 3600) then
    raise exception 'rate_limited: too many invitations, please try again later' using errcode = 'P0001';
  end if;
  if p_kind = 'org_member' then
    if p_role not in ('organizer_owner','organizer_admin','organizer_staff','finance') then raise exception 'invalid org role' using errcode = '22023'; end if;
    if p_event_id is not null then raise exception 'event_id not allowed for org_member invite' using errcode = '22023'; end if;
  elsif p_kind = 'event_staff' then
    if p_role not in ('scanner','organizer_scanner') then raise exception 'invalid event staff role' using errcode = '22023'; end if;
    if p_event_id is null then raise exception 'event_id required for event_staff invite' using errcode = '22023'; end if;
    if not exists (select 1 from public.events e where e.id = p_event_id and e.org_id = p_org_id) then raise exception 'event not in org' using errcode = '22023'; end if;
  else raise exception 'invalid kind' using errcode = '22023'; end if;
  insert into public.membership_invites (org_id, event_id, kind, role, invited_email, created_by, expires_at)
  values (p_org_id, p_event_id, p_kind, p_role, nullif(btrim(coalesce(p_invited_email,'')),''), v_user, now() + coalesce(p_expires_in, interval '14 days'))
  returning * into v_invite;
  return v_invite;
end;
$$;


ALTER FUNCTION "public"."fn_create_membership_invite_unchecked"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid", "p_invited_email" "text", "p_expires_in" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_organization"("p_name" "text", "p_currency" "text" DEFAULT 'SZL'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_create_organization_unchecked(p_name, p_currency); end; $$;


ALTER FUNCTION "public"."fn_create_organization"("p_name" "text", "p_currency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_organization_unchecked"("p_name" "text", "p_currency" "text" DEFAULT 'SZL'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_create_organization_unchecked"("p_name" "text", "p_currency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_resale_checkout_order"("p_listing_id" "uuid") RETURNS TABLE("order_id" "uuid", "payment_id" "uuid", "listing_id" "uuid", "total_cents" integer, "currency" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_buyer_id uuid := auth.uid();
  v_listing public.resale_listings%rowtype;
  v_source_item public.order_items%rowtype;
  v_source_order public.orders%rowtype;
  v_total_cents integer;
  v_order_id uuid;
  v_payment_id uuid;
begin
  if v_buyer_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_listing
  from public.resale_listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'listing is not active' using errcode = 'P0001';
  end if;

  if v_listing.listing_expires_at is not null and v_listing.listing_expires_at <= now() then
    update public.resale_listings
    set status = 'expired', updated_at = now()
    where id = v_listing.id and status = 'active';
    raise exception 'listing has expired' using errcode = 'P0001';
  end if;

  if v_listing.seller_id = v_buyer_id then
    raise exception 'seller cannot buy their own listing' using errcode = 'P0001';
  end if;

  select * into v_source_item
  from public.order_items
  where id = v_listing.order_item_id
  for update;

  if not found then
    raise exception 'source ticket not found' using errcode = 'P0002';
  end if;

  if v_source_item.status <> 'issued' then
    raise exception 'source ticket is not eligible for resale' using errcode = 'P0001';
  end if;

  if v_source_item.checked_in_at is not null or v_source_item.revoked_at is not null or v_source_item.refunded_at is not null then
    raise exception 'source ticket is no longer eligible for resale' using errcode = 'P0001';
  end if;

  select * into v_source_order
  from public.orders
  where id = v_source_item.order_id;

  if not found then
    raise exception 'source order not found' using errcode = 'P0002';
  end if;

  v_total_cents := coalesce(v_listing.price_cents, 0) + coalesce(v_listing.transfer_fee_cents, 0);

  insert into public.orders (
    org_id,
    buyer_id,
    total_cents,
    currency,
    status,
    channel,
    subtotal_cents,
    item_count,
    order_price_cents,
    order_currency,
    buyer_email
  ) values (
    v_listing.org_id,
    v_buyer_id,
    v_total_cents,
    v_listing.currency,
    'pending',
    'reseller',
    v_listing.price_cents,
    1,
    v_listing.price_cents,
    v_listing.currency,
    (select email from auth.users where id = v_buyer_id)
  ) returning id into v_order_id;

  insert into public.payments (
    order_id,
    provider,
    amount_cents,
    currency,
    status,
    channel,
    payload
  ) values (
    v_order_id,
    'manual',
    v_total_cents,
    v_listing.currency,
    'pending',
    'reseller',
    jsonb_build_object('kind', 'resale_checkout', 'listing_id', v_listing.id)
  ) returning id into v_payment_id;

  insert into public.payment_attempts (
    order_id,
    payment_id,
    provider,
    attempt_no,
    status,
    payload
  ) values (
    v_order_id,
    v_payment_id,
    'manual',
    1,
    'pending',
    jsonb_build_object('kind', 'resale_checkout', 'listing_id', v_listing.id)
  );

  return query select v_order_id, v_payment_id, v_listing.id, v_total_cents, v_listing.currency;
end;
$$;


ALTER FUNCTION "public"."fn_create_resale_checkout_order"("p_listing_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer DEFAULT 1) RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.fn_create_seat_hold(p_event_id, p_quantity, null::uuid);
$$;


ALTER FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer DEFAULT 1, "p_ticket_type_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_hold_code text;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 20 then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  if not exists (select 1 from public.events e where e.id = p_event_id and e.status = 'published') then
    raise exception 'event_not_available' using errcode = 'P0002';
  end if;
  if p_ticket_type_id is not null and not exists (
    select 1 from public.ticket_types tt
    where tt.id = p_ticket_type_id and tt.event_id = p_event_id
  ) then
    raise exception 'ticket_type_not_in_event' using errcode = '22023';
  end if;
  if not public.fn_rate_limit('seat_hold:' || v_user::text, 20, 60) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  v_hold_code := replace(gen_random_uuid()::text, '-', '');
  insert into public.seat_holds(event_id, hold_code, quantity, ticket_type_id, expires_at, created_by)
  values (p_event_id, v_hold_code, p_quantity, p_ticket_type_id, now() + interval '10 minutes', v_user);
  return v_hold_code;
end;
$$;


ALTER FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer, "p_ticket_type_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_talent_profile"("p_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_create_talent_profile_unchecked(p_name); end; $$;


ALTER FUNCTION "public"."fn_create_talent_profile"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_talent_profile_unchecked"("p_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_name text := nullif(btrim(p_name), '');
  v_base text;
  v_slug text;
  v_id uuid;
  v_existing public.artists%rowtype;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if v_name is null then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  select * into v_existing
  from public.artists
  where primary_user_id = v_user and org_id is null
  order by created_at
  limit 1;
  if found then
    return jsonb_build_object('id', v_existing.id, 'slug', v_existing.slug, 'name', v_existing.name, 'existing', true);
  end if;

  v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if length(v_base) < 2 then
    v_base := 'artist';
  end if;
  v_base := left(v_base, 60);
  v_slug := v_base || '-' || substr(md5(random()::text || v_user::text), 1, 6);

  insert into public.artists (name, slug, primary_user_id, org_id)
  values (v_name, v_slug, v_user, null)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'name', v_name, 'existing', false);
end;
$$;


ALTER FUNCTION "public"."fn_create_talent_profile_unchecked"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_waitlist_checkout_order"("p_waitlist_id" "uuid") RETURNS TABLE("order_id" "uuid", "payment_id" "uuid", "waitlist_id" "uuid", "total_cents" integer, "currency" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_buyer_id uuid := auth.uid();
  v_waitlist public.waitlists%rowtype;
  v_ticket_type public.ticket_types%rowtype;
  v_total_cents integer;
  v_order_id uuid;
  v_payment_id uuid;
begin
  if v_buyer_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_waitlist
  from public.waitlists
  where id = p_waitlist_id
  for update;

  if not found then
    raise exception 'waitlist offer not found' using errcode = 'P0002';
  end if;

  if v_waitlist.user_id <> v_buyer_id then
    raise exception 'waitlist offer does not belong to buyer' using errcode = 'P0001';
  end if;

  if lower(v_waitlist.status) not in ('offered', 'offer_available', 'notified') then
    raise exception 'waitlist offer is not available for checkout' using errcode = 'P0001';
  end if;

  if v_waitlist.offer_expires_at is null or v_waitlist.offer_expires_at <= now() then
    update public.waitlists
    set status = 'expired'
    where id = v_waitlist.id
      and lower(status) in ('offered', 'offer_available', 'notified');
    raise exception 'waitlist offer has expired' using errcode = 'P0001';
  end if;

  if v_waitlist.ticket_type_id is null then
    raise exception 'waitlist offer has no ticket type' using errcode = 'P0001';
  end if;

  select * into v_ticket_type
  from public.ticket_types
  where id = v_waitlist.ticket_type_id
  for update;

  if not found then
    raise exception 'ticket type not found' using errcode = 'P0002';
  end if;

  if v_ticket_type.event_id <> v_waitlist.event_id then
    raise exception 'ticket type does not match waitlist event' using errcode = 'P0001';
  end if;

  v_total_cents := coalesce(v_ticket_type.price_cents, 0) * greatest(1, coalesce(v_waitlist.quantity_requested, 1));

  insert into public.orders (
    org_id,
    buyer_id,
    total_cents,
    currency,
    status,
    channel,
    email,
    subtotal_cents,
    item_count,
    order_price_cents,
    order_currency,
    buyer_email
  ) values (
    (select org_id from public.events where id = v_waitlist.event_id),
    v_buyer_id,
    v_total_cents,
    v_ticket_type.currency,
    'pending',
    'online',
    coalesce(v_waitlist.email, (select email from auth.users where id = v_buyer_id)),
    v_total_cents,
    greatest(1, coalesce(v_waitlist.quantity_requested, 1)),
    v_total_cents,
    v_ticket_type.currency,
    coalesce(v_waitlist.email, (select email from auth.users where id = v_buyer_id))
  ) returning id into v_order_id;

  insert into public.payments (
    order_id,
    provider,
    amount_cents,
    currency,
    status,
    channel,
    payload
  ) values (
    v_order_id,
    'manual',
    v_total_cents,
    v_ticket_type.currency,
    'pending',
    'online',
    jsonb_build_object('kind', 'waitlist_checkout', 'waitlist_id', v_waitlist.id)
  ) returning id into v_payment_id;

  insert into public.payment_attempts (
    order_id,
    payment_id,
    provider,
    attempt_no,
    status,
    payload
  ) values (
    v_order_id,
    v_payment_id,
    'manual',
    1,
    'pending',
    jsonb_build_object('kind', 'waitlist_checkout', 'waitlist_id', v_waitlist.id)
  );

  update public.waitlists
  set status = 'checkout_pending'
  where id = v_waitlist.id;

  return query select v_order_id, v_payment_id, v_waitlist.id, v_total_cents, v_ticket_type.currency;
end;
$$;


ALTER FUNCTION "public"."fn_create_waitlist_checkout_order"("p_waitlist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_db_slow_queries"("p_limit" integer DEFAULT 10, "p_min_mean_ms" numeric DEFAULT 5) RETURNS TABLE("query" "text", "calls" bigint, "total_exec_ms" double precision, "mean_exec_ms" double precision, "rows" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  return query
    select
      regexp_replace(coalesce(s.query, ''), '\s+', ' ', 'g') as query,
      s.calls,
      s.total_exec_time as total_exec_ms,
      s.mean_exec_time as mean_exec_ms,
      s.rows
    from extensions.pg_stat_statements s
    where s.mean_exec_time >= coalesce(p_min_mean_ms, 0)
      and s.query is not null
      and s.query not like '%pg_stat_statements%'
    order by s.mean_exec_time desc
    limit greatest(1, least(p_limit, 50));
end
$$;


ALTER FUNCTION "public"."fn_db_slow_queries"("p_limit" integer, "p_min_mean_ms" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_db_slow_queries"("p_limit" integer, "p_min_mean_ms" numeric) IS 'Returns top slow queries from pg_stat_statements. Super-admin only (checked inside).';



CREATE OR REPLACE FUNCTION "public"."fn_deactivate_payment_method"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); perform public.fn_deactivate_payment_method_unchecked(p_id); end; $$;


ALTER FUNCTION "public"."fn_deactivate_payment_method"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_deactivate_payment_method_unchecked"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_was_default boolean;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select is_default into v_was_default
  from public.payment_methods
  where id = p_id and user_id = v_user and is_active;

  if v_was_default is null then
    raise exception 'payment method not found' using errcode = 'P0002';
  end if;

  update public.payment_methods
  set is_active = false,
      is_default = false,
      updated_at = now()
  where id = p_id and user_id = v_user;

  if v_was_default then
    update public.payment_methods
    set is_default = true,
        updated_at = now()
    where id = (
      select id from public.payment_methods
      where user_id = v_user and is_active
      order by created_at desc
      limit 1
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."fn_deactivate_payment_method_unchecked"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_decline_transfer"("p_transfer_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare v_transfer public.transfers;
begin
  perform app.require_claimed_account();
  select * into v_transfer from public.transfers where id=p_transfer_id for update;
  if not found then raise exception 'transfer_not_found'; end if;
  if v_transfer.to_user_id is distinct from auth.uid() then raise exception 'transfer_unauthorized'; end if;
  if v_transfer.status not in ('pending'::public.transfer_status,'requested'::public.transfer_status) then raise exception 'transfer_invalid_state'; end if;
  update public.transfers
  set status='declined'::public.transfer_status,
      metadata=coalesce(metadata,'{}'::jsonb)||case when nullif(trim(p_reason),'') is null then '{}'::jsonb else jsonb_build_object('decline_reason',left(trim(p_reason),240)) end,
      updated_at=now()
  where id=p_transfer_id returning * into v_transfer;
  insert into public.notifications(user_id,type,payload,status,channel,dedupe_key)
  values(v_transfer.from_user_id,'ticket_transfer_declined',jsonb_build_object('transfer_id',v_transfer.id,'href','/transfers'),'pending','in_app','ticket-transfer-declined:'||v_transfer.id::text)
  on conflict do nothing;
  return jsonb_build_object('transfer_id',v_transfer.id,'status','declined');
end;
$$;


ALTER FUNCTION "public"."fn_decline_transfer"("p_transfer_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_delete_account_for_user"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_exists boolean := false;
  v_status jsonb;
  v_orders_anonymised integer := 0;
  v_order_items_anonymised integer := 0;
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from auth.users where id = p_user_id
  ) into v_exists;

  if not v_exists then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  select public.fn_get_account_deletion_status_for_user(p_user_id)
    into v_status;

  if not coalesce((v_status ->> 'canDelete')::boolean, false) then
    raise exception 'account_deletion_blocked'
      using errcode = 'P0001', detail = v_status::text;
  end if;

  update public.orders
  set
    buyer_email = null,
    buyer_phone = null,
    email = null,
    phone = null
  where buyer_id = p_user_id;
  get diagnostics v_orders_anonymised = row_count;

  update public.order_items
  set
    holder_email = null,
    holder_name = null,
    holder_phone = null,
    holder_user_id = null,
    current_owner_id = null,
    name = null
  where holder_user_id = p_user_id
    or current_owner_id = p_user_id
    or order_id in (select id from public.orders where buyer_id = p_user_id);
  get diagnostics v_order_items_anonymised = row_count;

  update public.resale_listings
  set
    seller_id = null,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('sellerDeletedAt', now())
  where seller_id = p_user_id;

  update public.transfers
  set from_user_id = null
  where from_user_id = p_user_id;

  update public.transfers
  set to_user_id = null
  where to_user_id = p_user_id;

  update public.price_rule_redemptions
  set user_id = null
  where user_id = p_user_id;

  update public.audit_log
  set actor_id = null
  where actor_id = p_user_id;

  update public.devices
  set registered_by = null
  where registered_by = p_user_id;

  update public.guestlist_entries
  set created_by = null
  where created_by = p_user_id;

  update public.payment_provider_settings
  set updated_by = null
  where updated_by = p_user_id;

  update public.seat_holds
  set created_by = null
  where created_by = p_user_id;

  if to_regclass('public.physical_credentials') is not null then
    execute $sql$
      update public.physical_credentials
      set
        status = case
          when status in ('issued', 'active', 'suspended', 'lost') then 'revoked'
          else status
        end,
        user_id = null,
        revoked_at = case
          when status in ('issued', 'active', 'suspended', 'lost') then coalesce(revoked_at, now())
          else revoked_at
        end,
        revocation_reason = case
          when status in ('issued', 'active', 'suspended', 'lost') then coalesce(revocation_reason, 'account_deleted')
          else revocation_reason
        end,
        verification_metadata = coalesce(verification_metadata, '{}'::jsonb)
          || jsonb_build_object('accountDeletedAt', now())
      where user_id = $1
    $sql$ using p_user_id;
  end if;

  update public.waitlists
  set email = null, first_name = null, last_name = null
  where user_id = p_user_id;

  delete from public.notifications
  where user_id = p_user_id;

  delete from public.push_subscriptions
  where user_id = p_user_id;

  delete from public.seat_reservations
  where user_id = p_user_id;

  insert into public.audit_log
    (org_id, actor_id, table_name, record_id, action, changes)
  values (
    null,
    null,
    'auth.users',
    p_user_id::text,
    'delete',
    jsonb_build_object(
      'job', 'account_deletion',
      'orders_anonymised', v_orders_anonymised,
      'order_items_anonymised', v_order_items_anonymised,
      'ran_at', now()
    )
  );

  delete from auth.users
  where id = p_user_id;

  return jsonb_build_object(
    'deleted', true,
    'userId', p_user_id,
    'ordersAnonymised', v_orders_anonymised,
    'orderItemsAnonymised', v_order_items_anonymised
  );
end;
$_$;


ALTER FUNCTION "public"."fn_delete_account_for_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_delete_organization"("p_org_id" "uuid", "p_confirm_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); perform public.fn_delete_organization_unchecked(p_org_id, p_confirm_name); end; $$;


ALTER FUNCTION "public"."fn_delete_organization"("p_org_id" "uuid", "p_confirm_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_delete_organization_unchecked"("p_org_id" "uuid", "p_confirm_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_role public.app_role;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select o.name, om.role
    into v_name, v_role
  from public.organizations o
  join public.org_members om on om.org_id = o.id and om.user_id = v_user_id
  where o.id = p_org_id;

  if v_name is null then
    raise exception 'Organization not found';
  end if;

  if v_role <> 'organizer_owner'::public.app_role then
    raise exception 'Only the organization owner can delete this workspace';
  end if;

  if trim(coalesce(p_confirm_name, '')) <> v_name then
    raise exception 'Organization name does not match';
  end if;

  if exists (select 1 from public.events where org_id = p_org_id)
     or exists (select 1 from public.orders where org_id = p_org_id)
     or exists (select 1 from public.payout_accounts where org_id = p_org_id)
     or exists (select 1 from public.payouts where org_id = p_org_id)
     or exists (select 1 from public.resale_listings where org_id = p_org_id)
  then
    raise exception 'This workspace has events, orders, payouts, or resale activity and cannot be permanently deleted';
  end if;

  delete from public.audit_log where org_id = p_org_id;
  delete from public.organizations where id = p_org_id;
end;
$$;


ALTER FUNCTION "public"."fn_delete_organization_unchecked"("p_org_id" "uuid", "p_confirm_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_detect_oversold_ticket_types"() RETURNS TABLE("ticket_type_id" "uuid", "event_id" "uuid", "ticket_type_name" "text", "quota" integer, "committed" integer, "oversold_by" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tt.id, tt.event_id, tt.name, tt.quota, committed.cnt,
         (committed.cnt - tt.quota)::integer
  from public.ticket_types tt
  join lateral (
    select count(*)::integer as cnt
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = tt.id
      and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
      and (
        o.status = 'paid'
        or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now()))
      )
  ) committed on true
  where tt.quota is not null
    and tt.quota >= 0
    and committed.cnt > tt.quota;
$$;


ALTER FUNCTION "public"."fn_detect_oversold_ticket_types"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_devices_require_event_for_scanner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.device_role = 'organizer_scanner'::public.device_role AND NEW.event_id IS NULL THEN
    RAISE EXCEPTION 'Assigned scanner devices (organizer_scanner) must reference an event_id';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_devices_require_event_for_scanner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_disable_push_device_token"("p_service" "text", "p_token" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_disabled integer;
begin
  with gone as (
    update public.push_devices
       set disabled_at = now(),
           disabled_reason = nullif(btrim(p_reason), '')
     where service = lower(btrim(p_service))::public.push_service
       and token = btrim(p_token)
       and disabled_at is null
    returning 1
  )
  select count(*) from gone into v_disabled;

  return v_disabled;
end;
$$;


ALTER FUNCTION "public"."fn_disable_push_device_token"("p_service" "text", "p_token" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_dismiss_event_invitation"("p_invitation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_changed boolean := false;
begin
  perform app.require_claimed_account();
  update public.event_invitations
  set status = 'dismissed', updated_at = now(), responded_at = now()
  where id = p_invitation_id and invitee_id = v_me and status = 'pending';
  v_changed := found;
  return v_changed;
end;
$$;


ALTER FUNCTION "public"."fn_dismiss_event_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_dispute_counts"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select jsonb_build_object(
    'open', (select count(*) from public.disputes where status='open'),
    'investigating', (select count(*) from public.disputes where status='investigating'),
    'awaiting_customer', (select count(*) from public.disputes where status='awaiting_customer'),
    'unassigned_open', (select count(*) from public.disputes where status in ('open','investigating') and assigned_to is null),
    'stale_open', (select count(*) from public.disputes where status in ('open','investigating','awaiting_customer') and created_at < now() - interval '7 days')
  );
$$;


ALTER FUNCTION "public"."fn_dispute_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_disputes_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin new.updated_at := now(); return new; end; $$;


ALTER FUNCTION "public"."fn_disputes_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_duplicate_event"("p_event_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_duplicate_event_unchecked(p_event_id); end; $$;


ALTER FUNCTION "public"."fn_duplicate_event"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_duplicate_event_unchecked"("p_event_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id    uuid := (SELECT auth.uid());
  v_event      events%ROWTYPE;
  v_new_id     uuid;
  v_new_slug   text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Require manager-level org membership (or platform admin).
  IF NOT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id  = v_event.org_id
      AND user_id = v_user_id
      AND role    = ANY(ARRAY['admin','organizer','organizer_owner','organizer_admin']::app_role[])
  ) AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = v_user_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to duplicate this event';
  END IF;

  -- Unique slug: original slug + "-copy-" + epoch seconds.
  v_new_slug := v_event.slug || '-copy-' || EXTRACT(epoch FROM now())::bigint;

  INSERT INTO events (
    org_id, venue_id, title, slug, status, visibility,
    cover_image_url, category, city, country_code, tz,
    description, refund_policy, attendee_fields,
    confirmation_message, resale_cap_bps, created_by
  )
  VALUES (
    v_event.org_id,
    v_event.venue_id,
    v_event.title || ' (Copy)',
    v_new_slug,
    'draft',
    v_event.visibility,
    v_event.cover_image_url,
    v_event.category,
    v_event.city,
    v_event.country_code,
    v_event.tz,
    v_event.description,
    v_event.refund_policy,
    v_event.attendee_fields,
    v_event.confirmation_message,
    v_event.resale_cap_bps,
    v_user_id
  )
  RETURNING id INTO v_new_id;

  -- Copy ticket types, zeroing out any sales-derived state.
  INSERT INTO ticket_types (
    event_id, name, price_cents, currency, quota, per_user_limit, sales_status
  )
  SELECT
    v_new_id, name, price_cents, currency, quota, per_user_limit, 'on_sale'
  FROM ticket_types
  WHERE event_id = p_event_id;

  RETURN json_build_object('event_id', v_new_id, 'slug', v_new_slug);
END;
$$;


ALTER FUNCTION "public"."fn_duplicate_event_unchecked"("p_event_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone
);


ALTER TABLE "public"."device_sessions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_end_device_session"("p_session_id" "uuid") RETURNS "public"."device_sessions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_session public.device_sessions;
  v_org uuid;
begin
  perform app.require_claimed_account();

  select ds.* into v_session
  from public.device_sessions ds
  where ds.id = p_session_id
  for update;

  if not found then
    raise exception 'device_session_not_found' using errcode = 'P0002';
  end if;

  select d.org_id into v_org
  from public.devices d
  where d.id = v_session.device_id;

  if not (v_session.user_id = auth.uid() or app.is_org_manager(v_org)) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.device_sessions
  set ended_at = coalesce(ended_at, now())
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;


ALTER FUNCTION "public"."fn_end_device_session"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_enqueue_webhook"("p_event_type" "text", "p_payload" "jsonb", "p_org_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_inserted int;
begin
  if p_event_type is null or length(trim(p_event_type)) = 0 then
    raise exception 'event_type required';
  end if;

  insert into public.webhook_deliveries (
    endpoint_id, event_type, payload, attempt_no, next_retry_at, created_at
  )
  select
    e.id,
    p_event_type,
    p_payload,
    1,
    now(),
    now()
  from public.webhook_endpoints e
  where e.is_active = true
    and p_event_type = any(e.events)
    and (
      e.org_id is null  -- platform-level subscriber
      or e.org_id = p_org_id
    );

  get diagnostics v_inserted = row_count;
  return coalesce(v_inserted, 0);
end
$$;


ALTER FUNCTION "public"."fn_enqueue_webhook"("p_event_type" "text", "p_payload" "jsonb", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_enqueue_webhook"("p_event_type" "text", "p_payload" "jsonb", "p_org_id" "uuid") IS 'Enqueue webhook deliveries for an event. Service-role only; app code or DB triggers call this.';



CREATE OR REPLACE FUNCTION "public"."fn_event_artists_refresh_event_search"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare v_event uuid;
begin
  v_event := coalesce(new.event_id, old.event_id);
  if v_event is not null then
    update public.events set updated_at = now() where id = v_event;
  end if;
  return coalesce(new, old);
end
$$;


ALTER FUNCTION "public"."fn_event_artists_refresh_event_search"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_event_category_slug_exists"("p_slug" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.event_categories
    where slug = p_slug
      and is_active = true
  )
$$;


ALTER FUNCTION "public"."fn_event_category_slug_exists"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_event_friend_signals"("p_event_ids" "uuid"[]) RETURNS TABLE("event_id" "uuid", "friend_count" integer, "friend_names" "text"[], "friend_handles" "text"[])
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform app.require_claimed_account();

  if coalesce(cardinality(p_event_ids), 0) = 0 then
    return;
  end if;
  if cardinality(p_event_ids) > 50 then
    raise exception 'select at most 50 events' using errcode='22023';
  end if;

  return query
  select
    fg.event_id,
    count(*)::integer as friend_count,
    (array_agg(fg.friend_name order by fg.friend_name))[1:3] as friend_names,
    (array_agg(fg.friend_handle order by fg.friend_name) filter (where fg.friend_handle is not null))[1:3] as friend_handles
  from public.fn_my_friends_going(p_event_ids, null, 500) fg
  group by fg.event_id
  order by fg.event_id;
end;
$$;


ALTER FUNCTION "public"."fn_event_friend_signals"("p_event_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_event_invite_candidates"("p_event_id" "uuid") RETURNS TABLE("handle" "text", "display_name" "text", "avatar_url" "text", "is_going" boolean, "invite_status" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
begin
  perform app.require_claimed_account();

  if not public.fn_event_is_public_now(p_event_id) then
    return;
  end if;

  return query
  with eligible_friends as (
    select case
      when uc.requester_id = v_me then uc.recipient_id
      else uc.requester_id
    end as friend_id
    from public.user_connections uc
    where uc.status = 'accepted'::public.connection_status
      and (uc.requester_id = v_me or uc.recipient_id = v_me)
  ), going as (
    select g.friend_id
    from public.fn_my_friends_going(array[p_event_id], null, 500) g
  )
  select
    h.handle,
    coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(concat_ws(' ', p.name, p.surname)), ''), h.handle) as display_name,
    p.avatar_url,
    (g.friend_id is not null) as is_going,
    ei.status as invite_status
  from eligible_friends ef
  join public.profiles p on p.user_id = ef.friend_id
  join public.user_handles h on h.user_id = ef.friend_id
  left join going g on g.friend_id = ef.friend_id
  left join public.event_invitations ei
    on ei.event_id = p_event_id
   and ei.inviter_id = v_me
   and ei.invitee_id = ef.friend_id
  where not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_me and b.blocked_id = ef.friend_id)
       or (b.blocker_id = ef.friend_id and b.blocked_id = v_me)
  )
  order by (g.friend_id is not null) desc, display_name asc;
end;
$$;


ALTER FUNCTION "public"."fn_event_invite_candidates"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_event_is_public_now"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.status = 'published'::event_status
      and e.visibility = 'public'
      and (e.publish_at is null or now() at time zone 'utc' >= e.publish_at)
      and (e.unpublish_at is null or now() at time zone 'utc' <  e.unpublish_at)
  );
$$;


ALTER FUNCTION "public"."fn_event_is_public_now"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_event_sales_public"() RETURNS TABLE("event_id" "uuid", "tickets_sold" bigint, "gross_revenue_cents" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT m.event_id, m.tickets_sold, m.gross_cents AS gross_revenue_cents
  FROM public.mv_event_sales m
  WHERE (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.org_members om ON om.org_id = e.org_id
      WHERE e.id = m.event_id AND om.user_id = (SELECT auth.uid())
    )
    OR (auth.jwt() ->> 'role') = 'admin'
  );
$$;


ALTER FUNCTION "public"."fn_event_sales_public"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_events_refresh_search"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_venue text;
  v_artists text;
begin
  select v.name into v_venue from public.venues v where v.id = new.venue_id;
  select string_agg(a.name, ' ')
    into v_artists
    from public.event_artists ea
    join public.artists a on a.id = ea.artist_id
    where ea.event_id = new.id;

  new.search_text :=
    coalesce(new.title, '') || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(new.city, '') || ' ' ||
    coalesce(new.category, '') || ' ' ||
    coalesce(v_venue, '') || ' ' ||
    coalesce(v_artists, '');

  new.search_tsv := to_tsvector('simple', new.search_text);
  return new;
end
$$;


ALTER FUNCTION "public"."fn_events_refresh_search"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_expire_stale_checkout_holds"("p_grace" interval DEFAULT '00:15:00'::interval, "p_limit" integer DEFAULT 500) RETURNS TABLE("expired_orders" integer, "revoked_items" integer, "deleted_seat_holds" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_orders integer := 0;
  v_items  integer := 0;
  v_holds  integer := 0;
begin
  with candidates as (
    select o.id
    from public.orders o
    where o.status = 'pending'
      and o.hold_expires_at is not null
      and o.hold_expires_at < now() - coalesce(p_grace, interval '15 minutes')
      and not exists (
        select 1 from public.payments p
        where p.order_id = o.id and p.status in ('succeeded', 'pending')
      )
    order by o.hold_expires_at
    limit greatest(coalesce(p_limit, 500), 1)
    for update skip locked
  ),
  revoked as (
    update public.order_items oi
    set status = 'revoked'
    where oi.order_id in (select id from candidates)
      and oi.status = 'pending'
    returning 1
  ),
  closed as (
    update public.orders o
    set status = 'failed'
    where o.id in (select id from candidates)
    returning 1
  )
  select (select count(*) from closed), (select count(*) from revoked)
  into v_orders, v_items;

  with pruned as (
    delete from public.seat_holds sh
    where sh.expires_at < now() - interval '1 day'
    returning 1
  )
  select count(*) into v_holds from pruned;

  return query select v_orders, v_items, v_holds;
end;
$$;


ALTER FUNCTION "public"."fn_expire_stale_checkout_holds"("p_grace" interval, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_export_rpc_permissions"() RETURNS TABLE("schema_name" "text", "function_name" "text", "arguments" "text", "security_definer" boolean, "search_path_pinned" boolean, "grantees" "text"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    n.nspname::text,
    p.proname::text,
    pg_get_function_identity_arguments(p.oid),
    p.prosecdef,
    coalesce(
      exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'),
      false
    ),
    coalesce(
      (
        select array_agg(distinct grantee_name order by grantee_name)
        from (
          select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee_name
          from aclexplode(p.proacl) a
          where a.privilege_type = 'EXECUTE'
        ) g
      ),
      array[]::text[]
    )
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'app')
    and p.prokind = 'f'
  order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid);
$$;


ALTER FUNCTION "public"."fn_export_rpc_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_feature_flags_touch_last_changed"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.rollout_percent is distinct from old.rollout_percent
     or new.enabled is distinct from old.enabled
     or new.config is distinct from old.config
     or new.tags is distinct from old.tags
     or new.description is distinct from old.description
  then
    new.last_changed_at := now();
  end if;
  new.updated_at := now();
  return new;
end
$$;


ALTER FUNCTION "public"."fn_feature_flags_touch_last_changed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_finalize_email_broadcast"("p_notification_id" "uuid", "p_sent_count" integer, "p_failed_count" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if coalesce(p_sent_count, 0) < 0 or coalesce(p_failed_count, 0) < 0 then
    raise exception 'invalid_delivery_counts' using errcode = '22023';
  end if;

  update public.notifications
  set status = case when coalesce(p_failed_count, 0) > 0 and coalesce(p_sent_count, 0) = 0 then 'failed' else 'sent' end,
      sent_at = case when coalesce(p_sent_count, 0) > 0 then now() else sent_at end,
      payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
        'sent_count', coalesce(p_sent_count, 0),
        'failed_count', coalesce(p_failed_count, 0),
        'finalized_at', now()
      )
  where id = p_notification_id
    and type = 'email_broadcast';

  if not found then
    raise exception 'broadcast_not_found' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."fn_finalize_email_broadcast"("p_notification_id" "uuid", "p_sent_count" integer, "p_failed_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_find_claimable_guest_orders"() RETURNS TABLE("order_id" "uuid", "created_at" timestamp with time zone, "total_cents" integer, "currency" "text", "item_count" integer, "event_title" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_email text;
  v_phone text;
begin
  if v_user is null then return; end if;
  select case when u.email_confirmed_at is not null then public.fn_normalize_email(u.email) end,
         case when u.phone_confirmed_at is not null then public.fn_normalize_phone(u.phone) end
  into v_email, v_phone
  from auth.users u where u.id = v_user;
  if v_email is null and v_phone is null then return; end if;
  return query
  select o.id, o.created_at, o.total_cents, o.currency, o.item_count,
         (select e.title from public.order_items oi
            join public.ticket_types tt on tt.id = oi.ticket_type_id
            join public.events e on e.id = tt.event_id
            where oi.order_id = o.id limit 1) as event_title
  from public.orders o
  join auth.users bu on bu.id = o.buyer_id
  where bu.is_anonymous is true
    and o.buyer_id <> v_user
    and o.status <> 'pending'
    and (
      (v_email is not null and public.fn_normalize_email(coalesce(o.buyer_email, o.email)) = v_email)
      or (v_phone is not null and public.fn_normalize_phone(coalesce(o.buyer_phone, o.phone)) = v_phone)
    )
  order by o.created_at desc;
end;
$$;


ALTER FUNCTION "public"."fn_find_claimable_guest_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_friend_block"("p_handle" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_target is null or v_target = v_me then return 'unavailable'; end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_me, v_target)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.user_connections
  where (requester_id = v_me and recipient_id = v_target)
     or (requester_id = v_target and recipient_id = v_me);

  return 'blocked_by_me';
end;
$$;


ALTER FUNCTION "public"."fn_friend_block"("p_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_friend_cancel"("p_handle" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_target is null then return 'none'; end if;

  delete from public.user_connections
  where requester_id = v_me
    and recipient_id = v_target
    and status = 'pending'::public.connection_status;

  return 'none';
end;
$$;


ALTER FUNCTION "public"."fn_friend_cancel"("p_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_friend_request"("p_handle" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
  v_connection public.user_connections%rowtype;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id
    into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
    and btrim(p_handle) ~ '^[A-Za-z0-9_]{3,30}$'
  limit 1;

  if v_target is null or v_target = v_me then
    return 'unavailable';
  end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_me and b.blocked_id = v_target)
       or (b.blocker_id = v_target and b.blocked_id = v_me)
  ) then
    return 'unavailable';
  end if;

  if coalesce((
    select s.allow_friend_requests
    from public.user_privacy_settings s
    where s.user_id = v_target
  ), true) = false then
    return 'unavailable';
  end if;

  select uc.*
    into v_connection
  from public.user_connections uc
  where least(uc.requester_id, uc.recipient_id) = least(v_me, v_target)
    and greatest(uc.requester_id, uc.recipient_id) = greatest(v_me, v_target)
  limit 1;

  if found then
    if v_connection.status::text = 'accepted' then
      return 'friends';
    elsif v_connection.status::text = 'pending' then
      if v_connection.requester_id = v_me then
        return 'outgoing_pending';
      end if;
      return 'incoming_pending';
    elsif v_connection.status::text = 'blocked' then
      return 'unavailable';
    elsif v_connection.status::text = 'declined' then
      delete from public.user_connections
      where id = v_connection.id;
    end if;
  end if;

  insert into public.user_connections (requester_id, recipient_id, status)
  values (v_me, v_target, 'pending');

  return 'outgoing_pending';
exception
  when unique_violation then
    select uc.*
      into v_connection
    from public.user_connections uc
    where least(uc.requester_id, uc.recipient_id) = least(v_me, v_target)
      and greatest(uc.requester_id, uc.recipient_id) = greatest(v_me, v_target)
    limit 1;

    if found and v_connection.status::text = 'accepted' then return 'friends'; end if;
    if found and v_connection.status::text = 'pending' and v_connection.requester_id = v_me then return 'outgoing_pending'; end if;
    if found and v_connection.status::text = 'pending' then return 'incoming_pending'; end if;
    return 'unavailable';
end;
$_$;


ALTER FUNCTION "public"."fn_friend_request"("p_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_friend_respond"("p_handle" "text", "p_accept" boolean) RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_requester uuid;
  v_updated uuid;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id into v_requester
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_requester is null then return 'none'; end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_me and b.blocked_id = v_requester)
       or (b.blocker_id = v_requester and b.blocked_id = v_me)
  ) then
    return 'unavailable';
  end if;

  update public.user_connections
  set status = case when p_accept then 'accepted'::public.connection_status else 'declined'::public.connection_status end
  where requester_id = v_requester
    and recipient_id = v_me
    and status = 'pending'::public.connection_status
  returning id into v_updated;

  if v_updated is null then return 'none'; end if;
  if p_accept then return 'friends'; end if;
  return 'none';
end;
$$;


ALTER FUNCTION "public"."fn_friend_respond"("p_handle" "text", "p_accept" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_friend_unblock"("p_handle" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_target is null then return 'none'; end if;

  delete from public.user_blocks
  where blocker_id = v_me and blocked_id = v_target;

  return 'none';
end;
$$;


ALTER FUNCTION "public"."fn_friend_unblock"("p_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_friend_unfriend"("p_handle" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select h.user_id into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_target is null then return 'none'; end if;

  delete from public.user_connections
  where status = 'accepted'::public.connection_status
    and ((requester_id = v_me and recipient_id = v_target)
      or (requester_id = v_target and recipient_id = v_me));

  return 'none';
end;
$$;


ALTER FUNCTION "public"."fn_friend_unfriend"("p_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_account_deletion_status_for_user"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_owner_orgs integer := 0;
  v_upcoming_tickets integer := 0;
  v_active_resales integer := 0;
  v_pending_transfers integer := 0;
  v_paid_orders integer := 0;
  v_blockers jsonb := '[]'::jsonb;
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = 'P0001';
  end if;

  select count(*)::integer
    into v_owner_orgs
  from public.org_members
  where user_id = p_user_id
    and role in ('admin', 'organizer_owner');

  select count(distinct oi.id)::integer
    into v_upcoming_tickets
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.events e on e.id = tt.event_id
  where o.status = 'paid'
    and oi.status not in ('revoked', 'refunded')
    and oi.revoked_at is null
    and oi.refunded_at is null
    and (
      o.buyer_id = p_user_id
      or oi.current_owner_id = p_user_id
      or oi.holder_user_id = p_user_id
    )
    and coalesce(
      (
        select max(coalesce(ed.ends_at, ed.starts_at))
        from public.event_dates ed
        where ed.event_id = e.id
      ),
      e.ends_at,
      e.starts_at
    ) >= now();

  select count(*)::integer
    into v_active_resales
  from public.resale_listings
  where seller_id = p_user_id
    and status in ('active', 'pending', 'checkout_pending');

  select count(*)::integer
    into v_pending_transfers
  from public.transfers
  where (from_user_id = p_user_id or to_user_id = p_user_id)
    and status in ('requested', 'pending');

  select count(*)::integer
    into v_paid_orders
  from public.orders
  where buyer_id = p_user_id
    and status in ('paid', 'refunded');

  if v_owner_orgs > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'organizer_owner',
      'count', v_owner_orgs,
      'message', 'Transfer organization ownership before deleting this account.'
    ));
  end if;

  if v_upcoming_tickets > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'upcoming_tickets',
      'count', v_upcoming_tickets,
      'message', 'Use, refund, or transfer upcoming paid tickets before deleting this account.'
    ));
  end if;

  if v_active_resales > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'active_resales',
      'count', v_active_resales,
      'message', 'Cancel or complete active resale listings before deleting this account.'
    ));
  end if;

  if v_pending_transfers > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'pending_transfers',
      'count', v_pending_transfers,
      'message', 'Resolve pending ticket transfers before deleting this account.'
    ));
  end if;

  return jsonb_build_object(
    'canDelete', jsonb_array_length(v_blockers) = 0,
    'blockers', v_blockers,
    'counts', jsonb_build_object(
      'paidOrdersRetained', v_paid_orders,
      'ownerOrganizations', v_owner_orgs,
      'upcomingTickets', v_upcoming_tickets,
      'activeResales', v_active_resales,
      'pendingTransfers', v_pending_transfers
    ),
    'retention', jsonb_build_object(
      'orders', 'Retained without buyer profile/contact details for accounting and tax records.',
      'tickets', 'Upcoming paid tickets must be resolved before deletion.',
      'profile', 'Deleted with the Auth account.'
    )
  );
end;
$$;


ALTER FUNCTION "public"."fn_get_account_deletion_status_for_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_effective_payment_providers"("p_org_id" "uuid", "p_event_id" "uuid" DEFAULT NULL::"uuid", "p_ticket_type_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"[]
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
declare
  v_org_providers text[];
  v_event_providers text[];
  v_ticket_providers text[];
  v_platform_providers text[];
begin
  -- Platform-level: providers that are globally enabled
  select array_agg(provider order by provider)
  into v_platform_providers
  from public.payment_provider_settings
  where is_enabled = true;

  -- Organization-level
  select coalesce(payment_providers, '{}'::text[])
  into v_org_providers
  from public.organizations
  where id = p_org_id;

  -- If org has explicit policy, use it; otherwise use platform
  if array_length(v_org_providers, 1) > 0 then
    v_platform_providers := v_org_providers;
  end if;

  -- Event-level override
  if p_event_id is not null then
    select coalesce(payment_providers, '{}'::text[])
    into v_event_providers
    from public.events
    where id = p_event_id;

    if array_length(v_event_providers, 1) > 0 then
      -- Event has explicit policy: intersect with org/platform
      select array_agg(e order by e)
      into v_platform_providers
      from unnest(v_event_providers) e
      where e = any(v_platform_providers);
    end if;
  end if;

  -- Ticket-type-level override
  if p_ticket_type_id is not null then
    select coalesce(payment_providers, '{}'::text[])
    into v_ticket_providers
    from public.ticket_types
    where id = p_ticket_type_id;

    if array_length(v_ticket_providers, 1) > 0 then
      -- Ticket type has explicit policy: intersect with event/org/platform
      select array_agg(e order by e)
      into v_platform_providers
      from unnest(v_ticket_providers) e
      where e = any(v_platform_providers);
    end if;
  end if;

  return coalesce(v_platform_providers, '{}'::text[]);
end;
$$;


ALTER FUNCTION "public"."fn_get_effective_payment_providers"("p_org_id" "uuid", "p_event_id" "uuid", "p_ticket_type_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_effective_payment_providers"("p_org_id" "uuid", "p_event_id" "uuid", "p_ticket_type_id" "uuid") IS 'Resolves the effective payment providers for an order based on the policy hierarchy: platform > organizer > event > ticket-type. Empty array means no providers available.';



CREATE OR REPLACE FUNCTION "public"."fn_get_my_account_deletion_status"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return public.fn_get_account_deletion_status_for_user(v_user);
end;
$$;


ALTER FUNCTION "public"."fn_get_my_account_deletion_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_my_notification_mutes"() RETURNS "text"[]
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(array_agg(notification_type), '{}')
  from public.notification_mutes
  where user_id = (select auth.uid());
$$;


ALTER FUNCTION "public"."fn_get_my_notification_mutes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_my_order_totals"("p_order_id" "uuid") RETURNS "public"."order_totals"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  out public.order_totals;
  v_user uuid;
BEGIN
  SELECT public.current_user_uid() INTO v_user;
  SELECT
    o.id,
    o.currency,
    COALESCE(o.item_count, 0),
    COALESCE(o.subtotal_cents, 0),
    COALESCE(o.platform_fee_cents, 0),
    COALESCE(o.processor_fee_cents, 0),
    COALESCE(o.total_cents, 0),
    o.totals_computed_at
  INTO out
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.buyer_id = v_user;  -- strict buyer check

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not accessible' USING ERRCODE = '02000';
  END IF;

  RETURN out;
END;
$$;


ALTER FUNCTION "public"."fn_get_my_order_totals"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_my_order_totals_json"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  obj jsonb;
  v_user uuid;
BEGIN
  SELECT public.current_user_uid() INTO v_user;
  SELECT jsonb_build_object(
    'order_id', o.id,
    'currency', o.currency,
    'item_count', COALESCE(o.item_count, 0),
    'subtotal_cents', COALESCE(o.subtotal_cents, 0),
    'platform_fee_cents', COALESCE(o.platform_fee_cents, 0),
    'processor_fee_cents', COALESCE(o.processor_fee_cents, 0),
    'total_cents', COALESCE(o.total_cents, 0),
    'totals_computed_at', o.totals_computed_at
  )
  INTO obj
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.buyer_id = v_user;

  IF obj IS NULL THEN
    RAISE EXCEPTION 'Order not found or not accessible' USING ERRCODE = '02000';
  END IF;

  RETURN obj;
END;
$$;


ALTER FUNCTION "public"."fn_get_my_order_totals_json"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_my_ticketiv_roles"() RETURNS TABLE("user_id" "uuid", "role_key" "text", "role_label" "text", "source" "text", "source_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select * from public.fn_get_ticketiv_effective_roles(auth.uid());
$$;


ALTER FUNCTION "public"."fn_get_my_ticketiv_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_or_create_artist"("p_name" "text", "p_bio" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_name text := nullif(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_id uuid;
  v_slug_base text;
  v_slug text;
  v_suffix int := 1;
begin
  if v_name is null then
    raise exception 'Artist name is required';
  end if;

  select id into v_id
  from public.artists
  where name_key = lower(v_name)
  limit 1;

  if v_id is not null then
    update public.artists
    set
      bio = coalesce(public.artists.bio, nullif(p_bio, '')),
      image_url = coalesce(public.artists.image_url, nullif(p_image_url, ''))
    where id = v_id;
    return v_id;
  end if;

  v_slug_base := coalesce(nullif(public.slugify_text(v_name), ''), 'artist');
  v_slug := v_slug_base;

  while exists (select 1 from public.artists where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_slug_base || '-' || v_suffix::text;
  end loop;

  insert into public.artists (org_id, name, slug, bio, image_url)
  values (null, v_name, v_slug, nullif(p_bio, ''), nullif(p_image_url, ''))
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."fn_get_or_create_artist"("p_name" "text", "p_bio" "text", "p_image_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_or_create_venue"("p_name" "text", "p_city" "text" DEFAULT NULL::"text", "p_address" "text" DEFAULT NULL::"text", "p_tz" "text" DEFAULT 'Africa/Mbabane'::"text", "p_capacity" integer DEFAULT NULL::integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_name text := nullif(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_city text := nullif(regexp_replace(trim(coalesce(p_city, '')), '\s+', ' ', 'g'), '');
  v_id uuid;
  v_slug_base text;
  v_slug text;
  v_suffix int := 1;
begin
  if v_name is null then
    raise exception 'Venue name is required';
  end if;

  select id into v_id
  from public.venues
  where name_key = lower(v_name)
    and city_key = lower(coalesce(v_city, ''))
  limit 1;

  if v_id is not null then
    update public.venues
    set
      address = coalesce(public.venues.address, nullif(p_address, '')),
      tz = coalesce(public.venues.tz, nullif(p_tz, 'Africa/Mbabane'), p_tz),
      capacity = coalesce(public.venues.capacity, p_capacity)
    where id = v_id;
    return v_id;
  end if;

  v_slug_base := coalesce(nullif(public.slugify_text(v_name || case when v_city is not null then '-' || v_city else '' end), ''), 'venue');
  v_slug := v_slug_base;

  while exists (select 1 from public.venues where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_slug_base || '-' || v_suffix::text;
  end loop;

  insert into public.venues (org_id, name, slug, address, city, tz, capacity)
  values (null, v_name, v_slug, nullif(p_address, ''), v_city, coalesce(nullif(p_tz, ''), 'Africa/Mbabane'), p_capacity)
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."fn_get_or_create_venue"("p_name" "text", "p_city" "text", "p_address" "text", "p_tz" "text", "p_capacity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_ticketiv_effective_roles"("p_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "role_key" "text", "role_label" "text", "source" "text", "source_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.user_id, 'attendee'::text, 'Attendee'::text, 'profiles'::text, p.user_id
  from public.profiles p
  where p.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')

  union

  select om.user_id,
         om.role::text,
         case om.role
           when 'organizer_owner'::public.app_role then 'Owner'
           when 'organizer_admin'::public.app_role then 'Admin'
           when 'organizer_staff'::public.app_role then 'Staff'
           when 'finance'::public.app_role then 'Finance'
           when 'organizer'::public.app_role then 'Organizer'
           else initcap(replace(om.role::text, '_', ' '))
         end,
         'org_members'::text,
         om.org_id
  from public.org_members om
  where om.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
    and om.role in (
      'organizer'::public.app_role,
      'organizer_owner'::public.app_role,
      'organizer_admin'::public.app_role,
      'organizer_staff'::public.app_role,
      'finance'::public.app_role
    )

  union

  select es.user_id, 'scanner'::text, 'Scanner'::text, 'event_staff'::text, es.event_id
  from public.event_staff es
  where es.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
    and es.active is true
    and es.role in ('scanner'::public.app_role, 'organizer_scanner'::public.app_role)

  union

  select a.primary_user_id, 'talent'::text, 'Talent'::text, 'artists.primary_user_id'::text, a.id
  from public.artists a
  where a.primary_user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')

  union

  select au.user_id,
         au.role_tier::text,
         case au.role_tier::text
           when 'super_admin' then 'Super admin'
           else initcap(replace(au.role_tier::text, '_', ' '))
         end,
         'admin_users'::text,
         au.user_id
  from public.admin_users au
  where au.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
    and au.active is true;
$$;


ALTER FUNCTION "public"."fn_get_ticketiv_effective_roles"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_get_ticketiv_effective_roles"("p_user_id" "uuid") IS 'Derives the four Ticketiv UI roles from UUID-linked records: Attendee, Organizer, Scanner, Talent.';



CREATE OR REPLACE FUNCTION "public"."fn_invite_friends_to_event"("p_event_id" "uuid", "p_handles" "text"[]) RETURNS TABLE("handle" "text", "invitation_id" "uuid", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_event public.events%rowtype;
  v_inviter_name text;
  v_handle text;
  v_invitee uuid;
  v_invitation_id uuid;
  v_count integer := coalesce(array_length(p_handles, 1), 0);
begin
  perform app.require_claimed_account();
  if v_count = 0 then return; end if;
  if v_count > 20 then raise exception 'select at most 20 friends' using errcode='22023'; end if;
  if not public.fn_event_is_public_now(p_event_id) then
    raise exception 'event is not publicly available' using errcode='P0002';
  end if;
  if not public.fn_rate_limit('event-invite:' || v_me::text, 30, 3600) then
    raise exception 'rate_limited: too many event invitations' using errcode='P0001';
  end if;

  select e.* into v_event from public.events e where e.id = p_event_id;
  select coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(concat_ws(' ', p.name, p.surname)), ''), h.handle, 'A friend')
    into v_inviter_name
  from public.profiles p
  left join public.user_handles h on h.user_id = p.user_id
  where p.user_id = v_me;

  foreach v_handle in array p_handles loop
    v_handle := lower(regexp_replace(btrim(v_handle), '^@', ''));
    if v_handle = '' then continue; end if;

    select h.user_id into v_invitee
    from public.user_handles h
    where lower(h.handle) = v_handle
    limit 1;

    if v_invitee is null or v_invitee = v_me then continue; end if;

    if not exists (
      select 1 from public.user_connections uc
      where uc.status = 'accepted'::public.connection_status
        and ((uc.requester_id = v_me and uc.recipient_id = v_invitee)
          or (uc.requester_id = v_invitee and uc.recipient_id = v_me))
    ) then continue; end if;

    if exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = v_me and b.blocked_id = v_invitee)
         or (b.blocker_id = v_invitee and b.blocked_id = v_me)
    ) then continue; end if;

    insert into public.event_invitations (
      event_id, inviter_id, invitee_id, status, created_at, updated_at, responded_at
    ) values (
      p_event_id, v_me, v_invitee, 'pending', now(), now(), null
    )
    on conflict (event_id, inviter_id, invitee_id) do update set
      status = 'pending', updated_at = now(), responded_at = null
    returning id into v_invitation_id;

    insert into public.notifications (
      user_id, type, payload, status, attempts, created_at, channel, dedupe_key, read_at
    ) values (
      v_invitee,
      'event_invite',
      jsonb_build_object(
        'title', v_inviter_name || ' invited you to an event',
        'message', 'Join ' || v_inviter_name || ' at ' || v_event.title || '.',
        'eventId', v_event.id,
        'eventSlug', v_event.slug,
        'eventTitle', v_event.title,
        'inviterName', v_inviter_name,
        'invitationId', v_invitation_id
      ),
      'pending', 0, now(), 'in_app',
      'event-invite:' || p_event_id::text || ':' || v_me::text || ':' || v_invitee::text,
      null
    )
    on conflict (dedupe_key) where dedupe_key is not null do update set
      payload = excluded.payload,
      status = 'pending',
      attempts = 0,
      last_error = null,
      created_at = now(),
      scheduled_at = null,
      sent_at = null,
      delivered_at = null,
      channel = 'in_app',
      read_at = null;

    handle := v_handle;
    invitation_id := v_invitation_id;
    status := 'pending';
    return next;
  end loop;
end;
$$;


ALTER FUNCTION "public"."fn_invite_friends_to_event"("p_event_id" "uuid", "p_handles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_is_event_scanner"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
  SELECT exists (
    SELECT 1 FROM public.event_staff es
    WHERE es.event_id = p_event_id
      AND es.user_id = public.current_user_uid()
      AND es.role = 'scanner'::app_role
  );
$$;


ALTER FUNCTION "public"."fn_is_event_scanner"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_is_event_staff"("p_event_id" "uuid", "p_min_role" "public"."app_role" DEFAULT 'organizer_staff'::"public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
  SELECT exists (
    SELECT 1
    FROM public.event_staff es
    WHERE es.event_id = p_event_id
      AND es.user_id = public.current_user_uid()
      AND es.role = ANY(ARRAY['organizer_admin'::app_role,'organizer_staff'::app_role])
  );
$$;


ALTER FUNCTION "public"."fn_is_event_staff"("p_event_id" "uuid", "p_min_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_issue_guestlist"("p_guestlist_entry_id" "uuid", "p_allocate" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_issue_guestlist_unchecked(p_guestlist_entry_id, p_allocate); end; $$;


ALTER FUNCTION "public"."fn_issue_guestlist"("p_guestlist_entry_id" "uuid", "p_allocate" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_issue_guestlist_unchecked"("p_guestlist_entry_id" "uuid", "p_allocate" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_entry public.guestlist_entries%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_tt public.ticket_types%ROWTYPE;
  v_user uuid := (select auth.uid());
  v_fulfilled integer; v_remaining integer; v_qty integer;
  v_buyer uuid; v_order_id uuid; v_currency text;
begin
  select * into v_entry from public.guestlist_entries where id = p_guestlist_entry_id;
  if v_entry.id is null then raise exception 'guestlist_entry_not_found' using errcode = 'P0001'; end if;
  select * into v_event from public.events where id = v_entry.event_id;
  if v_event.id is null then raise exception 'event_not_found' using errcode = 'P0001'; end if;
  if not (
    exists (select 1 from public.event_staff es where es.event_id = v_entry.event_id and es.user_id = v_user and es.active = true)
    or app.is_org_admin_of(v_event.org_id)
    or app.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if v_entry.ticket_type_id is null then raise exception 'no_ticket_type' using errcode = 'P0001'; end if;
  select * into v_tt from public.ticket_types where id = v_entry.ticket_type_id and event_id = v_entry.event_id;
  if v_tt.id is null then raise exception 'ticket_type_not_found' using errcode = 'P0001'; end if;
  select count(*)::integer into v_fulfilled
  from public.guestlist_fulfillments gf join public.order_items oi on oi.order_id = gf.order_id
  where gf.guestlist_entry_id = v_entry.id;
  v_remaining := greatest(0, v_entry.allocation - v_fulfilled);
  if v_remaining <= 0 then raise exception 'already_fulfilled' using errcode = 'P0001'; end if;
  v_qty := least(coalesce(nullif(p_allocate, 0), v_remaining), v_remaining);
  if v_qty <= 0 then raise exception 'invalid_quantity' using errcode = 'P0001'; end if;
  if v_entry.email is not null then
    select id into v_buyer from auth.users where lower(email) = lower(v_entry.email) limit 1;
  end if;
  v_buyer := coalesce(v_buyer, v_entry.created_by, v_user);
  if v_buyer is null then raise exception 'no_buyer' using errcode = 'P0001'; end if;
  v_currency := coalesce(v_tt.currency, v_event.currency, 'SZL');
  insert into public.orders (org_id, buyer_id, total_cents, subtotal_cents, item_count, currency, status, channel, email, phone, buyer_email)
  values (v_event.org_id, v_buyer, 0, 0, v_qty, v_currency, 'paid', 'online', v_entry.email, v_entry.phone, v_entry.email)
  returning id into v_order_id;
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status, name, holder_name, holder_email, holder_phone)
  select v_order_id, v_tt.id, gen_random_uuid()::text, 'issued', v_tt.name, v_entry.full_name, v_entry.email, v_entry.phone
  from generate_series(1, v_qty);
  insert into public.guestlist_fulfillments (guestlist_entry_id, order_id)
  select v_entry.id, v_order_id from generate_series(1, v_qty);
  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (v_event.org_id, v_user, 'guestlist_fulfillments', v_entry.id::text, 'insert',
    jsonb_build_object('event_id', v_entry.event_id, 'guestlist_entry_id', v_entry.id, 'order_id', v_order_id,
      'ticket_type_id', v_tt.id, 'quantity', v_qty, 'buyer_id', v_buyer, 'holder_name', v_entry.full_name));
  return jsonb_build_object('order_id', v_order_id, 'quantity', v_qty, 'fulfilled_count', v_fulfilled + v_qty, 'remaining_count', v_remaining - v_qty);
end;
$$;


ALTER FUNCTION "public"."fn_issue_guestlist_unchecked"("p_guestlist_entry_id" "uuid", "p_allocate" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_link_event_artist_by_name"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text" DEFAULT NULL::"text", "p_bio" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_link_event_artist_by_name_unchecked(p_event_id, p_artist_name, p_role, p_bio, p_image_url); end; $$;


ALTER FUNCTION "public"."fn_link_event_artist_by_name"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text", "p_bio" "text", "p_image_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_link_event_artist_by_name_unchecked"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text" DEFAULT NULL::"text", "p_bio" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := auth.uid();
  v_org_id uuid;
  v_artist_id uuid;
begin
  select org_id into v_org_id from public.events where id = p_event_id;

  if v_org_id is null then
    raise exception 'Event not found';
  end if;

  if v_user is null or not public.can_manage_org(v_org_id, v_user) then
    raise exception 'Not allowed for this event';
  end if;

  v_artist_id := public.fn_get_or_create_artist(p_artist_name, p_bio, p_image_url);

  insert into public.event_artists (event_id, artist_id, role)
  values (p_event_id, v_artist_id, p_role)
  on conflict (event_id, artist_id) do update
    set role = coalesce(excluded.role, public.event_artists.role);

  return v_artist_id;
end;
$$;


ALTER FUNCTION "public"."fn_link_event_artist_by_name_unchecked"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text", "p_bio" "text", "p_image_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_list_my_order_totals"("limit_rows" integer DEFAULT 50, "offset_rows" integer DEFAULT 0) RETURNS SETOF "public"."order_totals"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  SELECT
    o.id,
    o.currency,
    COALESCE(o.item_count, 0),
    COALESCE(o.subtotal_cents, 0),
    COALESCE(o.platform_fee_cents, 0),
    COALESCE(o.processor_fee_cents, 0),
    COALESCE(o.total_cents, 0),
    o.totals_computed_at
  FROM public.orders o
  WHERE o.buyer_id = public.current_user_uid()
  ORDER BY o.created_at DESC
  LIMIT GREATEST(limit_rows, 0)
  OFFSET GREATEST(offset_rows, 0);
$$;


ALTER FUNCTION "public"."fn_list_my_order_totals"("limit_rows" integer, "offset_rows" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_lookup_transfer_recipient"("p_identifier" "text") RETURNS TABLE("user_id" "uuid", "display_name" "text", "handle" "text", "match_kind" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_actor_id uuid := auth.uid();
  v_input text := trim(coalesce(p_identifier,''));
  v_digits text;
  v_user_id uuid;
  v_kind text;
begin
  perform app.require_claimed_account();

  if length(v_input) < 3 then
    return;
  end if;

  if not public.fn_rate_limit('transfer_lookup:'||v_actor_id::text,60,3600) then
    raise exception 'rate_limited: too many recipient lookups, please try again later' using errcode='P0001';
  end if;

  if left(v_input,1)='@' then
    select uh.user_id into v_user_id
    from public.user_handles uh
    join auth.users u on u.id=uh.user_id
    where lower(uh.handle)=lower(substr(v_input,2))
      and coalesce(u.is_anonymous,false)=false
    limit 1;
    v_kind := 'handle';
  elsif position('@' in v_input)>1 then
    select u.id into v_user_id
    from auth.users u
    where lower(u.email)=lower(v_input)
      and coalesce(u.is_anonymous,false)=false
    limit 1;
    v_kind := 'email';
  else
    v_digits := regexp_replace(v_input,'[^0-9]','','g');
    if length(v_digits)>=8 then
      select u.id into v_user_id
      from auth.users u
      where regexp_replace(coalesce(u.phone,''),'[^0-9]','','g')=v_digits
        and coalesce(u.is_anonymous,false)=false
      limit 1;
      v_kind := 'phone';
    end if;
  end if;

  if v_user_id is null or v_user_id=v_actor_id then
    return;
  end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id=v_actor_id and b.blocked_id=v_user_id)
       or (b.blocker_id=v_user_id and b.blocked_id=v_actor_id)
  ) then
    return;
  end if;

  return query
  select v_user_id,
         coalesce(nullif(trim(p.display_name),''),nullif(trim(concat_ws(' ',p.name,p.surname)),''),uh.handle,'Ticketiv user')::text,
         uh.handle::text,
         v_kind
  from (select 1) seed
  left join public.profiles p on p.user_id=v_user_id
  left join public.user_handles uh on uh.user_id=v_user_id;
end;
$$;


ALTER FUNCTION "public"."fn_lookup_transfer_recipient"("p_identifier" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_match_friend_contacts"("p_phones" "text"[]) RETURNS TABLE("input_index" integer, "handle" "text", "display_name" "text", "avatar_url" "text", "relationship_state" "text", "can_request" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_count integer := coalesce(array_length(p_phones, 1), 0);
begin
  if v_me is null then raise exception 'authentication required' using errcode = '42501'; end if;
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


ALTER FUNCTION "public"."fn_match_friend_contacts"("p_phones" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_match_friend_contacts"("p_phones" "text"[]) IS 'TICK-386: transiently matches user-selected phone contacts. Never returns or persists phone values.';



CREATE OR REPLACE FUNCTION "public"."fn_mint_tickets"("p_order_item_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
BEGIN
  -- stub: minting logic placeholder
  RETURN;
END; $$;


ALTER FUNCTION "public"."fn_mint_tickets"("p_order_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_my_friends_going"("p_event_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 200) RETURNS TABLE("event_id" "uuid", "friend_id" "uuid", "friend_name" "text", "friend_handle" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 500));
begin
  perform app.require_claimed_account();

  if p_event_ids is not null and cardinality(p_event_ids) > 50 then
    raise exception 'select at most 50 events' using errcode='22023';
  end if;

  return query
  with my_friends as (
    select case
      when uc.requester_id = v_me then uc.recipient_id
      else uc.requester_id
    end as friend_user_id
    from public.user_connections uc
    where uc.status = 'accepted'::public.connection_status
      and (uc.requester_id = v_me or uc.recipient_id = v_me)
  ),
  ticket_attendance as (
    select distinct
      tt.event_id,
      coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) as attendee_id
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.events e on e.id = tt.event_id
    where o.status = 'paid'::public.order_status
      and oi.revoked_at is null
      and oi.refunded_at is null
      and oi.status in (
        'issued'::public.order_item_status,
        'transferred'::public.order_item_status,
        'checked_in'::public.order_item_status
      )
      and coalesce(oi.current_owner_id, oi.holder_user_id, o.buyer_id) is not null
      and (p_event_ids is null or tt.event_id = any(p_event_ids))
      and (p_from is null or e.starts_at >= p_from)
      and public.fn_event_is_public_now(tt.event_id)
  )
  select distinct
    ta.event_id,
    p.user_id as friend_id,
    coalesce(
      nullif(btrim(concat_ws(' ', p.name, p.surname)), ''),
      nullif(btrim(p.display_name), ''),
      uh.handle,
      'Friend'
    ) as friend_name,
    uh.handle as friend_handle
  from ticket_attendance ta
  join my_friends mf on mf.friend_user_id = ta.attendee_id
  join public.profiles p on p.user_id = ta.attendee_id
  left join public.user_handles uh on uh.user_id = p.user_id
  left join public.user_privacy_settings ps on ps.user_id = p.user_id
  where coalesce(ps.show_events_going_to_friends, true)
    and not exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = v_me and b.blocked_id = p.user_id)
         or (b.blocker_id = p.user_id and b.blocked_id = v_me)
    )
  order by friend_name, event_id
  limit v_limit;
end;
$$;


ALTER FUNCTION "public"."fn_my_friends_going"("p_event_ids" "uuid"[], "p_from" timestamp with time zone, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_my_waitlist_positions"() RETURNS TABLE("waitlist_id" "uuid", "position" bigint, "queue_length" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with ranked as (
    select
      id,
      row_number() over (
        partition by event_id, ticket_type_id
        order by joined_at asc
      ) as position,
      count(*) over (
        partition by event_id, ticket_type_id
      ) as queue_length
    from public.waitlists
    where status = 'waiting'
  )
  select
    r.id as waitlist_id,
    r.position,
    r.queue_length
  from ranked r
  inner join public.waitlists w on w.id = r.id
  where w.user_id = (select auth.uid())
    and w.status = 'waiting';
$$;


ALTER FUNCTION "public"."fn_my_waitlist_positions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_normalize_email"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog'
    AS $$
  select nullif(lower(btrim(coalesce(p, ''))), '')
$$;


ALTER FUNCTION "public"."fn_normalize_email"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_normalize_phone"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog'
    AS $$
  select nullif(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), '')
$$;


ALTER FUNCTION "public"."fn_normalize_phone"("p" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "order_id" "uuid",
    "payment_id" "uuid",
    "raised_by" "uuid",
    "kind" "public"."dispute_kind" DEFAULT 'other'::"public"."dispute_kind" NOT NULL,
    "status" "public"."dispute_status" DEFAULT 'open'::"public"."dispute_status" NOT NULL,
    "reason" "text",
    "amount_cents" integer,
    "currency" "text",
    "assigned_to" "uuid",
    "resolution" "text",
    "refund_id" "uuid",
    "dedupe_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."disputes" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_open_dispute"("p_kind" "public"."dispute_kind", "p_order_id" "uuid" DEFAULT NULL::"uuid", "p_payment_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text", "p_amount_cents" integer DEFAULT NULL::integer, "p_raised_by" "uuid" DEFAULT NULL::"uuid", "p_dedupe_key" "text" DEFAULT NULL::"text") RETURNS "public"."disputes"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_row public.disputes; v_org uuid; v_currency text; v_amount integer := p_amount_cents;
  v_order_id uuid := p_order_id; v_key text := nullif(trim(coalesce(p_dedupe_key,'')),'');
begin
  if p_order_id is null and p_payment_id is null then
    raise exception 'order_or_payment_required' using errcode='P0001';
  end if;
  if v_order_id is null and p_payment_id is not null then
    select order_id into v_order_id from public.payments where id = p_payment_id;
  end if;
  select o.org_id, o.currency, coalesce(v_amount, o.total_cents)
    into v_org, v_currency, v_amount from public.orders o where o.id = v_order_id;
  if v_key is not null then
    select * into v_row from public.disputes where dedupe_key = v_key;
    if found then return v_row; end if;
  end if;
  insert into public.disputes (org_id, order_id, payment_id, raised_by, kind, status, reason, amount_cents, currency, dedupe_key)
  values (v_org, v_order_id, p_payment_id, p_raised_by, p_kind, 'open',
          nullif(trim(coalesce(p_reason,'')),''), v_amount, v_currency, v_key)
  on conflict (dedupe_key) do update set updated_at = now()
  returning * into v_row;
  return v_row;
end; $$;


ALTER FUNCTION "public"."fn_open_dispute"("p_kind" "public"."dispute_kind", "p_order_id" "uuid", "p_payment_id" "uuid", "p_reason" "text", "p_amount_cents" integer, "p_raised_by" "uuid", "p_dedupe_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "cashier_user_id" "uuid" NOT NULL,
    "device_id" "uuid",
    "device_session_id" "uuid",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "opening_cash_cents" integer DEFAULT 0 NOT NULL,
    "expected_cash_cents" integer,
    "closing_cash_cents" integer,
    "cash_variance_cents" integer,
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "opened_by" "uuid" NOT NULL,
    "closed_at" timestamp with time zone,
    "closed_by" "uuid",
    "opening_notes" "text",
    "closing_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pos_shifts_close_state" CHECK (((("status" = 'open'::"text") AND ("closed_at" IS NULL) AND ("closed_by" IS NULL) AND ("closing_cash_cents" IS NULL) AND ("cash_variance_cents" IS NULL)) OR (("status" = 'closed'::"text") AND ("closed_at" IS NOT NULL) AND ("closed_by" IS NOT NULL) AND ("closing_cash_cents" IS NOT NULL) AND ("expected_cash_cents" IS NOT NULL) AND ("cash_variance_cents" IS NOT NULL)))),
    CONSTRAINT "pos_shifts_closing_cash_cents_check" CHECK ((("closing_cash_cents" IS NULL) OR ("closing_cash_cents" >= 0))),
    CONSTRAINT "pos_shifts_expected_cash_cents_check" CHECK ((("expected_cash_cents" IS NULL) OR ("expected_cash_cents" >= 0))),
    CONSTRAINT "pos_shifts_opening_cash_cents_check" CHECK (("opening_cash_cents" >= 0)),
    CONSTRAINT "pos_shifts_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."pos_shifts" OWNER TO "postgres";


COMMENT ON TABLE "public"."pos_shifts" IS 'Controlled cashier/outlet shift lifecycle and reconciliation for Ticketiv POS sales.';



CREATE OR REPLACE FUNCTION "public"."fn_open_pos_shift"("p_org_id" "uuid", "p_device_id" "uuid" DEFAULT NULL::"uuid", "p_device_session_id" "uuid" DEFAULT NULL::"uuid", "p_opening_cash_cents" integer DEFAULT 0, "p_notes" "text" DEFAULT NULL::"text") RETURNS "public"."pos_shifts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_actor uuid := auth.uid();
  v_shift public.pos_shifts;
  v_device_org uuid;
  v_device_role public.device_role;
  v_session_device uuid;
  v_session_user uuid;
  v_session_ended timestamptz;
begin
  perform app.require_claimed_account();

  if p_org_id is null then
    raise exception 'org_id_required' using errcode = '22023';
  end if;

  if coalesce(p_opening_cash_cents, 0) < 0 then
    raise exception 'invalid_opening_cash' using errcode = '22023';
  end if;

  if not public.user_has_org_role(
    p_org_id,
    array['admin','organizer','organizer_owner','organizer_admin','organizer_staff','pos']
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_device_session_id is not null and p_device_id is null then
    raise exception 'device_required_for_session' using errcode = '22023';
  end if;

  if p_device_id is not null then
    select d.org_id, d.device_role
      into v_device_org, v_device_role
    from public.devices d
    where d.id = p_device_id;

    if v_device_org is null then
      raise exception 'device_not_found' using errcode = 'P0002';
    end if;

    if v_device_org <> p_org_id then
      raise exception 'device_not_in_org' using errcode = '42501';
    end if;

    if v_device_role not in ('organizer_pos'::public.device_role, 'organizer_kiosk'::public.device_role) then
      raise exception 'device_not_pos_capable' using errcode = '22023';
    end if;
  end if;

  if p_device_session_id is not null then
    select ds.device_id, ds.user_id, ds.ended_at
      into v_session_device, v_session_user, v_session_ended
    from public.device_sessions ds
    where ds.id = p_device_session_id;

    if v_session_device is null then
      raise exception 'device_session_not_found' using errcode = 'P0002';
    end if;

    if v_session_device <> p_device_id then
      raise exception 'device_session_mismatch' using errcode = '42501';
    end if;

    if v_session_ended is not null then
      raise exception 'device_session_closed' using errcode = '55000';
    end if;

    if v_session_user is not null and v_session_user <> v_actor then
      raise exception 'device_session_owned_by_another_user' using errcode = '42501';
    end if;
  end if;

  insert into public.pos_shifts (
    org_id,
    cashier_user_id,
    device_id,
    device_session_id,
    opening_cash_cents,
    opened_by,
    opening_notes
  )
  values (
    p_org_id,
    v_actor,
    p_device_id,
    p_device_session_id,
    coalesce(p_opening_cash_cents, 0),
    v_actor,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_shift;

  insert into public.audit_log(org_id, actor_id, table_name, record_id, action, changes)
  values (
    p_org_id,
    v_actor,
    'pos_shifts',
    v_shift.id::text,
    'other',
    jsonb_build_object(
      'event_type', 'pos_shift_open',
      'opening_cash_cents', v_shift.opening_cash_cents,
      'device_id', v_shift.device_id,
      'device_session_id', v_shift.device_session_id
    )
  );

  return v_shift;
exception
  when unique_violation then
    raise exception 'pos_shift_already_open' using errcode = '23505';
end;
$$;


ALTER FUNCTION "public"."fn_open_pos_shift"("p_org_id" "uuid", "p_device_id" "uuid", "p_device_session_id" "uuid", "p_opening_cash_cents" integer, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_ops_alerts_tick"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_url          text;
  v_secret       text;
  v_request_id   bigint;
  v_resolved     integer := 0;
  v_prev_failure text;
begin
  with resolved as (
    update public.ops_cron_runs r
       set status_code = resp.status_code,
           ok          = (resp.status_code between 200 and 299),
           error       = nullif(resp.error_msg, ''),
           resolved_at = now()
      from net._http_response resp
     where resp.id = r.request_id
       and r.job = 'ops-alerts'
       and r.resolved_at is null
    returning r.ok, r.status_code, r.error
  )
  select count(*),
         max(case
               when coalesce(ok, false) then null
               else coalesce(error, 'HTTP ' || coalesce(status_code::text, 'no response'))
             end)
    from resolved
    into v_resolved, v_prev_failure;

  select decrypted_secret into v_url
    from vault.decrypted_secrets
   where name = 'ops_alert_cron_url';

  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'ops_alert_cron_secret';

  if v_url is null or v_secret is null then
    raise exception 'ops alerts cron is not configured: missing vault secret(s) %',
      concat_ws(', ',
        case when v_url is null then 'ops_alert_cron_url' end,
        case when v_secret is null then 'ops_alert_cron_secret' end)
      using errcode = 'P0001',
            hint = 'Seed them with vault.create_secret(<value>, <name>).';
  end if;

  select net.http_get(
           url                  => v_url,
           headers              => jsonb_build_object(
                                     'Authorization', 'Bearer ' || v_secret,
                                     'User-Agent',    'ticketiv-pg-cron/1'
                                   ),
           timeout_milliseconds => 30000
         )
    into v_request_id;

  insert into public.ops_cron_runs (job, request_id)
  values ('ops-alerts', v_request_id);

  delete from public.ops_cron_runs
   where requested_at < now() - interval '30 days';

  return jsonb_build_object(
    'job',               'ops-alerts',
    'request_id',        v_request_id,
    'resolved_previous', v_resolved,
    'previous_failure',  v_prev_failure
  );
end;
$$;


ALTER FUNCTION "public"."fn_ops_alerts_tick"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_ops_alerts_tick"() IS 'pg_cron entry point for the ops-alerts endpoint (every 5 min). Resolves the previous delivery, reads URL/secret from Vault, calls the endpoint via pg_net, and logs the request to ops_cron_runs. Also the manual trigger that replaced the workflow_dispatch button.';



CREATE OR REPLACE FUNCTION "public"."fn_ops_reconciliation_counts"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select jsonb_build_object(
    'succeeded_payment_order_not_paid', (
      select count(*) from public.payments p
      join public.orders o on o.id = p.order_id
      where p.status = 'succeeded' and o.status <> 'paid'),
    'paid_order_no_settlement_ledger', (
      select count(*) from public.orders o
      where o.status = 'paid'
        and not exists (
          select 1 from public.ledger_entries le
          where le.order_id = o.id and le.payment_id is not null and le.type = 'order_gross')),
    'settlement_ledger_invariant_broken', (
      select count(*) from (
        select payment_id from public.ledger_entries
        where payment_id is not null
        group by payment_id
        having coalesce(sum(amount_cents) filter (where type = 'order_gross'), 0)
             + coalesce(sum(amount_cents) filter (where type = 'fee'), 0)
            <> coalesce(sum(amount_cents) filter (where type = 'payment_net'), 0)
      ) broken),
    'paid_order_items_pending', (
      select count(distinct o.id) from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.status = 'paid' and oi.status = 'pending'),
    'duplicate_succeeded_payments', (
      select count(*) from (
        select order_id from public.payments where status = 'succeeded'
        group by order_id having count(*) > 1
      ) dup),
    'processed_refund_no_ledger', (
      select count(*) from public.refunds r
      where r.status = 'processed'
        and not exists (
          select 1 from public.ledger_entries le
          where le.payment_id = r.payment_id and le.type = 'refund')),
    'pending_order_with_succeeded_payment', (
      select count(distinct o.id) from public.orders o
      join public.payments p on p.order_id = o.id
      where o.status = 'pending' and p.status = 'succeeded'
        and o.created_at < now() - interval '2 hours'),
    'issued_ticket_on_unpaid_order', (
      select count(*) from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.status in ('issued', 'transferred', 'checked_in') and o.status <> 'paid'),
    'creation_time_ledger_pollution', (
      select count(*) from public.ledger_entries
      where payment_id is null and type in ('order_gross', 'fee')),
    'payout_overdraw_orgs', (
      with settled as (
        select org_id,
               coalesce(sum(amount_cents) filter (where type = 'payment_net'), 0) as net,
               coalesce(sum(amount_cents) filter (where type = 'refund'), 0)      as refunds
        from public.ledger_entries group by org_id),
      committed as (
        select org_id,
               coalesce(sum(amount_cents) filter (where status in ('requested', 'processing', 'paid')), 0) as payouts
        from public.payouts group by org_id)
      select count(*) from settled s join committed c on c.org_id = s.org_id
      where c.payouts > (s.net - s.refunds)),
    'failed_payouts', (
      select count(*) from public.payouts where status = 'failed'),
    'stuck_payment_outbox', (
      select count(*) from public.payment_outbox
      where status = 'pending'
        and coalesce(available_at, created_at) < now() - interval '15 minutes'),
    'stuck_notifications', (
      select count(*) from public.notifications
      where coalesce(channel, 'in_app') <> 'in_app'
        and status in ('pending', 'failed')
        and coalesce(scheduled_at, created_at) < now() - interval '30 minutes'),
    'deadletter_jobs', (
      select count(*) from public.jobs
      where max_attempts > 0 and attempts >= max_attempts)
  );
$$;


ALTER FUNCTION "public"."fn_ops_reconciliation_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_org_finance_summary"("p_org_id" "uuid", "p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_org_finance_summary_unchecked(p_org_id, p_from, p_to); end; $$;


ALTER FUNCTION "public"."fn_org_finance_summary"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_org_finance_summary_unchecked"("p_org_id" "uuid", "p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_currency text;
  v_gross integer := 0;
  v_fees integer := 0;
  v_net integer := 0;
  v_refunds integer := 0;
  v_committed integer := 0;
  v_pending integer := 0;
  v_paid integer := 0;
  v_captured_available integer := 0;
  v_settled_net integer := 0;
  v_available integer := 0;
  v_pending_settlement integer := 0;
  v_settlement_hold_days integer := 4;
  v_settlement_cutoff timestamptz := now() - make_interval(days => v_settlement_hold_days);
begin
  if p_org_id is null then
    raise exception 'org_id_required' using errcode = 'P0001';
  end if;

  if not public.is_org_finance_viewer(p_org_id) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  select coalesce(default_currency, 'SZL') into v_currency
  from public.organizations where id = p_org_id;
  v_currency := coalesce(v_currency, 'SZL');

  select
    coalesce(sum(amount_cents) filter (where type = 'order_gross'), 0),
    coalesce(sum(abs(amount_cents)) filter (where type = 'fee'), 0),
    coalesce(sum(amount_cents) filter (where type = 'payment_net'), 0),
    coalesce(sum(amount_cents) filter (where type in ('refund', 'reversal')), 0),
    coalesce(sum(amount_cents) filter (where type = 'payment_net' and occurred_at <= v_settlement_cutoff), 0)
  into v_gross, v_fees, v_net, v_refunds, v_settled_net
  from public.ledger_entries
  where org_id = p_org_id
    and (p_from is null or occurred_at >= p_from)
    and (p_to   is null or occurred_at <  p_to + interval '1 day');

  -- Payout figures are not date-scoped; they reflect committed outflow.
  select
    coalesce(sum(amount_cents) filter (where status in ('requested', 'processing', 'paid')), 0),
    coalesce(sum(amount_cents) filter (where status in ('requested', 'processing')), 0),
    coalesce(sum(amount_cents) filter (where status = 'paid'), 0)
  into v_committed, v_pending, v_paid
  from public.payouts
  where org_id = p_org_id;

  v_captured_available := greatest(0, v_net - v_refunds - v_committed);
  v_available := greatest(0, v_settled_net - v_refunds - v_committed);
  v_pending_settlement := greatest(0, v_captured_available - v_available);

  return jsonb_build_object(
    'currency', v_currency,
    'gross_cents', v_gross,
    'fees_cents', v_fees,
    'net_cents', v_net,
    'refunds_cents', v_refunds,
    'paid_out_cents', v_paid,
    'pending_payout_cents', v_pending,
    'available_cents', v_available,
    'captured_available_cents', v_captured_available,
    'settled_net_cents', v_settled_net,
    'pending_settlement_cents', v_pending_settlement,
    'settlement_hold_days', v_settlement_hold_days,
    'settlement_cutoff', v_settlement_cutoff
  );
end;
$$;


ALTER FUNCTION "public"."fn_org_finance_summary_unchecked"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_payment_routing_rules_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin new.updated_at := now(); return new; end
$$;


ALTER FUNCTION "public"."fn_payment_routing_rules_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_pos_charge"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text" DEFAULT NULL::"text", "p_buyer_email" "text" DEFAULT NULL::"text", "p_buyer_phone" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_pos_charge_unchecked(p_event_id, p_items, p_payment_method, p_buyer_name, p_buyer_email, p_buyer_phone); end; $$;


ALTER FUNCTION "public"."fn_pos_charge"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_pos_charge_unchecked"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text" DEFAULT NULL::"text", "p_buyer_email" "text" DEFAULT NULL::"text", "p_buyer_phone" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_caller uuid := auth.uid();
  v_org_id uuid;
  v_authorized boolean;
  v_created jsonb;
  v_order jsonb;
  v_order_id uuid;
  v_total int;
  v_currency text;
  v_is_comp boolean := lower(p_payment_method) = 'comp';
begin
  if v_caller is null then
    raise exception 'auth required';
  end if;

  if p_payment_method is null
     or lower(p_payment_method) not in ('cash', 'upi', 'card', 'comp')
  then
    raise exception 'invalid payment method: %', p_payment_method;
  end if;

  select org_id into v_org_id
  from public.events
  where id = p_event_id;

  if v_org_id is null then
    raise exception 'event not found';
  end if;

  -- Caller must be an org member with a POS-capable role. We trust
  -- user_has_org_role for the check (it lives in the existing RBAC layer).
  select public.user_has_org_role(
    v_org_id,
    array[
      'admin',
      'organizer',
      'organizer_owner',
      'organizer_admin',
      'organizer_staff',
      'pos'
    ]
  ) into v_authorized;

  if not coalesce(v_authorized, false) then
    raise exception 'not authorized to charge at box office';
  end if;

  -- Create the inventory-protected order. The caller (staff) is the
  -- buyer-of-record; holder name comes from p_buyer_name if supplied.
  select jsonb_build_object(
           'order_row', created.order_row,
           'order_items', created.order_items
         )
    into v_created
  from public.fn_create_inventory_protected_order(
    p_event_id  := p_event_id,
    p_buyer_id  := v_caller,
    p_buyer_email := coalesce(p_buyer_email, ''),
    p_items     := p_items,
    p_holder_name := p_buyer_name
  ) as created;

  v_order := v_created -> 'order_row';
  if v_order is null then
    raise exception 'order RPC returned no order';
  end if;

  v_order_id := (v_order ->> 'id')::uuid;
  v_total    := coalesce((v_order ->> 'total_cents')::int, 0);
  v_currency := coalesce(v_order ->> 'currency', 'SZL');

  -- Mark the channel + buyer contact directly on the order.
  update public.orders
     set channel = 'pos',
         buyer_email = coalesce(nullif(p_buyer_email, ''), buyer_email),
         buyer_phone = coalesce(nullif(p_buyer_phone, ''), buyer_phone)
   where id = v_order_id;

  -- Record the immediate at-the-door payment in one transaction.
  insert into public.payments(
    order_id, provider, amount_cents, currency, status, channel, payload
  )
  values (
    v_order_id,
    lower(p_payment_method),
    case when v_is_comp then 0 else v_total end,
    v_currency,
    'succeeded',
    'pos',
    jsonb_build_object(
      'source', 'pos',
      'buyer', jsonb_build_object('name', p_buyer_name, 'email', p_buyer_email, 'phone', p_buyer_phone),
      'method', lower(p_payment_method)
    )
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'total_cents', v_total,
    'currency', v_currency,
    'channel', 'pos',
    'payment_method', lower(p_payment_method),
    'order', v_order,
    'order_items', v_created -> 'order_items'
  );
end
$$;


ALTER FUNCTION "public"."fn_pos_charge_unchecked"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_pos_charge_unchecked"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") IS 'Transactional box-office charge: create inventory-protected order + mark channel=pos + insert succeeded payment, in a single transaction.';



CREATE OR REPLACE FUNCTION "public"."fn_pos_charge_with_shift"("p_shift_id" "uuid", "p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text" DEFAULT NULL::"text", "p_buyer_email" "text" DEFAULT NULL::"text", "p_buyer_phone" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_shift public.pos_shifts;
  v_event_org uuid;
  v_result jsonb;
  v_order_id uuid;
  v_actor uuid := auth.uid();
begin
  perform app.require_claimed_account();

  select * into v_shift
  from public.pos_shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'pos_shift_not_found' using errcode = 'P0002';
  end if;

  if v_shift.status <> 'open' then
    raise exception 'pos_shift_closed' using errcode = '55000';
  end if;

  if v_shift.cashier_user_id <> v_actor then
    raise exception 'not_shift_cashier' using errcode = '42501';
  end if;

  select e.org_id into v_event_org
  from public.events e
  where e.id = p_event_id;

  if v_event_org is null then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;

  if v_event_org <> v_shift.org_id then
    raise exception 'event_not_in_shift_org' using errcode = '42501';
  end if;

  if v_shift.device_session_id is not null and exists (
    select 1 from public.device_sessions ds
    where ds.id = v_shift.device_session_id and ds.ended_at is not null
  ) then
    raise exception 'device_session_closed' using errcode = '55000';
  end if;

  v_result := public.fn_pos_charge_unchecked(
    p_event_id,
    p_items,
    p_payment_method,
    p_buyer_name,
    p_buyer_email,
    p_buyer_phone
  );

  v_order_id := (v_result ->> 'order_id')::uuid;

  update public.orders
  set pos_shift_id = v_shift.id,
      cashier_user_id = v_actor,
      device_id = coalesce(v_shift.device_id, device_id),
      device_session_id = v_shift.device_session_id
  where id = v_order_id;

  update public.payments
  set payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
    'pos_shift_id', v_shift.id,
    'cashier_user_id', v_actor,
    'device_id', v_shift.device_id,
    'device_session_id', v_shift.device_session_id
  )
  where order_id = v_order_id;

  insert into public.audit_log(org_id, actor_id, table_name, record_id, action, changes)
  values (
    v_shift.org_id,
    v_actor,
    'orders',
    v_order_id::text,
    'other',
    jsonb_build_object(
      'event_type', 'pos_sale',
      'pos_shift_id', v_shift.id,
      'payment_method', lower(p_payment_method),
      'device_id', v_shift.device_id,
      'device_session_id', v_shift.device_session_id
    )
  );

  return v_result || jsonb_build_object(
    'pos_shift_id', v_shift.id,
    'cashier_user_id', v_actor,
    'device_id', v_shift.device_id,
    'device_session_id', v_shift.device_session_id
  );
end;
$$;


ALTER FUNCTION "public"."fn_pos_charge_with_shift"("p_shift_id" "uuid", "p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_pos_charge_with_shift"("p_shift_id" "uuid", "p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") IS 'Shift-aware POS charge that reuses the canonical inventory-protected order/payment flow and adds cashier/device attribution.';



CREATE OR REPLACE FUNCTION "public"."fn_pos_receipt"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_actor uuid := auth.uid();
  v_order public.orders;
  v_shift public.pos_shifts;
  v_event record;
  v_payment record;
  v_items jsonb;
  v_buyer_name text;
begin
  perform app.require_claimed_account();

  select * into v_order
  from public.orders
  where id = p_order_id and channel = 'pos';

  if not found or v_order.pos_shift_id is null then
    raise exception 'pos_receipt_not_found' using errcode = 'P0002';
  end if;

  select * into v_shift
  from public.pos_shifts
  where id = v_order.pos_shift_id;

  if not (
    v_shift.cashier_user_id = v_actor
    or app.is_org_manager(v_order.org_id)
    or app.is_org_finance_viewer(v_order.org_id)
    or app.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select e.id, e.title, e.starts_at, e.tz, e.city
    into v_event
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.events e on e.id = tt.event_id
  where oi.order_id = p_order_id
  limit 1;

  select p.provider, p.amount_cents, p.currency, p.created_at
    into v_payment
  from public.payments p
  where p.order_id = p_order_id and p.status = 'succeeded'
  order by p.created_at desc nulls last
  limit 1;

  select coalesce(jsonb_agg(line order by line->>'ticket_name'), '[]'::jsonb)
    into v_items
  from (
    select jsonb_build_object(
      'ticket_type_id', tt.id,
      'ticket_name', tt.name,
      'quantity', count(*),
      'unit_price_cents', tt.price_cents,
      'line_total_cents', tt.price_cents * count(*),
      'ticket_codes', jsonb_agg(oi.ticket_code order by oi.created_at)
    ) as line
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    where oi.order_id = p_order_id
    group by tt.id, tt.name, tt.price_cents
  ) grouped;

  select nullif(max(oi.holder_name), '') into v_buyer_name
  from public.order_items oi
  where oi.order_id = p_order_id;

  return jsonb_build_object(
    'receipt_reference', 'TIV-' || upper(substr(replace(v_order.id::text, '-', ''), 1, 10)),
    'order_id', v_order.id,
    'order_created_at', v_order.created_at,
    'org_id', v_order.org_id,
    'shift_id', v_order.pos_shift_id,
    'cashier_user_id', v_order.cashier_user_id,
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'starts_at', v_event.starts_at,
      'timezone', v_event.tz,
      'city', v_event.city
    ),
    'buyer', jsonb_build_object(
      'name', v_buyer_name,
      'email', coalesce(v_order.buyer_email, v_order.email),
      'phone', coalesce(v_order.buyer_phone, v_order.phone)
    ),
    'payment', jsonb_build_object(
      'method', v_payment.provider,
      'amount_cents', coalesce(v_payment.amount_cents, v_order.total_cents),
      'currency', coalesce(v_payment.currency, v_order.currency),
      'paid_at', coalesce(v_payment.created_at, v_order.created_at)
    ),
    'items', v_items,
    'item_count', coalesce(v_order.item_count, jsonb_array_length(v_items)),
    'subtotal_cents', coalesce(v_order.subtotal_cents, v_order.total_cents),
    'platform_fee_cents', coalesce(v_order.platform_fee_cents, 0),
    'processor_fee_cents', coalesce(v_order.processor_fee_cents, 0),
    'total_cents', v_order.total_cents,
    'currency', v_order.currency
  );
end;
$$;


ALTER FUNCTION "public"."fn_pos_receipt"("p_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_pos_receipt"("p_order_id" "uuid") IS 'Returns an authorization-scoped printable receipt payload for a POS order.';



CREATE OR REPLACE FUNCTION "public"."fn_pos_shift_summary"("p_shift_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_shift public.pos_shifts;
  v_order_count integer := 0;
  v_gross_sales integer := 0;
  v_cash_sales integer := 0;
  v_card_sales integer := 0;
  v_upi_sales integer := 0;
  v_comp_sales integer := 0;
  v_other_sales integer := 0;
  v_cash_refunds integer := 0;
  v_total_refunds integer := 0;
  v_expected_cash integer := 0;
begin
  perform app.require_claimed_account();

  select * into v_shift
  from public.pos_shifts
  where id = p_shift_id;

  if not found then
    raise exception 'pos_shift_not_found' using errcode = 'P0002';
  end if;

  if not (
    v_shift.cashier_user_id = auth.uid()
    or app.is_org_manager(v_shift.org_id)
    or app.is_org_finance_viewer(v_shift.org_id)
    or app.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select count(*), coalesce(sum(o.total_cents), 0)
    into v_order_count, v_gross_sales
  from public.orders o
  where o.pos_shift_id = p_shift_id;

  select
    coalesce(sum(p.amount_cents) filter (where lower(p.provider) = 'cash' and p.status = 'succeeded'), 0),
    coalesce(sum(p.amount_cents) filter (where lower(p.provider) = 'card' and p.status = 'succeeded'), 0),
    coalesce(sum(p.amount_cents) filter (where lower(p.provider) = 'upi' and p.status = 'succeeded'), 0),
    coalesce(sum(p.amount_cents) filter (where lower(p.provider) = 'comp' and p.status = 'succeeded'), 0),
    coalesce(sum(p.amount_cents) filter (where lower(p.provider) not in ('cash','card','upi','comp') and p.status = 'succeeded'), 0)
  into v_cash_sales, v_card_sales, v_upi_sales, v_comp_sales, v_other_sales
  from public.payments p
  join public.orders o on o.id = p.order_id
  where o.pos_shift_id = p_shift_id;

  select
    coalesce(sum(r.amount_cents) filter (where lower(p.provider) = 'cash' and r.status = 'processed'), 0),
    coalesce(sum(r.amount_cents) filter (where r.status = 'processed'), 0)
  into v_cash_refunds, v_total_refunds
  from public.refunds r
  join public.payments p on p.id = r.payment_id
  join public.orders o on o.id = p.order_id
  where o.pos_shift_id = p_shift_id;

  v_expected_cash := greatest(0, v_shift.opening_cash_cents + v_cash_sales - v_cash_refunds);

  return jsonb_build_object(
    'shift_id', v_shift.id,
    'org_id', v_shift.org_id,
    'cashier_user_id', v_shift.cashier_user_id,
    'device_id', v_shift.device_id,
    'device_session_id', v_shift.device_session_id,
    'status', v_shift.status,
    'opened_at', v_shift.opened_at,
    'closed_at', v_shift.closed_at,
    'opening_cash_cents', v_shift.opening_cash_cents,
    'expected_cash_cents', coalesce(v_shift.expected_cash_cents, v_expected_cash),
    'closing_cash_cents', v_shift.closing_cash_cents,
    'cash_variance_cents', v_shift.cash_variance_cents,
    'order_count', v_order_count,
    'gross_sales_cents', v_gross_sales,
    'refunds_cents', v_total_refunds,
    'payment_totals', jsonb_build_object(
      'cash_cents', v_cash_sales,
      'card_cents', v_card_sales,
      'upi_cents', v_upi_sales,
      'comp_cents', v_comp_sales,
      'other_cents', v_other_sales
    ),
    'cash_refunds_cents', v_cash_refunds
  );
end;
$$;


ALTER FUNCTION "public"."fn_pos_shift_summary"("p_shift_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_pos_shift_transactions"("p_shift_id" "uuid", "p_limit" integer DEFAULT 25) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_shift public.pos_shifts;
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_rows jsonb;
begin
  perform app.require_claimed_account();

  select * into v_shift from public.pos_shifts where id = p_shift_id;
  if not found then
    raise exception 'pos_shift_not_found' using errcode = 'P0002';
  end if;

  if not (
    v_shift.cashier_user_id = auth.uid()
    or app.is_org_manager(v_shift.org_id)
    or app.is_org_finance_viewer(v_shift.org_id)
    or app.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_data order by row_data->>'created_at' desc), '[]'::jsonb)
    into v_rows
  from (
    select jsonb_build_object(
      'order_id', o.id,
      'receipt_reference', 'TIV-' || upper(substr(replace(o.id::text, '-', ''), 1, 10)),
      'created_at', o.created_at,
      'total_cents', o.total_cents,
      'currency', o.currency,
      'item_count', coalesce(o.item_count, 0),
      'buyer_name', (
        select nullif(max(oi.holder_name), '') from public.order_items oi where oi.order_id = o.id
      ),
      'payment_method', p.provider
    ) as row_data
    from public.orders o
    join lateral (
      select provider
      from public.payments
      where order_id = o.id and status = 'succeeded'
      order by created_at desc nulls last
      limit 1
    ) p on true
    where o.pos_shift_id = p_shift_id and o.channel = 'pos'
    order by o.created_at desc
    limit v_limit
  ) rows;

  return v_rows;
end;
$$;


ALTER FUNCTION "public"."fn_pos_shift_transactions"("p_shift_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_pos_shift_transactions"("p_shift_id" "uuid", "p_limit" integer) IS 'Returns recent successful POS transactions for an authorized shift viewer.';



CREATE OR REPLACE FUNCTION "public"."fn_prepare_credential_entitlement"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_holder_user_id uuid;
begin
  select tt.event_id, coalesce(oi.holder_user_id, oi.current_owner_id, o.buyer_id)
    into v_event_id, v_holder_user_id
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.orders o on o.id = oi.order_id
  where oi.id = new.order_item_id;

  if v_event_id is null then
    raise exception 'credential_entitlements.order_item_id % is not linked to an event', new.order_item_id;
  end if;

  if new.event_id is distinct from v_event_id then
    raise exception 'credential_entitlements.event_id must match the order item event';
  end if;

  if new.holder_user_id is null then
    new.holder_user_id = v_holder_user_id;
  end if;

  return new;
end
$$;


ALTER FUNCTION "public"."fn_prepare_credential_entitlement"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_preview_pricing"("p_org_id" "uuid", "p_ticket_type_ids" "uuid"[], "p_quantities" integer[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  v_plan public.pricing_plans%ROWTYPE;
  v_subtotal int := 0;
  v_items int := 0;
  v_platform_pct int;
  v_platform_fixed int;
  v_platform_fee int;
  v_base int;
  v_processor_fee int;
  v_total_buyer int;
  v_currency text := 'SZL';
BEGIN
  IF array_length(p_ticket_type_ids,1) IS DISTINCT FROM array_length(p_quantities,1) THEN
    RAISE EXCEPTION 'ticket_type_ids and quantities must have same length';
  END IF;

  SELECT * INTO v_plan
  FROM public.pricing_plans
  WHERE org_id = p_org_id AND active = true
  ORDER BY effective_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active pricing plan for org %', p_org_id;
  END IF;

  FOR i IN 1..array_length(p_ticket_type_ids,1) LOOP
    v_subtotal := v_subtotal + (
      (SELECT price_cents FROM public.ticket_types WHERE id = p_ticket_type_ids[i])
      * p_quantities[i]
    );
    v_items := v_items + p_quantities[i];
  END LOOP;

  v_platform_pct   := ROUND(v_subtotal * v_plan.platform_percent_bps / 10000.0);
  v_platform_fixed := v_plan.platform_fixed_cents * v_items;
  v_platform_fee   := v_platform_pct + v_platform_fixed;

  IF v_plan.min_platform_fee_cents IS NOT NULL AND v_platform_fee < v_plan.min_platform_fee_cents THEN
    v_platform_fee := v_plan.min_platform_fee_cents;
  END IF;
  IF v_plan.max_platform_fee_cents IS NOT NULL AND v_platform_fee > v_plan.max_platform_fee_cents THEN
    v_platform_fee := v_plan.max_platform_fee_cents;
  END IF;

  IF v_plan.platform_fee_payer = 'buyer' THEN
    v_base := v_subtotal + v_platform_fee;
  ELSE
    v_base := v_subtotal;
  END IF;

  v_processor_fee := ROUND(v_base * v_plan.processor_percent_bps / 10000.0) + v_plan.processor_fixed_cents;

  v_total_buyer :=
    v_subtotal
    + CASE WHEN v_plan.platform_fee_payer  = 'buyer' THEN v_platform_fee  ELSE 0 END
    + CASE WHEN v_plan.processor_fee_payer = 'buyer' THEN v_processor_fee ELSE 0 END;

  RETURN jsonb_build_object(
    'currency', v_currency,
    'items', v_items,
    'subtotal_cents', v_subtotal,
    'platform_fee_cents', v_platform_fee,
    'processor_fee_cents', v_processor_fee,
    'total_cents_buyer_pays', v_total_buyer,
    'platform_fee_payer', v_plan.platform_fee_payer,
    'processor_fee_payer', v_plan.processor_fee_payer
  );
END;
$$;


ALTER FUNCTION "public"."fn_preview_pricing"("p_org_id" "uuid", "p_ticket_type_ids" "uuid"[], "p_quantities" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_preview_promo_code"("p_event_id" "uuid", "p_code" "text", "p_channel" "public"."sales_channel" DEFAULT 'online'::"public"."sales_channel") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org_id uuid;
  v_rule public.price_rules%rowtype;
  v_total_redemptions integer;
begin
  if p_event_id is null or p_code is null or length(trim(p_code)) < 3 then
    return jsonb_build_object('valid', false, 'reason', 'code_required');
  end if;

  select e.org_id into v_org_id
  from public.events e
  where e.id = p_event_id and e.status = 'published';

  if v_org_id is null then
    return jsonb_build_object('valid', false, 'reason', 'event_not_found');
  end if;

  select * into v_rule
  from public.price_rules
  where org_id = v_org_id
    and lower(code) = lower(trim(p_code))
    and coalesce(is_active, true) = true
    and (event_id is null or event_id = p_event_id)
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and (channel is null or cardinality(channel) = 0 or p_channel = any(channel))
    and type in ('absolute_discount', 'percent_discount')
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'code_invalid');
  end if;

  if v_rule.max_redemptions is not null and v_rule.max_redemptions > 0 then
    select count(*)::integer into v_total_redemptions
    from public.price_rule_redemptions
    where price_rule_id = v_rule.id;
    if v_total_redemptions >= v_rule.max_redemptions then
      return jsonb_build_object('valid', false, 'reason', 'code_exhausted');
    end if;
  end if;

  return jsonb_build_object(
    'valid', true,
    'discountType', case v_rule.type when 'percent_discount' then 'percent' else 'fixed' end,
    'discountValue', case v_rule.type
      when 'percent_discount' then v_rule.value_numeric
      else abs(v_rule.value_numeric)::integer
    end
  );
end;
$$;


ALTER FUNCTION "public"."fn_preview_promo_code"("p_event_id" "uuid", "p_code" "text", "p_channel" "public"."sales_channel") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_profile_can_read"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    p_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.org_members om1
      JOIN public.org_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = (SELECT auth.uid())
        AND om2.user_id = p_user_id
    );
$$;


ALTER FUNCTION "public"."fn_profile_can_read"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_profile_can_read"("p_user_id" "uuid") IS 'Profile is readable to the caller if it''s their own, or they share an org membership.';



CREATE OR REPLACE FUNCTION "public"."fn_provider_settlement_counts"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select jsonb_build_object(
    'settlement_items_unmatched', (select count(*) from public.provider_settlement_items where payment_id is null),
    'settlement_amount_mismatch', (
      select count(*) from public.provider_settlement_items si
      join public.payments p on p.id = si.payment_id
      where si.amount_cents <> p.amount_cents),
    'settlement_internal_imbalance', (
      select count(*) from public.provider_settlements where (gross_cents - fees_cents) <> net_cents),
    'succeeded_payments_never_settled', (
      select case when (select count(*) from public.provider_settlements) = 0 then 0 else (
        select count(*) from public.payments p
        where p.status='succeeded' and p.created_at < now() - interval '7 days'
          and not exists (select 1 from public.provider_settlement_items si where si.payment_id = p.id)
      ) end),
    'hours_since_last_settlement_ingest', (
      select coalesce(floor(extract(epoch from (now() - max(ingested_at)))/3600)::integer, -1)
      from public.provider_settlements)
  );
$$;


ALTER FUNCTION "public"."fn_provider_settlement_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_publish_resale_listing"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer DEFAULT 24) RETURNS TABLE("listing_id" "uuid", "order_item_id" "uuid", "price_cents" integer, "currency" "text", "listing_expires_at" timestamp with time zone, "transfer_fee_cents" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
begin
  perform app.require_claimed_account();
  if not public.fn_rate_limit('resale_publish:' || (select auth.uid())::text, 20, 3600) then
    raise exception 'rate_limited: too many resale listings, please try again later' using errcode = 'P0001';
  end if;
  return query select * from public.fn_publish_resale_listing_unchecked(p_order_item_id, p_price_cents, p_listing_hours);
end;
$$;


ALTER FUNCTION "public"."fn_publish_resale_listing"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_publish_resale_listing_unchecked"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer DEFAULT 24) RETURNS TABLE("listing_id" "uuid", "order_item_id" "uuid", "price_cents" integer, "currency" "text", "listing_expires_at" timestamp with time zone, "transfer_fee_cents" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_seller_id uuid := auth.uid();
  v_item public.order_items%rowtype;
  v_order public.orders%rowtype;
  v_ticket_type public.ticket_types%rowtype;
  v_existing_listing_id uuid;
  v_listing_id uuid;
  v_listing_hours integer;
  v_expires_at timestamptz;
  v_transfer_fee_cents integer;
begin
  if v_seller_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_price_cents is null or p_price_cents <= 0 then
    raise exception 'listing price must be greater than zero' using errcode = 'P0001';
  end if;

  if p_price_cents > 100000000 then
    raise exception 'listing price is too high' using errcode = 'P0001';
  end if;

  v_listing_hours := least(168, greatest(1, coalesce(p_listing_hours, 24)));
  v_expires_at := now() + make_interval(hours => v_listing_hours);
  v_transfer_fee_cents := greatest(0, round(p_price_cents * 0.05)::integer);

  select * into v_item
  from public.order_items
  where id = p_order_item_id
  for update;

  if not found then
    raise exception 'ticket not found' using errcode = 'P0002';
  end if;

  select * into v_order
  from public.orders
  where id = v_item.order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.buyer_id <> v_seller_id then
    raise exception 'ticket does not belong to seller' using errcode = 'P0001';
  end if;

  if v_item.status <> 'issued' then
    raise exception 'ticket is not eligible for resale' using errcode = 'P0001';
  end if;

  if v_item.checked_in_at is not null then
    raise exception 'checked-in ticket cannot be listed' using errcode = 'P0001';
  end if;

  if v_item.revoked_at is not null then
    raise exception 'revoked ticket cannot be listed' using errcode = 'P0001';
  end if;

  if v_item.refunded_at is not null then
    raise exception 'refunded ticket cannot be listed' using errcode = 'P0001';
  end if;

  -- If this item came from a prior transfer/resale, allow listing by its current owner,
  -- but block items that already have an incomplete transfer record.
  if exists (
    select 1
    from public.transfers t
    where t.order_item_id = v_item.id
      and t.status not in ('completed', 'cancelled', 'declined', 'expired')
  ) then
    raise exception 'ticket has a pending transfer' using errcode = 'P0001';
  end if;

  select rl.id into v_existing_listing_id
  from public.resale_listings rl
  where rl.order_item_id = v_item.id
    and rl.status in ('active', 'pending', 'checkout_pending')
  limit 1;

  if v_existing_listing_id is not null then
    raise exception 'ticket is already listed' using errcode = 'P0001';
  end if;

  select * into v_ticket_type
  from public.ticket_types
  where id = v_item.ticket_type_id;

  if not found then
    raise exception 'ticket type not found' using errcode = 'P0002';
  end if;

  insert into public.resale_listings (
    order_item_id,
    seller_id,
    org_id,
    price_cents,
    currency,
    status,
    listing_expires_at,
    transfer_fee_cents,
    metadata
  ) values (
    v_item.id,
    v_seller_id,
    v_order.org_id,
    p_price_cents,
    v_ticket_type.currency,
    'active',
    v_expires_at,
    v_transfer_fee_cents,
    jsonb_build_object(
      'publishedBy', v_seller_id,
      'publishedAt', now(),
      'listingHours', v_listing_hours
    )
  ) returning id into v_listing_id;

  insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
  values (
    v_seller_id,
    'resale_listing_created',
    jsonb_build_object('listingId', v_listing_id, 'ticketId', v_item.id, 'orderId', v_order.id),
    'pending',
    'in_app',
    'resale_listing_created:' || v_listing_id::text || ':' || v_seller_id::text
  )
  on conflict do nothing;

  return query select v_listing_id, v_item.id, p_price_cents, v_ticket_type.currency, v_expires_at, v_transfer_fee_cents;
end;
$$;


ALTER FUNCTION "public"."fn_publish_resale_listing_unchecked"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_push_targets_for_user"("p_user_id" "uuid", "p_notification_type" "text") RETURNS TABLE("service" "text", "token" "text", "device_id" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select d.service::text, d.token, d.device_id
  from public.push_devices d
  where d.user_id = p_user_id
    and d.disabled_at is null
    and not exists (
      select 1
      from public.notification_mutes m
      where m.user_id = p_user_id
        and m.notification_type = p_notification_type
    )
  order by d.last_seen_at desc;
$$;


ALTER FUNCTION "public"."fn_push_targets_for_user"("p_user_id" "uuid", "p_notification_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_quote_order"("p_items" "jsonb", "p_currency" "text" DEFAULT 'SZL'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  result jsonb := '{}'::jsonb;
BEGIN
  result := jsonb_build_object('items', p_items, 'currency', p_currency, 'total_cents', 0);
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."fn_quote_order"("p_items" "jsonb", "p_currency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_quote_order"("p_event_id" "uuid", "p_items" "jsonb", "p_channel" "public"."sales_channel", "p_coupon" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
BEGIN
  RETURN jsonb_build_object('total_cents', 0, 'breakdown', '[]'::jsonb);
END $$;


ALTER FUNCTION "public"."fn_quote_order"("p_event_id" "uuid", "p_items" "jsonb", "p_channel" "public"."sales_channel", "p_coupon" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_window_start timestamptz; v_hits integer;
begin
  if p_key is null or coalesce(p_max,0) <= 0 or coalesce(p_window_seconds,0) <= 0 then return true; end if;
  v_window_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits (bucket, window_start, hits) values (p_key, v_window_start, 1)
  on conflict (bucket, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;


ALTER FUNCTION "public"."fn_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_rate_limit_edge"("p_bucket" "text", "p_key" "text", "p_max" integer, "p_window_seconds" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_bucket text := 'edge:' || coalesce(p_bucket, '') || ':' || coalesce(p_key, '');
  v_allowed boolean;
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_key is null or coalesce(p_max, 0) <= 0 or coalesce(p_window_seconds, 0) <= 0 then
    return jsonb_build_object('allowed', true, 'remaining', coalesce(p_max, 0), 'retry_after', 0);
  end if;

  v_allowed := public.fn_rate_limit(v_bucket, p_max, p_window_seconds);

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );
  select hits into v_hits from public.rate_limits
   where bucket = v_bucket and window_start = v_window_start;

  return jsonb_build_object(
    'allowed', v_allowed,
    'remaining', greatest(0, p_max - coalesce(v_hits, 0)),
    'retry_after', greatest(1, ceil(
      extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - clock_timestamp()))
    ))::integer
  );
end;
$$;


ALTER FUNCTION "public"."fn_rate_limit_edge"("p_bucket" "text", "p_key" "text", "p_max" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_rate_limit_gc"("p_older_than" interval DEFAULT '1 day'::interval) RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with d as (delete from public.rate_limits where window_start < now() - p_older_than returning 1)
  select count(*)::integer from d;
$$;


ALTER FUNCTION "public"."fn_rate_limit_gc"("p_older_than" interval) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_live_stats" (
    "event_id" "uuid" NOT NULL,
    "tickets_sold" integer DEFAULT 0 NOT NULL,
    "tickets_available" integer DEFAULT 0 NOT NULL,
    "gross_sales_cents" bigint DEFAULT 0 NOT NULL,
    "successful_payments" integer DEFAULT 0 NOT NULL,
    "failed_payments" integer DEFAULT 0 NOT NULL,
    "checked_in_count" integer DEFAULT 0 NOT NULL,
    "last_order_at" timestamp with time zone,
    "last_scan_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_live_stats_checked_in_count_check" CHECK (("checked_in_count" >= 0)),
    CONSTRAINT "event_live_stats_failed_payments_check" CHECK (("failed_payments" >= 0)),
    CONSTRAINT "event_live_stats_gross_sales_cents_check" CHECK (("gross_sales_cents" >= 0)),
    CONSTRAINT "event_live_stats_successful_payments_check" CHECK (("successful_payments" >= 0)),
    CONSTRAINT "event_live_stats_tickets_available_check" CHECK (("tickets_available" >= 0)),
    CONSTRAINT "event_live_stats_tickets_sold_check" CHECK (("tickets_sold" >= 0))
);


ALTER TABLE "public"."event_live_stats" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recalculate_event_live_stats"("p_event_id" "uuid") RETURNS "public"."event_live_stats"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_stats public.event_live_stats;
begin
  if p_event_id is null then raise exception 'event id is required'; end if;

  insert into public.event_live_stats as els (
    event_id, tickets_sold, tickets_available, gross_sales_cents,
    successful_payments, failed_payments, checked_in_count,
    last_order_at, last_scan_at, updated_at)
  select
    e.id,
    coalesce(issued.tickets_sold, 0)::integer,
    greatest(coalesce(capacity.total_quota,0) - coalesce(issued.tickets_sold,0), 0)::integer,
    coalesce(payments.gross_sales_cents, 0)::bigint,
    coalesce(payments.successful_payments, 0)::integer,
    coalesce(payments.failed_payments, 0)::integer,
    coalesce(scans.checked_in_count, 0)::integer,
    payments.last_order_at,
    scans.last_scan_at,
    now()
  from public.events e
  left join lateral (
    select coalesce(sum(greatest(tt.quota,0)),0)::integer as total_quota
    from public.ticket_types tt where tt.event_id = e.id
  ) capacity on true
  left join lateral (
    select count(*)::integer as tickets_sold
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.orders o on o.id = oi.order_id
    where tt.event_id = e.id and o.status::text='paid'
      and oi.status::text in ('issued','checked_in','transferred')
      and oi.revoked_at is null and oi.refunded_at is null
  ) issued on true
  left join lateral (
    select coalesce(sum(case when p.status::text='succeeded' then p.amount_cents else 0 end),0)::bigint as gross_sales_cents,
           count(*) filter (where p.status::text='succeeded')::integer as successful_payments,
           count(*) filter (where p.status::text='failed')::integer as failed_payments,
           max(o.created_at) filter (where p.status::text='succeeded') as last_order_at
    from public.orders o join public.payments p on p.order_id = o.id
    where exists (select 1 from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      where oi.order_id = o.id and tt.event_id = e.id)
  ) payments on true
  left join lateral (
    select count(*) filter (where s.outcome='valid')::integer as checked_in_count,
           max(s.scanned_at) filter (where s.outcome='valid') as last_scan_at
    from (
      select sc.outcome, sc.scanned_at from public.scans sc where sc.event_id = e.id
      union all
      select sa.outcome, sa.scanned_at from public.scans_archive sa where sa.event_id = e.id
    ) s
  ) scans on true
  where e.id = p_event_id
  on conflict (event_id) do update set
    tickets_sold = excluded.tickets_sold,
    tickets_available = excluded.tickets_available,
    gross_sales_cents = excluded.gross_sales_cents,
    successful_payments = excluded.successful_payments,
    failed_payments = excluded.failed_payments,
    checked_in_count = excluded.checked_in_count,
    last_order_at = excluded.last_order_at,
    last_scan_at = excluded.last_scan_at,
    updated_at = now()
  returning * into v_stats;

  if not found then raise exception 'event % not found', p_event_id; end if;
  return v_stats;
end;
$$;


ALTER FUNCTION "public"."fn_recalculate_event_live_stats"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recalculate_event_live_stats_from_order"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order_id uuid;
  v_event_id uuid;
begin
  v_order_id := coalesce(new.id, old.id);

  for v_event_id in
    select distinct tt.event_id
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    where oi.order_id = v_order_id
  loop
    perform public.fn_recalculate_event_live_stats(v_event_id);
  end loop;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."fn_recalculate_event_live_stats_from_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recalculate_event_live_stats_from_order_item"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
begin
  if tg_op <> 'DELETE' and new.ticket_type_id is not null then
    select event_id into v_event_id
    from public.ticket_types
    where id = new.ticket_type_id;

    if v_event_id is not null then
      perform public.fn_recalculate_event_live_stats(v_event_id);
    end if;
  end if;

  if tg_op <> 'INSERT' and old.ticket_type_id is not null then
    select event_id into v_event_id
    from public.ticket_types
    where id = old.ticket_type_id;

    if v_event_id is not null then
      perform public.fn_recalculate_event_live_stats(v_event_id);
    end if;
  end if;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."fn_recalculate_event_live_stats_from_order_item"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recalculate_event_live_stats_from_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order_id uuid;
  v_event_id uuid;
begin
  v_order_id := coalesce(new.order_id, old.order_id);

  for v_event_id in
    select distinct tt.event_id
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    where oi.order_id = v_order_id
  loop
    perform public.fn_recalculate_event_live_stats(v_event_id);
  end loop;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."fn_recalculate_event_live_stats_from_payment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recalculate_event_live_stats_from_scan"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op <> 'DELETE' and new.event_id is not null
     and exists (select 1 from public.events where id = new.event_id) then
    perform public.fn_recalculate_event_live_stats(new.event_id);
  end if;

  if tg_op <> 'INSERT' and old.event_id is not null
     and exists (select 1 from public.events where id = old.event_id) then
    perform public.fn_recalculate_event_live_stats(old.event_id);
  end if;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."fn_recalculate_event_live_stats_from_scan"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recalculate_event_live_stats_from_ticket_type"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op <> 'DELETE' and new.event_id is not null
     and exists (select 1 from public.events where id = new.event_id) then
    perform public.fn_recalculate_event_live_stats(new.event_id);
  end if;

  -- Skipped when the event is already gone: this trigger also fires as part of
  -- the cascade that deletes the event itself.
  if tg_op <> 'INSERT' and old.event_id is not null
     and exists (select 1 from public.events where id = old.event_id) then
    perform public.fn_recalculate_event_live_stats(old.event_id);
  end if;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."fn_recalculate_event_live_stats_from_ticket_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_record_chargeback"("p_payment_id" "uuid", "p_provider_ref" "text" DEFAULT NULL::"text", "p_amount_cents" integer DEFAULT NULL::integer, "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("chargeback_payment_id" "uuid", "chargeback_order_id" "uuid", "already_recorded" boolean, "revoked_item_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_payment public.payments%rowtype; v_order public.orders%rowtype;
  v_amount integer; v_revoked integer := 0;
begin
  if p_payment_id is null then raise exception 'payment_id_required' using errcode='P0001'; end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'payment_not_found' using errcode='P0002'; end if;
  select * into v_order from public.orders where id = v_payment.order_id for update;
  if not found then raise exception 'order_not_found' using errcode='P0002'; end if;

  if v_payment.status = 'chargeback' then
    select count(*)::integer into v_revoked from public.order_items oi
      where oi.order_id = v_order.id and oi.status = 'revoked';
    return query select v_payment.id, v_order.id, true, v_revoked;
    return;
  end if;

  v_amount := coalesce(p_amount_cents, v_payment.amount_cents);

  update public.payments set status='chargeback',
    payload = coalesce(payload,'{}'::jsonb) || jsonb_build_object('chargeback', coalesce(p_payload,'{}'::jsonb))
  where id = v_payment.id;

  update public.order_items oi set status='revoked'
  where oi.order_id = v_order.id and oi.status in ('pending','issued','transferred');
  get diagnostics v_revoked = row_count;

  update public.orders set status='refunded' where id = v_order.id;

  insert into public.ledger_entries (org_id, order_id, payment_id, type, amount_cents, currency, meta)
  values (v_order.org_id, v_order.id, v_payment.id, 'reversal', v_amount, v_order.currency,
          jsonb_build_object('source','chargeback','provider_ref',p_provider_ref));

  if v_order.buyer_id is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (v_order.buyer_id,'refund_alert',
            jsonb_build_object('orderId',v_order.id,'paymentId',v_payment.id,
                               'amountCents',v_amount,'currency',v_order.currency,'kind','chargeback'),
            'pending','email','chargeback:'||v_payment.id::text)
    on conflict do nothing;
  end if;

  perform public.fn_open_dispute(
    'chargeback'::public.dispute_kind, v_order.id, v_payment.id,
    'Provider chargeback' || coalesce(' (' || p_provider_ref || ')',''),
    v_amount, v_order.buyer_id, 'chargeback:' || v_payment.id::text);

  return query select v_payment.id, v_order.id, false, v_revoked;
end; $$;


ALTER FUNCTION "public"."fn_record_chargeback"("p_payment_id" "uuid", "p_provider_ref" "text", "p_amount_cents" integer, "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_refresh_finance_reconciliation_issues"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_started timestamptz := clock_timestamp();
  v_detected integer := 0;
  v_resolved integer := 0;
  v_open integer := 0;
  v_critical integer := 0;
begin
  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, org_id, order_id, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'paid_order_without_succeeded_payment', o.id::text, o.org_id, o.id, 'critical',
    'Paid order has no succeeded payment',
    jsonb_build_object('order_status', o.status, 'total_cents', o.total_cents, 'currency', o.currency, 'created_at', o.created_at),
    v_started, v_started, v_started
  from public.orders o
  where o.status = 'paid'
    and not exists (select 1 from public.payments p where p.order_id = o.id and p.status = 'succeeded')
  on conflict (detector_key, entity_key) do update
  set org_id = excluded.org_id, order_id = excluded.order_id, severity = excluded.severity,
      title = excluded.title, details = excluded.details, last_detected_at = v_started,
      updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_detected = row_count;

  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, org_id, order_id, payment_id, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'succeeded_payment_without_paid_order', p.id::text, o.org_id, o.id, p.id, 'critical',
    'Succeeded payment is attached to a non-paid order',
    jsonb_build_object('payment_status', p.status, 'order_status', o.status, 'provider', p.provider,
      'provider_reference', p.ext_payment_id, 'amount_cents', p.amount_cents, 'currency', p.currency),
    v_started, v_started, v_started
  from public.payments p join public.orders o on o.id = p.order_id
  where p.status = 'succeeded' and o.status <> 'paid'
  on conflict (detector_key, entity_key) do update
  set org_id = excluded.org_id, order_id = excluded.order_id, payment_id = excluded.payment_id,
      severity = excluded.severity, title = excluded.title, details = excluded.details,
      last_detected_at = v_started, updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_open = row_count; v_detected := v_detected + v_open;

  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, org_id, order_id, payment_id, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'payment_amount_mismatch', p.id::text, o.org_id, o.id, p.id, 'critical',
    'Succeeded payment does not match the order amount or currency',
    jsonb_build_object('order_total_cents', o.total_cents, 'order_currency', o.currency,
      'payment_amount_cents', p.amount_cents, 'payment_currency', p.currency,
      'provider', p.provider, 'provider_reference', p.ext_payment_id),
    v_started, v_started, v_started
  from public.payments p join public.orders o on o.id = p.order_id
  where p.status = 'succeeded'
    and (p.amount_cents <> o.total_cents or upper(coalesce(p.currency, '')) <> upper(coalesce(o.currency, '')))
  on conflict (detector_key, entity_key) do update
  set org_id = excluded.org_id, order_id = excluded.order_id, payment_id = excluded.payment_id,
      severity = excluded.severity, title = excluded.title, details = excluded.details,
      last_detected_at = v_started, updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_open = row_count; v_detected := v_detected + v_open;

  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'duplicate_provider_reference', d.provider || ':' || d.ext_payment_id, 'critical',
    'Provider payment reference is duplicated',
    jsonb_build_object('provider', d.provider, 'provider_reference', d.ext_payment_id,
      'payment_ids', d.payment_ids, 'order_ids', d.order_ids, 'duplicate_count', d.duplicate_count),
    v_started, v_started, v_started
  from (
    select provider, ext_payment_id,
      jsonb_agg(id order by created_at) as payment_ids,
      jsonb_agg(order_id order by created_at) as order_ids,
      count(*) as duplicate_count
    from public.payments
    where ext_payment_id is not null and btrim(ext_payment_id) <> ''
    group by provider, ext_payment_id
    having count(*) > 1
  ) d
  on conflict (detector_key, entity_key) do update
  set severity = excluded.severity, title = excluded.title, details = excluded.details,
      last_detected_at = v_started, updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_open = row_count; v_detected := v_detected + v_open;

  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, org_id, order_id, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'payment_ledger_without_payment', le.id::text, le.org_id, le.order_id, 'critical',
    'Payment ledger row is missing its payment link',
    jsonb_build_object('ledger_entry_id', le.id, 'ledger_type', le.type,
      'amount_cents', le.amount_cents, 'currency', le.currency, 'occurred_at', le.occurred_at),
    v_started, v_started, v_started
  from public.ledger_entries le
  where le.payment_id is null and le.type in ('order_gross', 'fee', 'payment_net')
  on conflict (detector_key, entity_key) do update
  set org_id = excluded.org_id, order_id = excluded.order_id, severity = excluded.severity,
      title = excluded.title, details = excluded.details, last_detected_at = v_started,
      updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_open = row_count; v_detected := v_detected + v_open;

  insert into public.finance_reconciliation_issues as fri (
    detector_key, entity_key, org_id, order_id, payment_id, severity, title, details,
    first_detected_at, last_detected_at, updated_at
  )
  select
    'payment_attempt_link_mismatch', pa.id::text, o.org_id, pa.order_id, pa.payment_id, 'critical',
    'Succeeded payment attempt is not linked to its matching payment',
    jsonb_build_object('payment_attempt_id', pa.id, 'attempt_provider', pa.provider,
      'attempt_reference', pa.ext_ref, 'attempt_payment_id', pa.payment_id,
      'linked_payment_status', p.status, 'linked_payment_provider', p.provider,
      'linked_payment_reference', p.ext_payment_id),
    v_started, v_started, v_started
  from public.payment_attempts pa
  left join public.payments p on p.id = pa.payment_id
  left join public.orders o on o.id = pa.order_id
  where pa.status = 'succeeded'
    and (pa.payment_id is null or p.id is null or p.status <> 'succeeded'
      or p.order_id is distinct from pa.order_id or p.provider is distinct from pa.provider
      or (pa.ext_ref is not null and p.ext_payment_id is distinct from pa.ext_ref))
  on conflict (detector_key, entity_key) do update
  set org_id = excluded.org_id, order_id = excluded.order_id, payment_id = excluded.payment_id,
      severity = excluded.severity, title = excluded.title, details = excluded.details,
      last_detected_at = v_started, updated_at = v_started,
      status = case when fri.status = 'resolved' then 'open' else fri.status end,
      resolved_at = case when fri.status = 'resolved' then null else fri.resolved_at end;
  get diagnostics v_open = row_count; v_detected := v_detected + v_open;

  update public.finance_reconciliation_issues
  set status = 'resolved', resolved_at = v_started, updated_at = v_started
  where detector_key in (
    'paid_order_without_succeeded_payment', 'succeeded_payment_without_paid_order',
    'payment_amount_mismatch', 'duplicate_provider_reference',
    'payment_ledger_without_payment', 'payment_attempt_link_mismatch'
  )
    and status in ('open', 'acknowledged')
    and last_detected_at < v_started;
  get diagnostics v_resolved = row_count;

  select count(*)::integer,
         count(*) filter (where severity = 'critical')::integer
  into v_open, v_critical
  from public.finance_reconciliation_issues
  where status in ('open', 'acknowledged');

  return jsonb_build_object('refreshed_at', v_started, 'detected_this_run', v_detected,
    'auto_resolved_this_run', v_resolved, 'open_issues', v_open, 'critical_open_issues', v_critical);
end;
$$;


ALTER FUNCTION "public"."fn_refresh_finance_reconciliation_issues"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_refund_reconciliation_tick"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_secret       text;
  v_request_id   bigint;
  v_resolved     integer := 0;
  v_prev_failure text;
begin
  with resolved as (
    update public.ops_cron_runs r
       set status_code = resp.status_code,
           ok          = (resp.status_code between 200 and 299),
           error       = nullif(resp.error_msg, ''),
           resolved_at = now()
      from net._http_response resp
     where resp.id = r.request_id
       and r.job = 'refund-reconciliation'
       and r.resolved_at is null
    returning r.ok, r.status_code, r.error
  )
  select count(*),
         max(case
               when coalesce(ok, false) then null
               else coalesce(error, 'HTTP ' || coalesce(status_code::text, 'no response'))
             end)
    from resolved
    into v_resolved, v_prev_failure;

  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'ops_alert_cron_secret';

  if v_secret is null then
    raise exception 'refund reconciliation cron is not configured: missing ops_alert_cron_secret'
      using errcode = 'P0001';
  end if;

  select net.http_get(
           url                  => 'https://ticketiv.app/api/cron/refunds',
           headers              => jsonb_build_object(
                                     'Authorization', 'Bearer ' || v_secret,
                                     'User-Agent',    'ticketiv-pg-cron/1'
                                   ),
           timeout_milliseconds => 30000
         )
    into v_request_id;

  insert into public.ops_cron_runs (job, request_id)
  values ('refund-reconciliation', v_request_id);

  delete from public.ops_cron_runs
   where requested_at < now() - interval '30 days';

  return jsonb_build_object(
    'job',               'refund-reconciliation',
    'request_id',        v_request_id,
    'resolved_previous', v_resolved,
    'previous_failure',  v_prev_failure
  );
end;
$$;


ALTER FUNCTION "public"."fn_refund_reconciliation_tick"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_refund_reconciliation_tick"() IS '15-minute refund reconciliation scheduler. Resolves the previous pg_net delivery, calls the secured endpoint, and records the next request.';



CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "registered_by" "uuid",
    "label" "text",
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "max_scans_per_minute" integer,
    "device_role" "public"."device_role" DEFAULT 'scanner_unassigned'::"public"."device_role" NOT NULL
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


COMMENT ON COLUMN "public"."devices"."device_role" IS 'Role of this physical device. organizer_scanner = assigned to an event (event_id required); scanner_unassigned = not yet assigned; organizer_pos = POS terminal; organizer_kiosk = kiosk.';



CREATE OR REPLACE FUNCTION "public"."fn_register_device"("p_org_id" "uuid", "p_event_id" "uuid", "p_label" "text", "p_device_role" "public"."device_role") RETURNS "public"."devices"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare v_device public.devices;
begin
  perform app.require_claimed_account();
  if not app.is_org_admin_of(p_org_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_event_id is not null and not exists (select 1 from public.events e where e.id=p_event_id and e.org_id=p_org_id) then
    raise exception 'event_not_in_org' using errcode='22023';
  end if;
  insert into public.devices(org_id,event_id,registered_by,label,device_role)
  values (p_org_id,p_event_id,auth.uid(),nullif(btrim(p_label),''),p_device_role)
  returning * into v_device;
  return v_device;
end;
$$;


ALTER FUNCTION "public"."fn_register_device"("p_org_id" "uuid", "p_event_id" "uuid", "p_label" "text", "p_device_role" "public"."device_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_register_push_device"("p_service" "text", "p_token" "text", "p_device_id" "text", "p_app_id" "text" DEFAULT NULL::"text", "p_platform_version" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_service public.push_service;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  begin
    v_service := lower(btrim(p_service))::public.push_service;
  exception when invalid_text_representation then
    raise exception 'unsupported_push_service: %', p_service using errcode = 'P0001';
  end;

  if coalesce(btrim(p_token), '') = '' or coalesce(btrim(p_device_id), '') = '' then
    raise exception 'token_and_device_id_required' using errcode = 'P0001';
  end if;

  delete from public.push_devices
   where service = v_service
     and token = btrim(p_token)
     and user_id <> v_user;

  insert into public.push_devices (user_id, service, token, device_id, app_id, platform_version)
  values (v_user, v_service, btrim(p_token), btrim(p_device_id), nullif(btrim(p_app_id), ''), nullif(btrim(p_platform_version), ''))
  on conflict (user_id, service, device_id) do update
     set token            = excluded.token,
         app_id           = coalesce(excluded.app_id, public.push_devices.app_id),
         platform_version = coalesce(excluded.platform_version, public.push_devices.platform_version),
         last_seen_at     = now(),
         disabled_at      = null,
         disabled_reason  = null
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."fn_register_push_device"("p_service" "text", "p_token" "text", "p_device_id" "text", "p_app_id" "text", "p_platform_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_remove_push_subscription"("p_endpoint" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  delete from public.push_subscriptions
  where user_id = v_user
    and endpoint = p_endpoint;
end;
$$;


ALTER FUNCTION "public"."fn_remove_push_subscription"("p_endpoint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_report_user"("p_handle" "text", "p_reason" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_target uuid;
  v_reason text := btrim(p_reason);
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    raise exception 'report reason must be between 3 and 500 characters';
  end if;

  select h.user_id into v_target
  from public.user_handles h
  where lower(h.handle) = lower(btrim(p_handle))
  limit 1;

  if v_target is null or v_target = v_me then
    return false;
  end if;

  insert into public.user_reports (reporter_id, reported_id, reason)
  values (v_me, v_target, v_reason);

  return true;
end;
$$;


ALTER FUNCTION "public"."fn_report_user"("p_handle" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_request_payout"("p_org_id" "uuid", "p_amount_cents" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_request_payout_unchecked(p_org_id, p_amount_cents); end; $$;


ALTER FUNCTION "public"."fn_request_payout"("p_org_id" "uuid", "p_amount_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_request_payout_unchecked"("p_org_id" "uuid", "p_amount_cents" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_currency text;
  v_provider text;
  v_available integer;
  v_captured_available integer;
  v_pending_settlement integer;
  v_summary jsonb;
  v_payout_id uuid;
  v_actor uuid := auth.uid();
begin
  if p_org_id is null then
    raise exception 'org_id_required' using errcode = 'P0001';
  end if;

  if not (public.is_org_admin(p_org_id) or public.is_super_admin(v_actor)) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select provider into v_provider
  from public.payout_accounts
  where org_id = p_org_id
  order by created_at
  limit 1;

  if v_provider is null then
    raise exception 'no_payout_account' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.payouts
    where org_id = p_org_id and status in ('requested', 'processing')
  ) then
    raise exception 'payout_in_progress' using errcode = 'P0001';
  end if;

  v_summary := public.fn_org_finance_summary(p_org_id, null, null);
  v_available := coalesce((v_summary->>'available_cents')::integer, 0);
  v_captured_available := coalesce((v_summary->>'captured_available_cents')::integer, v_available);
  v_pending_settlement := coalesce((v_summary->>'pending_settlement_cents')::integer, 0);
  v_currency := v_summary->>'currency';

  if p_amount_cents > v_available then
    if p_amount_cents <= v_captured_available then
      raise exception 'funds_pending_settlement' using errcode = 'P0001';
    end if;

    raise exception 'insufficient_balance' using errcode = 'P0001';
  end if;

  insert into public.payouts (org_id, amount_cents, currency, provider, status)
  values (p_org_id, p_amount_cents, v_currency, v_provider, 'requested')
  returning id into v_payout_id;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (
    p_org_id, v_actor, 'payouts', v_payout_id::text, 'insert',
    jsonb_build_object(
      'amount_cents', p_amount_cents,
      'currency', v_currency,
      'status', 'requested',
      'provider', v_provider,
      'settled_available_cents', v_available,
      'captured_available_cents', v_captured_available,
      'pending_settlement_cents', v_pending_settlement,
      'settlement_hold_days', coalesce((v_summary->>'settlement_hold_days')::integer, 4)
    )
  );

  return jsonb_build_object(
    'payout_id', v_payout_id,
    'status', 'requested',
    'amount_cents', p_amount_cents,
    'currency', v_currency,
    'settled_available_cents', v_available,
    'captured_available_cents', v_captured_available,
    'pending_settlement_cents', v_pending_settlement
  );
end;
$$;


ALTER FUNCTION "public"."fn_request_payout_unchecked"("p_org_id" "uuid", "p_amount_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_request_transfer_by_email"("p_order_item_id" "uuid", "p_recipient_email" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
begin
  perform app.require_claimed_account();
  if not public.fn_rate_limit('transfer:'||auth.uid()::text,20,3600) then raise exception 'rate_limited: too many transfer requests, please try again later' using errcode='P0001'; end if;
  return public.fn_request_transfer_by_email_unchecked(p_order_item_id,p_recipient_email);
end;
$$;


ALTER FUNCTION "public"."fn_request_transfer_by_email"("p_order_item_id" "uuid", "p_recipient_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_request_transfer_by_email_unchecked"("p_order_item_id" "uuid", "p_recipient_email" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare v_to_user_id uuid;
begin
  select u.id into v_to_user_id from auth.users u
  where lower(u.email)=lower(trim(p_recipient_email)) and coalesce(u.is_anonymous,false)=false limit 1;
  if v_to_user_id is null then raise exception 'recipient_account_not_found'; end if;
  return public.fn_request_transfer_to_user_unchecked(p_order_item_id,v_to_user_id)::json;
end;
$$;


ALTER FUNCTION "public"."fn_request_transfer_by_email_unchecked"("p_order_item_id" "uuid", "p_recipient_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_request_transfer_by_phone"("p_order_item_id" "uuid", "p_recipient_phone" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_to_user_id uuid;
  v_phone text := regexp_replace(coalesce(p_recipient_phone,''),'[^0-9]','','g');
begin
  perform app.require_claimed_account();
  if length(v_phone)<8 then raise exception 'invalid_recipient_phone'; end if;
  if not public.fn_rate_limit('transfer:'||auth.uid()::text,20,3600) then raise exception 'rate_limited: too many transfer requests, please try again later' using errcode='P0001'; end if;
  select u.id into v_to_user_id from auth.users u
  where regexp_replace(coalesce(u.phone,''),'[^0-9]','','g')=v_phone and coalesce(u.is_anonymous,false)=false limit 1;
  if v_to_user_id is null then raise exception 'recipient_account_not_found'; end if;
  return public.fn_request_transfer_to_user_unchecked(p_order_item_id,v_to_user_id);
end;
$$;


ALTER FUNCTION "public"."fn_request_transfer_by_phone"("p_order_item_id" "uuid", "p_recipient_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_request_transfer_to_user"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
begin
  perform app.require_claimed_account();
  if not public.fn_rate_limit('transfer:'||auth.uid()::text,20,3600) then raise exception 'rate_limited: too many transfer requests, please try again later' using errcode='P0001'; end if;
  return public.fn_request_transfer_to_user_unchecked(p_order_item_id,p_recipient_user_id);
end;
$$;


ALTER FUNCTION "public"."fn_request_transfer_to_user"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_request_transfer_to_user_unchecked"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_actor_id uuid := auth.uid();
  v_owner_id uuid;
  v_item_status public.order_item_status;
  v_checked_in_at timestamptz;
  v_revoked_at timestamptz;
  v_refunded_at timestamptz;
  v_order_status public.order_status;
  v_transfer_id uuid;
  v_expires_at timestamptz;
begin
  if v_actor_id is null then raise exception 'authentication_required'; end if;
  if p_recipient_user_id is null or p_recipient_user_id = v_actor_id then
    raise exception 'invalid_transfer_recipient';
  end if;

  if not exists (
    select 1 from auth.users u
    where u.id = p_recipient_user_id
      and coalesce(u.is_anonymous, false) = false
  ) then raise exception 'recipient_account_not_found'; end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_actor_id and b.blocked_id = p_recipient_user_id)
       or (b.blocker_id = p_recipient_user_id and b.blocked_id = v_actor_id)
  ) then raise exception 'transfer_recipient_unavailable'; end if;

  select oi.current_owner_id,
         oi.status,
         oi.checked_in_at,
         oi.revoked_at,
         oi.refunded_at,
         o.status
    into v_owner_id,
         v_item_status,
         v_checked_in_at,
         v_revoked_at,
         v_refunded_at,
         v_order_status
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = p_order_item_id
  for update of oi;

  if not found then raise exception 'ticket_not_found'; end if;
  if v_owner_id is distinct from v_actor_id then raise exception 'transfer_not_owner'; end if;

  if v_order_status <> 'paid'::public.order_status
     or v_item_status not in ('issued'::public.order_item_status, 'transferred'::public.order_item_status)
     or v_checked_in_at is not null
     or v_revoked_at is not null
     or v_refunded_at is not null
  then raise exception 'ticket_not_transferable'; end if;

  update public.transfers
  set status = 'expired'::public.transfer_status,
      updated_at = now()
  where order_item_id = p_order_item_id
    and status in (
      'requested'::public.transfer_status,
      'pending'::public.transfer_status,
      'accepted'::public.transfer_status
    )
    and expires_at <= now();

  v_expires_at := now() + interval '24 hours';

  begin
    insert into public.transfers (
      order_item_id, from_user_id, to_user_id, status, expires_at, metadata
    ) values (
      p_order_item_id,
      v_actor_id,
      p_recipient_user_id,
      'pending'::public.transfer_status,
      v_expires_at,
      jsonb_build_object('source', 'ticket_transfer')
    ) returning id into v_transfer_id;
  exception when unique_violation then
    raise exception 'transfer_already_pending';
  end;

  insert into public.notifications (
    user_id, type, payload, status, channel, dedupe_key
  ) values (
    p_recipient_user_id,
    'ticket_transfer',
    jsonb_build_object(
      'transfer_id', v_transfer_id,
      'from_user_id', v_actor_id,
      'href', '/transfers'
    ),
    'pending',
    'in_app',
    'ticket-transfer-request:' || v_transfer_id::text
  ) on conflict do nothing;

  return jsonb_build_object(
    'transfer_id', v_transfer_id,
    'order_item_id', p_order_item_id,
    'to_user_id', p_recipient_user_id,
    'status', 'pending',
    'expires_at', v_expires_at
  );
end;
$$;


ALTER FUNCTION "public"."fn_request_transfer_to_user_unchecked"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_resolve_payment_outbox"("p_id" "uuid", "p_ok" boolean, "p_error" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_attempts integer;
begin
  if p_ok then
    update public.payment_outbox
    set status = 'done', last_error = null, locked_at = null
    where id = p_id;
    return;
  end if;

  select attempts into v_attempts from public.payment_outbox where id = p_id;
  if not found then return; end if;

  update public.payment_outbox
  set status = case when v_attempts >= 8 then 'failed' else 'pending' end,
      last_error = left(coalesce(p_error, 'unknown error'), 2000),
      available_at = now() + least(power(2, greatest(v_attempts, 1))::integer, 64) * interval '1 minute',
      locked_at = null
  where id = p_id;
end;
$$;


ALTER FUNCTION "public"."fn_resolve_payment_outbox"("p_id" "uuid", "p_ok" boolean, "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_revoke_membership_invite"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); perform public.fn_revoke_membership_invite_unchecked(p_id); end; $$;


ALTER FUNCTION "public"."fn_revoke_membership_invite"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_revoke_membership_invite_unchecked"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_org uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select org_id into v_org from public.membership_invites where id = p_id;
  if v_org is null then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if not public.is_org_admin(v_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.membership_invites set revoked_at = now()
  where id = p_id and accepted_at is null;
end;
$$;


ALTER FUNCTION "public"."fn_revoke_membership_invite_unchecked"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_rollup_metrics"("p_day" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  -- Basic example: upsert event_metrics_daily with tickets_sold from orders/order_items for the day
  INSERT INTO public.event_metrics_daily (org_id, event_id, day, tickets_sold, gross_revenue_cents, refunds_cents, unique_buyers, created_at)
  SELECT o.org_id, tt.event_id, p_day::date,
    COUNT(oi.*) AS tickets_sold,
    COALESCE(SUM(p.amount_cents),0) AS gross_revenue_cents,
    0 AS refunds_cents,
    COUNT(DISTINCT o.buyer_id) AS unique_buyers,
    now()
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  JOIN public.ticket_types tt ON tt.id = oi.ticket_type_id
  LEFT JOIN public.payments p ON p.order_id = o.id AND p.status = 'succeeded' AND p.created_at::date = p_day::date
  WHERE o.created_at::date = p_day::date
  GROUP BY o.org_id, tt.event_id
  ON CONFLICT (event_id, day) DO UPDATE
    SET tickets_sold = EXCLUDED.tickets_sold,
        gross_revenue_cents = EXCLUDED.gross_revenue_cents,
        refunds_cents = EXCLUDED.refunds_cents,
        unique_buyers = EXCLUDED.unique_buyers,
        created_at = now();
END;
$$;


ALTER FUNCTION "public"."fn_rollup_metrics"("p_day" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_scan_ticket"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_gate" "text" DEFAULT NULL::"text", "p_scanned_at" timestamp with time zone DEFAULT "now"(), "p_attempt_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_result jsonb;
  v_scan_id uuid;
  v_effective_scan_time timestamptz := now();
begin
  perform app.require_claimed_account();

  v_result := public.fn_scan_ticket_unchecked(
    p_ticket_code,
    p_event_id,
    p_scanned_by,
    p_device_id,
    p_session_id,
    p_gate,
    p_scanned_at,
    p_attempt_id
  );

  if coalesce(v_result ->> 'outcome', '') = 'duplicate' then
    if coalesce(auth.jwt() ->> 'role', '') = 'service_role'
       and p_scanned_at between now() - interval '7 days' and now() + interval '5 minutes'
    then
      v_effective_scan_time := p_scanned_at;
    end if;

    insert into public.scans(
      event_id,
      order_item_id,
      ticket_code,
      outcome,
      device_id,
      device_session_id,
      gate,
      scanned_at,
      notes,
      request_hash
    )
    values (
      p_event_id,
      nullif(v_result ->> 'order_item_id', '')::uuid,
      p_ticket_code,
      'already_used',
      p_device_id,
      p_session_id,
      p_gate,
      v_effective_scan_time,
      'Ticket was already scanned',
      p_attempt_id
    )
    on conflict do nothing
    returning id into v_scan_id;

    if v_scan_id is not null then
      v_result := v_result || jsonb_build_object('scan_id', v_scan_id);
    end if;
  end if;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."fn_scan_ticket"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_gate" "text", "p_scanned_at" timestamp with time zone, "p_attempt_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_scan_ticket_unchecked"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_gate" "text" DEFAULT NULL::"text", "p_scanned_at" timestamp with time zone DEFAULT "now"(), "p_attempt_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org_id uuid; v_authorized boolean := false; v_item record; v_scan_id uuid; v_existing record;
  v_effective_scan_time timestamptz := now();
begin
  if p_attempt_id is not null then
    select * into v_existing from public.scans where request_hash = p_attempt_id limit 1;
    if found then
      return jsonb_build_object('outcome',v_existing.outcome,'valid',v_existing.outcome='valid','message','Already processed','scan_id',v_existing.id,'order_item_id',v_existing.order_item_id,'idempotent',true);
    end if;
  end if;

  select e.org_id into v_org_id from public.events e where e.id = p_event_id;
  if v_org_id is null then return jsonb_build_object('outcome','error','valid',false,'message','Event not found'); end if;

  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and p_scanned_by is distinct from auth.uid() then
    return jsonb_build_object('outcome','unauthorized','valid',false,'message','Not authorized to scan for this event');
  end if;

  if coalesce(auth.jwt() ->> 'role', '') = 'service_role'
     and p_scanned_at between now() - interval '7 days' and now() + interval '5 minutes' then
    v_effective_scan_time := p_scanned_at;
  end if;

  if exists (select 1 from public.admin_users where user_id = p_scanned_by and active = true) then v_authorized := true; end if;
  if not v_authorized and exists (
    select 1 from public.org_members
    where org_id = v_org_id and user_id = p_scanned_by
      and role in ('admin','organizer','organizer_owner','organizer_admin','organizer_staff','scanner')
  ) then v_authorized := true; end if;
  if not v_authorized and exists (
    select 1 from public.event_staff
    where event_id = p_event_id and user_id = p_scanned_by and active = true
      and role in ('admin','organizer_admin','organizer_staff','scanner','organizer_scanner')
  ) then v_authorized := true; end if;
  if not v_authorized and p_device_id is not null and p_session_id is not null and exists (
    select 1
    from public.device_sessions ds
    join public.devices d on d.id = ds.device_id
    where ds.id = p_session_id
      and ds.device_id = p_device_id
      and ds.user_id = p_scanned_by
      and ds.ended_at is null
      and d.org_id = v_org_id
      and d.event_id = p_event_id
      and d.device_role in ('organizer_scanner','organizer_kiosk')
  ) then
    v_authorized := true;
    update public.devices set last_seen_at = now() where id = p_device_id;
  end if;

  if not v_authorized then return jsonb_build_object('outcome','unauthorized','valid',false,'message','Not authorized to scan for this event'); end if;

  select oi.id, oi.status, oi.checked_in_at, oi.revoked_at, oi.refunded_at,
         tt.event_id as tt_event_id, tt.name as ticket_type_name, o.status as order_status
  into v_item
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.orders o on o.id = oi.order_id
  where oi.ticket_code = p_ticket_code
  for update of oi;

  if not found then
    insert into public.scans(event_id,ticket_code,outcome,device_id,device_session_id,gate,scanned_at,notes,request_hash)
    values(p_event_id,p_ticket_code,'invalid',p_device_id,p_session_id,p_gate,v_effective_scan_time,'Ticket code not found',p_attempt_id)
    returning id into v_scan_id;
    return jsonb_build_object('outcome','not_found','valid',false,'message','Ticket not found','scan_id',v_scan_id);
  end if;
  if v_item.tt_event_id <> p_event_id then
    insert into public.scans(event_id,order_item_id,ticket_code,outcome,device_id,device_session_id,gate,scanned_at,notes,request_hash)
    values(p_event_id,v_item.id,p_ticket_code,'wrong_event',p_device_id,p_session_id,p_gate,v_effective_scan_time,'Ticket belongs to a different event',p_attempt_id)
    returning id into v_scan_id;
    return jsonb_build_object('outcome','wrong_event','valid',false,'message','Ticket is for a different event','scan_id',v_scan_id,'order_item_id',v_item.id);
  end if;
  if v_item.order_status <> 'paid' then
    return jsonb_build_object('outcome','not_paid','valid',false,'message','Order has not been paid','order_item_id',v_item.id);
  end if;
  if v_item.status = 'refunded' or v_item.refunded_at is not null then
    return jsonb_build_object('outcome','refunded','valid',false,'message','Ticket has been refunded','order_item_id',v_item.id);
  end if;
  if v_item.status = 'revoked' or v_item.revoked_at is not null then
    return jsonb_build_object('outcome','revoked','valid',false,'message','Ticket has been revoked','order_item_id',v_item.id);
  end if;
  if v_item.status = 'checked_in' or v_item.checked_in_at is not null then
    return jsonb_build_object('outcome','duplicate','valid',false,'message','Ticket was already scanned','order_item_id',v_item.id,'checked_in_at',v_item.checked_in_at);
  end if;

  insert into public.scans(event_id,order_item_id,ticket_code,outcome,device_id,device_session_id,gate,scanned_at,request_hash)
  values(p_event_id,v_item.id,p_ticket_code,'valid',p_device_id,p_session_id,p_gate,v_effective_scan_time,p_attempt_id)
  returning id into v_scan_id;

  update public.order_items
  set status='checked_in', checked_in_at=v_effective_scan_time, updated_at=now()
  where id=v_item.id;

  return jsonb_build_object('outcome','validated','valid',true,'message','Ticket validated','scan_id',v_scan_id,'order_item_id',v_item.id,'ticket_type_name',v_item.ticket_type_name,'checked_in_at',v_effective_scan_time);
exception when unique_violation then
  return jsonb_build_object('outcome','duplicate','valid',false,'message','Ticket was already scanned (concurrent)','order_item_id',v_item.id);
end;
$$;


ALTER FUNCTION "public"."fn_scan_ticket_unchecked"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_gate" "text", "p_scanned_at" timestamp with time zone, "p_attempt_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_search_events"("p_query" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_starts_after" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_starts_before" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_max_price_cents" integer DEFAULT NULL::integer, "p_only_free" boolean DEFAULT false, "p_limit" integer DEFAULT 30, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "title" "text", "slug" "text", "cover_image_url" "text", "starts_at" timestamp with time zone, "city" "text", "category" "text", "venue_name" "text", "min_price_cents" integer, "currency" "text", "organizer_name" "text", "organizer_logo_url" "text", "tickets_sold" integer, "rank" real)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with q as (
    select case
      when p_query is null or length(trim(p_query)) = 0 then null
      else websearch_to_tsquery('simple', p_query)
    end as tsq
  ),
  candidates as (
    select e.*,
      case
        when (select tsq from q) is null then 0.5
        else ts_rank((coalesce(e.search_tsv, to_tsvector('simple', coalesce(e.title,'')))), (select tsq from q))
      end as r
    from public.events e
    where e.status = 'published'
      and e.visibility = 'public'
      and (e.publish_at is null or e.publish_at <= now())
      and (e.unpublish_at is null or e.unpublish_at > now())
      and (
        (select tsq from q) is null
        or e.search_tsv @@ (select tsq from q)
        or e.title ilike '%' || p_query || '%'
      )
      and (p_category is null or e.category = p_category)
      and (p_city is null or e.city ilike p_city)
      and (p_starts_after is null or e.starts_at >= p_starts_after)
      and (p_starts_before is null or e.starts_at <= p_starts_before)
  ),
  priced as (
    select c.*,
      (select min(tt.price_cents) from public.ticket_types tt where tt.event_id = c.id) as min_price_cents,
      (select tt.currency from public.ticket_types tt where tt.event_id = c.id order by tt.price_cents asc limit 1) as currency
    from candidates c
  ),
  enriched as (
    select p.*,
      v.name as venue_name,
      o.name as organizer_name,
      o.logo as organizer_logo_url,
      els.tickets_sold as live_tickets_sold
    from priced p
    left join public.venues v on v.id = p.venue_id
    left join public.organizations o on o.id = p.org_id
    left join public.event_live_stats els on els.event_id = p.id
    where (p_max_price_cents is null or coalesce(p.min_price_cents, 0) <= p_max_price_cents)
      and (not p_only_free or coalesce(p.min_price_cents, 0) = 0)
  )
  select
    e.id,
    e.title,
    e.slug,
    e.cover_image_url,
    e.starts_at,
    e.city,
    e.category,
    e.venue_name,
    e.min_price_cents,
    e.currency,
    e.organizer_name,
    e.organizer_logo_url,
    e.live_tickets_sold as tickets_sold,
    e.r as rank
  from enriched e
  order by e.r desc, e.starts_at asc nulls last
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$$;


ALTER FUNCTION "public"."fn_search_events"("p_query" "text", "p_category" "text", "p_city" "text", "p_starts_after" timestamp with time zone, "p_starts_before" timestamp with time zone, "p_max_price_cents" integer, "p_only_free" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_search_friend_profiles"("p_query" "text", "p_limit" integer DEFAULT 12) RETURNS TABLE("handle" "text", "display_name" "text", "avatar_url" "text", "relationship_state" "text", "can_request" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with me as (
    select auth.uid() as user_id
  ), candidates as (
    select
      h.user_id,
      h.handle,
      coalesce(
        nullif(btrim(p.display_name), ''),
        nullif(btrim(concat_ws(' ', p.name, p.surname)), ''),
        h.handle
      ) as display_name,
      p.avatar_url,
      coalesce(s.profile_discoverability, 'everyone') as profile_discoverability,
      coalesce(s.allow_friend_requests, true) as allow_friend_requests
    from public.user_handles h
    join public.profiles p on p.user_id = h.user_id
    left join public.user_privacy_settings s on s.user_id = h.user_id
    where length(btrim(p_query)) >= 2
      and (
        h.handle ilike '%' || btrim(p_query) || '%'
        or coalesce(p.display_name, '') ilike '%' || btrim(p_query) || '%'
        or concat_ws(' ', p.name, p.surname) ilike '%' || btrim(p_query) || '%'
      )
  )
  select
    c.handle,
    c.display_name,
    c.avatar_url,
    case
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'accepted'::public.connection_status
          and ((uc.requester_id = m.user_id and uc.recipient_id = c.user_id)
            or (uc.requester_id = c.user_id and uc.recipient_id = m.user_id))
      ) then 'friends'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'pending'::public.connection_status
          and uc.requester_id = m.user_id and uc.recipient_id = c.user_id
      ) then 'outgoing_pending'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'pending'::public.connection_status
          and uc.requester_id = c.user_id and uc.recipient_id = m.user_id
      ) then 'incoming_pending'
      else 'none'
    end as relationship_state,
    c.allow_friend_requests as can_request
  from candidates c
  cross join me m
  where m.user_id is not null
    and c.user_id <> m.user_id
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = m.user_id and b.blocked_id = c.user_id)
         or (b.blocker_id = c.user_id and b.blocked_id = m.user_id)
    )
    and (
      c.profile_discoverability = 'everyone'
      or exists (
        select 1 from public.user_connections uc
        where uc.status in ('pending'::public.connection_status, 'accepted'::public.connection_status)
          and ((uc.requester_id = m.user_id and uc.recipient_id = c.user_id)
            or (uc.requester_id = c.user_id and uc.recipient_id = m.user_id))
      )
    )
  order by
    case when lower(c.handle) = lower(btrim(p_query)) then 0 else 1 end,
    c.display_name
  limit greatest(1, least(coalesce(p_limit, 12), 20));
$$;


ALTER FUNCTION "public"."fn_search_friend_profiles"("p_query" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_seed_uat_fixtures"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  ORG_A   uuid := 'da7a0000-0000-4000-8000-000000000001';
  ORG_B   uuid := 'da7a0000-0000-4000-8000-000000000002';
  U_OWNER uuid := 'da7a0001-0000-4000-8000-000000000001';
  U_ADMIN uuid := 'da7a0001-0000-4000-8000-000000000002';
  U_FIN   uuid := 'da7a0001-0000-4000-8000-000000000003';
  U_SCAN  uuid := 'da7a0001-0000-4000-8000-000000000004';
  U_CASH  uuid := 'da7a0001-0000-4000-8000-000000000005';
  U_BUY1  uuid := 'da7a0001-0000-4000-8000-000000000006';
  U_BUY2  uuid := 'da7a0001-0000-4000-8000-000000000007';
  U_BOWN  uuid := 'da7a0001-0000-4000-8000-000000000008';
  VENUE   uuid := 'da7a0002-0000-4000-8000-000000000001';
  EV_LIVE uuid := 'da7a0003-0000-4000-8000-000000000001';
  EV_DRFT uuid := 'da7a0003-0000-4000-8000-000000000002';
  EV_BETA uuid := 'da7a0003-0000-4000-8000-000000000003';
  TT_GA   uuid := 'da7a0004-0000-4000-8000-000000000001';
  TT_VIP  uuid := 'da7a0004-0000-4000-8000-000000000002';
  TT_BETA uuid := 'da7a0004-0000-4000-8000-000000000003';
  O_PAID  uuid := 'da7a0005-0000-4000-8000-000000000001';
  O_LIVE  uuid := 'da7a0005-0000-4000-8000-000000000002';
  O_STALE uuid := 'da7a0005-0000-4000-8000-000000000003';
  O_FAIL  uuid := 'da7a0005-0000-4000-8000-000000000004';
  O_REFD  uuid := 'da7a0005-0000-4000-8000-000000000005';
  O_DISC  uuid := 'da7a0005-0000-4000-8000-000000000006';
  P_REFD  uuid := 'da7a0006-0000-4000-8000-000000000002';
  P_DISC  uuid := 'da7a0006-0000-4000-8000-000000000003';
  v_total integer;
  v_item  uuid;
begin
  perform public.fn_teardown_uat_fixtures();

  insert into auth.users (id, email, aud, role, instance_id) values
    (U_OWNER,'uat-owner@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_ADMIN,'uat-admin@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_FIN,  'uat-finance@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_SCAN, 'uat-scanner@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_CASH, 'uat-cashier@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_BUY1, 'uat-buyer1@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_BUY2, 'uat-buyer2@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
    (U_BOWN, 'uat-beta-owner@uat.ticketiv.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000');

  insert into public.organizations (id, name, slug) values
    (ORG_A, 'UAT Alpha Events', 'uat-alpha'),
    (ORG_B, 'UAT Beta Events',  'uat-beta');

  insert into public.org_members (org_id, user_id, role) values
    (ORG_A, U_OWNER, 'organizer_owner'),
    (ORG_A, U_ADMIN, 'organizer_admin'),
    (ORG_A, U_FIN,   'finance'),
    (ORG_A, U_SCAN,  'organizer_scanner'),
    (ORG_A, U_CASH,  'pos'),
    (ORG_B, U_BOWN,  'organizer_owner');

  insert into public.pricing_plans
    (org_id, platform_percent_bps, platform_fixed_cents, processor_percent_bps,
     processor_fixed_cents, platform_fee_payer, processor_fee_payer, currency, active)
  values (ORG_A, 650, 0, 290, 100, 'buyer', 'buyer', 'ZAR', true);

  insert into public.venues (id, name, slug, city)
  values (VENUE, 'UAT Test Grounds', 'uat-test-grounds', 'Mbabane');

  insert into public.events (id, org_id, title, slug, status, visibility, venue_id, starts_at)
  values
    (EV_LIVE, ORG_A, 'UAT Live Event', 'uat-live-event', 'published', 'unlisted', VENUE, now() + interval '30 days'),
    (EV_BETA, ORG_B, 'UAT Beta Event', 'uat-beta-event', 'published', 'unlisted', VENUE, now() + interval '30 days');
  insert into public.events (id, org_id, title, slug, status, visibility)
  values (EV_DRFT, ORG_A, 'UAT Draft Event', 'uat-draft-event', 'draft', 'private');

  insert into public.ticket_types (id, event_id, name, price_cents, quota, currency) values
    (TT_GA,   EV_LIVE, 'UAT General Admission', 10000, 100, 'ZAR'),
    (TT_VIP,  EV_LIVE, 'UAT VIP',               25000, 20, 'ZAR'),
    (TT_BETA, EV_BETA, 'UAT Beta GA',           10000, 50, 'ZAR');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count, fees_paid_by)
  values (O_PAID, ORG_A, U_BUY1, 'uat-buyer1@uat.ticketiv.invalid', 20000, 'ZAR',
          'pending', 20000, 'online', 2, 'buyer');
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status) values
    (O_PAID, TT_GA, 'UAT-ALPHA-GA-0001', 'pending'),
    (O_PAID, TT_GA, 'UAT-ALPHA-GA-0002', 'pending');
  insert into public.payment_attempts (order_id, provider, attempt_no, status, ext_ref)
  values (O_PAID, 'paystack', 1, 'pending', 'uat_ref_paid_0001');

  select total_cents into v_total from public.orders where id = O_PAID;
  perform public.fn_complete_order_payment(
    O_PAID, 'paystack', 'uat_ref_paid_0001', v_total, 'ZAR',
    jsonb_build_object('source', 'uat_fixture'));

  select id into v_item from public.order_items where order_id = O_PAID order by ticket_code limit 1;
  insert into public.scans (event_id, ticket_code, outcome, order_item_id, scanned_at)
  values (EV_LIVE, 'UAT-ALPHA-GA-0001', 'valid', v_item, now() - interval '1 hour');
  update public.order_items set status = 'checked_in' where id = v_item;

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count, hold_expires_at)
  values (O_LIVE, ORG_A, U_BUY2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'ZAR',
          'pending', 10000, 'online', 1, now() + interval '9 minutes');
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (O_LIVE, TT_GA, 'UAT-ALPHA-GA-0003', 'pending');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count, hold_expires_at)
  values (O_STALE, ORG_A, U_BUY2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'ZAR',
          'pending', 10000, 'online', 1, now() - interval '2 hours');
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (O_STALE, TT_GA, 'UAT-ALPHA-GA-0004', 'pending');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count)
  values (O_FAIL, ORG_A, U_BUY2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'ZAR',
          'failed', 10000, 'online', 1);
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (O_FAIL, TT_GA, 'UAT-ALPHA-GA-0005', 'revoked');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count)
  values (O_REFD, ORG_A, U_BUY1, 'uat-buyer1@uat.ticketiv.invalid', 10000, 'ZAR',
          'paid', 10000, 'online', 1);
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (O_REFD, TT_GA, 'UAT-ALPHA-GA-0006', 'issued');
  insert into public.payments (id, order_id, provider, amount_cents, currency,
                               ext_payment_id, status, channel)
  values (P_REFD, O_REFD, 'paystack', 10000, 'ZAR', 'uat_ref_refunded_0001', 'succeeded', 'online');
  insert into public.refunds (payment_id, amount_cents, currency, status)
  values (P_REFD, 10000, 'ZAR', 'requested');
  update public.refunds set status = 'processed' where payment_id = P_REFD;

  insert into public.payout_accounts (org_id, provider, details_encrypted)
  values (ORG_A, 'paystack', 'uat-fixture-not-a-real-account');
  insert into public.payouts (org_id, amount_cents, provider, status)
  values (ORG_A, 5000, 'paystack', 'requested');

  insert into public.orders (id, org_id, buyer_id, buyer_email, total_cents, currency,
                             status, subtotal_cents, channel, item_count)
  values (O_DISC, ORG_A, U_BUY2, 'uat-buyer2@uat.ticketiv.invalid', 10000, 'ZAR',
          'paid', 10000, 'online', 1);
  insert into public.order_items (order_id, ticket_type_id, ticket_code, status)
  values (O_DISC, TT_GA, 'UAT-ALPHA-GA-0007', 'issued');
  insert into public.payments (id, order_id, provider, amount_cents, currency,
                               ext_payment_id, status, channel)
  values (P_DISC, O_DISC, 'paystack', 10000, 'ZAR', 'uat_ref_discrepancy_0001', 'succeeded', 'online');
  delete from public.ledger_entries where order_id = O_DISC;

  return jsonb_build_object(
    'ok', true,
    'currency', 'ZAR',
    'orgs', jsonb_build_object('alpha', ORG_A, 'beta', ORG_B),
    'personas', jsonb_build_object(
      'owner', U_OWNER, 'admin', U_ADMIN, 'finance', U_FIN,
      'scanner', U_SCAN, 'cashier', U_CASH, 'buyer1', U_BUY1,
      'buyer2', U_BUY2, 'beta_owner', U_BOWN),
    'events', jsonb_build_object('live', EV_LIVE, 'draft', EV_DRFT, 'beta', EV_BETA),
    'ticket_types', jsonb_build_object('ga', TT_GA, 'vip', TT_VIP, 'beta_ga', TT_BETA),
    'orders', jsonb_build_object(
      'paid', O_PAID, 'pending_live', O_LIVE, 'pending_stale', O_STALE,
      'failed', O_FAIL, 'refunded', O_REFD, 'discrepancy', O_DISC),
    'counts', jsonb_build_object(
      'orders', (select count(*) from public.orders where org_id in (ORG_A, ORG_B)),
      'payments', (select count(*) from public.payments p
                   join public.orders o on o.id = p.order_id where o.org_id in (ORG_A, ORG_B)),
      'ledger_entries', (select count(*) from public.ledger_entries where org_id in (ORG_A, ORG_B)),
      'scans', (select count(*) from public.scans where event_id = EV_LIVE))
  );
end;
$$;


ALTER FUNCTION "public"."fn_seed_uat_fixtures"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_seller_completed_resales"("p_seller_ids" "uuid"[]) RETURNS TABLE("seller_id" "uuid", "completed_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select rl.seller_id, count(*)::bigint
  from public.resale_listings rl
  where rl.seller_id = any(
    case
      when coalesce(auth.jwt() ->> 'role', '') = 'service_role' then p_seller_ids
      else array[auth.uid()]::uuid[]
    end
  )
    and rl.status in ('sold','completed')
  group by rl.seller_id;
$$;


ALTER FUNCTION "public"."fn_seller_completed_resales"("p_seller_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_default_payment_method"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); perform public.fn_set_default_payment_method_unchecked(p_id); end; $$;


ALTER FUNCTION "public"."fn_set_default_payment_method"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_default_payment_method_unchecked"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.payment_methods
    where id = p_id and user_id = v_user and is_active
  ) then
    raise exception 'payment method not found' using errcode = 'P0002';
  end if;

  update public.payment_methods
  set is_default = (id = p_id),
      updated_at = now()
  where user_id = v_user;
end;
$$;


ALTER FUNCTION "public"."fn_set_default_payment_method_unchecked"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_my_avatar_url"("p_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_set_my_avatar_url"("p_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_my_locale"("p_locale" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_locale is null or btrim(p_locale) = '' then
    raise exception 'locale required' using errcode = '22023';
  end if;

  update public.profiles
  set locale = btrim(p_locale)
  where user_id = v_user;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."fn_set_my_locale"("p_locale" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_settlement_ingest_tick"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_url          text;
  v_secret       text;
  v_request_id   bigint;
  v_resolved     integer := 0;
  v_prev_failure text;
begin
  -- Resolve the prior settlement delivery before queuing another. pg_net's
  -- response table is short-lived, so preserving the result here is the
  -- durable proof that the job actually reached the endpoint.
  with resolved as (
    update public.ops_cron_runs r
       set status_code = resp.status_code,
           ok          = (resp.status_code between 200 and 299),
           error       = nullif(resp.error_msg, ''),
           resolved_at = now()
      from net._http_response resp
     where resp.id = r.request_id
       and r.job = 'settlement-ingest'
       and r.resolved_at is null
    returning r.ok, r.status_code, r.error
  )
  select count(*),
         max(case
               when coalesce(ok, false) then null
               else coalesce(error, 'HTTP ' || coalesce(status_code::text, 'no response'))
             end)
    from resolved
    into v_resolved, v_prev_failure;

  select decrypted_secret into v_url
    from vault.decrypted_secrets
   where name = 'settlement_cron_url';

  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'ops_alert_cron_secret';

  if v_url is null or v_secret is null then
    raise exception 'settlement ingest cron is not configured: missing vault secret(s) %',
      concat_ws(', ',
        case when v_url is null then 'settlement_cron_url' end,
        case when v_secret is null then 'ops_alert_cron_secret' end)
      using errcode = 'P0001',
            hint = 'Seed them with vault.create_secret(<value>, <name>).';
  end if;

  select net.http_get(
           url                  => v_url,
           headers              => jsonb_build_object(
                                     'Authorization', 'Bearer ' || v_secret,
                                     'User-Agent',    'ticketiv-pg-cron/1'
                                   ),
           timeout_milliseconds => 120000
         )
    into v_request_id;

  insert into public.ops_cron_runs (job, request_id)
  values ('settlement-ingest', v_request_id);

  delete from public.ops_cron_runs
   where requested_at < now() - interval '30 days';

  return jsonb_build_object(
    'job',               'settlement-ingest',
    'request_id',        v_request_id,
    'resolved_previous', v_resolved,
    'previous_failure',  v_prev_failure
  );
end;
$$;


ALTER FUNCTION "public"."fn_settlement_ingest_tick"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_settlement_ingest_tick"() IS 'Daily pg_cron entry point for provider settlement ingestion. Resolves the previous delivery, reads URL/secret from Vault, calls the secured endpoint via pg_net, and logs the request.';



CREATE OR REPLACE FUNCTION "public"."fn_start_device_session"("p_device_id" "uuid") RETURNS "public"."device_sessions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare v_session public.device_sessions; v_org uuid;
begin
  perform app.require_claimed_account();
  select org_id into v_org from public.devices where id=p_device_id;
  if v_org is null then raise exception 'device_not_found' using errcode='P0002'; end if;
  if not app.is_org_manager(v_org) then raise exception 'not_authorized' using errcode='42501'; end if;
  insert into public.device_sessions(device_id,user_id)
  values (p_device_id,auth.uid()) returning * into v_session;
  update public.devices set last_seen_at=now() where id=p_device_id;
  return v_session;
end;
$$;


ALTER FUNCTION "public"."fn_start_device_session"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_store_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_endpoint is null or btrim(p_endpoint) = ''
     or p_p256dh is null or btrim(p_p256dh) = ''
     or p_auth is null or btrim(p_auth) = '' then
    raise exception 'incomplete push subscription' using errcode = '22023';
  end if;

  insert into public.push_subscriptions as s (
    user_id, endpoint, p256dh, auth, user_agent, created_at, last_seen_at
  )
  values (
    v_user, p_endpoint, p_p256dh, p_auth, p_user_agent, now(), now()
  )
  on conflict (user_id, endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = coalesce(excluded.user_agent, s.user_agent),
    last_seen_at = now();

  insert into public.user_notification_preferences as p (
    user_id, email_opt_in, sms_opt_in, push_opt_in, in_app_opt_in, updated_at
  )
  values (v_user, true, true, true, true, now())
  on conflict (user_id) do update set
    push_opt_in = true,
    updated_at = now();
end;
$$;


ALTER FUNCTION "public"."fn_store_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tapband_activate_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_attempt_id" "text" DEFAULT NULL::"text", "p_verification_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_credential record;
  v_inventory record;
  v_existing record;
  v_now timestamptz := now();
begin
  select pc.*, ci.org_id, ci.event_id
    into v_credential
  from public.physical_credentials pc
  join public.credential_inventory ci on ci.id = pc.inventory_id
  where pc.id = p_credential_id
  for update of pc;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_credential_not_found', 'message', 'Credential not found');
  end if;

  if not (public.fn_tapband_actor_is_platform_admin(p_actor_id) or v_credential.user_id = p_actor_id) then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to activate credential');
  end if;

  if p_attempt_id is not null then
    select id into v_existing
    from public.credential_taps
    where operator_user_id = p_actor_id
      and client_attempt_id = p_attempt_id
      and tap_type = 'activate'
      and credential_id = p_credential_id
    limit 1;

    if found then
      return jsonb_build_object('ok', true, 'status', v_credential.status, 'credential_id', p_credential_id, 'idempotent', true);
    end if;
  end if;

  if v_credential.status = 'active' then
    return jsonb_build_object('ok', true, 'status', 'active', 'credential_id', p_credential_id, 'idempotent', true);
  end if;

  if v_credential.status <> 'issued' then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_invalid_state', 'message', 'Only issued credentials can be activated');
  end if;

  update public.physical_credentials
  set status = 'active',
      activated_by = p_actor_id,
      activated_at = v_now,
      verification_metadata = verification_metadata || coalesce(p_verification_metadata, '{}'::jsonb),
      updated_at = v_now
  where id = p_credential_id
  returning * into v_credential;

  update public.credential_inventory
  set inventory_status = 'active',
      activated_at = v_now,
      updated_by = p_actor_id
  where id = v_credential.inventory_id
  returning * into v_inventory;

  insert into public.credential_taps (
    credential_id, inventory_id, device_id, device_session_id, operator_user_id,
    tap_type, outcome, reason_code, occurred_at, client_attempt_id, metadata
  )
  values (
    p_credential_id, v_credential.inventory_id, p_device_id, p_session_id, p_actor_id,
    'activate', 'active', 'tapband_credential_active', v_now, p_attempt_id,
    coalesce(p_verification_metadata, '{}'::jsonb)
  );

  perform public.fn_tapband_audit_lifecycle(
    v_inventory.org_id,
    p_actor_id,
    'physical_credentials',
    p_credential_id,
    'update',
    jsonb_build_object('status', 'active')
  );

  return jsonb_build_object('ok', true, 'status', 'active', 'credential_id', p_credential_id, 'idempotent', false);
end
$$;


ALTER FUNCTION "public"."fn_tapband_activate_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_verification_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tapband_actor_can_manage_event"("p_actor_id" "uuid", "p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p_event_id is not null
    and (
      public.fn_tapband_actor_is_platform_admin(p_actor_id)
      or exists (
        select 1
        from public.events e
        join public.org_members om on om.org_id = e.org_id
        where e.id = p_event_id
          and om.user_id = p_actor_id
          and om.role in ('organizer_owner','organizer_admin','organizer_staff','organizer_scanner','admin','organizer','scanner')
      )
      or exists (
        select 1
        from public.event_staff es
        where es.event_id = p_event_id
          and es.user_id = p_actor_id
          and es.active is true
          and es.role in ('organizer_admin','organizer_staff','scanner','organizer_scanner','admin')
      )
    )
$$;


ALTER FUNCTION "public"."fn_tapband_actor_can_manage_event"("p_actor_id" "uuid", "p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tapband_actor_is_platform_admin"("p_actor_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = p_actor_id
      and au.active is true
  )
$$;


ALTER FUNCTION "public"."fn_tapband_actor_is_platform_admin"("p_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tapband_assign_entitlement"("p_credential_id" "uuid", "p_order_item_id" "uuid", "p_event_id" "uuid", "p_actor_id" "uuid", "p_assignment_source" "text" DEFAULT 'support'::"text", "p_attempt_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_credential record;
  v_item record;
  v_entitlement record;
  v_existing record;
  v_now timestamptz := now();
begin
  if not public.fn_tapband_actor_can_manage_event(p_actor_id, p_event_id) then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to assign entitlement');
  end if;

  select * into v_credential
  from public.physical_credentials
  where id = p_credential_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_credential_not_found', 'message', 'Credential not found');
  end if;

  if v_credential.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_credential_inactive', 'message', 'Credential is not active');
  end if;

  select oi.id, oi.holder_user_id, oi.current_owner_id, o.buyer_id, o.org_id, tt.event_id
    into v_item
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  where oi.id = p_order_item_id
  for update of oi;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_order_item_not_found', 'message', 'Order item not found');
  end if;

  if v_item.event_id <> p_event_id then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_wrong_event', 'message', 'Order item belongs to a different event');
  end if;

  select * into v_existing
  from public.credential_entitlements
  where order_item_id = p_order_item_id
    and status = 'active'
  limit 1;

  if found then
    if v_existing.credential_id = p_credential_id then
      return jsonb_build_object('ok', true, 'status', 'active', 'entitlement_id', v_existing.id, 'credential_id', p_credential_id, 'order_item_id', p_order_item_id, 'idempotent', true);
    end if;
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_entitlement_conflict', 'message', 'Order item already has an active credential entitlement');
  end if;

  insert into public.credential_entitlements (
    credential_id,
    order_item_id,
    event_id,
    holder_user_id,
    status,
    valid_from,
    assigned_by,
    assignment_source,
    assigned_at,
    metadata
  )
  values (
    p_credential_id,
    p_order_item_id,
    p_event_id,
    coalesce(v_item.holder_user_id, v_item.current_owner_id, v_item.buyer_id),
    'active',
    v_now,
    p_actor_id,
    p_assignment_source,
    v_now,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_entitlement;

  insert into public.credential_taps (
    credential_id, inventory_id, event_id, order_item_id, operator_user_id,
    tap_type, outcome, reason_code, occurred_at, client_attempt_id, metadata
  )
  values (
    p_credential_id, v_credential.inventory_id, p_event_id, p_order_item_id, p_actor_id,
    case when p_assignment_source = 'outlet_sale' then 'outlet_sale' else 'support_lookup' end,
    'entitlement_assigned', 'tapband_entitlement_assigned', v_now, p_attempt_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  perform public.fn_tapband_audit_lifecycle(
    v_item.org_id,
    p_actor_id,
    'credential_entitlements',
    v_entitlement.id,
    'insert',
    jsonb_build_object('credential_id', p_credential_id, 'order_item_id', p_order_item_id, 'event_id', p_event_id)
  );

  return jsonb_build_object('ok', true, 'status', 'active', 'entitlement_id', v_entitlement.id, 'credential_id', p_credential_id, 'order_item_id', p_order_item_id, 'idempotent', false);
end
$$;


ALTER FUNCTION "public"."fn_tapband_assign_entitlement"("p_credential_id" "uuid", "p_order_item_id" "uuid", "p_event_id" "uuid", "p_actor_id" "uuid", "p_assignment_source" "text", "p_attempt_id" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tapband_audit_lifecycle"("p_org_id" "uuid", "p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "uuid", "p_action" "text", "p_changes" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (
    p_org_id,
    p_actor_id,
    p_table_name,
    p_record_id::text,
    p_action::public.audit_action,
    coalesce(p_changes, '{}'::jsonb) || jsonb_build_object('business_action', 'tapband_lifecycle')
  );
end
$$;


ALTER FUNCTION "public"."fn_tapband_audit_lifecycle"("p_org_id" "uuid", "p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "uuid", "p_action" "text", "p_changes" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tapband_customer_credentials"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'credential_id', pc.id,
    'credential_public_id', pc.credential_public_id,
    'inventory_id', pc.inventory_id,
    'status', pc.status,
    'credential_type', pc.credential_type,
    'chip_family', pc.chip_family,
    'key_version', pc.key_version,
    'issued_at', pc.issued_at,
    'activated_at', pc.activated_at,
    'last_used_at', pc.last_used_at,
    'revoked_at', pc.revoked_at,
    'replacement_of_id', pc.replacement_of_id,
    'replaced_by_id', pc.replaced_by_id
  ) order by pc.created_at desc), '[]'::jsonb)
  from public.physical_credentials pc
  where pc.user_id = p_user_id
$$;


ALTER FUNCTION "public"."fn_tapband_customer_credentials"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tapband_issue_credential"("p_inventory_id" "uuid", "p_user_id" "uuid", "p_credential_public_id" "text", "p_actor_id" "uuid", "p_device_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_attempt_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_inventory record;
  v_credential record;
  v_existing record;
  v_now timestamptz := now();
begin
  if p_actor_id is null or not public.fn_tapband_actor_is_platform_admin(p_actor_id) then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to issue credentials');
  end if;

  if p_attempt_id is not null then
    select credential_id into v_existing
    from public.credential_taps
    where operator_user_id = p_actor_id
      and client_attempt_id = p_attempt_id
      and tap_type = 'provision'
      and outcome = 'issued'
    limit 1;

    if found then
      return jsonb_build_object('ok', true, 'status', 'issued', 'credential_id', v_existing.credential_id, 'idempotent', true);
    end if;
  end if;

  select *
    into v_inventory
  from public.credential_inventory
  where id = p_inventory_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_inventory_not_found', 'message', 'Inventory item not found');
  end if;

  if v_inventory.inventory_status not in ('inspected', 'available', 'reserved') then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_inventory_not_available', 'message', 'Inventory item is not available for issue');
  end if;

  if v_inventory.current_credential_id is not null then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_inventory_already_issued', 'message', 'Inventory item already has a current credential');
  end if;

  insert into public.physical_credentials (
    inventory_id,
    user_id,
    credential_public_id,
    credential_type,
    chip_family,
    key_version,
    authentication_mode,
    status,
    issued_by,
    issued_at,
    verification_metadata
  )
  values (
    p_inventory_id,
    p_user_id,
    p_credential_public_id,
    case when v_inventory.chip_family ilike '%desfire%' then 'desfire_ev3' else 'ntag_pilot' end,
    v_inventory.chip_family,
    v_inventory.key_version,
    case when v_inventory.chip_family ilike '%desfire%' then 'desfire_mutual_auth' else 'server_entitlement' end,
    'issued',
    p_actor_id,
    v_now,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_credential;

  update public.credential_inventory
  set inventory_status = 'issued',
      current_credential_id = v_credential.id,
      issued_at = v_now,
      updated_by = p_actor_id
  where id = p_inventory_id;

  insert into public.credential_taps (
    credential_id, inventory_id, device_id, device_session_id, operator_user_id,
    tap_type, outcome, reason_code, occurred_at, client_attempt_id, metadata
  )
  values (
    v_credential.id, p_inventory_id, p_device_id, p_session_id, p_actor_id,
    'provision', 'issued', 'tapband_credential_issued', v_now, p_attempt_id,
    jsonb_build_object('user_id', p_user_id) || coalesce(p_metadata, '{}'::jsonb)
  );

  perform public.fn_tapband_audit_lifecycle(
    v_inventory.org_id,
    p_actor_id,
    'physical_credentials',
    v_credential.id,
    'insert',
    jsonb_build_object('status', 'issued', 'inventory_id', p_inventory_id)
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'issued',
    'credential_id', v_credential.id,
    'inventory_id', p_inventory_id,
    'user_id', p_user_id,
    'idempotent', false
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_duplicate_credential', 'message', 'Credential already exists or inventory is already active');
end
$$;


ALTER FUNCTION "public"."fn_tapband_issue_credential"("p_inventory_id" "uuid", "p_user_id" "uuid", "p_credential_public_id" "text", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tapband_replace_credential"("p_old_credential_id" "uuid", "p_new_inventory_id" "uuid", "p_new_credential_public_id" "text", "p_actor_id" "uuid", "p_attempt_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_old record;
  v_inventory record;
  v_new record;
  v_existing record;
  v_now timestamptz := now();
begin
  if p_actor_id is null or not public.fn_tapband_actor_is_platform_admin(p_actor_id) then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to replace credentials');
  end if;

  if p_attempt_id is not null then
    select credential_id into v_existing
    from public.credential_taps
    where operator_user_id = p_actor_id
      and client_attempt_id = p_attempt_id
      and tap_type = 'replacement'
      and outcome = 'replacement_issued'
    limit 1;

    if found then
      return jsonb_build_object('ok', true, 'status', 'issued', 'credential_id', v_existing.credential_id, 'idempotent', true);
    end if;
  end if;

  select pc.*, ci.org_id
    into v_old
  from public.physical_credentials pc
  join public.credential_inventory ci on ci.id = pc.inventory_id
  where pc.id = p_old_credential_id
  for update of pc;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_credential_not_found', 'message', 'Old credential not found');
  end if;

  select * into v_inventory
  from public.credential_inventory
  where id = p_new_inventory_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_inventory_not_found', 'message', 'Replacement inventory item not found');
  end if;

  if v_inventory.inventory_status not in ('inspected', 'available', 'reserved') or v_inventory.current_credential_id is not null then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_inventory_not_available', 'message', 'Replacement inventory item is not available');
  end if;

  update public.physical_credentials
  set status = 'replaced',
      revoked_by = p_actor_id,
      revoked_at = v_now,
      revocation_reason = coalesce((p_metadata ->> 'reason'), 'Credential replaced'),
      updated_at = v_now
  where id = p_old_credential_id;

  update public.credential_inventory
  set inventory_status = case when v_old.status = 'lost' then 'lost' else 'retired' end,
      current_credential_id = null,
      retired_at = case when v_old.status = 'lost' then retired_at else v_now end,
      updated_by = p_actor_id
  where id = v_old.inventory_id;

  update public.credential_entitlements
  set status = 'removed',
      removed_by = p_actor_id,
      removed_at = v_now,
      removal_reason = 'Credential replaced',
      updated_at = v_now
  where credential_id = p_old_credential_id
    and status in ('active', 'suspended');

  insert into public.physical_credentials (
    inventory_id,
    user_id,
    credential_public_id,
    credential_type,
    chip_family,
    key_version,
    authentication_mode,
    status,
    issued_by,
    issued_at,
    replacement_of_id,
    verification_metadata
  )
  values (
    p_new_inventory_id,
    v_old.user_id,
    p_new_credential_public_id,
    case when v_inventory.chip_family ilike '%desfire%' then 'desfire_ev3' else 'ntag_pilot' end,
    v_inventory.chip_family,
    v_inventory.key_version,
    case when v_inventory.chip_family ilike '%desfire%' then 'desfire_mutual_auth' else 'server_entitlement' end,
    'issued',
    p_actor_id,
    v_now,
    p_old_credential_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_new;

  update public.physical_credentials
  set replaced_by_id = v_new.id
  where id = p_old_credential_id;

  update public.credential_inventory
  set inventory_status = 'issued',
      current_credential_id = v_new.id,
      issued_at = v_now,
      updated_by = p_actor_id
  where id = p_new_inventory_id;

  insert into public.credential_entitlements (
    credential_id,
    order_item_id,
    event_id,
    holder_user_id,
    status,
    valid_from,
    valid_until,
    assigned_by,
    assignment_source,
    assigned_at,
    metadata
  )
  select
    v_new.id,
    ce.order_item_id,
    ce.event_id,
    ce.holder_user_id,
    'active',
    v_now,
    ce.valid_until,
    p_actor_id,
    'replacement',
    v_now,
    jsonb_build_object('replacement_of_id', p_old_credential_id)
  from public.credential_entitlements ce
  where ce.credential_id = p_old_credential_id
    and ce.status in ('removed', 'expired')
    and ce.removed_at = v_now;

  insert into public.credential_taps (
    credential_id, inventory_id, operator_user_id, tap_type, outcome,
    reason_code, occurred_at, client_attempt_id, metadata
  )
  values (
    v_new.id, p_new_inventory_id, p_actor_id, 'replacement', 'replacement_issued',
    'tapband_replacement_issued', v_now, p_attempt_id,
    jsonb_build_object('replacement_of_id', p_old_credential_id) || coalesce(p_metadata, '{}'::jsonb)
  );

  perform public.fn_tapband_audit_lifecycle(
    v_inventory.org_id,
    p_actor_id,
    'physical_credentials',
    v_new.id,
    'insert',
    jsonb_build_object('status', 'issued', 'replacement_of_id', p_old_credential_id)
  );

  return jsonb_build_object('ok', true, 'status', 'issued', 'credential_id', v_new.id, 'replacement_of_id', p_old_credential_id, 'idempotent', false);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_replacement_conflict', 'message', 'Replacement would create a duplicate active entitlement or credential');
end
$$;


ALTER FUNCTION "public"."fn_tapband_replace_credential"("p_old_credential_id" "uuid", "p_new_inventory_id" "uuid", "p_new_credential_public_id" "text", "p_actor_id" "uuid", "p_attempt_id" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tapband_resolve_credential_for_event"("p_credential_public_id" "text", "p_event_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_attempt_id" "text" DEFAULT NULL::"text", "p_gate" "text" DEFAULT NULL::"text", "p_scanned_at" timestamp with time zone DEFAULT "now"()) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_credential record;
  v_entitlement record;
  v_existing record;
  v_existing_scan_id uuid := null;
  v_now timestamptz := coalesce(p_scanned_at, now());
  v_authorized boolean := false;
  v_outcome text;
  v_reason text;
  v_order_item_id uuid := null;
  v_ticket_type_name text := null;
  v_ticket_code text := null;
  v_scan_id uuid := null;
  v_scan_outcome text := 'invalid';
  v_scan_ticket_code text;
  v_scan_notes text;
  v_request_hash text := case when p_attempt_id is null then null else 'tapband:' || p_attempt_id end;
  v_presented_hash text := md5(coalesce(p_credential_public_id, ''));
  v_admissible_entitlement_count integer := 0;
begin
  if p_credential_public_id is null or btrim(p_credential_public_id) = '' then
    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', 'tapband_reader_error', 'outcome', 'reader_error', 'message', 'TapBand credential could not be read');
  end if;

  if public.fn_tapband_actor_can_manage_event(p_actor_id, p_event_id) then
    v_authorized := true;
  end if;

  if not v_authorized and p_device_id is not null and p_session_id is not null and exists (
    select 1
    from public.device_sessions ds
    join public.devices d on d.id = ds.device_id
    join public.events e on e.id = p_event_id
    where ds.id = p_session_id
      and ds.device_id = p_device_id
      and ds.ended_at is null
      and d.org_id = e.org_id
      and d.event_id = p_event_id
      and d.device_role in ('organizer_scanner', 'organizer_kiosk')
  ) then
    v_authorized := true;

    update public.devices
    set last_seen_at = now()
    where id = p_device_id;
  end if;

  if not v_authorized then
    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', 'tapband_unauthorized', 'outcome', 'unauthorized', 'message', 'Not authorized to resolve credential for this event');
  end if;

  if p_attempt_id is not null then
    select * into v_existing
    from public.credential_taps
    where client_attempt_id = p_attempt_id
      and tap_type in ('identify', 'check_in')
      and (
        (p_actor_id is not null and operator_user_id = p_actor_id)
        or (p_actor_id is null and p_device_id is not null and device_id = p_device_id)
      )
    limit 1;

    if found then
      select id into v_existing_scan_id
      from public.scans
      where request_hash = v_request_hash
      limit 1;

      return jsonb_build_object(
        'ok', v_existing.outcome = 'valid',
        'valid', v_existing.outcome = 'valid',
        'reason_code', v_existing.reason_code,
        'outcome', v_existing.outcome,
        'credential_id', v_existing.credential_id,
        'inventory_id', v_existing.inventory_id,
        'event_id', v_existing.event_id,
        'order_item_id', v_existing.order_item_id,
        'scan_id', v_existing_scan_id,
        'idempotent', true
      );
    end if;
  end if;

  select pc.*
    into v_credential
  from public.physical_credentials pc
  where pc.credential_public_id = p_credential_public_id
  limit 1;

  if not found then
    v_outcome := 'unknown';
    v_reason := 'tapband_unknown';
    v_scan_ticket_code := 'tapband:' || left(v_presented_hash, 16);
    v_scan_notes := 'TapBand credential not found';

    insert into public.credential_taps (
      event_id, device_id, device_session_id, operator_user_id, presented_credential_hash,
      tap_type, outcome, reason_code, occurred_at, client_attempt_id
    )
    values (
      p_event_id, p_device_id, p_session_id, p_actor_id, v_presented_hash,
      'identify', v_outcome, v_reason, v_now, p_attempt_id
    );

    insert into public.scans
      (event_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_scan_ticket_code, 'invalid', p_device_id, p_session_id, p_gate, v_now, v_scan_notes, v_request_hash)
    returning id into v_scan_id;

    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', v_reason, 'outcome', v_outcome, 'message', 'TapBand credential not found', 'scan_id', v_scan_id);
  end if;

  if v_credential.status <> 'active' then
    v_outcome := v_credential.status;
    v_reason := 'tapband_' || v_credential.status;
  else
    select count(*)::integer into v_admissible_entitlement_count
    from public.credential_entitlements ce
    join public.order_items oi on oi.id = ce.order_item_id
    join public.orders o on o.id = oi.order_id
    where ce.credential_id = v_credential.id
      and ce.event_id = p_event_id
      and ce.status = 'active'
      and ce.valid_from <= v_now
      and (ce.valid_until is null or ce.valid_until > v_now)
      and o.status = 'paid'
      and oi.status not in ('checked_in', 'revoked', 'refunded')
      and oi.checked_in_at is null;

    if v_admissible_entitlement_count > 1 then
      v_outcome := 'multiple_entitlements';
      v_reason := 'tapband_multiple_entitlements';
    else
      select ce.id as entitlement_id,
             ce.order_item_id,
             oi.ticket_code,
             oi.status as order_item_status,
             oi.checked_in_at,
             o.status as order_status,
             tt.name as ticket_type_name
        into v_entitlement
      from public.credential_entitlements ce
      join public.order_items oi on oi.id = ce.order_item_id
      join public.orders o on o.id = oi.order_id
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      where ce.credential_id = v_credential.id
        and ce.event_id = p_event_id
        and ce.status = 'active'
        and ce.valid_from <= v_now
        and (ce.valid_until is null or ce.valid_until > v_now)
      order by
        case
          when o.status = 'paid'
            and oi.status not in ('checked_in', 'revoked', 'refunded')
            and oi.checked_in_at is null
          then 0
          else 1
        end,
        ce.assigned_at
      limit 1
      for update of oi;

      if not found then
        v_outcome := 'no_entitlement';
        v_reason := 'tapband_no_entitlement';
      else
        v_order_item_id := v_entitlement.order_item_id;
        v_ticket_type_name := v_entitlement.ticket_type_name;
        v_ticket_code := v_entitlement.ticket_code;

        if v_entitlement.order_status <> 'paid' then
          v_outcome := 'not_paid';
          v_reason := 'tapband_not_paid';
        elsif v_entitlement.order_item_status in ('revoked', 'refunded') then
          v_outcome := v_entitlement.order_item_status;
          v_reason := 'tapband_ticket_' || v_entitlement.order_item_status;
        elsif v_entitlement.order_item_status = 'checked_in' or v_entitlement.checked_in_at is not null then
          v_outcome := 'already_used';
          v_reason := 'tapband_already_used';
        else
          v_outcome := 'valid';
          v_reason := 'tapband_valid_entitlement';
        end if;
      end if;
    end if;
  end if;

  insert into public.credential_taps (
    credential_id, inventory_id, event_id, order_item_id, device_id, device_session_id,
    operator_user_id, tap_type, outcome, reason_code, occurred_at, client_attempt_id
  )
  values (
    v_credential.id,
    v_credential.inventory_id,
    p_event_id,
    v_order_item_id,
    p_device_id,
    p_session_id,
    p_actor_id,
    'check_in',
    v_outcome,
    v_reason,
    v_now,
    p_attempt_id
  );

  v_scan_outcome := case
    when v_outcome = 'valid' then 'valid'
    when v_outcome = 'already_used' then 'already_used'
    when v_outcome in ('revoked', 'lost', 'replaced', 'retired', 'destroyed', 'defective', 'refunded') then 'revoked'
    else 'invalid'
  end;
  v_scan_ticket_code := coalesce(v_ticket_code, 'tapband:' || left(v_presented_hash, 16));
  v_scan_notes := 'TapBand: ' || v_reason;

  insert into public.scans
    (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
  values
    (p_event_id, v_order_item_id, v_scan_ticket_code, v_scan_outcome, p_device_id, p_session_id, p_gate, v_now, v_scan_notes, v_request_hash)
  returning id into v_scan_id;

  if v_outcome = 'valid' and v_order_item_id is not null then
    update public.order_items
    set status = 'checked_in',
        checked_in_at = v_now,
        updated_at = v_now
    where id = v_order_item_id;

    update public.physical_credentials
    set last_used_at = v_now,
        updated_at = v_now
    where id = v_credential.id;
  end if;

  return jsonb_build_object(
    'ok', v_outcome = 'valid',
    'valid', v_outcome = 'valid',
    'reason_code', v_reason,
    'outcome', v_outcome,
    'credential_id', v_credential.id,
    'inventory_id', v_credential.inventory_id,
    'event_id', p_event_id,
    'order_item_id', v_order_item_id,
    'scan_id', v_scan_id,
    'ticket_type_name', v_ticket_type_name,
    'checked_in_at', case when v_outcome = 'valid' then v_now else null end
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'valid', false, 'reason_code', 'tapband_attempt_conflict', 'outcome', 'attempt_conflict', 'message', 'TapBand attempt was already processed');
end
$$;


ALTER FUNCTION "public"."fn_tapband_resolve_credential_for_event"("p_credential_public_id" "text", "p_event_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_gate" "text", "p_scanned_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tapband_revoke_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_reason" "text", "p_new_status" "text" DEFAULT 'revoked'::"text", "p_attempt_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_credential record;
  v_inventory record;
  v_now timestamptz := now();
  v_status text := coalesce(nullif(p_new_status, ''), 'revoked');
begin
  select pc.*, ci.org_id
    into v_credential
  from public.physical_credentials pc
  join public.credential_inventory ci on ci.id = pc.inventory_id
  where pc.id = p_credential_id
  for update of pc;

  if not found then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_credential_not_found', 'message', 'Credential not found');
  end if;

  if v_status not in ('revoked', 'lost', 'replaced', 'defective', 'retired', 'destroyed') then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_invalid_status', 'message', 'Unsupported revocation status');
  end if;

  if not (
    public.fn_tapband_actor_is_platform_admin(p_actor_id)
    or (v_status = 'lost' and v_credential.user_id = p_actor_id)
  ) then
    return jsonb_build_object('ok', false, 'reason_code', 'tapband_unauthorized', 'message', 'Not authorized to revoke credential');
  end if;

  if v_credential.status in ('revoked', 'lost', 'replaced', 'defective', 'retired', 'destroyed') then
    return jsonb_build_object('ok', true, 'status', v_credential.status, 'credential_id', p_credential_id, 'idempotent', true);
  end if;

  update public.physical_credentials
  set status = v_status,
      revoked_by = p_actor_id,
      revoked_at = v_now,
      revocation_reason = p_reason,
      updated_at = v_now
  where id = p_credential_id
  returning * into v_credential;

  update public.credential_inventory
  set inventory_status = case when v_status = 'replaced' then 'retired' else v_status end,
      current_credential_id = null,
      retired_at = case when v_status in ('retired','destroyed','replaced') then v_now else retired_at end,
      updated_by = p_actor_id
  where id = v_credential.inventory_id
  returning * into v_inventory;

  update public.credential_entitlements
  set status = 'removed',
      removed_by = p_actor_id,
      removed_at = v_now,
      removal_reason = p_reason,
      updated_at = v_now
  where credential_id = p_credential_id
    and status in ('active', 'suspended');

  insert into public.credential_taps (
    credential_id, inventory_id, operator_user_id, tap_type, outcome,
    reason_code, occurred_at, client_attempt_id, metadata
  )
  values (
    p_credential_id, v_credential.inventory_id, p_actor_id, 'revoke_check', v_status,
    'tapband_credential_' || v_status, v_now, p_attempt_id,
    jsonb_build_object('reason', p_reason) || coalesce(p_metadata, '{}'::jsonb)
  );

  perform public.fn_tapband_audit_lifecycle(
    v_inventory.org_id,
    p_actor_id,
    'physical_credentials',
    p_credential_id,
    'update',
    jsonb_build_object('status', v_status, 'reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'status', v_status, 'credential_id', p_credential_id, 'idempotent', false);
end
$$;


ALTER FUNCTION "public"."fn_tapband_revoke_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_reason" "text", "p_new_status" "text", "p_attempt_id" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_teardown_uat_fixtures"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_orgs uuid[] := array[
    'da7a0000-0000-4000-8000-000000000001'::uuid,
    'da7a0000-0000-4000-8000-000000000002'::uuid
  ];
  v_users uuid[] := array[
    'da7a0001-0000-4000-8000-000000000001'::uuid,
    'da7a0001-0000-4000-8000-000000000002'::uuid,
    'da7a0001-0000-4000-8000-000000000003'::uuid,
    'da7a0001-0000-4000-8000-000000000004'::uuid,
    'da7a0001-0000-4000-8000-000000000005'::uuid,
    'da7a0001-0000-4000-8000-000000000006'::uuid,
    'da7a0001-0000-4000-8000-000000000007'::uuid,
    'da7a0001-0000-4000-8000-000000000008'::uuid
  ];
  v_venue uuid := 'da7a0002-0000-4000-8000-000000000001';
  v_orders integer;
begin
  select count(*) into v_orders from public.orders where org_id = any(v_orgs);

  delete from public.scans s
   where s.event_id in (select id from public.events where org_id = any(v_orgs));
  delete from public.ledger_entries where org_id = any(v_orgs);
  delete from public.refund_items ri
   where ri.refund_id in (
     select r.id from public.refunds r join public.payments p on p.id = r.payment_id
     where p.order_id in (select id from public.orders where org_id = any(v_orgs)));
  delete from public.refunds r
   where r.payment_id in (select p.id from public.payments p
     where p.order_id in (select id from public.orders where org_id = any(v_orgs)));
  delete from public.payment_outbox
   where order_id in (select id from public.orders where org_id = any(v_orgs));
  delete from public.payment_attempts
   where order_id in (select id from public.orders where org_id = any(v_orgs));
  delete from public.payments
   where order_id in (select id from public.orders where org_id = any(v_orgs));
  delete from public.order_items
   where order_id in (select id from public.orders where org_id = any(v_orgs));
  delete from public.orders where org_id = any(v_orgs);
  delete from public.payouts where org_id = any(v_orgs);
  delete from public.payout_accounts where org_id = any(v_orgs);
  delete from public.devices where org_id = any(v_orgs);
  delete from public.seat_holds
   where event_id in (select id from public.events where org_id = any(v_orgs));
  delete from public.ticket_types
   where event_id in (select id from public.events where org_id = any(v_orgs));
  delete from public.events where org_id = any(v_orgs);
  delete from public.pricing_plans where org_id = any(v_orgs);
  delete from public.org_members where org_id = any(v_orgs);
  delete from public.organizations where id = any(v_orgs);
  delete from public.venues where id = v_venue;
  delete from public.notifications where user_id = any(v_users);
  delete from public.profiles where user_id = any(v_users);
  delete from auth.users where id = any(v_users);

  return jsonb_build_object('ok', true, 'removed', jsonb_build_object('orders_removed', v_orders));
end;
$$;


ALTER FUNCTION "public"."fn_teardown_uat_fixtures"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_ticket_is_transferable"("p_order_item_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.id = p_order_item_id
      AND (
        oi.checked_in_at IS NOT NULL
        OR oi.revoked_at IS NOT NULL
        OR oi.refunded_at IS NOT NULL
      )
  );
$$;


ALTER FUNCTION "public"."fn_ticket_is_transferable"("p_order_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_ticket_type_remaining"("p_event_id" "uuid") RETURNS TABLE("ticket_type_id" "uuid", "remaining" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    tt.id,
    greatest(
      0,
      least(
        tt.quota - coalesce(reserved.all_channels, 0),
        case
          when channels.has_channels and online.ticket_type_id is null then 0
          when online.quota is null then tt.quota - coalesce(reserved.all_channels, 0)
          else online.quota - coalesce(reserved.online, 0)
        end
      )
    )::integer
  from public.ticket_types tt
  left join public.ticket_type_channels online
    on online.ticket_type_id = tt.id
   and online.channel = 'online'::public.sales_channel
  left join lateral (
    select exists (
      select 1
      from public.ticket_type_channels configured
      where configured.ticket_type_id = tt.id
    ) as has_channels
  ) channels on true
  left join lateral (
    select
      count(*)::integer as all_channels,
      count(*) filter (where o.channel = 'online'::public.sales_channel)::integer as online
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = tt.id
      and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
      and (
        o.status = 'paid'
        or (
          o.status = 'pending'
          and (o.hold_expires_at is null or o.hold_expires_at > now())
        )
      )
  ) reserved on true
  where tt.event_id = p_event_id;
$$;


ALTER FUNCTION "public"."fn_ticket_type_remaining"("p_event_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_ticket_type_remaining"("p_event_id" "uuid") IS 'Public online availability by ticket type, bounded by total and online-channel quota.';



CREATE OR REPLACE FUNCTION "public"."fn_toggle_favourite"("p_event_id" "uuid", "p_save" boolean) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_save THEN
    INSERT INTO event_favourites (user_id, event_id)
    VALUES (v_user_id, p_event_id)
    ON CONFLICT ON CONSTRAINT event_favourites_user_id_event_id_key DO NOTHING;
  ELSE
    DELETE FROM event_favourites
    WHERE user_id = v_user_id AND event_id = p_event_id;
  END IF;

  RETURN json_build_object('saved', p_save);
END;
$$;


ALTER FUNCTION "public"."fn_toggle_favourite"("p_event_id" "uuid", "p_save" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_toggle_notification_mute"("p_type" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := (select auth.uid());
  v_muted boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Toggle: if muted, unmute; if not muted, mute
  if exists (
    select 1 from public.notification_mutes
    where user_id = v_user_id and notification_type = p_type
  ) then
    delete from public.notification_mutes
    where user_id = v_user_id and notification_type = p_type;
    v_muted := false;
  else
    insert into public.notification_mutes(user_id, notification_type)
    values(v_user_id, p_type)
    on conflict(user_id, notification_type) do nothing;
    v_muted := true;
  end if;

  return json_build_object('type', p_type, 'muted', v_muted);
end;
$$;


ALTER FUNCTION "public"."fn_toggle_notification_mute"("p_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_touch_event_live_stats_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."fn_touch_event_live_stats_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_touch_tapband_credentials_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end
$$;


ALTER FUNCTION "public"."fn_touch_tapband_credentials_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_touch_tapband_feature_configs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end
$$;


ALTER FUNCTION "public"."fn_touch_tapband_feature_configs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_transition_dispute"("p_dispute_id" "uuid", "p_status" "public"."dispute_status", "p_resolution" "text" DEFAULT NULL::"text", "p_refund_id" "uuid" DEFAULT NULL::"uuid", "p_assigned_to" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."disputes"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_row public.disputes;
begin
  if p_dispute_id is null then raise exception 'dispute_id_required' using errcode='P0001'; end if;
  select * into v_row from public.disputes where id = p_dispute_id for update;
  if not found then raise exception 'dispute_not_found' using errcode='P0002'; end if;
  if v_row.status in ('resolved','rejected') and p_status <> v_row.status then
    raise exception 'dispute_already_closed' using errcode='P0001';
  end if;
  update public.disputes
  set status = p_status,
      resolution = coalesce(nullif(trim(coalesce(p_resolution,'')),''), resolution),
      refund_id = coalesce(p_refund_id, refund_id),
      assigned_to = coalesce(p_assigned_to, assigned_to),
      resolved_at = case when p_status in ('resolved','rejected') then now() else null end
  where id = p_dispute_id returning * into v_row;
  return v_row;
end; $$;


ALTER FUNCTION "public"."fn_transition_dispute"("p_dispute_id" "uuid", "p_status" "public"."dispute_status", "p_resolution" "text", "p_refund_id" "uuid", "p_assigned_to" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_transition_event_status"("p_event_id" "uuid", "p_new_status" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.fn_transition_event_status_unchecked(p_event_id, p_new_status); end; $$;


ALTER FUNCTION "public"."fn_transition_event_status"("p_event_id" "uuid", "p_new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_transition_event_status_unchecked"("p_event_id" "uuid", "p_new_status" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id       uuid := (SELECT auth.uid());
  v_event         events%ROWTYPE;
  v_active_holders integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Require organizer_owner / organizer_admin membership (or platform admin).
  IF NOT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id  = v_event.org_id
      AND user_id = v_user_id
      AND role    = ANY(ARRAY['organizer_owner', 'organizer_admin']::app_role[])
  ) AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = v_user_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Validate requested transition.
  IF p_new_status NOT IN ('paused', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid target status: %', p_new_status;
  END IF;
  IF p_new_status = 'paused' AND v_event.status::text != 'published' THEN
    RAISE EXCEPTION 'Can only pause a published event (current: %)', v_event.status;
  END IF;
  IF p_new_status = 'published' AND v_event.status::text != 'paused' THEN
    RAISE EXCEPTION 'Can only resume a paused event (current: %)', v_event.status;
  END IF;
  IF p_new_status = 'archived' AND v_event.status::text = 'archived' THEN
    RAISE EXCEPTION 'Event is already archived';
  END IF;

  -- Count active ticket holders (issued + checked_in) for the warning payload.
  SELECT COUNT(*) INTO v_active_holders
  FROM tickets
  WHERE event_id = p_event_id
    AND status IN ('issued', 'checked_in');

  -- Apply the status change.
  UPDATE events
  SET status     = p_new_status::event_status,
      updated_at = now()
  WHERE id = p_event_id;

  RETURN json_build_object(
    'status',          p_new_status,
    'active_holders',  v_active_holders
  );
END;
$$;


ALTER FUNCTION "public"."fn_transition_event_status_unchecked"("p_event_id" "uuid", "p_new_status" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'SZL'::"text" NOT NULL,
    "provider" "text" NOT NULL,
    "destination_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "paid_at" timestamp with time zone,
    "status" "public"."payout_status" DEFAULT 'requested'::"public"."payout_status" NOT NULL,
    CONSTRAINT "payouts_amount_cents_check" CHECK (("amount_cents" >= 0)),
    CONSTRAINT "payouts_currency_iso" CHECK (("currency" ~ '^[A-Z]{3}$'::"text"))
);


ALTER TABLE "public"."payouts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_transition_payout"("p_payout_id" "uuid", "p_new_status" "public"."payout_status", "p_destination_ref" "text" DEFAULT NULL::"text") RETURNS "public"."payouts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare v_payout public.payouts;
begin
  perform app.require_claimed_account();
  if not app.is_platform_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_new_status not in ('processing','paid','failed','cancelled') then raise exception 'invalid_payout_status' using errcode='22023'; end if;
  update public.payouts
  set status = p_new_status,
      destination_ref = coalesce(p_destination_ref, destination_ref),
      paid_at = case when p_new_status = 'paid' then now() else paid_at end
  where id = p_payout_id
  returning * into v_payout;
  if not found then raise exception 'payout_not_found' using errcode='P0002'; end if;
  return v_payout;
end;
$$;


ALTER FUNCTION "public"."fn_transition_payout"("p_payout_id" "uuid", "p_new_status" "public"."payout_status", "p_destination_ref" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refunds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "type" "public"."refund_type" DEFAULT 'full'::"public"."refund_type" NOT NULL,
    "status" "public"."refund_status" DEFAULT 'requested'::"public"."refund_status" NOT NULL,
    "provider_ref" "text",
    "provider_payload" "jsonb",
    "initiated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    CONSTRAINT "refunds_amount_cents_check" CHECK (("amount_cents" >= 0)),
    CONSTRAINT "refunds_currency_iso" CHECK (("currency" ~ '^[A-Z]{3}$'::"text"))
);


ALTER TABLE "public"."refunds" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_transition_refund"("p_refund_id" "uuid", "p_new_status" "public"."refund_status", "p_provider_ref" "text" DEFAULT NULL::"text", "p_provider_payload" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."refunds"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$
declare
  v_refund public.refunds;
  v_org uuid;
  v_is_service boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
begin
  if not v_is_service then
    perform app.require_claimed_account();
  end if;

  select r.* into v_refund
  from public.refunds r
  where r.id = p_refund_id
  for update;

  if not found then
    raise exception 'refund_not_found' using errcode = 'P0002';
  end if;

  select o.org_id into v_org
  from public.payments py
  join public.orders o on o.id = py.order_id
  where py.id = v_refund.payment_id;

  if p_new_status not in ('processing', 'processed', 'failed', 'cancelled') then
    raise exception 'invalid_refund_status' using errcode = '22023';
  end if;

  if p_new_status in ('processed', 'failed') then
    if not (v_is_service or app.is_platform_admin()) then
      raise exception 'provider_or_platform_admin_required' using errcode = '42501';
    end if;
  elsif not (v_is_service or app.is_org_finance_viewer(v_org) or app.is_platform_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.refunds
  set status = p_new_status,
      provider_ref = case
        when v_is_service or app.is_platform_admin()
          then coalesce(p_provider_ref, provider_ref)
        else provider_ref
      end,
      provider_payload = case
        when v_is_service or app.is_platform_admin()
          then coalesce(p_provider_payload, provider_payload)
        else provider_payload
      end,
      processed_at = case
        when p_new_status in ('processed', 'failed', 'cancelled') then now()
        else processed_at
      end
  where id = p_refund_id
  returning * into v_refund;

  return v_refund;
end;
$$;


ALTER FUNCTION "public"."fn_transition_refund"("p_refund_id" "uuid", "p_new_status" "public"."refund_status", "p_provider_ref" "text", "p_provider_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_trg_emit_order_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status::text in ('paid', 'completed', 'fulfilled')
     and (tg_op = 'INSERT' or old.status::text <> new.status::text)
  then
    perform public.fn_enqueue_webhook(
      'order.paid',
      jsonb_build_object(
        'order_id', new.id,
        'org_id', new.org_id,
        'buyer_id', new.buyer_id,
        'total_cents', new.total_cents,
        'currency', new.currency,
        'channel', new.channel,
        'status', new.status
      ),
      new.org_id
    );
  end if;
  return new;
end
$$;


ALTER FUNCTION "public"."fn_trg_emit_order_paid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_trg_emit_payout_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status::text in ('paid', 'completed')
     and (tg_op = 'INSERT' or old.status::text <> new.status::text)
  then
    perform public.fn_enqueue_webhook(
      'payout.paid',
      jsonb_build_object(
        'payout_id', new.id,
        'org_id', new.org_id,
        'amount_cents', new.amount_cents,
        'currency', new.currency,
        'provider', new.provider,
        'destination_ref', new.destination_ref
      ),
      new.org_id
    );
  end if;
  return new;
end
$$;


ALTER FUNCTION "public"."fn_trg_emit_payout_paid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_trg_emit_ticket_transferred"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_org_id uuid;
begin
  if new.status::text in ('accepted', 'completed')
     and (
       tg_op = 'INSERT'
       or old.status::text not in ('accepted', 'completed')
     )
  then
    select tt.event_id, e.org_id
      into v_event_id, v_org_id
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      join public.events e on e.id = tt.event_id
     where oi.id = new.order_item_id;

    perform public.fn_enqueue_webhook(
      'ticket.transferred',
      jsonb_build_object(
        'transfer_id', new.id,
        'order_item_id', new.order_item_id,
        'from_user_id', new.from_user_id,
        'to_user_id', new.to_user_id,
        'event_id', v_event_id
      ),
      v_org_id
    );
  end if;
  return new;
end
$$;


ALTER FUNCTION "public"."fn_trg_emit_ticket_transferred"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_unregister_push_device"("p_service" "text", "p_device_id" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_removed integer;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  with gone as (
    delete from public.push_devices
     where user_id = v_user
       and service = lower(btrim(p_service))::public.push_service
       and device_id = btrim(p_device_id)
    returning 1
  )
  select count(*) from gone into v_removed;

  return v_removed;
end;
$$;


ALTER FUNCTION "public"."fn_unregister_push_device"("p_service" "text", "p_device_id" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finance_reconciliation_issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "detector_key" "text" NOT NULL,
    "entity_key" "text" NOT NULL,
    "org_id" "uuid",
    "order_id" "uuid",
    "payment_id" "uuid",
    "refund_id" "uuid",
    "severity" "text" DEFAULT 'critical'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "runbook_key" "text" DEFAULT 'docs/FINANCE_RECONCILIATION.md'::"text" NOT NULL,
    "owner_user_id" "uuid",
    "first_detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "acknowledged_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolution_note" "text",
    CONSTRAINT "finance_reconciliation_issues_severity_check" CHECK (("severity" = ANY (ARRAY['warning'::"text", 'critical'::"text"]))),
    CONSTRAINT "finance_reconciliation_issues_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'resolved'::"text", 'ignored'::"text"])))
);


ALTER TABLE "public"."finance_reconciliation_issues" OWNER TO "postgres";


COMMENT ON TABLE "public"."finance_reconciliation_issues" IS 'Persistent operator queue for finance/payment reconciliation anomalies. Refreshed by service-role detectors; acknowledged/resolved through a guarded RPC.';



CREATE OR REPLACE FUNCTION "public"."fn_update_finance_reconciliation_issue"("p_issue_id" "uuid", "p_new_status" "text", "p_resolution_note" "text" DEFAULT NULL::"text") RETURNS "public"."finance_reconciliation_issues"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_issue public.finance_reconciliation_issues%rowtype;
  v_actor uuid := auth.uid();
  v_previous_status text;
  v_note text := nullif(btrim(coalesce(p_resolution_note, '')), '');
  v_is_write_admin boolean := false;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_new_status not in ('open', 'acknowledged', 'resolved', 'ignored') then
    raise exception 'invalid_reconciliation_status' using errcode = '22023';
  end if;

  if char_length(coalesce(v_note, '')) > 1000 then
    raise exception 'resolution_note_too_long' using errcode = '22023';
  end if;

  if p_new_status in ('resolved', 'ignored') and v_note is null then
    raise exception 'resolution_note_required' using errcode = '22023';
  end if;

  select * into v_issue
  from public.finance_reconciliation_issues
  where id = p_issue_id
  for update;

  if not found then
    raise exception 'reconciliation_issue_not_found' using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from public.admin_users au
    where au.user_id = v_actor
      and au.active is true
      and au.role_tier::text in ('super_admin', 'finance_admin')
  ) into v_is_write_admin;

  if not (
    v_is_write_admin
    or (v_issue.org_id is not null and app.is_org_finance_viewer(v_issue.org_id))
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  v_previous_status := v_issue.status;

  update public.finance_reconciliation_issues
  set status = p_new_status,
      owner_user_id = case
        when p_new_status in ('acknowledged', 'resolved', 'ignored')
          then coalesce(owner_user_id, v_actor)
        else owner_user_id
      end,
      acknowledged_at = case
        when p_new_status = 'acknowledged' then coalesce(acknowledged_at, now())
        when p_new_status = 'open' then null
        else acknowledged_at
      end,
      resolved_at = case
        when p_new_status in ('resolved', 'ignored') then now()
        when p_new_status = 'open' then null
        else resolved_at
      end,
      resolution_note = case
        when p_new_status = 'open' then null
        when v_note is not null then v_note
        else resolution_note
      end,
      updated_at = now()
  where id = p_issue_id
  returning * into v_issue;

  insert into public.audit_log (
    org_id,
    actor_id,
    table_name,
    record_id,
    action,
    changes
  ) values (
    v_issue.org_id,
    v_actor,
    'finance_reconciliation_issues',
    v_issue.id::text,
    'update'::public.audit_action,
    jsonb_build_object(
      'business_action', 'finance_reconciliation_issue_status_changed',
      'detector_key', v_issue.detector_key,
      'previous_status', v_previous_status,
      'new_status', p_new_status,
      'resolution_note', v_note
    )
  );

  return v_issue;
end;
$$;


ALTER FUNCTION "public"."fn_update_finance_reconciliation_issue"("p_issue_id" "uuid", "p_new_status" "text", "p_resolution_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_update_finance_reconciliation_issue"("p_issue_id" "uuid", "p_new_status" "text", "p_resolution_note" "text") IS 'TICK-340 authenticated operator transition with write-role enforcement, resolution notes, ownership, and atomic audit logging.';



CREATE OR REPLACE FUNCTION "public"."fn_update_my_notification_preferences"("p_email_opt_in" boolean DEFAULT NULL::boolean, "p_sms_opt_in" boolean DEFAULT NULL::boolean, "p_push_opt_in" boolean DEFAULT NULL::boolean, "p_in_app_opt_in" boolean DEFAULT NULL::boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.user_notification_preferences as p (
    user_id, email_opt_in, sms_opt_in, push_opt_in, in_app_opt_in, updated_at
  )
  values (
    v_user,
    coalesce(p_email_opt_in, true),
    coalesce(p_sms_opt_in, true),
    coalesce(p_push_opt_in, true),
    coalesce(p_in_app_opt_in, true),
    now()
  )
  on conflict (user_id) do update set
    email_opt_in = coalesce(p_email_opt_in, p.email_opt_in),
    sms_opt_in = coalesce(p_sms_opt_in, p.sms_opt_in),
    push_opt_in = coalesce(p_push_opt_in, p.push_opt_in),
    in_app_opt_in = coalesce(p_in_app_opt_in, p.in_app_opt_in),
    updated_at = now();
end;
$$;


ALTER FUNCTION "public"."fn_update_my_notification_preferences"("p_email_opt_in" boolean, "p_sms_opt_in" boolean, "p_push_opt_in" boolean, "p_in_app_opt_in" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_update_my_profile"("p_display_name" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text", "p_surname" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); perform public.fn_update_my_profile_unchecked(p_display_name, p_name, p_surname, p_phone); end; $$;


ALTER FUNCTION "public"."fn_update_my_profile"("p_display_name" "text", "p_name" "text", "p_surname" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_update_my_profile_unchecked"("p_display_name" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text", "p_surname" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_name text;
  v_surname text;
begin
  if v_user is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  update public.profiles
  set display_name = nullif(btrim(coalesce(p_display_name, display_name)), ''),
      name = nullif(btrim(coalesce(p_name, name)), ''),
      surname = nullif(btrim(coalesce(p_surname, surname)), ''),
      phone = null
  where user_id = v_user
  returning name, surname into v_name, v_surname;
  if not found then raise exception 'profile not found' using errcode = 'P0002'; end if;
  insert into public.user_private_profiles (user_id, name, surname, phone, updated_at)
  values (v_user, v_name, v_surname, nullif(btrim(coalesce(p_phone, '')), ''), now())
  on conflict (user_id) do update set
    name = coalesce(nullif(btrim(p_name), ''), public.user_private_profiles.name, excluded.name),
    surname = coalesce(nullif(btrim(p_surname), ''), public.user_private_profiles.surname, excluded.surname),
    phone = coalesce(nullif(btrim(p_phone), ''), public.user_private_profiles.phone),
    updated_at = now();
end;
$$;


ALTER FUNCTION "public"."fn_update_my_profile_unchecked"("p_display_name" "text", "p_name" "text", "p_surname" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_profile_discoverability not in ('everyone', 'friends') then
    raise exception 'invalid profile discoverability';
  end if;

  insert into public.user_privacy_settings (
    user_id,
    profile_discoverability,
    allow_friend_requests,
    show_events_going_to_friends,
    allow_friend_suggestions,
    updated_at
  ) values (
    v_me,
    p_profile_discoverability,
    p_allow_friend_requests,
    p_show_events_going_to_friends,
    p_allow_friend_suggestions,
    now()
  )
  on conflict (user_id) do update set
    profile_discoverability = excluded.profile_discoverability,
    allow_friend_requests = excluded.allow_friend_requests,
    show_events_going_to_friends = excluded.show_events_going_to_friends,
    allow_friend_suggestions = excluded.allow_friend_suggestions,
    updated_at = now();
end;
$$;


ALTER FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean, "p_discover_by_phone" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare v_me uuid := (select auth.uid());
begin
  if v_me is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_profile_discoverability not in ('everyone', 'friends') then
    raise exception 'invalid profile discoverability' using errcode = '22023';
  end if;
  insert into public.user_privacy_settings (
    user_id, profile_discoverability, allow_friend_requests,
    show_events_going_to_friends, allow_friend_suggestions, discover_by_phone, updated_at
  ) values (
    v_me, p_profile_discoverability, p_allow_friend_requests,
    p_show_events_going_to_friends, p_allow_friend_suggestions, p_discover_by_phone, now()
  )
  on conflict (user_id) do update set
    profile_discoverability = excluded.profile_discoverability,
    allow_friend_requests = excluded.allow_friend_requests,
    show_events_going_to_friends = excluded.show_events_going_to_friends,
    allow_friend_suggestions = excluded.allow_friend_suggestions,
    discover_by_phone = excluded.discover_by_phone,
    updated_at = now();
end;
$$;


ALTER FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean, "p_discover_by_phone" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_upsert_provider_settlement"("p_provider" "text", "p_ext_settlement_id" "text", "p_status" "text", "p_currency" "text", "p_gross_cents" integer, "p_fees_cents" integer, "p_net_cents" integer, "p_settled_at" timestamp with time zone, "p_payload" "jsonb" DEFAULT NULL::"jsonb", "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_settlement_id uuid; v_item_count integer := 0; v_matched integer := 0;
begin
  if coalesce(trim(p_provider), '') = '' then raise exception 'provider_required' using errcode='P0001'; end if;
  if coalesce(trim(p_ext_settlement_id), '') = '' then raise exception 'ext_settlement_id_required' using errcode='P0001'; end if;

  insert into public.provider_settlements (
    provider, ext_settlement_id, status, currency, gross_cents, fees_cents, net_cents, settled_at, payload, ingested_at
  ) values (
    p_provider, p_ext_settlement_id, p_status, p_currency,
    coalesce(p_gross_cents,0), coalesce(p_fees_cents,0), coalesce(p_net_cents,0), p_settled_at, p_payload, now()
  )
  on conflict (provider, ext_settlement_id) do update
    set status=excluded.status, currency=excluded.currency, gross_cents=excluded.gross_cents,
        fees_cents=excluded.fees_cents, net_cents=excluded.net_cents, settled_at=excluded.settled_at,
        payload=excluded.payload, ingested_at=now()
  returning id into v_settlement_id;

  if p_items is not null and jsonb_typeof(p_items) = 'array' then
    insert into public.provider_settlement_items (settlement_id, ext_payment_id, payment_id, amount_cents, fee_cents, payload)
    select v_settlement_id, item->>'extPaymentId',
           (select p.id from public.payments p where p.provider = p_provider and p.ext_payment_id = item->>'extPaymentId' limit 1),
           coalesce((item->>'amountCents')::integer, 0),
           coalesce((item->>'feeCents')::integer, 0),
           item
    from jsonb_array_elements(p_items) as item
    where coalesce(item->>'extPaymentId','') <> ''
    on conflict (settlement_id, ext_payment_id) do update
      set payment_id=excluded.payment_id, amount_cents=excluded.amount_cents,
          fee_cents=excluded.fee_cents, payload=excluded.payload;

    select count(*), count(*) filter (where payment_id is not null) into v_item_count, v_matched
    from public.provider_settlement_items where settlement_id = v_settlement_id;
  end if;

  return jsonb_build_object('settlement_id', v_settlement_id, 'items', v_item_count,
    'matched_payments', v_matched, 'unmatched_items', v_item_count - v_matched);
end;
$$;


ALTER FUNCTION "public"."fn_upsert_provider_settlement"("p_provider" "text", "p_ext_settlement_id" "text", "p_status" "text", "p_currency" "text", "p_gross_cents" integer, "p_fees_cents" integer, "p_net_cents" integer, "p_settled_at" timestamp with time zone, "p_payload" "jsonb", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_user_connections_set_responded_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    NEW.responded_at = now();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_user_connections_set_responded_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_webhook_endpoints_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin new.updated_at := now(); return new; end
$$;


ALTER FUNCTION "public"."fn_webhook_endpoints_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_kpis"("p_event_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.get_event_kpis_unchecked(p_event_id); end; $$;


ALTER FUNCTION "public"."get_event_kpis"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_kpis_unchecked"("p_event_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  result json;
begin
  if not public.can_manage_event(p_event_id, public.current_user_uid()) then
    raise exception 'not authorized to view event KPIs' using errcode = '42501';
  end if;

  select json_build_object(
    'orders_count', count(distinct oi.order_id),
    'tickets_sold', count(oi.id) filter (where oi.status <> 'revoked' and oi.revoked_at is null),
    'gross_revenue_cents', coalesce(
      sum(tt.price_cents) filter (where oi.status <> 'revoked' and oi.revoked_at is null), 0),
    'check_ins', count(oi.id) filter (where oi.checked_in_at is not null)
  )
  into result
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.orders o on o.id = oi.order_id
  where tt.event_id = p_event_id
    and o.status = 'paid';

  return result;
end;
$$;


ALTER FUNCTION "public"."get_event_kpis_unchecked"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organizer_kpis"("p_range" "text" DEFAULT '30d'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.get_organizer_kpis_unchecked(p_range); end; $$;


ALTER FUNCTION "public"."get_organizer_kpis"("p_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organizer_kpis_unchecked"("p_range" "text" DEFAULT '30d'::"text") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  since timestamptz;
  result json;
begin
  since := case p_range
    when '7d' then now() - interval '7 days'
    when '30d' then now() - interval '30 days'
    when '90d' then now() - interval '90 days'
    else '-infinity'::timestamptz
  end;

  with my_orgs as (
    select public.current_user_org_ids() as org_id
  ),
  paid as (
    select o.*
    from public.orders o
    where o.org_id in (select org_id from my_orgs)
      and o.status = 'paid'
      and o.created_at >= since
  )
  select json_build_object(
    'events_count', (select count(*) from public.events e where e.org_id in (select org_id from my_orgs)),
    'tickets_sold', (
      select count(*) from public.order_items oi
      join paid p on p.id = oi.order_id
      where oi.status <> 'revoked' and oi.revoked_at is null),
    'gross_revenue_cents', (select coalesce(sum(total_cents), 0) from paid),
    'net_revenue_cents', (
      select coalesce(sum(total_cents
        - coalesce(platform_fee_cents, 0)
        - coalesce(processor_fee_cents, 0)), 0) from paid),
    'check_ins', (
      select count(*) from public.order_items oi
      join paid p on p.id = oi.order_id
      where oi.checked_in_at is not null),
    'currency', coalesce((select currency from paid limit 1), 'SZL')
  )
  into result;

  return result;
end;
$$;


ALTER FUNCTION "public"."get_organizer_kpis_unchecked"("p_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_profile"("p_handle" "text") RETURNS TABLE("handle" "text", "display_name" "text", "avatar_url" "text", "joined_at" timestamp with time zone, "is_owner" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  select
    h.handle,
    coalesce(
      nullif(btrim(p.display_name), ''),
      nullif(btrim(concat_ws(' ', p.name, p.surname)), ''),
      h.handle
    ) as display_name,
    p.avatar_url,
    p.created_at as joined_at,
    (select auth.uid()) = h.user_id as is_owner
  from public.user_handles h
  join public.profiles p on p.user_id = h.user_id
  where lower(h.handle) = lower(btrim(p_handle))
    and btrim(p_handle) ~ '^[A-Za-z0-9_]{3,30}$'
  limit 1;
$_$;


ALTER FUNCTION "public"."get_public_profile"("p_handle" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_public_profile"("p_handle" "text") IS 'Privacy-safe public profile lookup by permanent handle. Returns identity fields only.';



CREATE OR REPLACE FUNCTION "public"."get_social_public_profile"("p_handle" "text") RETURNS TABLE("handle" "text", "display_name" "text", "avatar_url" "text", "joined_at" timestamp with time zone, "is_owner" boolean, "relationship_state" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  with target as (
    select
      h.user_id,
      h.handle,
      p.display_name,
      p.name,
      p.surname,
      p.avatar_url,
      p.created_at,
      coalesce(s.profile_discoverability, 'everyone') as profile_discoverability
    from public.user_handles h
    join public.profiles p on p.user_id = h.user_id
    left join public.user_privacy_settings s on s.user_id = h.user_id
    where lower(h.handle) = lower(btrim(p_handle))
      and btrim(p_handle) ~ '^[A-Za-z0-9_]{3,30}$'
    limit 1
  ), me as (
    select auth.uid() as user_id
  )
  select
    t.handle,
    coalesce(
      nullif(btrim(t.display_name), ''),
      nullif(btrim(concat_ws(' ', t.name, t.surname)), ''),
      t.handle
    ) as display_name,
    t.avatar_url,
    t.created_at as joined_at,
    m.user_id = t.user_id as is_owner,
    case
      when m.user_id is null or m.user_id = t.user_id then 'none'
      when exists (
        select 1 from public.user_blocks b
        where b.blocker_id = m.user_id and b.blocked_id = t.user_id
      ) then 'blocked_by_me'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'accepted'::public.connection_status
          and ((uc.requester_id = m.user_id and uc.recipient_id = t.user_id)
            or (uc.requester_id = t.user_id and uc.recipient_id = m.user_id))
      ) then 'friends'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'pending'::public.connection_status
          and uc.requester_id = m.user_id and uc.recipient_id = t.user_id
      ) then 'outgoing_pending'
      when exists (
        select 1 from public.user_connections uc
        where uc.status = 'pending'::public.connection_status
          and uc.requester_id = t.user_id and uc.recipient_id = m.user_id
      ) then 'incoming_pending'
      else 'none'
    end as relationship_state
  from target t
  cross join me m
  where not exists (
    select 1 from public.user_blocks b
    where b.blocker_id = t.user_id and b.blocked_id = m.user_id
  )
  and (
    t.profile_discoverability = 'everyone'
    or m.user_id = t.user_id
    or exists (
      select 1 from public.user_blocks b
      where b.blocker_id = m.user_id and b.blocked_id = t.user_id
    )
    or exists (
      select 1 from public.user_connections uc
      where uc.status in ('pending'::public.connection_status, 'accepted'::public.connection_status)
        and ((uc.requester_id = m.user_id and uc.recipient_id = t.user_id)
          or (uc.requester_id = t.user_id and uc.recipient_id = m.user_id))
    )
  )
  limit 1;
$_$;


ALTER FUNCTION "public"."get_social_public_profile"("p_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ticket_type_event"("ticket_type_uuid" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
  SELECT event_id FROM public.ticket_types WHERE id = ticket_type_uuid;
$$;


ALTER FUNCTION "public"."get_ticket_type_event"("ticket_type_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_org"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT om.org_id
  FROM public.org_members om
  WHERE om.user_id = (SELECT auth.uid())
  ORDER BY om.created_at ASC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_org"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_org"() IS 'Calling user''s primary org (earliest org_members membership). Multi-org callers should use get_user_orgs().';



CREATE OR REPLACE FUNCTION "public"."get_user_orgs"() RETURNS TABLE("org_id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
  SELECT org_id FROM public.org_members WHERE user_id = public.current_user_uid();
$$;


ALTER FUNCTION "public"."get_user_orgs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") RETURNS TABLE("org_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT org_id FROM public.org_members WHERE user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_seeded_super_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
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


ALTER FUNCTION "public"."grant_seeded_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_scanner_checkin_only"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if old.status in ('issued'::public.order_item_status, 'transferred'::public.order_item_status)
     and new.status = 'checked_in'::public.order_item_status
     and old.checked_in_at is null
     and new.checked_in_at is not null
     and (to_jsonb(new) - array['status', 'checked_in_at', 'updated_at'])
         = (to_jsonb(old) - array['status', 'checked_in_at', 'updated_at'])
  then return new; end if;

  if old.current_owner_id is null
     and new.current_owner_id is not null
     and new.status = old.status
     and exists (
       select 1 from public.orders o
       where o.id = new.order_id and o.buyer_id = new.current_owner_id
     )
     and (to_jsonb(new) - array['current_owner_id', 'updated_at'])
         = (to_jsonb(old) - array['current_owner_id', 'updated_at'])
  then return new; end if;

  if old.status in ('issued'::public.order_item_status, 'transferred'::public.order_item_status)
     and new.status = 'transferred'::public.order_item_status
     and new.current_owner_id is not null
     and new.current_owner_id is distinct from old.current_owner_id
     and old.checked_in_at is null
     and new.checked_in_at is null
     and old.revoked_at is not distinct from new.revoked_at
     and old.refunded_at is not distinct from new.refunded_at
     and (to_jsonb(new) - array['status', 'current_owner_id', 'updated_at'])
         = (to_jsonb(old) - array['status', 'current_owner_id', 'updated_at'])
  then return new; end if;

  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then return new; end if;

  raise exception 'Ticket mutations must use an authorized check-in or transfer path';
end;
$$;


ALTER FUNCTION "public"."guard_scanner_checkin_only"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_name text;
  v_surname text;
  v_display_name text;
  v_phone text;
  v_handle_base text;
  v_handle text;
begin
  v_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'given_name',
    new.raw_user_meta_data ->> 'name'
  )), '');

  v_surname := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'surname',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'family_name'
  )), '');

  v_display_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    concat_ws(' ', v_name, v_surname)
  )), '');

  v_phone := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'phone_number',
    new.phone::text
  )), '');

  insert into public.profiles (user_id, name, surname, display_name, phone)
  values (new.id, v_name, v_surname, v_display_name, v_phone)
  on conflict (user_id) do nothing;

  insert into public.user_notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  v_handle_base := lower(regexp_replace(
    coalesce(
      nullif(new.raw_user_meta_data ->> 'preferred_username', ''),
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'user'
    ),
    '[^a-zA-Z0-9_]+', '', 'g'
  ));
  v_handle_base := left(coalesce(nullif(v_handle_base, ''), 'user'), 21);
  if length(v_handle_base) < 3 then
    v_handle_base := rpad(v_handle_base, 3, 'x');
  end if;
  v_handle := v_handle_base || '_' || left(replace(new.id::text, '-', ''), 8);

  insert into public.user_handles (user_id, handle)
  values (new.id, v_handle)
  on conflict (user_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Creates a profile row when an auth.users row is inserted. Mirrors phone if set at signup. Roles live in org_members and admin_users, not on profiles.';



CREATE OR REPLACE FUNCTION "public"."handle_refund_processed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_org            uuid;
  v_order          uuid;
  v_buyer          uuid;
  v_payment_amount integer;
  v_items          jsonb;
  oi               record;
begin
  if tg_op = 'UPDATE' then
    if old.status = 'processed' or new.status <> 'processed' then return new; end if;
  elsif tg_op = 'INSERT' then
    if new.status <> 'processed' then return new; end if;
  end if;

  select o.org_id, o.id, o.buyer_id, p.amount_cents
  into v_org, v_order, v_buyer, v_payment_amount
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.id = new.payment_id;

  if v_org is null then
    raise exception 'refund_payment_has_no_order:%', new.payment_id using errcode = 'P0002';
  end if;

  v_items := case
    when new.provider_payload ? 'items' and jsonb_typeof(new.provider_payload->'items') = 'array'
      then new.provider_payload->'items'
    else null
  end;

  if v_items is not null then
    for oi in
      select * from jsonb_to_recordset(v_items) as (order_item_id uuid, amount_cents int, currency text)
    loop
      insert into public.refund_items (refund_id, order_item_id, amount_cents, currency, user_id)
      values (new.id, oi.order_item_id, oi.amount_cents, coalesce(oi.currency, new.currency), v_buyer)
      on conflict do nothing;

      if oi.order_item_id is not null then
        update public.order_items
        set refunded_at = coalesce(refunded_at, now()), status = 'refunded'
        where id = oi.order_item_id;
      end if;

      insert into public.ledger_entries (org_id, order_id, payment_id, refund_id, type, amount_cents, currency, meta)
      values (v_org, v_order, new.payment_id, new.id, 'refund',
              oi.amount_cents, coalesce(oi.currency, new.currency),
              jsonb_build_object('order_item_id', oi.order_item_id));
    end loop;
  else
    insert into public.refund_items (refund_id, order_item_id, amount_cents, currency, user_id)
    values (new.id, null, coalesce(new.amount_cents, 0), new.currency, v_buyer)
    on conflict do nothing;

    insert into public.ledger_entries (org_id, order_id, payment_id, refund_id, type, amount_cents, currency, meta)
    values (v_org, v_order, new.payment_id, new.id, 'refund',
            coalesce(new.amount_cents, 0), new.currency,
            jsonb_build_object('source', 'refund_processed'));

    if coalesce(new.amount_cents, 0) >= coalesce(v_payment_amount, 0) then
      update public.order_items
      set status = 'refunded', refunded_at = coalesce(refunded_at, now())
      where order_id = v_order
        and status in ('pending', 'issued', 'transferred');
    end if;
  end if;

  if v_buyer is not null then
    insert into public.notifications (user_id, type, payload, status, channel, dedupe_key)
    values (v_buyer, 'refund_alert',
            jsonb_build_object('refundId', new.id, 'orderId', v_order,
                               'amountCents', coalesce(new.amount_cents, 0), 'currency', new.currency),
            'pending', 'email', 'refund_alert:' || new.id::text)
    on conflict do nothing;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_refund_processed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_app_role"("r" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    CASE
      WHEN r = 'admin' THEN
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid()))
      ELSE
        EXISTS (
          SELECT 1 FROM public.org_members om
          WHERE om.user_id = (SELECT auth.uid())
            AND om.role::text = r
        )
    END;
$$;


ALTER FUNCTION "public"."has_app_role"("r" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_app_role"("r" "text") IS '''admin'' = global admin (admin_users); any other role = org_members row with that role.';



CREATE OR REPLACE FUNCTION "public"."insert_job_secure"("p_kind" "text", "p_payload" "jsonb", "p_run_after" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  new_id uuid := gen_random_uuid();
BEGIN
  -- Basic validation
  IF p_kind IS NULL OR length(trim(p_kind)) = 0 THEN
    RAISE EXCEPTION 'kind cannot be empty';
  END IF;

  INSERT INTO public.jobs(id, kind, payload, run_after, attempts, max_attempts, created_at)
  VALUES (new_id, p_kind, p_payload, p_run_after, 0, 5, now());

  RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."insert_job_secure"("p_kind" "text", "p_payload" "jsonb", "p_run_after" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_event_organizer"("p_user_id" "uuid", "p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.org_members m ON e.org_id = m.org_id
    WHERE e.id = p_event_id AND m.user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."is_event_organizer"("p_user_id" "uuid", "p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = (select auth.uid())
      and om.role = any(array['organizer_owner','organizer_admin']::public.app_role[])
  ) or exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
      and active = true
  );
$$;


ALTER FUNCTION "public"."is_org_admin"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_finance_viewer"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = (select auth.uid())
      and om.role = any (array['organizer_owner', 'admin', 'organizer', 'finance']::public.app_role[])
  ) or public.is_super_admin((select auth.uid()));
$$;


ALTER FUNCTION "public"."is_org_finance_viewer"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_staff"("user_uuid" "uuid", "org_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = user_uuid AND om.org_id = org_uuid
      AND om.role IN (
        'organizer_staff'::app_role,'organizer_admin'::app_role,'organizer_owner'::app_role,'organizer'::app_role
      )
  );
$$;


ALTER FUNCTION "public"."is_org_staff"("user_uuid" "uuid", "org_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"("check_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    (
      check_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    )
    and exists (
      select 1
      from public.admin_users au
      where au.user_id = check_user_id
        and au.active = true
    );
$$;


ALTER FUNCTION "public"."is_super_admin"("check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."issue_comp_ticket"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer DEFAULT 1, "p_note" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'app', 'public'
    AS $$ begin perform app.require_claimed_account(); return public.issue_comp_ticket_unchecked(p_org_id, p_ticket_type_id, p_recipient_email, p_qty, p_note); end; $$;


ALTER FUNCTION "public"."issue_comp_ticket"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."issue_comp_ticket_unchecked"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer DEFAULT 1, "p_note" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  v_user uuid;
  v_event_id uuid;
  v_order_id uuid;
  v_code text;
  i integer;
BEGIN
  SELECT (select auth.uid()) INTO v_user;

  -- Only org owner or admin may issue comp tickets
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = v_user
      AND role IN ('organizer_owner', 'organizer_admin')
  ) THEN
    RAISE EXCEPTION 'Only org owners and admins can issue comp tickets';
  END IF;

  -- Validate ticket type belongs to this org
  SELECT e.id INTO v_event_id
  FROM public.ticket_types tt
  JOIN public.events e ON e.id = tt.event_id
  WHERE tt.id = p_ticket_type_id
    AND e.org_id = p_org_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Ticket type not found in this organization';
  END IF;

  IF p_qty < 1 OR p_qty > 20 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 20';
  END IF;

  -- Create zero-price comp order
  INSERT INTO public.orders (
    org_id, buyer_id, total_cents, currency, status, channel,
    buyer_email, subtotal_cents, item_count
  )
  VALUES (
    p_org_id, v_user, 0, 'SZL',
    'paid'::public.order_status,
    'comp'::public.sales_channel,
    p_recipient_email, 0, p_qty
  )
  RETURNING id INTO v_order_id;

  -- Create order_items
  FOR i IN 1..p_qty LOOP
    v_code := upper(
      substr(encode(gen_random_bytes(3), 'hex'), 1, 3) || '-' ||
      substr(encode(gen_random_bytes(3), 'hex'), 1, 4)
    );

    INSERT INTO public.order_items (
      order_id, ticket_type_id, status, holder_email, ticket_code
    )
    VALUES (
      v_order_id, p_ticket_type_id,
      'issued'::public.order_item_status,
      p_recipient_email, v_code
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;


ALTER FUNCTION "public"."issue_comp_ticket_unchecked"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."issue_order_items_when_order_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'paid'::order_status and old.status is distinct from new.status then
    update public.order_items
      set status = 'issued'::order_item_status,
          updated_at = now()
      where order_id = new.id
        and status = 'pending'::order_item_status;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."issue_order_items_when_order_paid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_event_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  payload json;
begin
  payload := json_build_object(
    'action', tg_op,
    'event_id', coalesce(new.id, old.id),
    'org_id', coalesce(new.org_id, old.org_id),
    'at', now()
  );

  perform pg_notify('ticketiv:events', payload::text);
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."notify_event_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_items_status_transition_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  old_status public.order_item_status;
  new_status public.order_item_status;
BEGIN
  old_status := OLD.status;
  new_status := NEW.status;
  IF old_status = new_status THEN RETURN NEW; END IF;
  IF old_status IN ('revoked','refunded') THEN
    RAISE EXCEPTION 'cannot change status from terminal state %', old_status;
  END IF;
  IF old_status = 'checked_in' AND new_status = 'transferred' THEN
    RAISE EXCEPTION 'cannot transfer an order_item that is already checked in';
  END IF;
  IF NOT ( (old_status = 'pending'     AND new_status IN ('issued','revoked','refunded'))
        OR (old_status = 'issued'      AND new_status IN ('transferred','checked_in','revoked','refunded'))
        OR (old_status = 'transferred' AND new_status IN ('checked_in','revoked','refunded')) ) THEN
    RAISE EXCEPTION 'invalid status transition from % to %', old_status, new_status;
  END IF;
  IF new_status = 'checked_in' THEN NEW.checked_in_at := COALESCE(NEW.checked_in_at, now()); END IF;
  IF new_status = 'revoked'    THEN NEW.revoked_at    := COALESCE(NEW.revoked_at, now());    END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."order_items_status_transition_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_ledger_summary_fn"() RETURNS TABLE("order_id" "uuid", "gross_cents" bigint, "payment_net_cents" bigint, "refund_cents" bigint, "net_cents" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF (current_setting('request.jwt.claim.role', true) = 'service_role') THEN
    RETURN QUERY SELECT * FROM public.order_ledger_summary_fn_impl();
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id::text = current_setting('request.jwt.claim.sub', true)) THEN
    RETURN QUERY SELECT * FROM public.order_ledger_summary_fn_impl();
    RETURN;
  END IF;

  RAISE EXCEPTION 'permission denied to call order_ledger_summary_fn';
END;
$$;


ALTER FUNCTION "public"."order_ledger_summary_fn"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_ledger_summary_fn_definer"() RETURNS TABLE("order_id" "uuid", "gross_cents" bigint, "payment_net_cents" bigint, "refund_cents" bigint, "net_cents" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT
    order_id,
    sum(CASE WHEN (type = 'order_gross') THEN amount_cents ELSE 0 END) AS gross_cents,
    sum(CASE WHEN (type = 'payment_net') THEN amount_cents ELSE 0 END) AS payment_net_cents,
    sum(CASE WHEN (type = 'refund') THEN amount_cents ELSE 0 END) AS refund_cents,
    sum(amount_cents) AS net_cents
  FROM public.ledger_entries le
  WHERE order_id IS NOT NULL
  GROUP BY order_id;
$$;


ALTER FUNCTION "public"."order_ledger_summary_fn_definer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_ledger_summary_fn_impl"() RETURNS TABLE("order_id" "uuid", "gross_cents" bigint, "payment_net_cents" bigint, "refund_cents" bigint, "net_cents" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT * FROM public.order_ledger_summary_fn_definer();
$$;


ALTER FUNCTION "public"."order_ledger_summary_fn_impl"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_ledger_summary_for_order"("p_order_id" "uuid") RETURNS TABLE("order_id" "uuid", "gross_cents" bigint, "payment_net_cents" bigint, "refund_cents" bigint, "net_cents" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- allow service role
  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return query
    select * from public.order_ledger_summary_fn_impl()
    where order_id = p_order_id;
    return;
  end if;

  -- allow admins
  if exists (
    select 1
    from public.admin_users au
    where au.user_id::text = current_setting('request.jwt.claim.sub', true)
  ) then
    return query
    select * from public.order_ledger_summary_fn_impl()
    where order_id = p_order_id;
    return;
  end if;

  -- allow buyer OR org staff
  if not exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and (
        o.buyer_id = auth.uid()
        or o.org_id = any(public.current_user_org_ids())
      )
  ) then
    raise exception 'permission denied';
  end if;

  return query
  select * from public.order_ledger_summary_fn_impl()
  where order_id = p_order_id;
end;
$$;


ALTER FUNCTION "public"."order_ledger_summary_for_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_buyer_contact_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if tg_op = 'UPDATE' then
    if old.buyer_email is not null and old.buyer_email is distinct from new.buyer_email then
      raise exception 'buyer_email and buyer_phone are immutable once set';
    end if;
    if old.buyer_phone is not null and old.buyer_phone is distinct from new.buyer_phone then
      raise exception 'buyer_email and buyer_phone are immutable once set';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_buyer_contact_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_pricing_changes_after_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'paid' OR NEW.status = 'paid' THEN
      -- If order is paid (old or new), disallow changes to pricing snapshot fields
      IF (OLD.order_price_cents IS DISTINCT FROM NEW.order_price_cents)
      OR (OLD.order_platform_fee_cents IS DISTINCT FROM NEW.order_platform_fee_cents)
      OR (OLD.order_processor_fee_cents IS DISTINCT FROM NEW.order_processor_fee_cents)
      OR (OLD.order_currency IS DISTINCT FROM NEW.order_currency)
      OR (OLD.pricing_plan_snapshot IS DISTINCT FROM NEW.pricing_plan_snapshot)
      THEN
        RAISE EXCEPTION 'Cannot modify pricing fields on paid orders';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_pricing_changes_after_paid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_scans_on_refunded_items"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  -- Placeholder logic: adjust or replace with original implementation if needed.
  -- If a refunded order item exists for the scanned order_item_id, prevent the scan.
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.order_item_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.refund_items ri
      JOIN public.refunds r ON ri.refund_id = r.id
      WHERE ri.order_item_id = NEW.order_item_id
    ) THEN
      RETURN NULL; -- prevent the scan
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_scans_on_refunded_items"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_totals_change_after_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  IF (TG_OP = 'UPDATE') AND (OLD.status = 'paid' OR NEW.status = 'paid') THEN
    IF (OLD.total_cents IS DISTINCT FROM NEW.total_cents)
      OR (OLD.subtotal_cents IS DISTINCT FROM NEW.subtotal_cents)
      OR (OLD.platform_fee_cents IS DISTINCT FROM NEW.platform_fee_cents)
      OR (OLD.processor_fee_cents IS DISTINCT FROM NEW.processor_fee_cents)
    THEN
      RAISE EXCEPTION 'Cannot modify order totals after payment';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_totals_change_after_paid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resale_listing_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  IF NOT public.fn_ticket_is_transferable(NEW.order_item_id) THEN
    RAISE EXCEPTION 'Order item % is not transferable or resellable', NEW.order_item_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.transfers t
    WHERE t.order_item_id = NEW.order_item_id
      AND t.status IN ('requested','pending','accepted','completed')
  ) THEN
    RAISE EXCEPTION 'Order item % has an active transfer', NEW.order_item_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."resale_listing_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resale_listings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."resale_listings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_analyze"("schemas" "text"[] DEFAULT ARRAY['public'::"text"]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT quote_ident(table_schema)||'.'||quote_ident(table_name) AS tbl
    FROM information_schema.tables
    WHERE table_schema = ANY(schemas)
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ANALYZE %s;', rec.tbl);
  END LOOP;
END;$$;


ALTER FUNCTION "public"."run_analyze"("schemas" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scanner_mark_checkin"("p_order_item_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE
  v_event_id uuid;
  v_user uuid;
BEGIN
  SELECT event_id INTO v_event_id FROM public.order_items WHERE id = p_order_item_id;
  SELECT public.current_user_uid() INTO v_user;
  IF NOT EXISTS (
    SELECT 1 FROM public.scanner_users su WHERE su.user_id = v_user AND su.event_id = v_event_id AND su.active = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.order_items
  SET checked_in_at = now()
  WHERE id = p_order_item_id;
END;
$$;


ALTER FUNCTION "public"."scanner_mark_checkin"("p_order_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_event_categories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_event_categories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_payment_provider_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_payment_provider_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify_text"("p_value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select trim(both '-' from regexp_replace(regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'))
$$;


ALTER FUNCTION "public"."slugify_text"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_order_status_from_ledger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  expected integer;
  net bigint;
  derived text;
  target_order_id uuid := COALESCE(NEW.order_id, OLD.order_id);
BEGIN
  IF target_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT expected_total_cents, net_cents, derived_status
    INTO expected, net, derived
  FROM public.compute_order_payment_status(target_order_id);

  -- Only update when different to avoid recursion loops
  IF (SELECT status FROM public.orders WHERE id = target_order_id) IS DISTINCT FROM derived THEN
    UPDATE public.orders SET status = derived, updated_at = now() WHERE id = target_order_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_order_status_from_ledger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_check_order_currency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
DECLARE v_order_currency text; v_item_currency text;
BEGIN
  SELECT currency INTO v_item_currency FROM public.ticket_types WHERE id = NEW.ticket_type_id;
  SELECT currency INTO v_order_currency FROM public.orders WHERE id = NEW.order_id;

  IF v_order_currency IS NULL THEN
    UPDATE public.orders SET currency = v_item_currency WHERE id = NEW.order_id;
  ELSIF v_order_currency <> v_item_currency THEN
    RAISE EXCEPTION 'Mixed currencies not allowed in one order (% vs %)', v_order_currency, v_item_currency;
  END IF;

  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."trg_check_order_currency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_reprice_order_after_adjustments"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
begin
  perform public.fn_apply_pricing_to_order(coalesce(new.order_id, old.order_id));
  return null;
end;
$$;


ALTER FUNCTION "public"."trg_reprice_order_after_adjustments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_reprice_order_after_items"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
BEGIN
  PERFORM public.fn_apply_pricing_to_order(COALESCE(NEW.order_id, OLD.order_id));
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."trg_reprice_order_after_items"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_reprice_order_on_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'pending'::order_status THEN
    PERFORM public.fn_apply_pricing_to_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_reprice_order_on_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_org_role"("p_org" "uuid", "p_roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members m WHERE m.org_id = p_org AND m.user_id = public.current_user_uid() AND m.role = ANY(p_roles::app_role[])
  );
$$;


ALTER FUNCTION "public"."user_has_org_role"("p_org" "uuid", "p_roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_event_category_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.category is null or btrim(new.category) = '' then
    new.category = null;
    return new;
  end if;

  new.category = lower(btrim(new.category));

  if not exists (
    select 1
    from public.event_categories
    where slug = new.category
      and is_active = true
  ) then
    raise exception 'Invalid or inactive event category: %', new.category
      using errcode = '23514';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_event_category_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_scan_and_checkin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  oi_status public.order_item_status;
begin
  perform set_config('search_path', 'public,pg_catalog', true);

  -- Audit-only scans (e.g. unknown credential / ticket) carry no order_item.
  if new.order_item_id is null then
    return new;
  end if;

  select status into oi_status from public.order_items where id = new.order_item_id;
  if not found then
    return new;
  end if;

  -- Only a genuine valid scan transitions the ticket to checked_in. Non-valid
  -- outcomes (already_used, revoked, wrong_event, not_paid, ...) are recorded
  -- without raising so the RPC can return a graceful outcome to the gate.
  if new.outcome = 'valid' and oi_status = 'issued' then
    update public.order_items
      set checked_in_at = coalesce(checked_in_at, now()),
          status = 'checked_in',
          updated_at = now()
      where id = new.order_item_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_scan_and_checkin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_transfer_order_item_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  oi_status public.order_item_status;
BEGIN
  IF NEW.order_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- fully-qualified reference already used
  SELECT status INTO oi_status FROM public.order_items WHERE id = NEW.order_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_item % not found', NEW.order_item_id;
  END IF;

  IF oi_status = 'checked_in' THEN
    RAISE EXCEPTION 'cannot create transfer: order_item % already checked in', NEW.order_item_id;
  END IF;

  IF oi_status IN ('revoked','refunded') THEN
    RAISE EXCEPTION 'cannot create transfer: order_item % is %', NEW.order_item_id, oi_status;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_transfer_order_item_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_ticket_signature"("ticket_code" "text", "provided_sig" "text", "secret" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT encode(extensions.hmac(ticket_code::text, secret::text, 'sha256'), 'hex') = lower(provided_sig);
$$;


ALTER FUNCTION "public"."verify_ticket_signature"("ticket_code" "text", "provided_sig" "text", "secret" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "_internal"."policy_backups" (
    "id" integer NOT NULL,
    "table_schema" "text",
    "table_name" "text",
    "polname" "text",
    "using_expr" "text",
    "with_check" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "_internal"."policy_backups" OWNER TO "postgres";


COMMENT ON TABLE "_internal"."policy_backups" IS 'Historical RLS policy snapshots from past refactors. Do not write from app code.';



CREATE SEQUENCE IF NOT EXISTS "_internal"."policy_backups_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "_internal"."policy_backups_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "_internal"."policy_backups_id_seq" OWNED BY "_internal"."policy_backups"."id";



CREATE TABLE IF NOT EXISTS "_internal"."project_docs" (
    "key" "text" NOT NULL,
    "doc" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "_internal"."project_docs" OWNER TO "postgres";


COMMENT ON TABLE "_internal"."project_docs" IS 'Deprecated design-note storage. Content has been migrated to table comments. Retained for history.';



CREATE TABLE IF NOT EXISTS "monitoring"."index_bloat_snapshots" (
    "id" bigint NOT NULL,
    "snapshot_at" timestamp with time zone DEFAULT "now"(),
    "schemaname" "text",
    "tablename" "text",
    "indexname" "text",
    "table_bytes" bigint,
    "index_bytes" bigint,
    "bloat_ratio" double precision
);


ALTER TABLE "monitoring"."index_bloat_snapshots" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "monitoring"."index_bloat_snapshots_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "monitoring"."index_bloat_snapshots_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "monitoring"."index_bloat_snapshots_id_seq" OWNED BY "monitoring"."index_bloat_snapshots"."id";



CREATE OR REPLACE VIEW "monitoring"."long_running_queries" AS
 SELECT "pid",
    ("now"() - "query_start") AS "duration",
    "usename",
    "datname",
    "state",
    "query"
   FROM "pg_stat_activity"
  WHERE (("state" = 'active'::"text") AND (("now"() - "query_start") > '00:05:00'::interval))
  ORDER BY ("now"() - "query_start") DESC;


ALTER VIEW "monitoring"."long_running_queries" OWNER TO "postgres";


CREATE OR REPLACE VIEW "monitoring"."slow_queries_summary" AS
 SELECT "query",
    "calls",
    "total_exec_time",
    "mean_exec_time",
    "rows"
   FROM "extensions"."pg_stat_statements"
  ORDER BY "mean_exec_time" DESC
 LIMIT 50;


ALTER VIEW "monitoring"."slow_queries_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "monitoring"."slow_query_snapshots" (
    "id" bigint NOT NULL,
    "snapshot_at" timestamp with time zone DEFAULT "now"(),
    "query" "text",
    "calls" bigint,
    "total_exec_time" double precision,
    "mean_exec_time" double precision,
    "rows" bigint
);


ALTER TABLE "monitoring"."slow_query_snapshots" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "monitoring"."slow_query_snapshots_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "monitoring"."slow_query_snapshots_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "monitoring"."slow_query_snapshots_id_seq" OWNED BY "monitoring"."slow_query_snapshots"."id";



CREATE TABLE IF NOT EXISTS "ops_backup"."payout_accounts_tick376" (
    "id" "uuid",
    "org_id" "uuid",
    "provider" "text",
    "details_encrypted" "text",
    "created_at" timestamp with time zone,
    "snapshot_taken_at" timestamp with time zone
);


ALTER TABLE "ops_backup"."payout_accounts_tick376" OWNER TO "postgres";


COMMENT ON TABLE "ops_backup"."payout_accounts_tick376" IS 'TICK-376 pre-re-encryption restore point. Contains legacy plaintext payout details. Not exposed via PostgREST (schema not in the exposed list). DROP once the live format recount shows zero legacy/v1/retired-key rows.';



CREATE TABLE IF NOT EXISTS "private"."organizer_identity_details" (
    "user_id" "uuid" NOT NULL,
    "id_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organizer_identity_details_id_number_length" CHECK ((("id_number" IS NULL) OR (("char_length"("id_number") >= 4) AND ("char_length"("id_number") <= 64))))
);


ALTER TABLE "private"."organizer_identity_details" OWNER TO "postgres";


COMMENT ON TABLE "private"."organizer_identity_details" IS 'Sensitive optional organizer identity details; not exposed through the Data API.';



CREATE TABLE IF NOT EXISTS "public"."admin_action_catalog" (
    "key" "text" NOT NULL,
    "workspace_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text" NOT NULL,
    "target_table" "text" NOT NULL,
    "required_role" "text" DEFAULT 'super_admin'::"text" NOT NULL,
    "backend_function" "text",
    "is_enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_action_catalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_action_catalog" IS 'Super-admin action registry for Ticketiv operational workspaces. Protected by RLS; action rows describe UI/business actions and do not by themselves execute provider-side operations.';



CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "run_after" timestamp with time zone DEFAULT "now"(),
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 8,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "locked_at" timestamp with time zone
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "attempt_no" integer NOT NULL,
    "status" "text" NOT NULL,
    "ext_ref" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_id" "uuid",
    CONSTRAINT "payment_attempts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'succeeded'::"text", 'failed'::"text", 'timed_out'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."payment_attempts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_attention_queue" WITH ("security_invoker"='true') AS
 SELECT 'pending_payout'::"text" AS "kind",
    ("p"."id")::"text" AS "record_id",
    'Payout needs review'::"text" AS "title",
    "concat"("p"."currency", ' ', ((("p"."amount_cents")::numeric / (100)::numeric))::"text", ' payout is ', ("p"."status")::"text") AS "detail",
    "p"."created_at",
    ('/super-admin/payouts/'::"text" || ("p"."id")::"text") AS "href"
   FROM "public"."payouts" "p"
  WHERE ("p"."status" = ANY (ARRAY['requested'::"public"."payout_status", 'processing'::"public"."payout_status"]))
UNION ALL
 SELECT 'open_refund'::"text" AS "kind",
    ("r"."id")::"text" AS "record_id",
    'Refund needs review'::"text" AS "title",
    "concat"("r"."currency", ' ', ((("r"."amount_cents")::numeric / (100)::numeric))::"text", ' refund is ', ("r"."status")::"text") AS "detail",
    "r"."created_at",
    ('/super-admin/refunds/'::"text" || ("r"."id")::"text") AS "href"
   FROM "public"."refunds" "r"
  WHERE ("r"."status" = ANY (ARRAY['requested'::"public"."refund_status", 'processing'::"public"."refund_status"]))
UNION ALL
 SELECT 'failed_payment'::"text" AS "kind",
    ("pa"."id")::"text" AS "record_id",
    'Payment attempt failed'::"text" AS "title",
    "concat"("pa"."provider", ' attempt #', ("pa"."attempt_no")::"text", ' failed') AS "detail",
    "pa"."created_at",
    ('/super-admin/orders/'::"text" || ("pa"."order_id")::"text") AS "href"
   FROM "public"."payment_attempts" "pa"
  WHERE ("pa"."status" = 'failed'::"text")
UNION ALL
 SELECT 'failed_job'::"text" AS "kind",
    ("j"."id")::"text" AS "record_id",
    'Background job exhausted retries'::"text" AS "title",
    "concat"("j"."kind", ': ', COALESCE("j"."last_error", 'unknown error'::"text")) AS "detail",
    "j"."created_at",
    '/super-admin/reliability'::"text" AS "href"
   FROM "public"."jobs" "j"
  WHERE (("j"."last_error" IS NOT NULL) AND ("j"."attempts" >= "j"."max_attempts"));


ALTER VIEW "public"."admin_attention_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "ticket_type_id" "uuid" NOT NULL,
    "seat_id" "uuid",
    "ticket_code" "text" NOT NULL,
    "checked_in_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "holder_name" "text",
    "holder_email" "text",
    "holder_phone" "text",
    "transferred_from_order_item_id" "uuid",
    "revoked_at" timestamp with time zone,
    "status" "public"."order_item_status" DEFAULT 'pending'::"public"."order_item_status" NOT NULL,
    "refunded_at" timestamp with time zone,
    "current_owner_id" "uuid",
    "holder_user_id" "uuid"
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_items"."holder_user_id" IS 'Optional explicit holder account for physical credential assignment. QR ticket ownership via current_owner_id remains unchanged.';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "buyer_id" "uuid",
    "total_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'SZL'::"text" NOT NULL,
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "channel" "public"."sales_channel" DEFAULT 'online'::"public"."sales_channel" NOT NULL,
    "device_id" "uuid",
    "email" "text",
    "phone" "text",
    "subtotal_cents" integer,
    "item_count" integer,
    "platform_fee_cents" integer,
    "processor_fee_cents" integer,
    "fees_paid_by" "public"."fee_payer",
    "pricing_plan_id" "uuid",
    "totals_computed_at" timestamp with time zone,
    "order_price_cents" integer,
    "order_platform_fee_cents" integer,
    "order_processor_fee_cents" integer,
    "order_currency" "text",
    "pricing_plan_snapshot" "jsonb",
    "buyer_email" "text",
    "buyer_phone" "text",
    "hold_expires_at" timestamp with time zone,
    "pos_shift_id" "uuid",
    "cashier_user_id" "uuid",
    "device_session_id" "uuid",
    "organizer_net_cents" integer,
    CONSTRAINT "orders_currency_iso" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "orders_order_currency_check" CHECK (("order_currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "orders_total_cents_check" CHECK (("total_cents" >= 0)),
    CONSTRAINT "orders_total_nonneg" CHECK (("total_cents" >= 0))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slug" "text" NOT NULL,
    "bio" "text",
    "logo" "text",
    "default_currency" "text" DEFAULT 'SZL'::"text" NOT NULL,
    "payment_providers" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "organizations_default_currency_check" CHECK (("default_currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "organizations_slug_format" CHECK ((("slug" ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::"text") AND (("length"("slug") >= 2) AND ("length"("slug") <= 80))))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."slug" IS 'URL-safe handle for the organization. Format: lower(a-z0-9 with single hyphens), 2-80 chars.';



COMMENT ON COLUMN "public"."organizations"."payment_providers" IS 'Allowed payment providers for this organization. Empty = all enabled providers (no lock). Resolved by fn_get_effective_payment_providers.';



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "ext_payment_id" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."payments_status" DEFAULT 'pending'::"public"."payments_status",
    "channel" "public"."sales_channel",
    CONSTRAINT "payments_currency_iso" CHECK (("currency" ~ '^[A-Z]{3}$'::"text"))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "order_item_id" "uuid",
    "ticket_code" "text" NOT NULL,
    "outcome" "text" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "device_id" "uuid",
    "device_session_id" "uuid",
    "gate" "text",
    "notes" "text",
    "request_hash" "text",
    "source_ip" "inet",
    CONSTRAINT "scans_outcome_check" CHECK (("outcome" = ANY (ARRAY['valid'::"text", 'already_used'::"text", 'revoked'::"text", 'invalid'::"text", 'wrong_event'::"text"])))
);


ALTER TABLE "public"."scans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'ZAR'::"text" NOT NULL,
    "quota" integer NOT NULL,
    "per_user_limit" integer,
    "is_reserved_seating" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sales_status" "public"."ticket_type_sales_status" DEFAULT 'on_sale'::"public"."ticket_type_sales_status" NOT NULL,
    "sales_paused_at" timestamp with time zone,
    "sales_pause_reason" "text",
    "payment_providers" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "ticket_types_currency_iso" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "ticket_types_per_user_limit_check" CHECK (("per_user_limit" >= 0)),
    CONSTRAINT "ticket_types_price_cents_check" CHECK (("price_cents" >= 0)),
    CONSTRAINT "ticket_types_quota_check" CHECK (("quota" >= 0))
);


ALTER TABLE "public"."ticket_types" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ticket_types"."payment_providers" IS 'Allowed payment providers for this ticket type. Empty = inherit from event. Resolved by fn_get_effective_payment_providers.';



CREATE TABLE IF NOT EXISTS "public"."webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "signature" "text",
    "payload" "jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "provider_event_id" "text"
);


ALTER TABLE "public"."webhooks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_command_centre_metrics" WITH ("security_invoker"='true') AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."organizations") AS "total_organizations",
    ( SELECT "count"(*) AS "count"
           FROM "public"."events") AS "total_events",
    ( SELECT "count"(*) AS "count"
           FROM "public"."events"
          WHERE ("events"."status" = 'published'::"public"."event_status")) AS "published_events",
    ( SELECT "count"(*) AS "count"
           FROM "public"."events"
          WHERE ("events"."status" = 'draft'::"public"."event_status")) AS "draft_events",
    ( SELECT "count"(*) AS "count"
           FROM "public"."events"
          WHERE (("events"."status" = 'published'::"public"."event_status") AND ("events"."starts_at" >= "now"()))) AS "upcoming_events",
    ( SELECT "count"(*) AS "count"
           FROM "public"."ticket_types") AS "ticket_types",
    ( SELECT "count"(*) AS "count"
           FROM "public"."orders") AS "total_orders",
    ( SELECT "count"(*) AS "count"
           FROM "public"."orders"
          WHERE ("orders"."status" = 'paid'::"public"."order_status")) AS "paid_orders",
    ( SELECT COALESCE("sum"("orders"."total_cents"), (0)::bigint) AS "coalesce"
           FROM "public"."orders"
          WHERE ("orders"."status" = 'paid'::"public"."order_status")) AS "gross_revenue_cents",
    ( SELECT COALESCE("sum"("orders"."platform_fee_cents"), (0)::bigint) AS "coalesce"
           FROM "public"."orders"
          WHERE ("orders"."status" = 'paid'::"public"."order_status")) AS "platform_fee_cents",
    ( SELECT "count"(*) AS "count"
           FROM "public"."payments"
          WHERE ("payments"."status" = 'failed'::"public"."payments_status")) AS "failed_payments",
    ( SELECT "count"(*) AS "count"
           FROM "public"."payment_attempts"
          WHERE ("payment_attempts"."status" = 'failed'::"text")) AS "failed_payment_attempts",
    ( SELECT "count"(*) AS "count"
           FROM "public"."payouts"
          WHERE ("payouts"."status" = ANY (ARRAY['requested'::"public"."payout_status", 'processing'::"public"."payout_status"]))) AS "pending_payouts",
    ( SELECT COALESCE("sum"("payouts"."amount_cents"), (0)::bigint) AS "coalesce"
           FROM "public"."payouts"
          WHERE ("payouts"."status" = ANY (ARRAY['requested'::"public"."payout_status", 'processing'::"public"."payout_status"]))) AS "pending_payout_cents",
    ( SELECT "count"(*) AS "count"
           FROM "public"."refunds"
          WHERE ("refunds"."status" = ANY (ARRAY['requested'::"public"."refund_status", 'processing'::"public"."refund_status"]))) AS "open_refunds",
    ( SELECT COALESCE("sum"("refunds"."amount_cents"), (0)::bigint) AS "coalesce"
           FROM "public"."refunds"
          WHERE ("refunds"."status" = ANY (ARRAY['requested'::"public"."refund_status", 'processing'::"public"."refund_status"]))) AS "open_refund_cents",
    ( SELECT "count"(*) AS "count"
           FROM "public"."order_items"
          WHERE ("order_items"."status" = ANY (ARRAY['issued'::"public"."order_item_status", 'checked_in'::"public"."order_item_status", 'transferred'::"public"."order_item_status"]))) AS "tickets_issued",
    ( SELECT "count"(*) AS "count"
           FROM "public"."order_items"
          WHERE (("order_items"."checked_in_at" IS NOT NULL) OR ("order_items"."status" = 'checked_in'::"public"."order_item_status"))) AS "tickets_checked_in",
    ( SELECT "count"(*) AS "count"
           FROM "public"."scans"
          WHERE ("scans"."scanned_at" >= ("now"() - '24:00:00'::interval))) AS "scans_last_24h",
    ( SELECT "count"(*) AS "count"
           FROM "public"."webhooks"
          WHERE ("webhooks"."processed_at" IS NULL)) AS "unprocessed_webhooks",
    ( SELECT "count"(*) AS "count"
           FROM "public"."jobs"
          WHERE (("jobs"."last_error" IS NOT NULL) AND ("jobs"."attempts" >= "jobs"."max_attempts"))) AS "failed_jobs";


ALTER VIEW "public"."admin_command_centre_metrics" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_event_readiness" AS
SELECT
    NULL::"uuid" AS "event_id",
    NULL::"uuid" AS "org_id",
    NULL::"text" AS "title",
    NULL::"public"."event_status" AS "status",
    NULL::"text" AS "visibility",
    NULL::timestamp with time zone AS "starts_at",
    NULL::timestamp with time zone AS "ends_at",
    NULL::"text" AS "cover_image_url",
    NULL::"text" AS "description",
    NULL::"uuid" AS "venue_id",
    NULL::bigint AS "on_sale_ticket_types",
    NULL::boolean AS "has_active_pricing_plan",
    NULL::boolean AS "has_payout_account",
    NULL::"jsonb" AS "checks";


ALTER VIEW "public"."admin_event_readiness" OWNER TO "postgres";


COMMENT ON VIEW "public"."admin_event_readiness" IS 'Super-admin event readiness checklist read model. Security invoker view used by backend dashboard only.';



CREATE TABLE IF NOT EXISTS "public"."app_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "schema_name" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "row_data" "jsonb",
    "changed_by" "uuid",
    "change_query" "text"
);


ALTER TABLE "public"."app_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "actor_id" "uuid",
    "table_name" "text" NOT NULL,
    "record_id" "text",
    "action" "public"."audit_action" NOT NULL,
    "changes" "jsonb",
    "ip" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_recent_operations" WITH ("security_invoker"='true') AS
 SELECT 'audit'::"text" AS "source",
    ("al"."id")::"text" AS "record_id",
    ("al"."action")::"text" AS "action",
    "al"."table_name" AS "entity",
    "al"."record_id" AS "entity_id",
    "al"."created_at" AS "occurred_at"
   FROM "public"."audit_log" "al"
UNION ALL
 SELECT 'app_audit'::"text" AS "source",
    ("aal"."id")::"text" AS "record_id",
    "aal"."operation" AS "action",
    "concat"("aal"."schema_name", '.', "aal"."table_name") AS "entity",
    NULL::"text" AS "entity_id",
    "aal"."occurred_at"
   FROM "public"."app_audit_log" "aal";


ALTER VIEW "public"."admin_recent_operations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role_tier" "public"."admin_role_tier" DEFAULT 'super_admin'::"public"."admin_role_tier" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_workspace_actions" WITH ("security_invoker"='true') AS
 SELECT "key",
    "workspace_key",
    "label",
    "description",
    "target_table",
    "backend_function",
    "is_enabled",
    "created_at"
   FROM "public"."admin_action_catalog"
  ORDER BY "workspace_key", "label";


ALTER VIEW "public"."admin_workspace_actions" OWNER TO "postgres";


COMMENT ON VIEW "public"."admin_workspace_actions" IS 'Read model for super-admin workspace actions. Refund action entries are internal review/status controls only and must not be treated as payment-provider execution.';



CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "key" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "config" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rollout_percent" integer,
    "owner" "uuid",
    "description" "text",
    "tags" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "last_changed_by" "uuid",
    "last_changed_at" timestamp with time zone,
    CONSTRAINT "feature_flags_rollout_percent_check" CHECK ((("rollout_percent" IS NULL) OR (("rollout_percent" >= 0) AND ("rollout_percent" <= 100))))
);


ALTER TABLE "public"."feature_flags" OWNER TO "postgres";


COMMENT ON COLUMN "public"."feature_flags"."org_id" IS 'Per-org flag when set; NULL for platform-wide flags managed by super-admin.';



COMMENT ON COLUMN "public"."feature_flags"."rollout_percent" IS 'Percentage rollout 0-100 for platform-level flags (NULL for binary flags).';



COMMENT ON COLUMN "public"."feature_flags"."tags" IS 'Free-form tags for filtering (e.g. {growth, payments}).';



CREATE TABLE IF NOT EXISTS "public"."org_members" (
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" DEFAULT 'organizer_staff'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."org_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "ticket_type_id" "uuid",
    "code" "text",
    "type" "public"."price_rule_type" NOT NULL,
    "value_numeric" numeric(10,2) NOT NULL,
    "applies_to" "text" DEFAULT 'item'::"text" NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "max_redemptions" integer,
    "per_user_limit" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "channel" "public"."sales_channel"[] DEFAULT '{}'::"public"."sales_channel"[],
    CONSTRAINT "ck_price_rules_channel_no_dups" CHECK ((NOT "public"."fn_array_has_dups"("channel"))),
    CONSTRAINT "price_rules_applies_to_check" CHECK (("applies_to" = ANY (ARRAY['item'::"text", 'order'::"text"])))
);


ALTER TABLE "public"."price_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "platform_percent_bps" integer DEFAULT 500 NOT NULL,
    "platform_fixed_cents" integer DEFAULT 250 NOT NULL,
    "processor_percent_bps" integer DEFAULT 200 NOT NULL,
    "processor_fixed_cents" integer DEFAULT 0 NOT NULL,
    "platform_fee_payer" "public"."fee_payer" DEFAULT 'buyer'::"public"."fee_payer" NOT NULL,
    "processor_fee_payer" "public"."fee_payer" DEFAULT 'buyer'::"public"."fee_payer" NOT NULL,
    "min_platform_fee_cents" integer DEFAULT 0,
    "max_platform_fee_cents" integer,
    "currency" "text" DEFAULT 'SZL'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pricing_plans_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text"))
);


ALTER TABLE "public"."pricing_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seat_holds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "ticket_type_id" "uuid",
    "hold_code" "text",
    "status" "public"."seat_hold_status" DEFAULT 'active'::"public"."seat_hold_status" NOT NULL,
    "quantity" integer NOT NULL,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "seat_holds_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."seat_holds" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_workspace_operating_counts" WITH ("security_invoker"='true') AS
 SELECT 'event-operations'::"text" AS "workspace_key",
    ( SELECT "count"(*) AS "count"
           FROM "public"."events"
          WHERE ("events"."status" = 'draft'::"public"."event_status")) AS "needs_review_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."events"
          WHERE (("events"."status" = 'published'::"public"."event_status") AND ("events"."starts_at" >= "now"()))) AS "active_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."events"
          WHERE ("events"."status" = 'archived'::"public"."event_status")) AS "closed_count"
UNION ALL
 SELECT 'organizer-operations'::"text" AS "workspace_key",
    ( SELECT "count"(*) AS "count"
           FROM "public"."organizations") AS "needs_review_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."org_members") AS "active_count",
    (0)::bigint AS "closed_count"
UNION ALL
 SELECT 'ticket-inventory'::"text" AS "workspace_key",
    ( SELECT "count"(*) AS "count"
           FROM "public"."ticket_types"
          WHERE ("ticket_types"."quota" <= 0)) AS "needs_review_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."ticket_types"
          WHERE ("ticket_types"."quota" > 0)) AS "active_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."seat_holds"
          WHERE ("seat_holds"."status" = ANY (ARRAY['released'::"public"."seat_hold_status", 'expired'::"public"."seat_hold_status"]))) AS "closed_count"
UNION ALL
 SELECT 'sales-orders'::"text" AS "workspace_key",
    ( SELECT "count"(*) AS "count"
           FROM "public"."orders"
          WHERE ("orders"."status" = ANY (ARRAY['pending'::"public"."order_status", 'failed'::"public"."order_status"]))) AS "needs_review_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."orders"
          WHERE ("orders"."status" = 'paid'::"public"."order_status")) AS "active_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."orders"
          WHERE ("orders"."status" = 'refunded'::"public"."order_status")) AS "closed_count"
UNION ALL
 SELECT 'payments-finance'::"text" AS "workspace_key",
    (( SELECT "count"(*) AS "count"
           FROM "public"."payment_attempts"
          WHERE ("payment_attempts"."status" = 'failed'::"text")) + ( SELECT "count"(*) AS "count"
           FROM "public"."refunds"
          WHERE ("refunds"."status" = ANY (ARRAY['requested'::"public"."refund_status", 'processing'::"public"."refund_status"])))) AS "needs_review_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."payments"
          WHERE ("payments"."status" = 'succeeded'::"public"."payments_status")) AS "active_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."payouts"
          WHERE ("payouts"."status" = ANY (ARRAY['paid'::"public"."payout_status", 'cancelled'::"public"."payout_status", 'failed'::"public"."payout_status"]))) AS "closed_count"
UNION ALL
 SELECT 'access-control'::"text" AS "workspace_key",
    ( SELECT "count"(*) AS "count"
           FROM "public"."scans"
          WHERE ("scans"."outcome" <> 'valid'::"text")) AS "needs_review_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."devices"
          WHERE ("devices"."last_seen_at" >= ("now"() - '24:00:00'::interval))) AS "active_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."device_sessions"
          WHERE ("device_sessions"."ended_at" IS NOT NULL)) AS "closed_count"
UNION ALL
 SELECT 'promotions-controls'::"text" AS "workspace_key",
    ( SELECT "count"(*) AS "count"
           FROM "public"."price_rules"
          WHERE (("price_rules"."is_active" = true) AND ("price_rules"."ends_at" IS NOT NULL) AND ("price_rules"."ends_at" < "now"()))) AS "needs_review_count",
    (( SELECT "count"(*) AS "count"
           FROM "public"."feature_flags"
          WHERE ("feature_flags"."enabled" = true)) + ( SELECT "count"(*) AS "count"
           FROM "public"."price_rules"
          WHERE ("price_rules"."is_active" = true))) AS "active_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."price_rules"
          WHERE ("price_rules"."is_active" = false)) AS "closed_count"
UNION ALL
 SELECT 'reliability-audit'::"text" AS "workspace_key",
    (( SELECT "count"(*) AS "count"
           FROM "public"."webhooks"
          WHERE ("webhooks"."processed_at" IS NULL)) + ( SELECT "count"(*) AS "count"
           FROM "public"."jobs"
          WHERE (("jobs"."last_error" IS NOT NULL) AND ("jobs"."attempts" >= "jobs"."max_attempts")))) AS "needs_review_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."jobs"
          WHERE ("jobs"."locked_at" IS NOT NULL)) AS "active_count",
    (( SELECT "count"(*) AS "count"
           FROM "public"."audit_log") + ( SELECT "count"(*) AS "count"
           FROM "public"."app_audit_log")) AS "closed_count"
UNION ALL
 SELECT 'platform-settings'::"text" AS "workspace_key",
    ( SELECT "count"(*) AS "count"
           FROM "public"."admin_users") AS "needs_review_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."pricing_plans"
          WHERE ("pricing_plans"."active" = true)) AS "active_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."pricing_plans"
          WHERE ("pricing_plans"."active" = false)) AS "closed_count";


ALTER VIEW "public"."admin_workspace_operating_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."artists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "primary_user_id" "uuid",
    "slug" "text" NOT NULL,
    "image_url" "text",
    "name_key" "text" GENERATED ALWAYS AS ("lower"("regexp_replace"(TRIM(BOTH FROM "name"), '\s+'::"text", ' '::"text", 'g'::"text"))) STORED,
    CONSTRAINT "artists_slug_format" CHECK ((("slug" ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::"text") AND (("length"("slug") >= 2) AND ("length"("slug") <= 80))))
);


ALTER TABLE "public"."artists" OWNER TO "postgres";


COMMENT ON COLUMN "public"."artists"."slug" IS 'URL-safe handle for the artist. Format: lower(a-z0-9 with single hyphens), 2-80 chars.';



CREATE TABLE IF NOT EXISTS "public"."audit_log_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "actor_id" "uuid",
    "table_name" "text" NOT NULL,
    "record_id" "text",
    "action" "public"."audit_action" NOT NULL,
    "changes" "jsonb",
    "ip" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log_archive" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credential_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_name" "text" NOT NULL,
    "supplier_reference" "text",
    "org_id" "uuid",
    "event_id" "uuid",
    "purpose" "text" DEFAULT 'pilot'::"text" NOT NULL,
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "chip_family" "text" NOT NULL,
    "chip_product" "text",
    "key_version" "text",
    "frequency" "text" DEFAULT '13.56 MHz'::"text" NOT NULL,
    "protocol" "text" DEFAULT 'ISO/IEC 14443 Type A'::"text" NOT NULL,
    "memory_bytes" integer,
    "quantity_ordered" integer DEFAULT 0 NOT NULL,
    "quantity_received" integer DEFAULT 0 NOT NULL,
    "branding_version" "text",
    "serial_prefix" "text",
    "production_date" "date",
    "received_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "quarantined_at" timestamp with time zone,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credential_batches_chip_family_not_blank" CHECK (("btrim"("chip_family") <> ''::"text")),
    CONSTRAINT "credential_batches_memory_positive" CHECK ((("memory_bytes" IS NULL) OR ("memory_bytes" > 0))),
    CONSTRAINT "credential_batches_metadata_object" CHECK (("jsonb_typeof"("metadata") = 'object'::"text")),
    CONSTRAINT "credential_batches_purpose_check" CHECK (("purpose" = ANY (ARRAY['pilot'::"text", 'uat'::"text", 'production'::"text"]))),
    CONSTRAINT "credential_batches_quantities_non_negative" CHECK ((("quantity_ordered" >= 0) AND ("quantity_received" >= 0))),
    CONSTRAINT "credential_batches_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'ordered'::"text", 'received'::"text", 'quarantined'::"text", 'accepted'::"text", 'rejected'::"text", 'retired'::"text"]))),
    CONSTRAINT "credential_batches_supplier_not_blank" CHECK (("btrim"("supplier_name") <> ''::"text"))
);


ALTER TABLE "public"."credential_batches" OWNER TO "postgres";


COMMENT ON TABLE "public"."credential_batches" IS 'Supplier batch record for TapBand physical credentials, including chip family, quantities and operational acceptance state.';



CREATE TABLE IF NOT EXISTS "public"."credential_entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credential_id" "uuid" NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "holder_user_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_until" timestamp with time zone,
    "assigned_by" "uuid" DEFAULT "auth"."uid"(),
    "assignment_source" "text" DEFAULT 'activation'::"text" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "removed_by" "uuid",
    "removed_at" timestamp with time zone,
    "removal_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credential_entitlements_assignment_source_check" CHECK (("assignment_source" = ANY (ARRAY['activation'::"text", 'outlet_sale'::"text", 'support'::"text", 'replacement'::"text", 'import'::"text", 'system'::"text"]))),
    CONSTRAINT "credential_entitlements_metadata_object" CHECK (("jsonb_typeof"("metadata") = 'object'::"text")),
    CONSTRAINT "credential_entitlements_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'removed'::"text", 'expired'::"text", 'consumed'::"text"]))),
    CONSTRAINT "credential_entitlements_valid_window" CHECK ((("valid_until" IS NULL) OR ("valid_until" > "valid_from")))
);


ALTER TABLE "public"."credential_entitlements" OWNER TO "postgres";


COMMENT ON TABLE "public"."credential_entitlements" IS 'Links physical credentials to issued order items and event access windows, with partial unique indexes preventing duplicate active assignment.';



CREATE TABLE IF NOT EXISTS "public"."credential_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "org_id" "uuid",
    "event_id" "uuid",
    "outlet_id" "text",
    "public_serial" "text" NOT NULL,
    "external_serial" "text",
    "qr_reference" "text",
    "chip_family" "text" NOT NULL,
    "chip_identifier_hash" "text",
    "chip_fingerprint" "text",
    "secure_element_ref" "text",
    "key_version" "text",
    "inventory_status" "text" DEFAULT 'received'::"text" NOT NULL,
    "current_credential_id" "uuid",
    "issued_at" timestamp with time zone,
    "activated_at" timestamp with time zone,
    "retired_at" timestamp with time zone,
    "defect_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credential_inventory_chip_family_not_blank" CHECK (("btrim"("chip_family") <> ''::"text")),
    CONSTRAINT "credential_inventory_hash_not_blank" CHECK ((("chip_identifier_hash" IS NULL) OR ("btrim"("chip_identifier_hash") <> ''::"text"))),
    CONSTRAINT "credential_inventory_metadata_object" CHECK (("jsonb_typeof"("metadata") = 'object'::"text")),
    CONSTRAINT "credential_inventory_outlet_id_not_blank" CHECK ((("outlet_id" IS NULL) OR ("btrim"("outlet_id") <> ''::"text"))),
    CONSTRAINT "credential_inventory_public_serial_not_blank" CHECK (("btrim"("public_serial") <> ''::"text")),
    CONSTRAINT "credential_inventory_status_check" CHECK (("inventory_status" = ANY (ARRAY['received'::"text", 'inspected'::"text", 'available'::"text", 'reserved'::"text", 'issued'::"text", 'active'::"text", 'revoked'::"text", 'defective'::"text", 'lost'::"text", 'destroyed'::"text", 'returned'::"text", 'retired'::"text"])))
);


ALTER TABLE "public"."credential_inventory" OWNER TO "postgres";


COMMENT ON TABLE "public"."credential_inventory" IS 'Per-band inventory. Chip UIDs must only be stored as hashes or secure element references; raw UIDs are intentionally not modeled.';



COMMENT ON COLUMN "public"."credential_inventory"."chip_identifier_hash" IS 'Hash of the chip identifier used for lookup and risk controls. Do not store raw NFC UID values here.';



COMMENT ON COLUMN "public"."credential_inventory"."secure_element_ref" IS 'Reference to secure-key material or chip attestation metadata; not a raw secret.';



CREATE TABLE IF NOT EXISTS "public"."credential_taps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credential_id" "uuid",
    "inventory_id" "uuid",
    "event_id" "uuid",
    "order_item_id" "uuid",
    "device_id" "uuid",
    "device_session_id" "uuid",
    "operator_user_id" "uuid" DEFAULT "auth"."uid"(),
    "outlet_id" "text",
    "presented_credential_hash" "text",
    "tap_type" "text" NOT NULL,
    "outcome" "text" NOT NULL,
    "reason_code" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "offline" boolean DEFAULT false NOT NULL,
    "client_attempt_id" "text",
    "synced_at" timestamp with time zone,
    "latency_ms" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credential_taps_latency_non_negative" CHECK ((("latency_ms" IS NULL) OR ("latency_ms" >= 0))),
    CONSTRAINT "credential_taps_metadata_object" CHECK (("jsonb_typeof"("metadata") = 'object'::"text")),
    CONSTRAINT "credential_taps_outcome_not_blank" CHECK (("btrim"("outcome") <> ''::"text")),
    CONSTRAINT "credential_taps_outlet_id_not_blank" CHECK ((("outlet_id" IS NULL) OR ("btrim"("outlet_id") <> ''::"text"))),
    CONSTRAINT "credential_taps_presented_hash_not_blank" CHECK ((("presented_credential_hash" IS NULL) OR ("btrim"("presented_credential_hash") <> ''::"text"))),
    CONSTRAINT "credential_taps_type_check" CHECK (("tap_type" = ANY (ARRAY['provision'::"text", 'activate'::"text", 'identify'::"text", 'outlet_sale'::"text", 'check_in'::"text", 'revoke_check'::"text", 'support_lookup'::"text", 'replacement'::"text", 'inventory_audit'::"text"])))
);


ALTER TABLE "public"."credential_taps" OWNER TO "postgres";


COMMENT ON TABLE "public"."credential_taps" IS 'Append-only TapBand tap/audit log for provisioning, activation, outlet sale, lookup and entry attempts.';



COMMENT ON COLUMN "public"."credential_taps"."presented_credential_hash" IS 'Hash-only representation of a presented credential when the tap cannot be linked to a stored credential row.';



CREATE TABLE IF NOT EXISTS "public"."device_setup_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "device_role" "public"."device_role" DEFAULT 'organizer_scanner'::"public"."device_role" NOT NULL,
    "label" "text" NOT NULL,
    "max_scans_per_minute" integer,
    "code_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:30:00'::interval) NOT NULL,
    "claimed_at" timestamp with time zone,
    "claimed_device_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "device_setup_codes_label_not_blank" CHECK (("btrim"("label") <> ''::"text")),
    CONSTRAINT "device_setup_codes_rate_limit_positive" CHECK ((("max_scans_per_minute" IS NULL) OR (("max_scans_per_minute" >= 1) AND ("max_scans_per_minute" <= 600)))),
    CONSTRAINT "device_setup_codes_scanners_require_event" CHECK ((("device_role" <> 'organizer_scanner'::"public"."device_role") OR ("event_id" IS NOT NULL))),
    CONSTRAINT "device_setup_codes_supported_roles" CHECK (("device_role" = ANY (ARRAY['organizer_scanner'::"public"."device_role", 'organizer_pos'::"public"."device_role", 'organizer_kiosk'::"public"."device_role"])))
);


ALTER TABLE "public"."device_setup_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_artists" (
    "event_id" "uuid" NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "role" "text"
);


ALTER TABLE "public"."event_artists" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."event_catalog" AS
SELECT
    NULL::"uuid" AS "event_id",
    NULL::"uuid" AS "org_id",
    NULL::"text" AS "title",
    NULL::"text" AS "slug",
    NULL::"text" AS "cover_image_url",
    NULL::timestamp with time zone AS "starts_at",
    NULL::"text" AS "city",
    NULL::"text" AS "country_code",
    NULL::"jsonb" AS "ticket_types";


ALTER VIEW "public"."event_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text",
    "sort_order" integer DEFAULT 100 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_categories_name_not_blank" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "event_categories_slug_format" CHECK ((("slug" ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::"text") AND (("length"("slug") >= 2) AND ("length"("slug") <= 80))))
);


ALTER TABLE "public"."event_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_dates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_dates_starts_before_ends" CHECK ((("starts_at" IS NULL) OR ("ends_at" IS NULL) OR ("starts_at" < "ends_at"))),
    CONSTRAINT "event_dates_starts_ends_chk" CHECK ((("starts_at" IS NULL) OR ("ends_at" IS NULL) OR ("starts_at" <= "ends_at"))),
    CONSTRAINT "event_dates_time_range" CHECK (("ends_at" > "starts_at"))
);


ALTER TABLE "public"."event_dates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_favourites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_favourites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invitee_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    CONSTRAINT "event_invitations_not_self" CHECK (("inviter_id" <> "invitee_id")),
    CONSTRAINT "event_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'dismissed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."event_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_metrics_daily" (
    "org_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "tickets_sold" integer DEFAULT 0 NOT NULL,
    "gross_revenue_cents" bigint DEFAULT 0 NOT NULL,
    "refunds_cents" bigint DEFAULT 0 NOT NULL,
    "unique_buyers" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_metrics_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_series" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "series_type" "public"."series_type" NOT NULL,
    "cover_image_url" "text",
    "recurrence_pattern" "jsonb",
    "starts_on" "date",
    "ends_on" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_series_date_order" CHECK ((("starts_on" IS NULL) OR ("ends_on" IS NULL) OR ("ends_on" >= "starts_on"))),
    CONSTRAINT "event_series_recurrence_only_for_recurring" CHECK ((("series_type" = 'recurring'::"public"."series_type") OR ("recurrence_pattern" IS NULL))),
    CONSTRAINT "event_series_slug_format" CHECK ((("slug" ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::"text") AND (("length"("slug") >= 2) AND ("length"("slug") <= 80))))
);

ALTER TABLE ONLY "public"."event_series" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_series" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_series" IS 'Parent grouping for tour/recurring/season events. Owned by an org. Events with series_id IS NOT NULL belong to a series; series_id IS NULL means standalone.';



CREATE TABLE IF NOT EXISTS "public"."event_staff" (
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_staff_role_check" CHECK (("role" = ANY (ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role", 'scanner'::"public"."app_role"])))
);


ALTER TABLE "public"."event_staff" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."event_summary" WITH ("security_invoker"='on') AS
 SELECT "e"."id" AS "event_id",
    "e"."org_id",
    "e"."title",
    "e"."slug",
    "count"(DISTINCT "d"."id") AS "dates_count"
   FROM ("public"."events" "e"
     LEFT JOIN "public"."event_dates" "d" ON (("d"."event_id" = "e"."id")))
  GROUP BY "e"."id", "e"."org_id", "e"."title", "e"."slug";


ALTER VIEW "public"."event_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guestlist_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "ticket_type_id" "uuid",
    "full_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "allocation" integer DEFAULT 1 NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "guestlist_entries_allocation_check" CHECK (("allocation" > 0))
);


ALTER TABLE "public"."guestlist_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guestlist_fulfillments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guestlist_entry_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guestlist_fulfillments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ledger_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "order_id" "uuid",
    "payment_id" "uuid",
    "refund_id" "uuid",
    "payout_id" "uuid",
    "type" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "meta" "jsonb",
    CONSTRAINT "check_ledger_entries_type_allow_reversal" CHECK (("type" = ANY (ARRAY['order_gross'::"text", 'fee'::"text", 'tax'::"text", 'discount'::"text", 'payment_net'::"text", 'refund'::"text", 'payout'::"text", 'reversal'::"text"]))),
    CONSTRAINT "ledger_entries_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text"))
);


ALTER TABLE "public"."ledger_entries" OWNER TO "postgres";


COMMENT ON TABLE "public"."ledger_entries" IS 'Internal accounting truth (double-entry style). Invariant: payments are external truth; ledger_entries are internal accounting truth; orders.status is derived from ledger balance. (Originally documented in deprecated public.project_docs.)';



CREATE MATERIALIZED VIEW "public"."mv_event_sales" AS
 SELECT "e"."id" AS "event_id",
    "count"("oi"."id") AS "tickets_sold",
    "count"("oi"."created_at") AS "tickets_issued",
    "count"(*) FILTER (WHERE (("o"."status")::"text" = 'paid'::"text")) AS "paid_orders",
    COALESCE("sum"(
        CASE
            WHEN (("o"."status")::"text" = 'paid'::"text") THEN "o"."total_cents"
            ELSE 0
        END), (0)::bigint) AS "gross_cents"
   FROM ((("public"."events" "e"
     LEFT JOIN "public"."ticket_types" "tt" ON (("tt"."event_id" = "e"."id")))
     LEFT JOIN "public"."order_items" "oi" ON (("oi"."ticket_type_id" = "tt"."id")))
     LEFT JOIN "public"."orders" "o" ON (("o"."id" = "oi"."order_id")))
  GROUP BY "e"."id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_event_sales" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."mv_revenue_breakdown" AS
 SELECT "o"."org_id",
    "o"."id" AS "order_id",
    "oi"."order_id" AS "oi_order_id",
    "tt"."event_id",
    "date_trunc"('day'::"text", "o"."created_at") AS "day",
    "sum"("oi_rev"."price_cents") AS "revenue_cents"
   FROM ((("public"."orders" "o"
     JOIN "public"."order_items" "oi" ON (("oi"."order_id" = "o"."id")))
     JOIN "public"."ticket_types" "tt" ON (("tt"."id" = "oi"."ticket_type_id")))
     LEFT JOIN ( SELECT "oi2"."id",
            COALESCE("o2"."total_cents", 0) AS "price_cents"
           FROM ("public"."order_items" "oi2"
             LEFT JOIN "public"."orders" "o2" ON (("o2"."id" = "oi2"."order_id")))) "oi_rev" ON (("oi_rev"."id" = "oi"."id")))
  WHERE ("o"."status" = 'paid'::"public"."order_status")
  GROUP BY "o"."org_id", "o"."id", "oi"."order_id", "tt"."event_id", ("date_trunc"('day'::"text", "o"."created_at"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_revenue_breakdown" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_mutes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "muted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_mutes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "payload" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "channel" "text",
    "dedupe_key" "text",
    "read_at" timestamp with time zone,
    CONSTRAINT "check_notifications_type_channel" CHECK ((("type" = ANY (ARRAY['email_confirmation'::"text", 'ticket_delivery'::"text", 'transfer_notification'::"text", 'refund_alert'::"text", 'generic'::"text", 'ticket_purchase_succeeded'::"text", 'payment_succeeded'::"text", 'payment_failed'::"text", 'event_published'::"text", 'event_changed'::"text", 'event_invite'::"text", 'refund_updated'::"text", 'payout_updated'::"text", 'ticket_transfer_updated'::"text", 'tapband_credential_lost'::"text", 'ticket_transfer'::"text", 'ticket_transfer_accepted'::"text", 'ticket_transfer_declined'::"text"])) AND (("channel" IS NULL) OR ("channel" = ANY (ARRAY['email'::"text", 'sms'::"text", 'push'::"text", 'in_app'::"text"])))))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ops_cron_runs" (
    "id" bigint NOT NULL,
    "job" "text" NOT NULL,
    "request_id" bigint,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status_code" integer,
    "ok" boolean,
    "error" "text",
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."ops_cron_runs" OWNER TO "postgres";


COMMENT ON TABLE "public"."ops_cron_runs" IS 'HTTP delivery log for pg_cron-driven jobs. Written by fn_ops_alerts_tick(); each tick resolves the prior request against net._http_response before firing the next one.';



ALTER TABLE "public"."ops_cron_runs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."ops_cron_runs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."order_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "price_rule_id" "uuid",
    "type" "public"."price_rule_type" NOT NULL,
    "scope" "text" NOT NULL,
    "target_order_item_id" "uuid",
    "amount_cents" integer NOT NULL,
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "order_adjustments_scope_check" CHECK (("scope" = ANY (ARRAY['order'::"text", 'item'::"text"])))
);


ALTER TABLE "public"."order_adjustments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_financials" WITH ("security_invoker"='on') AS
 SELECT "o"."id" AS "order_id",
    "o"."org_id",
    "o"."created_at",
    "o"."status",
    "o"."currency",
    "o"."item_count",
    "o"."subtotal_cents",
    "o"."platform_fee_cents",
    "o"."processor_fee_cents",
    "o"."total_cents",
    (("o"."subtotal_cents" -
        CASE
            WHEN ("pp"."platform_fee_payer" = 'organizer'::"public"."fee_payer") THEN "o"."platform_fee_cents"
            ELSE 0
        END) -
        CASE
            WHEN ("pp"."processor_fee_payer" = 'organizer'::"public"."fee_payer") THEN "o"."processor_fee_cents"
            ELSE 0
        END) AS "organizer_gross_if_buyer_pays_fees",
    "pp"."platform_percent_bps",
    "pp"."platform_fixed_cents",
    "pp"."processor_percent_bps",
    "pp"."processor_fixed_cents"
   FROM ("public"."orders" "o"
     LEFT JOIN "public"."pricing_plans" "pp" ON (("pp"."id" = "o"."pricing_plan_id")));


ALTER VIEW "public"."order_financials" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_ledger_summary" WITH ("security_invoker"='true') AS
 SELECT "order_id",
    "gross_cents",
    "payment_net_cents",
    "refund_cents",
    "net_cents"
   FROM "public"."order_ledger_summary_fn"() "t"("order_id", "gross_cents", "payment_net_cents", "refund_cents", "net_cents");


ALTER VIEW "public"."order_ledger_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_metrics_daily" (
    "org_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "tickets_sold" integer DEFAULT 0 NOT NULL,
    "gross_revenue_cents" bigint DEFAULT 0 NOT NULL,
    "refunds_cents" bigint DEFAULT 0 NOT NULL,
    "active_events" integer DEFAULT 0 NOT NULL,
    "unique_buyers" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."org_metrics_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "method_type" "text" DEFAULT 'card'::"text" NOT NULL,
    "brand" "text",
    "last4" "text",
    "exp_month" integer,
    "exp_year" integer,
    "token" "text",
    "is_default" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_provider_settings" (
    "provider" "text" NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL,
    "mode" "text" DEFAULT 'test'::"text" NOT NULL,
    "public_key" "text",
    "secret_key" "text",
    "webhook_secret" "text",
    "callback_url" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_provider_settings_mode_check" CHECK (("mode" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "payment_provider_settings_provider_check" CHECK (("provider" = ANY (ARRAY['paystack'::"text", 'flutterwave'::"text", 'manual'::"text", 'momo'::"text", 'deltapay'::"text"])))
);


ALTER TABLE "public"."payment_provider_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_provider_settings" IS 'Service-role only payment gateway settings managed by super-admin dashboard. Secret values are never exposed to browser clients.';



CREATE TABLE IF NOT EXISTS "public"."payment_routing_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "priority" integer DEFAULT 100 NOT NULL,
    "country_code" "text",
    "currency" "text",
    "provider" "text" NOT NULL,
    "fallback_provider" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payment_routing_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_routing_rules" IS 'Declarative payment provider routing. Rules evaluated by priority ASC; first match wins.';



CREATE TABLE IF NOT EXISTS "public"."payout_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "details_encrypted" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payout_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."physical_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "credential_public_id" "text" NOT NULL,
    "credential_type" "text" DEFAULT 'ntag_pilot'::"text" NOT NULL,
    "chip_family" "text" NOT NULL,
    "key_version" "text",
    "authentication_mode" "text" DEFAULT 'server_entitlement'::"text" NOT NULL,
    "status" "text" DEFAULT 'issued'::"text" NOT NULL,
    "issued_by" "uuid" DEFAULT "auth"."uid"(),
    "activated_by" "uuid",
    "revoked_by" "uuid",
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activated_at" timestamp with time zone,
    "last_used_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "revocation_reason" "text",
    "replacement_of_id" "uuid",
    "replaced_by_id" "uuid",
    "pin_enabled" boolean DEFAULT false NOT NULL,
    "verification_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "physical_credentials_active_has_user" CHECK ((("status" <> 'active'::"text") OR ("user_id" IS NOT NULL))),
    CONSTRAINT "physical_credentials_authentication_mode_check" CHECK (("authentication_mode" = ANY (ARRAY['server_entitlement'::"text", 'desfire_mutual_auth'::"text", 'signed_payload'::"text"]))),
    CONSTRAINT "physical_credentials_chip_family_not_blank" CHECK (("btrim"("chip_family") <> ''::"text")),
    CONSTRAINT "physical_credentials_public_id_not_blank" CHECK (("btrim"("credential_public_id") <> ''::"text")),
    CONSTRAINT "physical_credentials_replaced_by_not_self" CHECK ((("replaced_by_id" IS NULL) OR ("replaced_by_id" <> "id"))),
    CONSTRAINT "physical_credentials_replacement_of_not_self" CHECK ((("replacement_of_id" IS NULL) OR ("replacement_of_id" <> "id"))),
    CONSTRAINT "physical_credentials_status_check" CHECK (("status" = ANY (ARRAY['issued'::"text", 'active'::"text", 'suspended'::"text", 'revoked'::"text", 'lost'::"text", 'replaced'::"text", 'defective'::"text", 'retired'::"text", 'destroyed'::"text"]))),
    CONSTRAINT "physical_credentials_type_check" CHECK (("credential_type" = ANY (ARRAY['ntag_pilot'::"text", 'desfire_ev3'::"text", 'qr_fallback'::"text", 'manual_reference'::"text"]))),
    CONSTRAINT "physical_credentials_verification_metadata_object" CHECK (("jsonb_typeof"("verification_metadata") = 'object'::"text"))
);


ALTER TABLE "public"."physical_credentials" OWNER TO "postgres";


COMMENT ON TABLE "public"."physical_credentials" IS 'Customer-facing TapBand credential lifecycle record. Production access must pair the credential with server entitlements and configured authentication mode.';



COMMENT ON COLUMN "public"."physical_credentials"."authentication_mode" IS 'Production TapBand authentication mode. A hashed UID alone is not an accepted authenticator.';



CREATE TABLE IF NOT EXISTS "public"."price_rule_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "price_rule_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "order_id" "uuid",
    "redeemed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."price_rule_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "surname" "text",
    "phone" "text",
    "locale" "text" DEFAULT 'en'::"text" NOT NULL,
    "avatar_url" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."user_id" IS 'Canonical Supabase Auth UUID for this Ticketiv profile. Every app role must be derived from this UUID.';



CREATE TABLE IF NOT EXISTS "public"."provider_settlement_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "settlement_id" "uuid" NOT NULL,
    "ext_payment_id" "text" NOT NULL,
    "payment_id" "uuid",
    "amount_cents" integer DEFAULT 0 NOT NULL,
    "fee_cents" integer DEFAULT 0 NOT NULL,
    "payload" "jsonb"
);


ALTER TABLE "public"."provider_settlement_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "ext_settlement_id" "text" NOT NULL,
    "status" "text",
    "currency" "text",
    "gross_cents" integer DEFAULT 0 NOT NULL,
    "fees_cents" integer DEFAULT 0 NOT NULL,
    "net_cents" integer DEFAULT 0 NOT NULL,
    "settled_at" timestamp with time zone,
    "payload" "jsonb",
    "ingested_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_settlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "service" "public"."push_service" NOT NULL,
    "token" "text" NOT NULL,
    "device_id" "text" NOT NULL,
    "app_id" "text",
    "platform_version" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "disabled_at" timestamp with time zone,
    "disabled_reason" "text",
    CONSTRAINT "push_devices_device_id_not_blank" CHECK (("btrim"("device_id") <> ''::"text")),
    CONSTRAINT "push_devices_token_not_blank" CHECK (("btrim"("token") <> ''::"text"))
);


ALTER TABLE "public"."push_devices" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_devices" IS 'Native push registrations (FCM/APNs/HMS) for the React Native apps. Web Push lives separately in push_subscriptions. Writes go through SECURITY DEFINER RPCs only.';



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_subscriptions" IS 'Web Push subscriptions captured via the browser Push API. Consumed by the (TODO) VAPID-signed sender to deliver waitlist-offer push notifications. See TICK-214.';



CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "bucket" "text" NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "hits" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refund_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "refund_id" "uuid" NOT NULL,
    "order_item_id" "uuid",
    "amount_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    CONSTRAINT "refund_items_amount_cents_check" CHECK (("amount_cents" >= 0)),
    CONSTRAINT "refund_items_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text"))
);


ALTER TABLE "public"."refund_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resale_listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "seller_id" "uuid",
    "org_id" "uuid" NOT NULL,
    "price_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'SZL'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "listing_expires_at" timestamp with time zone,
    "transfer_fee_cents" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "transfer_id" "uuid",
    CONSTRAINT "resale_listings_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "resale_listings_price_cents_check" CHECK (("price_cents" >= 0)),
    CONSTRAINT "resale_listings_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'sold'::"text", 'cancelled'::"text", 'expired'::"text"]))),
    CONSTRAINT "resale_listings_transfer_fee_cents_check" CHECK (("transfer_fee_cents" >= 0))
);


ALTER TABLE "public"."resale_listings" OWNER TO "postgres";


COMMENT ON TABLE "public"."resale_listings" IS 'Paid marketplace ticket resale. price_cents is the listing price. transfer_id links to the transfer created when the listing was sold (NULL while active/cancelled/expired).';



COMMENT ON COLUMN "public"."resale_listings"."transfer_id" IS 'Transfer created when this listing was sold. NULL while listing is active/cancelled/expired.';



CREATE TABLE IF NOT EXISTS "public"."scans_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "order_item_id" "uuid",
    "ticket_code" "text" NOT NULL,
    "outcome" "text" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "device_id" "uuid",
    "device_session_id" "uuid",
    "gate" "text",
    "notes" "text",
    "request_hash" "text",
    "source_ip" "inet",
    "archived_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "scans_outcome_check" CHECK (("outcome" = ANY (ARRAY['valid'::"text", 'already_used'::"text", 'revoked'::"text", 'invalid'::"text", 'wrong_event'::"text"])))
);


ALTER TABLE "public"."scans_archive" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seat_maps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "schema" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."seat_maps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seat_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "seat_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."seat_reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seat_map_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."seats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."series_follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "series_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."series_follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tapband_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_key" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "org_id" "uuid",
    "event_id" "uuid",
    "device_id" "uuid",
    "correlation_id" "text",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tapband_alerts_details_object" CHECK (("jsonb_typeof"("details") = 'object'::"text")),
    CONSTRAINT "tapband_alerts_key_not_blank" CHECK (("btrim"("alert_key") <> ''::"text")),
    CONSTRAINT "tapband_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['warning'::"text", 'critical'::"text"]))),
    CONSTRAINT "tapband_alerts_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."tapband_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tapband_feature_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" DEFAULT 'production'::"text" NOT NULL,
    "org_id" "uuid",
    "event_id" "uuid",
    "enabled" boolean DEFAULT false NOT NULL,
    "product_visibility_enabled" boolean DEFAULT false NOT NULL,
    "credential_lookup_enabled" boolean DEFAULT false NOT NULL,
    "provisioning_enabled" boolean DEFAULT false NOT NULL,
    "activation_enabled" boolean DEFAULT false NOT NULL,
    "outlet_lookup_enabled" boolean DEFAULT false NOT NULL,
    "outlet_sales_enabled" boolean DEFAULT false NOT NULL,
    "online_nfc_scanning_enabled" boolean DEFAULT false NOT NULL,
    "offline_nfc_scanning_enabled" boolean DEFAULT false NOT NULL,
    "offline_manifest_issuance_enabled" boolean DEFAULT false NOT NULL,
    "qr_fallback_enabled" boolean DEFAULT false NOT NULL,
    "lost_replacement_enabled" boolean DEFAULT false NOT NULL,
    "desfire_secure_mode_enabled" boolean DEFAULT false NOT NULL,
    "allowed_chip_families" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "allowed_key_versions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "supported_entry_zones" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "manifest_validity_seconds" integer DEFAULT 900 NOT NULL,
    "tap_debounce_ms" integer DEFAULT 1500 NOT NULL,
    "outlet_verification_requirement" "text" DEFAULT 'phone_otp'::"text" NOT NULL,
    "replacement_fee_cents" integer DEFAULT 0 NOT NULL,
    "replacement_fee_waiver_enabled" boolean DEFAULT false NOT NULL,
    "effective_within_seconds" integer DEFAULT 60 NOT NULL,
    "public_client_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notes" "text",
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "outlet_id" "text",
    CONSTRAINT "tapband_feature_configs_debounce_window" CHECK ((("tap_debounce_ms" >= 0) AND ("tap_debounce_ms" <= 60000))),
    CONSTRAINT "tapband_feature_configs_effective_window" CHECK ((("effective_within_seconds" >= 0) AND ("effective_within_seconds" <= 3600))),
    CONSTRAINT "tapband_feature_configs_environment_not_blank" CHECK (("btrim"("environment") <> ''::"text")),
    CONSTRAINT "tapband_feature_configs_manifest_window" CHECK ((("manifest_validity_seconds" >= 60) AND ("manifest_validity_seconds" <= 86400))),
    CONSTRAINT "tapband_feature_configs_outlet_id_not_blank" CHECK ((("outlet_id" IS NULL) OR ("btrim"("outlet_id") <> ''::"text"))),
    CONSTRAINT "tapband_feature_configs_public_config_object" CHECK (("jsonb_typeof"("public_client_config") = 'object'::"text")),
    CONSTRAINT "tapband_feature_configs_replacement_fee_non_negative" CHECK (("replacement_fee_cents" >= 0)),
    CONSTRAINT "tapband_feature_configs_verification_requirement" CHECK (("outlet_verification_requirement" = ANY (ARRAY['none'::"text", 'staff_pin'::"text", 'phone_otp'::"text", 'identity_review'::"text"])))
);


ALTER TABLE "public"."tapband_feature_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tapband_kill_switches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "switch_type" "text" NOT NULL,
    "environment" "text" DEFAULT 'production'::"text" NOT NULL,
    "org_id" "uuid",
    "event_id" "uuid",
    "target_ref" "text",
    "capability" "text",
    "reason_code" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "revoked_by" "uuid",
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tapband_kill_switches_environment_not_blank" CHECK (("btrim"("environment") <> ''::"text")),
    CONSTRAINT "tapband_kill_switches_reason_code_not_blank" CHECK (("btrim"("reason_code") <> ''::"text")),
    CONSTRAINT "tapband_kill_switches_reason_not_blank" CHECK (("btrim"("reason") <> ''::"text")),
    CONSTRAINT "tapband_kill_switches_target_required" CHECK ((("switch_type" = ANY (ARRAY['all_credential_lookups'::"text", 'nfc_scanning'::"text", 'offline_manifest_issuance'::"text", 'customer_replacement'::"text"])) OR ("target_ref" IS NOT NULL))),
    CONSTRAINT "tapband_kill_switches_time_order" CHECK ((("ends_at" IS NULL) OR ("ends_at" > "starts_at"))),
    CONSTRAINT "tapband_kill_switches_type_check" CHECK (("switch_type" = ANY (ARRAY['all_credential_lookups'::"text", 'supplier_batch'::"text", 'chip_family'::"text", 'key_version'::"text", 'outlet'::"text", 'provisioning_device'::"text", 'nfc_scanning'::"text", 'offline_manifest_issuance'::"text", 'customer_replacement'::"text"])))
);


ALTER TABLE "public"."tapband_kill_switches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tapband_telemetry_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "event_id" "uuid",
    "device_id" "uuid",
    "event_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "outcome" "text",
    "channel" "text",
    "credential_hash" "text",
    "serial_hash" "text",
    "actor_hash" "text",
    "reader_id" "text",
    "correlation_id" "text",
    "latency_ms" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ingested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tapband_telemetry_event_type_not_blank" CHECK (("btrim"("event_type") <> ''::"text")),
    CONSTRAINT "tapband_telemetry_latency_non_negative" CHECK ((("latency_ms" IS NULL) OR ("latency_ms" >= 0))),
    CONSTRAINT "tapband_telemetry_metadata_object" CHECK (("jsonb_typeof"("metadata") = 'object'::"text")),
    CONSTRAINT "tapband_telemetry_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."tapband_telemetry_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_type_channels" (
    "ticket_type_id" "uuid" NOT NULL,
    "channel" "public"."sales_channel" NOT NULL,
    "quota" integer,
    "per_order_limit" integer,
    CONSTRAINT "ticket_type_channels_per_order_limit_check" CHECK (("per_order_limit" >= 0)),
    CONSTRAINT "ticket_type_channels_quota_check" CHECK (("quota" >= 0))
);


ALTER TABLE "public"."ticket_type_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid",
    "from_user_id" "uuid",
    "to_user_id" "uuid",
    "status" "public"."transfer_status" DEFAULT 'requested'::"public"."transfer_status" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval) NOT NULL
);


ALTER TABLE "public"."transfers" OWNER TO "postgres";


COMMENT ON TABLE "public"."transfers" IS 'Free peer-to-peer ticket gifts. For paid resale, use resale_listings; selling a listing creates a transfer linked via resale_listings.transfer_id.';



CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_blocks_no_self" CHECK (("blocker_id" <> "blocked_id"))
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "status" "public"."connection_status" DEFAULT 'pending'::"public"."connection_status" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    CONSTRAINT "user_connections_no_self" CHECK (("requester_id" <> "recipient_id"))
);


ALTER TABLE "public"."user_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_connections" IS 'Mutual friendship graph. requester_id sends; recipient_id accepts/declines/blocks. Pair uniqueness enforced regardless of direction.';



CREATE OR REPLACE VIEW "public"."user_friends" WITH ("security_invoker"='true') AS
 SELECT
        CASE
            WHEN ("requester_id" = ( SELECT "auth"."uid"() AS "uid")) THEN "recipient_id"
            ELSE "requester_id"
        END AS "friend_id",
    "responded_at" AS "connected_at",
    "id" AS "connection_id"
   FROM "public"."user_connections"
  WHERE (("status" = 'accepted'::"public"."connection_status") AND ((( SELECT "auth"."uid"() AS "uid") = "requester_id") OR (( SELECT "auth"."uid"() AS "uid") = "recipient_id")));


ALTER VIEW "public"."user_friends" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_friends" IS 'Accepted friends from the current user perspective. security_invoker=true means RLS on user_connections still applies to readers.';



CREATE TABLE IF NOT EXISTS "public"."user_handles" (
    "user_id" "uuid" NOT NULL,
    "handle" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_handles_handle_format" CHECK ((("handle" ~ '^[a-z0-9][a-z0-9_]{2,29}$'::"text") AND ("handle" = "lower"("handle"))))
);


ALTER TABLE "public"."user_handles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_handles" IS 'Public user handles (e.g. @lethu). One per user. Used in URLs, mentions, friend search.';



CREATE TABLE IF NOT EXISTS "public"."user_notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "email_opt_in" boolean DEFAULT true NOT NULL,
    "sms_opt_in" boolean DEFAULT false NOT NULL,
    "push_opt_in" boolean DEFAULT true NOT NULL,
    "in_app_opt_in" boolean DEFAULT true NOT NULL,
    "preferred_channel" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_privacy_settings" (
    "user_id" "uuid" NOT NULL,
    "profile_discoverability" "text" DEFAULT 'everyone'::"text" NOT NULL,
    "allow_friend_requests" boolean DEFAULT true NOT NULL,
    "show_events_going_to_friends" boolean DEFAULT true NOT NULL,
    "allow_friend_suggestions" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "discover_by_phone" boolean DEFAULT false NOT NULL,
    CONSTRAINT "user_privacy_settings_profile_discoverability_check" CHECK (("profile_discoverability" = ANY (ARRAY['everyone'::"text", 'friends'::"text"])))
);


ALTER TABLE "public"."user_privacy_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_private_profiles" (
    "user_id" "uuid" NOT NULL,
    "name" "text",
    "surname" "text",
    "phone" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_private_profiles_phone_check" CHECK ((("phone" IS NULL) OR ("regexp_replace"("phone", '[^0-9+]'::"text", ''::"text", 'g'::"text") ~ '^\+?[0-9]{7,15}$'::"text")))
);


ALTER TABLE "public"."user_private_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_reports_no_self" CHECK (("reporter_id" <> "reported_id")),
    CONSTRAINT "user_reports_reason_check" CHECK ((("char_length"("btrim"("reason")) >= 3) AND ("char_length"("btrim"("reason")) <= 500)))
);


ALTER TABLE "public"."user_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "address" "text",
    "tz" "text" DEFAULT 'Africa/Mbabane'::"text",
    "capacity" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "city" "text",
    "slug" "text" NOT NULL,
    "name_key" "text" GENERATED ALWAYS AS ("lower"("regexp_replace"(TRIM(BOTH FROM "name"), '\s+'::"text", ' '::"text", 'g'::"text"))) STORED,
    "city_key" "text" GENERATED ALWAYS AS ("lower"("regexp_replace"(TRIM(BOTH FROM COALESCE("city", ''::"text")), '\s+'::"text", ' '::"text", 'g'::"text"))) STORED,
    CONSTRAINT "venues_capacity_check" CHECK (("capacity" >= 0)),
    CONSTRAINT "venues_slug_format" CHECK ((("slug" ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::"text") AND (("length"("slug") >= 2) AND ("length"("slug") <= 80))))
);


ALTER TABLE "public"."venues" OWNER TO "postgres";


COMMENT ON COLUMN "public"."venues"."slug" IS 'URL-safe handle for the venue. Format: lower(a-z0-9 with single hyphens), 2-80 chars.';



CREATE OR REPLACE VIEW "public"."v_events_public" WITH ("security_invoker"='true') AS
 SELECT "e"."id",
    "e"."title",
    "e"."slug",
    "e"."category",
    COALESCE("e"."city", "v"."city") AS "city",
    "e"."country_code" AS "country",
    "e"."cover_image_url" AS "poster_url",
    "e"."starts_at",
    "e"."venue_id",
    "v"."name" AS "venue_name",
    "v"."address" AS "venue_address",
    "v"."tz" AS "venue_tz",
    "tp"."min_price_cents",
    "tp"."max_price_cents",
    "tp"."currency",
    "e"."org_id" AS "organizer_id",
    "o"."name" AS "organizer_name",
    "o"."logo" AS "organizer_logo_url",
    "e"."featured_priority"
   FROM ((("public"."events" "e"
     LEFT JOIN "public"."venues" "v" ON (("v"."id" = "e"."venue_id")))
     LEFT JOIN "public"."organizations" "o" ON (("o"."id" = "e"."org_id")))
     LEFT JOIN LATERAL ( SELECT "min"("t"."price_cents") AS "min_price_cents",
            "max"("t"."price_cents") AS "max_price_cents",
            ( SELECT "t2"."currency"
                   FROM "public"."ticket_types" "t2"
                  WHERE (("t2"."event_id" = "e"."id") AND ("t2"."sales_status" = 'on_sale'::"public"."ticket_type_sales_status"))
                  ORDER BY "t2"."price_cents"
                 LIMIT 1) AS "currency"
           FROM "public"."ticket_types" "t"
          WHERE (("t"."event_id" = "e"."id") AND ("t"."sales_status" = 'on_sale'::"public"."ticket_type_sales_status"))) "tp" ON (true))
  WHERE (("e"."status" = 'published'::"public"."event_status") AND ("e"."visibility" = 'public'::"text"));


ALTER VIEW "public"."v_events_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_artist_events_public" WITH ("security_invoker"='true') AS
 SELECT "ev"."id",
    "ev"."title",
    "ev"."slug",
    "ev"."category",
    "ev"."city",
    "ev"."country",
    "ev"."poster_url",
    "ev"."starts_at",
    "ev"."venue_id",
    "ev"."venue_name",
    "ev"."venue_address",
    "ev"."venue_tz",
    "ev"."min_price_cents",
    "ev"."max_price_cents",
    "ev"."currency",
    "ev"."organizer_id",
    "ev"."organizer_name",
    "ev"."organizer_logo_url",
    "ea"."artist_id"
   FROM ("public"."v_events_public" "ev"
     JOIN "public"."event_artists" "ea" ON (("ea"."event_id" = "ev"."id")));


ALTER VIEW "public"."v_artist_events_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_artist_public" WITH ("security_invoker"='true') AS
 SELECT "id",
    "name",
    "slug",
    "bio",
    "image_url" AS "photo_url",
    NULL::"text" AS "genre",
    NULL::"jsonb" AS "social_links"
   FROM "public"."artists" "a";


ALTER VIEW "public"."v_artist_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_event_kpis" WITH ("security_invoker"='true') AS
 SELECT "e"."org_id",
    "e"."id" AS "event_id",
    "e"."title",
    "e"."slug",
    "count"(DISTINCT "o"."id") FILTER (WHERE ("o"."status" = 'paid'::"public"."order_status")) AS "paid_orders",
    "count"("oi"."id") FILTER (WHERE ("oi"."revoked_at" IS NULL)) AS "tickets_issued",
    "count"("oi"."id") FILTER (WHERE ("oi"."checked_in_at" IS NOT NULL)) AS "tickets_checked_in",
    COALESCE("sum"("o"."total_cents") FILTER (WHERE ("o"."status" = 'paid'::"public"."order_status")), (0)::bigint) AS "revenue_cents",
    "max"("o"."currency") FILTER (WHERE ("o"."status" = 'paid'::"public"."order_status")) AS "currency"
   FROM ((("public"."events" "e"
     LEFT JOIN "public"."ticket_types" "tt" ON (("tt"."event_id" = "e"."id")))
     LEFT JOIN "public"."order_items" "oi" ON (("oi"."ticket_type_id" = "tt"."id")))
     LEFT JOIN "public"."orders" "o" ON (("o"."id" = "oi"."order_id")))
  GROUP BY "e"."org_id", "e"."id", "e"."title", "e"."slug";


ALTER VIEW "public"."v_event_kpis" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_event_lineup_public" WITH ("security_invoker"='true') AS
 SELECT "ea"."event_id",
    "a"."id" AS "artist_id",
    "a"."name" AS "artist_name",
    "a"."slug" AS "artist_slug",
    "a"."image_url" AS "artist_image_url",
    "ea"."role"
   FROM (("public"."event_artists" "ea"
     JOIN "public"."artists" "a" ON (("a"."id" = "ea"."artist_id")))
     JOIN "public"."events" "e" ON (("e"."id" = "ea"."event_id")))
  WHERE ("e"."visibility" = 'public'::"text")
  ORDER BY "ea"."event_id", "a"."name";


ALTER VIEW "public"."v_event_lineup_public" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_event_lineup_public" IS 'Public lineup join: event_artists + artists, filtered to events with visibility=public. Front-end /events/[id] reads from here for the Lineup section.';



CREATE OR REPLACE VIEW "public"."v_event_public" WITH ("security_invoker"='true') AS
 SELECT "ev"."id",
    "ev"."title",
    "ev"."slug",
    "ev"."category",
    "ev"."city",
    "ev"."country",
    "ev"."poster_url",
    "ev"."starts_at",
    "ev"."venue_id",
    "ev"."venue_name",
    "ev"."venue_address",
    "ev"."venue_tz",
    "ev"."min_price_cents",
    "ev"."max_price_cents",
    "ev"."currency",
    "ev"."organizer_id",
    "ev"."organizer_name",
    "ev"."organizer_logo_url",
    "e"."description",
    "e"."visibility",
    "v"."capacity" AS "venue_capacity"
   FROM (("public"."v_events_public" "ev"
     JOIN "public"."events" "e" ON (("e"."id" = "ev"."id")))
     LEFT JOIN "public"."venues" "v" ON (("v"."id" = "ev"."venue_id")));


ALTER VIEW "public"."v_event_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_event_sales_public" WITH ("security_invoker"='true') AS
 SELECT "event_id",
    "tickets_sold",
    "gross_cents" AS "gross_revenue_cents"
   FROM "public"."mv_event_sales";


ALTER VIEW "public"."v_event_sales_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_finance_reconciliation_queue" WITH ("security_invoker"='true') AS
 SELECT "id",
    "detector_key",
    "entity_key",
    "org_id",
    "order_id",
    "payment_id",
    "refund_id",
    "severity",
    "status",
    "title",
    "details",
    "runbook_key",
    "owner_user_id",
    "first_detected_at",
    "last_detected_at",
    "acknowledged_at",
    "resolved_at",
    (EXTRACT(epoch FROM ("now"() - "first_detected_at")))::bigint AS "age_seconds",
    "resolution_note"
   FROM "public"."finance_reconciliation_issues";


ALTER VIEW "public"."v_finance_reconciliation_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_inbound_transfers" WITH ("security_invoker"='true') AS
 SELECT "t"."id" AS "transfer_id",
    "t"."order_item_id",
    "t"."from_user_id",
    "t"."to_user_id",
    "t"."status",
    "t"."created_at" AS "offered_at",
    "t"."updated_at",
    "t"."expires_at",
    COALESCE("fp"."display_name", NULLIF(TRIM(BOTH FROM ((COALESCE("fp"."name", ''::"text") || ' '::"text") || COALESCE("fp"."surname", ''::"text"))), ''::"text"), 'Friend'::"text") AS "from_name",
    "fh"."handle" AS "from_handle",
    "oi"."ticket_code",
    "oi"."ticket_type_id",
    "tt"."name" AS "ticket_type_name",
    "tt"."price_cents",
    "tt"."currency",
    "e"."id" AS "event_id",
    "e"."title" AS "event_title",
    "e"."starts_at" AS "event_starts_at",
    "e"."cover_image_url",
    "v"."name" AS "venue_name"
   FROM (((((("public"."transfers" "t"
     JOIN "public"."order_items" "oi" ON (("oi"."id" = "t"."order_item_id")))
     LEFT JOIN "public"."ticket_types" "tt" ON (("tt"."id" = "oi"."ticket_type_id")))
     LEFT JOIN "public"."events" "e" ON (("e"."id" = "tt"."event_id")))
     LEFT JOIN "public"."venues" "v" ON (("v"."id" = "e"."venue_id")))
     LEFT JOIN "public"."profiles" "fp" ON (("fp"."user_id" = "t"."from_user_id")))
     LEFT JOIN "public"."user_handles" "fh" ON (("fh"."user_id" = "t"."from_user_id")))
  WHERE (("t"."status" = ANY (ARRAY['pending'::"public"."transfer_status", 'requested'::"public"."transfer_status"])) AND ("t"."to_user_id" = "auth"."uid"()) AND ("t"."expires_at" > "now"()));


ALTER VIEW "public"."v_inbound_transfers" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_inbound_transfers" IS 'Pending transfers offered to the current user, with sender + event context. RLS via security_invoker honors transfers/order_items policies.';



CREATE OR REPLACE VIEW "public"."v_my_order_ledger_summary" WITH ("security_invoker"='true') AS
 SELECT "s"."order_id",
    "s"."gross_cents",
    "s"."payment_net_cents",
    "s"."refund_cents",
    "s"."net_cents"
   FROM ("public"."orders" "o"
     CROSS JOIN LATERAL "public"."order_ledger_summary_for_order"("o"."id") "s"("order_id", "gross_cents", "payment_net_cents", "refund_cents", "net_cents"))
  WHERE ("o"."buyer_id" = "auth"."uid"());


ALTER VIEW "public"."v_my_order_ledger_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_my_tickets" WITH ("security_invoker"='true') AS
 SELECT "o"."order_id",
    "o"."buyer_id",
    "o"."order_status",
    "o"."ordered_at",
    "oi"."id" AS "order_item_id",
    "oi"."ticket_code",
    "oi"."checked_in_at",
    "oi"."revoked_at",
    "tt"."id" AS "ticket_type_id",
    "tt"."name" AS "ticket_type_name",
    "tt"."price_cents",
    "tt"."currency",
    "e"."id" AS "event_id",
    "e"."title" AS "event_title",
    "e"."slug" AS "event_slug",
    "e"."city",
    "e"."cover_image_url",
    "v"."name" AS "venue_name",
    "v"."address" AS "venue_address",
    COALESCE("nextd"."starts_at", "lastd"."starts_at") AS "event_starts_at",
    "oi"."status" AS "order_item_status",
    "oi"."refunded_at",
    "oi"."transferred_from_order_item_id",
    "oi"."current_owner_id"
   FROM (((((("public"."order_items" "oi"
     JOIN LATERAL "app"."ticket_order_context"("oi"."id") "o"("order_id", "buyer_id", "order_status", "ordered_at") ON (true))
     JOIN "public"."ticket_types" "tt" ON (("tt"."id" = "oi"."ticket_type_id")))
     JOIN "public"."events" "e" ON (("e"."id" = "tt"."event_id")))
     LEFT JOIN "public"."venues" "v" ON (("v"."id" = "e"."venue_id")))
     LEFT JOIN LATERAL ( SELECT "d"."starts_at"
           FROM "public"."event_dates" "d"
          WHERE (("d"."event_id" = "e"."id") AND ("d"."starts_at" >= "now"()))
          ORDER BY "d"."starts_at"
         LIMIT 1) "nextd" ON (true))
     LEFT JOIN LATERAL ( SELECT "d"."starts_at"
           FROM "public"."event_dates" "d"
          WHERE (("d"."event_id" = "e"."id") AND ("d"."starts_at" < "now"()))
          ORDER BY "d"."starts_at" DESC
         LIMIT 1) "lastd" ON (true))
  WHERE (("oi"."current_owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("oi"."current_owner_id" IS NULL) AND ("o"."buyer_id" = ( SELECT "auth"."uid"() AS "uid"))));


ALTER VIEW "public"."v_my_tickets" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_my_tickets" IS 'Current-user ticket view. Canonical visibility follows order_items.current_owner_id; buyer_id is used only as a legacy fallback when current_owner_id is null.';



CREATE OR REPLACE VIEW "public"."v_organizer_events_public" WITH ("security_invoker"='true') AS
 SELECT "id",
    "title",
    "slug",
    "category",
    "city",
    "country",
    "poster_url",
    "starts_at",
    "venue_id",
    "venue_name",
    "venue_address",
    "venue_tz",
    "min_price_cents",
    "max_price_cents",
    "currency",
    "organizer_id",
    "organizer_name",
    "organizer_logo_url"
   FROM "public"."v_events_public";


ALTER VIEW "public"."v_organizer_events_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_organizer_public" WITH ("security_invoker"='true') AS
 SELECT "id",
    "name",
    "slug",
    "bio",
    "logo" AS "logo_url",
    NULL::"text" AS "website",
    NULL::"jsonb" AS "social_links",
    ( SELECT "count"(*) AS "count"
           FROM "public"."events" "e"
          WHERE (("e"."org_id" = "o"."id") AND ("e"."status" = 'published'::"public"."event_status") AND ("e"."visibility" = 'public'::"text"))) AS "event_count"
   FROM "public"."organizations" "o";


ALTER VIEW "public"."v_organizer_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_public_event_cards" WITH ("security_invoker"='true') AS
 SELECT "e"."id",
    "e"."title",
    "e"."slug",
    "e"."category",
    COALESCE("e"."city", "v"."city") AS "city",
    "e"."country_code" AS "country",
    "e"."cover_image_url" AS "poster_url",
    "e"."starts_at",
    "e"."venue_id",
    "v"."name" AS "venue_name",
    "v"."address" AS "venue_address",
    "v"."tz" AS "venue_tz",
    "tp"."min_price_cents",
    "tp"."max_price_cents",
    "tp"."currency",
    "e"."org_id" AS "organizer_id",
    "o"."name" AS "organizer_name",
    "o"."logo" AS "organizer_logo_url",
    "e"."featured_priority",
    COALESCE("els"."tickets_sold", 0) AS "tickets_sold",
    COALESCE("els"."tickets_available", 0) AS "tickets_available",
    COALESCE("els"."checked_in_count", 0) AS "checked_in_count",
    "els"."last_order_at",
    "els"."last_scan_at",
    "els"."updated_at" AS "live_stats_updated_at"
   FROM (((("public"."events" "e"
     LEFT JOIN "public"."venues" "v" ON (("v"."id" = "e"."venue_id")))
     LEFT JOIN "public"."organizations" "o" ON (("o"."id" = "e"."org_id")))
     LEFT JOIN "public"."event_live_stats" "els" ON (("els"."event_id" = "e"."id")))
     LEFT JOIN LATERAL ( SELECT "min"("t"."price_cents") AS "min_price_cents",
            "max"("t"."price_cents") AS "max_price_cents",
            ( SELECT "t2"."currency"
                   FROM "public"."ticket_types" "t2"
                  WHERE (("t2"."event_id" = "e"."id") AND ("t2"."sales_status" = 'on_sale'::"public"."ticket_type_sales_status"))
                  ORDER BY "t2"."price_cents"
                 LIMIT 1) AS "currency"
           FROM "public"."ticket_types" "t"
          WHERE (("t"."event_id" = "e"."id") AND ("t"."sales_status" = 'on_sale'::"public"."ticket_type_sales_status"))) "tp" ON (true))
  WHERE (("e"."status" = 'published'::"public"."event_status") AND ("e"."visibility" = 'public'::"text") AND (("e"."publish_at" IS NULL) OR ("e"."publish_at" <= "now"())) AND (("e"."unpublish_at" IS NULL) OR ("e"."unpublish_at" > "now"())));


ALTER VIEW "public"."v_public_event_cards" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_user_events" WITH ("security_invoker"='on') AS
 SELECT "event_id"
   FROM "public"."event_staff" "es"
  WHERE (("user_id" = "auth"."uid"()) AND "active");


ALTER VIEW "public"."v_user_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_user_orgs" WITH ("security_invoker"='on') AS
 SELECT "org_id"
   FROM "public"."org_members"
  WHERE ("user_id" = "auth"."uid"());


ALTER VIEW "public"."v_user_orgs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "ticket_type_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "quantity_requested" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "offer_expires_at" timestamp with time zone,
    "notified_at" timestamp with time zone,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "waitlists_identity_present" CHECK ((("email" IS NOT NULL) OR ("user_id" IS NOT NULL))),
    CONSTRAINT "waitlists_quantity_requested_check" CHECK (("quantity_requested" > 0)),
    CONSTRAINT "waitlists_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'offered'::"text", 'converted'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."waitlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "attempt_no" integer DEFAULT 1 NOT NULL,
    "response_status" integer,
    "response_body" "text",
    "duration_ms" integer,
    "delivered_at" timestamp with time zone,
    "next_retry_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_deliveries" OWNER TO "postgres";


COMMENT ON TABLE "public"."webhook_deliveries" IS 'One row per delivery attempt; retries get successive rows tied to the same endpoint_id.';



CREATE TABLE IF NOT EXISTS "public"."webhook_endpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "url" "text" NOT NULL,
    "description" "text",
    "secret" "text",
    "events" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_delivery_at" timestamp with time zone,
    "last_status_code" integer
);


ALTER TABLE "public"."webhook_endpoints" OWNER TO "postgres";


COMMENT ON TABLE "public"."webhook_endpoints" IS 'Outbound webhook subscribers. Platform-level rows have org_id NULL.';



ALTER TABLE ONLY "_internal"."policy_backups" ALTER COLUMN "id" SET DEFAULT "nextval"('"_internal"."policy_backups_id_seq"'::"regclass");



ALTER TABLE ONLY "monitoring"."index_bloat_snapshots" ALTER COLUMN "id" SET DEFAULT "nextval"('"monitoring"."index_bloat_snapshots_id_seq"'::"regclass");



ALTER TABLE ONLY "monitoring"."slow_query_snapshots" ALTER COLUMN "id" SET DEFAULT "nextval"('"monitoring"."slow_query_snapshots_id_seq"'::"regclass");



ALTER TABLE ONLY "_internal"."policy_backups"
    ADD CONSTRAINT "policy_backups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "_internal"."project_docs"
    ADD CONSTRAINT "project_docs_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "monitoring"."index_bloat_snapshots"
    ADD CONSTRAINT "index_bloat_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "monitoring"."slow_query_snapshots"
    ADD CONSTRAINT "slow_query_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."organizer_identity_details"
    ADD CONSTRAINT "organizer_identity_details_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."admin_action_catalog"
    ADD CONSTRAINT "admin_action_catalog_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."app_audit_log"
    ADD CONSTRAINT "app_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artists"
    ADD CONSTRAINT "artists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log_archive"
    ADD CONSTRAINT "audit_log_archive_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credential_batches"
    ADD CONSTRAINT "credential_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credential_entitlements"
    ADD CONSTRAINT "credential_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credential_inventory"
    ADD CONSTRAINT "credential_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credential_taps"
    ADD CONSTRAINT "credential_taps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_setup_codes"
    ADD CONSTRAINT "device_setup_codes_code_hash_key" UNIQUE ("code_hash");



ALTER TABLE ONLY "public"."device_setup_codes"
    ADD CONSTRAINT "device_setup_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_dedupe_key_key" UNIQUE ("dedupe_key");



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_artists"
    ADD CONSTRAINT "event_artists_pkey" PRIMARY KEY ("event_id", "artist_id");



ALTER TABLE ONLY "public"."event_categories"
    ADD CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_dates"
    ADD CONSTRAINT "event_dates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_favourites"
    ADD CONSTRAINT "event_favourites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_favourites"
    ADD CONSTRAINT "event_favourites_user_id_event_id_key" UNIQUE ("user_id", "event_id");



ALTER TABLE ONLY "public"."event_invitations"
    ADD CONSTRAINT "event_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_invitations"
    ADD CONSTRAINT "event_invitations_unique_pair" UNIQUE ("event_id", "inviter_id", "invitee_id");



ALTER TABLE ONLY "public"."event_live_stats"
    ADD CONSTRAINT "event_live_stats_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."event_metrics_daily"
    ADD CONSTRAINT "event_metrics_daily_pkey" PRIMARY KEY ("event_id", "day");



ALTER TABLE ONLY "public"."event_series"
    ADD CONSTRAINT "event_series_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_series"
    ADD CONSTRAINT "event_series_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."event_staff"
    ADD CONSTRAINT "event_staff_pkey" PRIMARY KEY ("event_id", "user_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finance_reconciliation_issues"
    ADD CONSTRAINT "finance_reconciliation_issues_detector_key_entity_key_key" UNIQUE ("detector_key", "entity_key");



ALTER TABLE ONLY "public"."finance_reconciliation_issues"
    ADD CONSTRAINT "finance_reconciliation_issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guestlist_entries"
    ADD CONSTRAINT "guestlist_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guestlist_fulfillments"
    ADD CONSTRAINT "guestlist_fulfillments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_invites"
    ADD CONSTRAINT "membership_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_invites"
    ADD CONSTRAINT "membership_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."seat_reservations"
    ADD CONSTRAINT "no_overlapping_seat_reservations" EXCLUDE USING "gist" ("seat_id" WITH =, "tstzrange"("created_at", "expires_at", '[]'::"text") WITH &&) WHERE ("active") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."notification_mutes"
    ADD CONSTRAINT "notification_mutes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_mutes"
    ADD CONSTRAINT "notification_mutes_user_id_notification_type_key" UNIQUE ("user_id", "notification_type");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ops_cron_runs"
    ADD CONSTRAINT "ops_cron_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_adjustments"
    ADD CONSTRAINT "order_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_ticket_code_key" UNIQUE ("ticket_code");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_pkey" PRIMARY KEY ("org_id", "user_id");



ALTER TABLE ONLY "public"."org_metrics_daily"
    ADD CONSTRAINT "org_metrics_daily_pkey" PRIMARY KEY ("org_id", "day");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_order_id_provider_attempt_no_key" UNIQUE ("order_id", "provider", "attempt_no");



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_outbox"
    ADD CONSTRAINT "payment_outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_provider_settings"
    ADD CONSTRAINT "payment_provider_settings_pkey" PRIMARY KEY ("provider");



ALTER TABLE ONLY "public"."payment_routing_rules"
    ADD CONSTRAINT "payment_routing_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_accounts"
    ADD CONSTRAINT "payout_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_credentials"
    ADD CONSTRAINT "physical_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_shifts"
    ADD CONSTRAINT "pos_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_rule_redemptions"
    ADD CONSTRAINT "price_rule_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_plans"
    ADD CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."provider_settlement_items"
    ADD CONSTRAINT "provider_settlement_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_settlement_items"
    ADD CONSTRAINT "provider_settlement_items_settlement_ext_key" UNIQUE ("settlement_id", "ext_payment_id");



ALTER TABLE ONLY "public"."provider_settlements"
    ADD CONSTRAINT "provider_settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_settlements"
    ADD CONSTRAINT "provider_settlements_provider_ext_key" UNIQUE ("provider", "ext_settlement_id");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_user_id_service_device_id_key" UNIQUE ("user_id", "service", "device_id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_endpoint_key" UNIQUE ("user_id", "endpoint");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("bucket", "window_start");



ALTER TABLE ONLY "public"."refund_items"
    ADD CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resale_listings"
    ADD CONSTRAINT "resale_listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scans_archive"
    ADD CONSTRAINT "scans_archive_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seat_holds"
    ADD CONSTRAINT "seat_holds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seat_maps"
    ADD CONSTRAINT "seat_maps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seat_reservations"
    ADD CONSTRAINT "seat_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seats"
    ADD CONSTRAINT "seats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seats"
    ADD CONSTRAINT "seats_unique_label_per_map" UNIQUE ("seat_map_id", "label");



ALTER TABLE ONLY "public"."series_follows"
    ADD CONSTRAINT "series_follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."series_follows"
    ADD CONSTRAINT "series_follows_user_id_series_id_key" UNIQUE ("user_id", "series_id");



ALTER TABLE ONLY "public"."tapband_alerts"
    ADD CONSTRAINT "tapband_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tapband_feature_configs"
    ADD CONSTRAINT "tapband_feature_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tapband_kill_switches"
    ADD CONSTRAINT "tapband_kill_switches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tapband_telemetry_events"
    ADD CONSTRAINT "tapband_telemetry_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_type_channels"
    ADD CONSTRAINT "ticket_type_channels_pkey" PRIMARY KEY ("ticket_type_id", "channel");



ALTER TABLE ONLY "public"."ticket_types"
    ADD CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "uq_devices_org_label" UNIQUE ("org_id", "label");



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "uq_price_rules_event_code" UNIQUE ("event_id", "code");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pair_uniq" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_connections"
    ADD CONSTRAINT "user_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_handles"
    ADD CONSTRAINT "user_handles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_privacy_settings"
    ADD CONSTRAINT "user_privacy_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_private_profiles"
    ADD CONSTRAINT "user_private_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guestlist_fulfillments"
    ADD CONSTRAINT "ux_guestlist_fulfillments_once" UNIQUE ("guestlist_entry_id", "order_id");



ALTER TABLE ONLY "public"."ticket_types"
    ADD CONSTRAINT "ux_ticket_types_event_name" UNIQUE ("event_id", "name");



ALTER TABLE ONLY "public"."webhooks"
    ADD CONSTRAINT "ux_webhooks_provider_sig" UNIQUE ("provider", "signature");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlists"
    ADD CONSTRAINT "waitlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlists"
    ADD CONSTRAINT "waitlists_ticket_type_id_user_id_key" UNIQUE ("ticket_type_id", "user_id");



ALTER TABLE ONLY "public"."webhook_deliveries"
    ADD CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_endpoints"
    ADD CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhooks"
    ADD CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_project_docs_user_id" ON "_internal"."project_docs" USING "btree" ("user_id");



CREATE UNIQUE INDEX "artists_global_name_unique" ON "public"."artists" USING "btree" ("name_key");



CREATE UNIQUE INDEX "artists_slug_unique" ON "public"."artists" USING "btree" ("slug");



CREATE INDEX "audit_log_archive_actor_id_idx" ON "public"."audit_log_archive" USING "btree" ("actor_id");



CREATE INDEX "audit_log_archive_org_id_idx" ON "public"."audit_log_archive" USING "btree" ("org_id");



CREATE INDEX "credential_batches_scope_idx" ON "public"."credential_batches" USING "btree" ("org_id", "event_id", "status");



CREATE UNIQUE INDEX "credential_batches_supplier_reference_uidx" ON "public"."credential_batches" USING "btree" ("supplier_name", "supplier_reference") WHERE ("supplier_reference" IS NOT NULL);



CREATE UNIQUE INDEX "credential_entitlements_active_credential_order_item_uidx" ON "public"."credential_entitlements" USING "btree" ("credential_id", "order_item_id") WHERE ("status" = ANY (ARRAY['active'::"text", 'suspended'::"text"]));



CREATE UNIQUE INDEX "credential_entitlements_active_order_item_uidx" ON "public"."credential_entitlements" USING "btree" ("order_item_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "credential_entitlements_credential_status_idx" ON "public"."credential_entitlements" USING "btree" ("credential_id", "status");



CREATE INDEX "credential_entitlements_event_status_idx" ON "public"."credential_entitlements" USING "btree" ("event_id", "status");



CREATE INDEX "credential_entitlements_holder_user_idx" ON "public"."credential_entitlements" USING "btree" ("holder_user_id", "status") WHERE ("holder_user_id" IS NOT NULL);



CREATE INDEX "credential_inventory_batch_status_idx" ON "public"."credential_inventory" USING "btree" ("batch_id", "inventory_status");



CREATE UNIQUE INDEX "credential_inventory_chip_identifier_hash_uidx" ON "public"."credential_inventory" USING "btree" ("chip_identifier_hash") WHERE ("chip_identifier_hash" IS NOT NULL);



CREATE UNIQUE INDEX "credential_inventory_external_serial_uidx" ON "public"."credential_inventory" USING "btree" ("external_serial") WHERE ("external_serial" IS NOT NULL);



CREATE UNIQUE INDEX "credential_inventory_public_serial_uidx" ON "public"."credential_inventory" USING "btree" ("public_serial");



CREATE UNIQUE INDEX "credential_inventory_qr_reference_uidx" ON "public"."credential_inventory" USING "btree" ("qr_reference") WHERE ("qr_reference" IS NOT NULL);



CREATE INDEX "credential_inventory_scope_idx" ON "public"."credential_inventory" USING "btree" ("org_id", "event_id", "outlet_id") WHERE (("org_id" IS NOT NULL) OR ("event_id" IS NOT NULL) OR ("outlet_id" IS NOT NULL));



CREATE INDEX "credential_taps_credential_occurred_idx" ON "public"."credential_taps" USING "btree" ("credential_id", "occurred_at" DESC) WHERE ("credential_id" IS NOT NULL);



CREATE UNIQUE INDEX "credential_taps_device_attempt_uidx" ON "public"."credential_taps" USING "btree" ("device_id", "client_attempt_id") WHERE (("device_id" IS NOT NULL) AND ("client_attempt_id" IS NOT NULL));



CREATE INDEX "credential_taps_device_occurred_idx" ON "public"."credential_taps" USING "btree" ("device_id", "occurred_at" DESC) WHERE ("device_id" IS NOT NULL);



CREATE INDEX "credential_taps_event_occurred_idx" ON "public"."credential_taps" USING "btree" ("event_id", "occurred_at" DESC) WHERE ("event_id" IS NOT NULL);



CREATE UNIQUE INDEX "credential_taps_operator_attempt_uidx" ON "public"."credential_taps" USING "btree" ("operator_user_id", "client_attempt_id") WHERE (("operator_user_id" IS NOT NULL) AND ("client_attempt_id" IS NOT NULL));



CREATE INDEX "device_setup_codes_claimable_idx" ON "public"."device_setup_codes" USING "btree" ("code_hash", "expires_at") WHERE ("claimed_at" IS NULL);



CREATE INDEX "device_setup_codes_org_event_idx" ON "public"."device_setup_codes" USING "btree" ("org_id", "event_id", "created_at" DESC);



CREATE INDEX "devices_event_idx" ON "public"."devices" USING "btree" ("event_id");



CREATE INDEX "devices_org_idx" ON "public"."devices" USING "btree" ("org_id");



CREATE INDEX "event_categories_active_sort_idx" ON "public"."event_categories" USING "btree" ("is_active", "sort_order", "name");



CREATE UNIQUE INDEX "event_categories_name_unique" ON "public"."event_categories" USING "btree" ("lower"(TRIM(BOTH FROM "name")));



CREATE UNIQUE INDEX "event_categories_slug_unique" ON "public"."event_categories" USING "btree" ("slug");



CREATE INDEX "event_invitations_invitee_status_created_idx" ON "public"."event_invitations" USING "btree" ("invitee_id", "status", "created_at" DESC);



CREATE INDEX "event_invitations_inviter_event_idx" ON "public"."event_invitations" USING "btree" ("inviter_id", "event_id", "status");



CREATE INDEX "event_series_org_idx" ON "public"."event_series" USING "btree" ("org_id");



CREATE UNIQUE INDEX "events_org_slug_unique" ON "public"."events" USING "btree" ("org_id", "slug");



CREATE INDEX "events_public_idx" ON "public"."events" USING "btree" ("status", "visibility", "publish_at", "unpublish_at");



CREATE INDEX "events_series_id_idx" ON "public"."events" USING "btree" ("series_id") WHERE ("series_id" IS NOT NULL);



CREATE INDEX "idx_app_audit_log_changed_by" ON "public"."app_audit_log" USING "btree" ("changed_by");



CREATE INDEX "idx_app_audit_log_occurred_at" ON "public"."app_audit_log" USING "btree" ("occurred_at");



CREATE INDEX "idx_app_audit_log_schema_table" ON "public"."app_audit_log" USING "btree" ("schema_name", "table_name");



CREATE INDEX "idx_artists_primary_user_id" ON "public"."artists" USING "btree" ("primary_user_id");



CREATE INDEX "idx_audit_log_actor_id" ON "public"."audit_log" USING "btree" ("actor_id");



CREATE INDEX "idx_audit_log_org_id" ON "public"."audit_log" USING "btree" ("org_id");



CREATE INDEX "idx_device_sessions_device_id" ON "public"."device_sessions" USING "btree" ("device_id");



CREATE INDEX "idx_device_sessions_user_id" ON "public"."device_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_device_setup_codes_claimed_device_id" ON "public"."device_setup_codes" USING "btree" ("claimed_device_id");



CREATE INDEX "idx_device_setup_codes_created_by" ON "public"."device_setup_codes" USING "btree" ("created_by");



CREATE INDEX "idx_device_setup_codes_event_id" ON "public"."device_setup_codes" USING "btree" ("event_id");



CREATE INDEX "idx_devices_registered_by" ON "public"."devices" USING "btree" ("registered_by");



CREATE INDEX "idx_event_artists_artist_id" ON "public"."event_artists" USING "btree" ("artist_id");



CREATE INDEX "idx_event_dates_event_starts" ON "public"."event_dates" USING "btree" ("event_id", "starts_at");



CREATE INDEX "idx_event_favourites_event_id" ON "public"."event_favourites" USING "btree" ("event_id");



CREATE INDEX "idx_event_favourites_user_id" ON "public"."event_favourites" USING "btree" ("user_id");



CREATE INDEX "idx_event_metrics_daily_org_day" ON "public"."event_metrics_daily" USING "btree" ("org_id", "day");



CREATE INDEX "idx_event_staff_event_user_role_active" ON "public"."event_staff" USING "btree" ("event_id", "user_id", "role", "active");



CREATE INDEX "idx_event_staff_user" ON "public"."event_staff" USING "btree" ("user_id", "event_id");



CREATE INDEX "idx_events_created_by" ON "public"."events" USING "btree" ("created_by");



CREATE INDEX "idx_events_featured_priority" ON "public"."events" USING "btree" ("featured_priority" DESC NULLS LAST, "starts_at") WHERE ("featured_priority" IS NOT NULL);



CREATE INDEX "idx_events_org_id" ON "public"."events" USING "btree" ("org_id");



CREATE INDEX "idx_events_org_visibility_publish_status" ON "public"."events" USING "btree" ("org_id", "visibility", "publish_at", "unpublish_at", "status");



CREATE INDEX "idx_events_public_window" ON "public"."events" USING "btree" ("visibility", "publish_at", "unpublish_at", "status");



CREATE INDEX "idx_events_publish_at" ON "public"."events" USING "btree" ("publish_at");



CREATE INDEX "idx_events_publish_window" ON "public"."events" USING "btree" ("publish_at", "unpublish_at");



CREATE INDEX "idx_events_published_future" ON "public"."events" USING "btree" ("starts_at") WHERE (("status" = 'published'::"public"."event_status") AND ("starts_at" IS NOT NULL));



CREATE INDEX "idx_events_search_tsv" ON "public"."events" USING "gin" ("search_tsv");



CREATE INDEX "idx_events_slug" ON "public"."events" USING "btree" ("slug");



CREATE INDEX "idx_events_starts_at" ON "public"."events" USING "btree" ("starts_at");



CREATE INDEX "idx_events_status" ON "public"."events" USING "btree" ("status");



CREATE INDEX "idx_events_status_visibility" ON "public"."events" USING "btree" ("status", "visibility");



CREATE INDEX "idx_events_time" ON "public"."events" USING "btree" ("starts_at", "ends_at");



CREATE INDEX "idx_events_title_trgm" ON "public"."events" USING "gin" ("title" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_events_venue_id" ON "public"."events" USING "btree" ("venue_id");



CREATE INDEX "idx_feature_flags_last_changed_by" ON "public"."feature_flags" USING "btree" ("last_changed_by");



CREATE INDEX "idx_feature_flags_org_id" ON "public"."feature_flags" USING "btree" ("org_id");



CREATE INDEX "idx_feature_flags_owner" ON "public"."feature_flags" USING "btree" ("owner");



CREATE INDEX "idx_finance_reconciliation_issues_org_status" ON "public"."finance_reconciliation_issues" USING "btree" ("org_id", "status", "last_detected_at" DESC);



CREATE INDEX "idx_finance_reconciliation_issues_status" ON "public"."finance_reconciliation_issues" USING "btree" ("status", "severity", "last_detected_at" DESC);



CREATE INDEX "idx_guestlist_entries_created_by" ON "public"."guestlist_entries" USING "btree" ("created_by");



CREATE INDEX "idx_guestlist_entries_event_id" ON "public"."guestlist_entries" USING "btree" ("event_id");



CREATE INDEX "idx_guestlist_entries_ticket_type" ON "public"."guestlist_entries" USING "btree" ("ticket_type_id");



CREATE INDEX "idx_guestlist_fulfillments_entry" ON "public"."guestlist_fulfillments" USING "btree" ("guestlist_entry_id");



CREATE INDEX "idx_guestlist_fulfillments_order" ON "public"."guestlist_fulfillments" USING "btree" ("order_id");



CREATE INDEX "idx_jobs_locked_at" ON "public"."jobs" USING "btree" ("locked_at");



CREATE INDEX "idx_jobs_run_after" ON "public"."jobs" USING "btree" ("run_after") WHERE ("locked_at" IS NULL);



CREATE INDEX "idx_jobs_run_after_locked_at" ON "public"."jobs" USING "btree" ("run_after", "locked_at");



CREATE INDEX "idx_ledger_entries_event_id" ON "public"."ledger_entries" USING "btree" ("event_id");



CREATE INDEX "idx_ledger_entries_payment_id" ON "public"."ledger_entries" USING "btree" ("payment_id");



CREATE INDEX "idx_ledger_entries_payout_id" ON "public"."ledger_entries" USING "btree" ("payout_id");



CREATE INDEX "idx_ledger_entries_refund_id" ON "public"."ledger_entries" USING "btree" ("refund_id");



CREATE INDEX "idx_ledger_order" ON "public"."ledger_entries" USING "btree" ("order_id");



CREATE INDEX "idx_ledger_org_event_occurred_at" ON "public"."ledger_entries" USING "btree" ("org_id", "event_id", "occurred_at");



CREATE INDEX "idx_ledger_org_id" ON "public"."ledger_entries" USING "btree" ("org_id");



CREATE INDEX "idx_mv_revenue_event_day" ON "public"."mv_revenue_breakdown" USING "btree" ("event_id", "day");



CREATE INDEX "idx_notifications_scheduled_at" ON "public"."notifications" USING "btree" ("scheduled_at");



CREATE INDEX "idx_notifications_status" ON "public"."notifications" USING "btree" ("status");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read_created" ON "public"."notifications" USING "btree" ("user_id", "read_at", "created_at" DESC);



CREATE INDEX "idx_order_adjustments_order_id" ON "public"."order_adjustments" USING "btree" ("order_id");



CREATE INDEX "idx_order_adjustments_price_rule_id" ON "public"."order_adjustments" USING "btree" ("price_rule_id");



CREATE INDEX "idx_order_adjustments_target_order_item_id" ON "public"."order_adjustments" USING "btree" ("target_order_item_id");



CREATE INDEX "idx_order_items_current_owner_id" ON "public"."order_items" USING "btree" ("current_owner_id");



CREATE INDEX "idx_order_items_holder_user_id" ON "public"."order_items" USING "btree" ("holder_user_id") WHERE ("holder_user_id" IS NOT NULL);



CREATE INDEX "idx_order_items_norm_code" ON "public"."order_items" USING "btree" ("app"."normalize_ticket_code"("ticket_code"));



CREATE INDEX "idx_order_items_order_id_ticket_type_id" ON "public"."order_items" USING "btree" ("order_id", "ticket_type_id");



CREATE INDEX "idx_order_items_order_ticket_checked" ON "public"."order_items" USING "btree" ("order_id", "ticket_type_id", "ticket_code", "checked_in_at");



CREATE INDEX "idx_order_items_ticket_order" ON "public"."order_items" USING "btree" ("ticket_type_id", "order_id");



CREATE INDEX "idx_order_items_ticket_type_id" ON "public"."order_items" USING "btree" ("ticket_type_id");



CREATE INDEX "idx_order_items_transferred_from_order_item_id" ON "public"."order_items" USING "btree" ("transferred_from_order_item_id");



CREATE INDEX "idx_orders_buyer" ON "public"."orders" USING "btree" ("buyer_id");



CREATE INDEX "idx_orders_buyer_created" ON "public"."orders" USING "btree" ("buyer_id", "created_at" DESC);



CREATE INDEX "idx_orders_buyer_org" ON "public"."orders" USING "btree" ("buyer_id", "org_id");



CREATE INDEX "idx_orders_buyer_status_created" ON "public"."orders" USING "btree" ("buyer_id", "status", "created_at");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at");



CREATE INDEX "idx_orders_device_id" ON "public"."orders" USING "btree" ("device_id");



CREATE INDEX "idx_orders_device_session_id" ON "public"."orders" USING "btree" ("device_session_id");



CREATE INDEX "idx_orders_id_buyer" ON "public"."orders" USING "btree" ("id", "buyer_id");



CREATE INDEX "idx_orders_org" ON "public"."orders" USING "btree" ("org_id");



CREATE INDEX "idx_orders_org_created" ON "public"."orders" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "idx_orders_org_id_buyer_id_created_at" ON "public"."orders" USING "btree" ("org_id", "buyer_id", "created_at" DESC);



CREATE INDEX "idx_orders_org_id_pending_created_at" ON "public"."orders" USING "btree" ("org_id", "created_at" DESC) WHERE ("status" = 'pending'::"public"."order_status");



CREATE INDEX "idx_orders_org_status" ON "public"."orders" USING "btree" ("org_id", "status", "created_at" DESC);



CREATE INDEX "idx_orders_pending_hold_expiry" ON "public"."orders" USING "btree" ("hold_expires_at") WHERE ("status" = 'pending'::"public"."order_status");



CREATE INDEX "idx_orders_pricing_plan_id" ON "public"."orders" USING "btree" ("pricing_plan_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_status_created_at" ON "public"."orders" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_org_members_org_user_role" ON "public"."org_members" USING "btree" ("org_id", "user_id", "role");



CREATE INDEX "idx_org_members_user" ON "public"."org_members" USING "btree" ("user_id", "org_id");



CREATE INDEX "idx_org_members_user_role_org" ON "public"."org_members" USING "btree" ("user_id", "role", "org_id");



CREATE INDEX "idx_org_metrics_daily_day" ON "public"."org_metrics_daily" USING "btree" ("day");



CREATE INDEX "idx_payment_attempts_order_id" ON "public"."payment_attempts" USING "btree" ("order_id");



CREATE INDEX "idx_payment_attempts_payment_id" ON "public"."payment_attempts" USING "btree" ("payment_id");



CREATE INDEX "idx_payment_outbox_claimable" ON "public"."payment_outbox" USING "btree" ("status", "available_at") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE INDEX "idx_payment_provider_settings_updated_by" ON "public"."payment_provider_settings" USING "btree" ("updated_by");



CREATE INDEX "idx_payment_routing_rules_created_by" ON "public"."payment_routing_rules" USING "btree" ("created_by");



CREATE INDEX "idx_payment_routing_rules_match" ON "public"."payment_routing_rules" USING "btree" ("country_code", "currency") WHERE ("is_active" = true);



CREATE INDEX "idx_payment_routing_rules_priority" ON "public"."payment_routing_rules" USING "btree" ("priority", "is_active");



CREATE INDEX "idx_payments_order_id" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_payout_accounts_org_id" ON "public"."payout_accounts" USING "btree" ("org_id");



CREATE INDEX "idx_payouts_org_id" ON "public"."payouts" USING "btree" ("org_id");



CREATE INDEX "idx_payouts_org_status_paidat" ON "public"."payouts" USING "btree" ("org_id", "status", "paid_at");



CREATE INDEX "idx_pos_shifts_cashier_user_id" ON "public"."pos_shifts" USING "btree" ("cashier_user_id");



CREATE INDEX "idx_pos_shifts_closed_by" ON "public"."pos_shifts" USING "btree" ("closed_by");



CREATE INDEX "idx_pos_shifts_device_session_id" ON "public"."pos_shifts" USING "btree" ("device_session_id");



CREATE INDEX "idx_pos_shifts_opened_by" ON "public"."pos_shifts" USING "btree" ("opened_by");



CREATE INDEX "idx_price_rule_redemptions_order_id" ON "public"."price_rule_redemptions" USING "btree" ("order_id");



CREATE INDEX "idx_price_rule_redemptions_price_rule_id" ON "public"."price_rule_redemptions" USING "btree" ("price_rule_id");



CREATE INDEX "idx_price_rule_redemptions_user_id" ON "public"."price_rule_redemptions" USING "btree" ("user_id");



CREATE INDEX "idx_price_rules_active" ON "public"."price_rules" USING "btree" ("is_active");



CREATE INDEX "idx_price_rules_active_window" ON "public"."price_rules" USING "btree" ("is_active", "starts_at", "ends_at");



CREATE INDEX "idx_price_rules_channel_gin" ON "public"."price_rules" USING "gin" ("channel");



CREATE INDEX "idx_price_rules_event_active" ON "public"."price_rules" USING "btree" ("event_id", "is_active", "starts_at", "ends_at");



CREATE INDEX "idx_price_rules_event_id" ON "public"."price_rules" USING "btree" ("event_id");



CREATE INDEX "idx_price_rules_event_ticket" ON "public"."price_rules" USING "btree" ("event_id", "ticket_type_id");



CREATE INDEX "idx_price_rules_event_window" ON "public"."price_rules" USING "btree" ("event_id", "starts_at", "ends_at");



CREATE INDEX "idx_price_rules_org_event" ON "public"."price_rules" USING "btree" ("org_id", "event_id");



CREATE INDEX "idx_price_rules_org_event_active" ON "public"."price_rules" USING "btree" ("org_id", "event_id", "is_active", "starts_at", "ends_at");



CREATE INDEX "idx_price_rules_org_id" ON "public"."price_rules" USING "btree" ("org_id");



CREATE INDEX "idx_price_rules_ticket_type" ON "public"."price_rules" USING "btree" ("ticket_type_id");



CREATE INDEX "idx_pricing_plans_org_id" ON "public"."pricing_plans" USING "btree" ("org_id");



CREATE INDEX "idx_refund_items_order_item_id" ON "public"."refund_items" USING "btree" ("order_item_id");



CREATE INDEX "idx_refund_items_refund_id" ON "public"."refund_items" USING "btree" ("refund_id");



CREATE INDEX "idx_refunds_initiated_by" ON "public"."refunds" USING "btree" ("initiated_by");



CREATE INDEX "idx_refunds_payment_id" ON "public"."refunds" USING "btree" ("payment_id");



CREATE INDEX "idx_resale_listings_order_item_id" ON "public"."resale_listings" USING "btree" ("order_item_id");



CREATE INDEX "idx_resale_listings_org_id" ON "public"."resale_listings" USING "btree" ("org_id");



CREATE INDEX "idx_resale_listings_seller_id" ON "public"."resale_listings" USING "btree" ("seller_id");



CREATE INDEX "idx_resale_listings_status" ON "public"."resale_listings" USING "btree" ("status");



CREATE INDEX "idx_scans_device_id" ON "public"."scans" USING "btree" ("device_id");



CREATE INDEX "idx_scans_device_session_id" ON "public"."scans" USING "btree" ("device_session_id");



CREATE INDEX "idx_scans_event_id" ON "public"."scans" USING "btree" ("event_id");



CREATE INDEX "idx_scans_event_id_ticket_code" ON "public"."scans" USING "btree" ("event_id", "ticket_code");



CREATE INDEX "idx_scans_event_time" ON "public"."scans" USING "btree" ("event_id", "scanned_at" DESC);



CREATE INDEX "idx_scans_order_item_id" ON "public"."scans" USING "btree" ("order_item_id");



CREATE INDEX "idx_scans_scanned_at" ON "public"."scans" USING "btree" ("scanned_at");



CREATE INDEX "idx_scans_ticket_code" ON "public"."scans" USING "btree" ("ticket_code");



CREATE INDEX "idx_seat_holds_created_by" ON "public"."seat_holds" USING "btree" ("created_by");



CREATE INDEX "idx_seat_holds_event_id" ON "public"."seat_holds" USING "btree" ("event_id");



CREATE INDEX "idx_seat_holds_ticket_type_id" ON "public"."seat_holds" USING "btree" ("ticket_type_id");



CREATE INDEX "idx_seat_maps_event_id" ON "public"."seat_maps" USING "btree" ("event_id");



CREATE INDEX "idx_seat_res_event_seat" ON "public"."seat_reservations" USING "btree" ("event_id", "seat_id");



CREATE INDEX "idx_seat_res_user" ON "public"."seat_reservations" USING "btree" ("user_id");



CREATE INDEX "idx_seat_reservations_active_expires_at" ON "public"."seat_reservations" USING "btree" ("expires_at") WHERE ("active" = true);



CREATE INDEX "idx_seat_reservations_event_id" ON "public"."seat_reservations" USING "btree" ("event_id");



CREATE INDEX "idx_seat_reservations_seat_id" ON "public"."seat_reservations" USING "btree" ("seat_id");



CREATE INDEX "idx_seat_reservations_seat_user_event" ON "public"."seat_reservations" USING "btree" ("seat_id", "user_id", "event_id");



CREATE INDEX "idx_ticket_type_channels_ticket_type_id" ON "public"."ticket_type_channels" USING "btree" ("ticket_type_id");



CREATE INDEX "idx_ticket_types_event_id" ON "public"."ticket_types" USING "btree" ("event_id");



CREATE INDEX "idx_transfers_from_user_id" ON "public"."transfers" USING "btree" ("from_user_id");



CREATE INDEX "idx_transfers_order_item_id" ON "public"."transfers" USING "btree" ("order_item_id");



CREATE INDEX "idx_transfers_to_user_id" ON "public"."transfers" USING "btree" ("to_user_id");



CREATE INDEX "idx_unp_preferred_channel" ON "public"."user_notification_preferences" USING "btree" ("preferred_channel");



CREATE INDEX "idx_waitlists_event_id" ON "public"."waitlists" USING "btree" ("event_id");



CREATE INDEX "idx_waitlists_user_id" ON "public"."waitlists" USING "btree" ("user_id");



CREATE INDEX "idx_webhook_deliveries_endpoint" ON "public"."webhook_deliveries" USING "btree" ("endpoint_id", "created_at" DESC);



CREATE INDEX "idx_webhook_deliveries_pending" ON "public"."webhook_deliveries" USING "btree" ("next_retry_at") WHERE (("delivered_at" IS NULL) AND ("next_retry_at" IS NOT NULL));



CREATE INDEX "idx_webhook_endpoints_active" ON "public"."webhook_endpoints" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_webhook_endpoints_created_by" ON "public"."webhook_endpoints" USING "btree" ("created_by");



CREATE INDEX "idx_webhook_endpoints_org" ON "public"."webhook_endpoints" USING "btree" ("org_id");



CREATE INDEX "idx_webhooks_received" ON "public"."webhooks" USING "btree" ("received_at");



CREATE INDEX "idx_webhooks_unprocessed" ON "public"."webhooks" USING "btree" ("received_at") WHERE ("processed_at" IS NULL);



CREATE INDEX "ix_disputes_org" ON "public"."disputes" USING "btree" ("org_id");



CREATE INDEX "ix_disputes_payment" ON "public"."disputes" USING "btree" ("payment_id");



CREATE INDEX "ix_disputes_status" ON "public"."disputes" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "ix_ops_cron_runs_job_requested" ON "public"."ops_cron_runs" USING "btree" ("job", "requested_at" DESC);



CREATE INDEX "ix_provider_settlement_items_payment" ON "public"."provider_settlement_items" USING "btree" ("payment_id");



CREATE INDEX "ix_provider_settlements_settled_at" ON "public"."provider_settlements" USING "btree" ("settled_at");



CREATE INDEX "ix_scans_archive_event" ON "public"."scans_archive" USING "btree" ("event_id");



CREATE INDEX "ix_seat_res_expiry" ON "public"."seat_reservations" USING "btree" ("expires_at");



CREATE INDEX "ix_seats_seat_map" ON "public"."seats" USING "btree" ("seat_map_id");



CREATE INDEX "membership_invites_event_id_idx" ON "public"."membership_invites" USING "btree" ("event_id");



CREATE INDEX "membership_invites_org_idx" ON "public"."membership_invites" USING "btree" ("org_id");



CREATE INDEX "membership_invites_token_idx" ON "public"."membership_invites" USING "btree" ("token");



CREATE UNIQUE INDEX "mv_event_sales_event_id_uidx" ON "public"."mv_event_sales" USING "btree" ("event_id");



CREATE INDEX "mv_event_sales_gross_idx" ON "public"."mv_event_sales" USING "btree" ("gross_cents");



CREATE INDEX "mv_event_sales_paid_idx" ON "public"."mv_event_sales" USING "btree" ("paid_orders");



CREATE UNIQUE INDEX "notifications_dedupe_key_unique" ON "public"."notifications" USING "btree" ("dedupe_key") WHERE ("dedupe_key" IS NOT NULL);



CREATE INDEX "order_items_event_ticket_idx" ON "public"."order_items" USING "btree" ("ticket_type_id", "created_at" DESC);



CREATE INDEX "order_items_order_idx" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "order_items_ticket_code_norm_idx" ON "public"."order_items" USING "btree" ("regexp_replace"("upper"("ticket_code"), '[^A-Z0-9]'::"text", ''::"text", 'g'::"text"));



CREATE INDEX "orders_cashier_user_id_idx" ON "public"."orders" USING "btree" ("cashier_user_id");



CREATE INDEX "orders_pos_shift_id_idx" ON "public"."orders" USING "btree" ("pos_shift_id");



CREATE UNIQUE INDEX "organizations_slug_unique" ON "public"."organizations" USING "btree" ("slug");



CREATE INDEX "payment_methods_user_id_idx" ON "public"."payment_methods" USING "btree" ("user_id");



CREATE UNIQUE INDEX "physical_credentials_active_inventory_uidx" ON "public"."physical_credentials" USING "btree" ("inventory_id") WHERE ("status" = ANY (ARRAY['issued'::"text", 'active'::"text", 'suspended'::"text"]));



CREATE UNIQUE INDEX "physical_credentials_public_id_uidx" ON "public"."physical_credentials" USING "btree" ("credential_public_id");



CREATE INDEX "physical_credentials_replacement_of_idx" ON "public"."physical_credentials" USING "btree" ("replacement_of_id") WHERE ("replacement_of_id" IS NOT NULL);



CREATE INDEX "physical_credentials_user_status_idx" ON "public"."physical_credentials" USING "btree" ("user_id", "status") WHERE ("user_id" IS NOT NULL);



CREATE UNIQUE INDEX "pos_shifts_one_open_per_cashier_org" ON "public"."pos_shifts" USING "btree" ("org_id", "cashier_user_id") WHERE ("status" = 'open'::"text");



CREATE UNIQUE INDEX "pos_shifts_one_open_per_device" ON "public"."pos_shifts" USING "btree" ("device_id") WHERE (("status" = 'open'::"text") AND ("device_id" IS NOT NULL));



CREATE INDEX "pos_shifts_org_opened_at_idx" ON "public"."pos_shifts" USING "btree" ("org_id", "opened_at" DESC);



CREATE INDEX "pricing_plans_effective_history_idx" ON "public"."pricing_plans" USING "btree" ("org_id", "effective_from" DESC, "created_at" DESC);



COMMENT ON INDEX "public"."pricing_plans_effective_history_idx" IS 'TICK-351: supports effective-dated pricing-plan history and audit/reporting lookups.';



CREATE UNIQUE INDEX "pricing_plans_one_active_global_idx" ON "public"."pricing_plans" USING "btree" ((1)) WHERE (("active" IS TRUE) AND ("org_id" IS NULL));



COMMENT ON INDEX "public"."pricing_plans_one_active_global_idx" IS 'TICK-351: at most one active global pricing plan (org_id is null).';



CREATE UNIQUE INDEX "pricing_plans_one_active_per_org_idx" ON "public"."pricing_plans" USING "btree" ("org_id") WHERE (("active" IS TRUE) AND ("org_id" IS NOT NULL));



COMMENT ON INDEX "public"."pricing_plans_one_active_per_org_idx" IS 'TICK-351: at most one active organization-specific pricing plan; inactive rows remain as immutable history.';



CREATE UNIQUE INDEX "push_devices_service_token_key" ON "public"."push_devices" USING "btree" ("service", "token");



CREATE INDEX "push_devices_user_active_idx" ON "public"."push_devices" USING "btree" ("user_id") WHERE ("disabled_at" IS NULL);



CREATE INDEX "push_subscriptions_user_id_idx" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "refunds_active_request_key_unique" ON "public"."refunds" USING "btree" ((("provider_payload" ->> 'request_key'::"text"))) WHERE (("provider_payload" ? 'request_key'::"text") AND ("status" = ANY (ARRAY['requested'::"public"."refund_status", 'processing'::"public"."refund_status", 'processed'::"public"."refund_status"])));



CREATE INDEX "resale_listings_transfer_id_idx" ON "public"."resale_listings" USING "btree" ("transfer_id") WHERE ("transfer_id" IS NOT NULL);



CREATE INDEX "scans_archive_device_id_idx" ON "public"."scans_archive" USING "btree" ("device_id");



CREATE INDEX "scans_archive_device_session_id_idx" ON "public"."scans_archive" USING "btree" ("device_session_id");



CREATE INDEX "scans_archive_event_id_scanned_at_idx" ON "public"."scans_archive" USING "btree" ("event_id", "scanned_at" DESC);



CREATE INDEX "scans_archive_event_id_ticket_code_idx" ON "public"."scans_archive" USING "btree" ("event_id", "ticket_code");



CREATE UNIQUE INDEX "scans_archive_event_id_ticket_code_idx1" ON "public"."scans_archive" USING "btree" ("event_id", "ticket_code") WHERE ("outcome" = 'valid'::"text");



CREATE INDEX "scans_archive_event_id_ticket_code_scanned_at_idx" ON "public"."scans_archive" USING "btree" ("event_id", "ticket_code", "scanned_at" DESC);



CREATE INDEX "scans_archive_order_item_id_idx" ON "public"."scans_archive" USING "btree" ("order_item_id");



CREATE UNIQUE INDEX "scans_archive_request_hash_idx" ON "public"."scans_archive" USING "btree" ("request_hash") WHERE ("request_hash" IS NOT NULL);



CREATE INDEX "scans_archive_scanned_at_idx" ON "public"."scans_archive" USING "btree" ("scanned_at");



CREATE INDEX "scans_archive_ticket_code_idx" ON "public"."scans_archive" USING "btree" ("ticket_code");



CREATE INDEX "scans_event_id_ticket_code_scanned_at_idx" ON "public"."scans" USING "btree" ("event_id", "ticket_code", "scanned_at" DESC);



CREATE UNIQUE INDEX "scans_one_success_per_ticket" ON "public"."scans" USING "btree" ("event_id", "ticket_code") WHERE ("outcome" = 'valid'::"text");



CREATE UNIQUE INDEX "scans_unique_request_hash" ON "public"."scans" USING "btree" ("request_hash") WHERE ("request_hash" IS NOT NULL);



CREATE UNIQUE INDEX "seat_one_active_reservation" ON "public"."seat_reservations" USING "btree" ("seat_id") WHERE ("active" = true);



CREATE INDEX "seat_reservations_lookup" ON "public"."seat_reservations" USING "btree" ("event_id", "seat_id", "user_id");



CREATE UNIQUE INDEX "seat_reservations_unique_active" ON "public"."seat_reservations" USING "btree" ("event_id", "seat_id") WHERE ("active" = true);



CREATE UNIQUE INDEX "seat_sold_once" ON "public"."order_items" USING "btree" ("seat_id") WHERE (("seat_id" IS NOT NULL) AND ("revoked_at" IS NULL) AND ("refunded_at" IS NULL));



CREATE INDEX "series_follows_series_id_idx" ON "public"."series_follows" USING "btree" ("series_id");



CREATE INDEX "tapband_alerts_device_time_idx" ON "public"."tapband_alerts" USING "btree" ("device_id", "last_seen_at" DESC) WHERE ("device_id" IS NOT NULL);



CREATE INDEX "tapband_alerts_event_time_idx" ON "public"."tapband_alerts" USING "btree" ("event_id", "last_seen_at" DESC) WHERE ("event_id" IS NOT NULL);



CREATE INDEX "tapband_alerts_open_idx" ON "public"."tapband_alerts" USING "btree" ("status", "severity", "last_seen_at" DESC) WHERE ("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text"]));



CREATE INDEX "tapband_alerts_org_time_idx" ON "public"."tapband_alerts" USING "btree" ("org_id", "last_seen_at" DESC) WHERE ("org_id" IS NOT NULL);



CREATE INDEX "tapband_feature_configs_event_idx" ON "public"."tapband_feature_configs" USING "btree" ("event_id", "environment") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "tapband_feature_configs_org_idx" ON "public"."tapband_feature_configs" USING "btree" ("org_id", "environment") WHERE ("org_id" IS NOT NULL);



CREATE INDEX "tapband_feature_configs_outlet_idx" ON "public"."tapband_feature_configs" USING "btree" ("outlet_id", "environment") WHERE ("outlet_id" IS NOT NULL);



CREATE UNIQUE INDEX "tapband_feature_configs_scope_uidx" ON "public"."tapband_feature_configs" USING "btree" ("environment", COALESCE("org_id", '00000000-0000-0000-0000-000000000000'::"uuid"), COALESCE("event_id", '00000000-0000-0000-0000-000000000000'::"uuid"), COALESCE("outlet_id", ''::"text"));



CREATE INDEX "tapband_kill_switches_active_idx" ON "public"."tapband_kill_switches" USING "btree" ("environment", "switch_type", "enabled", "starts_at", "ends_at");



CREATE INDEX "tapband_kill_switches_event_idx" ON "public"."tapband_kill_switches" USING "btree" ("event_id", "environment") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "tapband_kill_switches_org_idx" ON "public"."tapband_kill_switches" USING "btree" ("org_id", "environment") WHERE ("org_id" IS NOT NULL);



CREATE INDEX "tapband_telemetry_events_correlation_idx" ON "public"."tapband_telemetry_events" USING "btree" ("correlation_id") WHERE ("correlation_id" IS NOT NULL);



CREATE INDEX "tapband_telemetry_events_credential_idx" ON "public"."tapband_telemetry_events" USING "btree" ("credential_hash", "occurred_at" DESC) WHERE ("credential_hash" IS NOT NULL);



CREATE INDEX "tapband_telemetry_events_device_time_idx" ON "public"."tapband_telemetry_events" USING "btree" ("device_id", "occurred_at" DESC) WHERE ("device_id" IS NOT NULL);



CREATE INDEX "tapband_telemetry_events_event_time_idx" ON "public"."tapband_telemetry_events" USING "btree" ("event_id", "occurred_at" DESC) WHERE ("event_id" IS NOT NULL);



CREATE INDEX "tapband_telemetry_events_org_time_idx" ON "public"."tapband_telemetry_events" USING "btree" ("org_id", "occurred_at" DESC) WHERE ("org_id" IS NOT NULL);



CREATE INDEX "tapband_telemetry_events_serial_idx" ON "public"."tapband_telemetry_events" USING "btree" ("serial_hash", "occurred_at" DESC) WHERE ("serial_hash" IS NOT NULL);



CREATE INDEX "tapband_telemetry_events_type_time_idx" ON "public"."tapband_telemetry_events" USING "btree" ("event_type", "occurred_at" DESC);



CREATE UNIQUE INDEX "transfers_one_live_per_ticket_idx" ON "public"."transfers" USING "btree" ("order_item_id") WHERE (("order_item_id" IS NOT NULL) AND ("status" = ANY (ARRAY['requested'::"public"."transfer_status", 'pending'::"public"."transfer_status", 'accepted'::"public"."transfer_status"])));



CREATE UNIQUE INDEX "ui_active_transfer_per_item" ON "public"."transfers" USING "btree" ("order_item_id") WHERE ("status" = 'requested'::"public"."transfer_status");



CREATE UNIQUE INDEX "ui_payment_outbox_order_topic" ON "public"."payment_outbox" USING "btree" ("order_id", "topic");



CREATE UNIQUE INDEX "ui_payments_provider_ext" ON "public"."payments" USING "btree" ("provider", "ext_payment_id") WHERE ("ext_payment_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_price_rules_org_code" ON "public"."price_rules" USING "btree" ("org_id", "code") WHERE ("code" IS NOT NULL);



CREATE UNIQUE INDEX "uq_pricing_plans_org_active" ON "public"."pricing_plans" USING "btree" ("org_id") WHERE ("active" = true);



CREATE INDEX "user_blocks_blocked_id_idx" ON "public"."user_blocks" USING "btree" ("blocked_id");



CREATE UNIQUE INDEX "user_connections_pair_unique" ON "public"."user_connections" USING "btree" (LEAST("requester_id", "recipient_id"), GREATEST("requester_id", "recipient_id"));



CREATE INDEX "user_connections_recipient_status_idx" ON "public"."user_connections" USING "btree" ("recipient_id", "status");



CREATE INDEX "user_connections_requester_status_idx" ON "public"."user_connections" USING "btree" ("requester_id", "status");



CREATE UNIQUE INDEX "user_handles_handle_unique" ON "public"."user_handles" USING "btree" ("handle");



CREATE INDEX "user_private_profiles_contact_phone_key_idx" ON "public"."user_private_profiles" USING "btree" ("public"."fn_contact_phone_key"("phone")) WHERE (("phone" IS NOT NULL) AND ("btrim"("phone") <> ''::"text"));



CREATE INDEX "user_reports_reported_id_idx" ON "public"."user_reports" USING "btree" ("reported_id", "created_at" DESC);



CREATE INDEX "user_reports_reporter_id_idx" ON "public"."user_reports" USING "btree" ("reporter_id", "created_at" DESC);



CREATE UNIQUE INDEX "ux_feature_flags_org_scoped_key" ON "public"."feature_flags" USING "btree" ("org_id", "key") WHERE ("org_id" IS NOT NULL);



CREATE UNIQUE INDEX "ux_feature_flags_platform_key" ON "public"."feature_flags" USING "btree" ("key") WHERE ("org_id" IS NULL);



CREATE UNIQUE INDEX "ux_transfers_active" ON "public"."transfers" USING "btree" ("order_item_id") WHERE ("status" = ANY (ARRAY['requested'::"public"."transfer_status", 'pending'::"public"."transfer_status", 'accepted'::"public"."transfer_status"]));



CREATE UNIQUE INDEX "venues_global_name_city_unique" ON "public"."venues" USING "btree" ("name_key", "city_key");



CREATE UNIQUE INDEX "venues_slug_unique" ON "public"."venues" USING "btree" ("slug");



CREATE UNIQUE INDEX "waitlists_event_email_uniq" ON "public"."waitlists" USING "btree" ("event_id", "lower"("email")) WHERE ("email" IS NOT NULL);



CREATE UNIQUE INDEX "webhooks_provider_event_uniq" ON "public"."webhooks" USING "btree" ("provider", "provider_event_id") WHERE ("provider_event_id" IS NOT NULL);



CREATE OR REPLACE VIEW "public"."admin_event_readiness" WITH ("security_invoker"='on') AS
 SELECT "e"."id" AS "event_id",
    "e"."org_id",
    "e"."title",
    "e"."status",
    "e"."visibility",
    "e"."starts_at",
    "e"."ends_at",
    "e"."cover_image_url",
    "e"."description",
    "e"."venue_id",
    "count"("tt"."id") FILTER (WHERE ((COALESCE(("tt"."sales_status")::"text", 'on_sale'::"text") = 'on_sale'::"text") AND ("tt"."quota" > 0))) AS "on_sale_ticket_types",
    (EXISTS ( SELECT 1
           FROM "public"."pricing_plans" "pp"
          WHERE (("pp"."org_id" = "e"."org_id") AND ("pp"."active" IS TRUE)))) AS "has_active_pricing_plan",
    (EXISTS ( SELECT 1
           FROM "public"."payout_accounts" "pa"
          WHERE ("pa"."org_id" = "e"."org_id"))) AS "has_payout_account",
    "jsonb_build_object"('has_organization', ("e"."org_id" IS NOT NULL), 'has_venue', ("e"."venue_id" IS NOT NULL), 'has_title', (NULLIF(TRIM(BOTH FROM COALESCE("e"."title", ''::"text")), ''::"text") IS NOT NULL), 'has_slug', (NULLIF(TRIM(BOTH FROM COALESCE("e"."slug", ''::"text")), ''::"text") IS NOT NULL), 'has_start_date', ("e"."starts_at" IS NOT NULL), 'has_valid_date_range', (("e"."ends_at" IS NULL) OR ("e"."starts_at" IS NULL) OR ("e"."ends_at" > "e"."starts_at")), 'has_cover_image', (NULLIF(TRIM(BOTH FROM COALESCE("e"."cover_image_url", ''::"text")), ''::"text") IS NOT NULL), 'has_description', (NULLIF(TRIM(BOTH FROM COALESCE("e"."description", ''::"text")), ''::"text") IS NOT NULL), 'has_on_sale_ticket_type', ("count"("tt"."id") FILTER (WHERE ((COALESCE(("tt"."sales_status")::"text", 'on_sale'::"text") = 'on_sale'::"text") AND ("tt"."quota" > 0))) > 0), 'has_active_pricing_plan', (EXISTS ( SELECT 1
           FROM "public"."pricing_plans" "pp"
          WHERE (("pp"."org_id" = "e"."org_id") AND ("pp"."active" IS TRUE)))), 'has_payout_account', (EXISTS ( SELECT 1
           FROM "public"."payout_accounts" "pa"
          WHERE ("pa"."org_id" = "e"."org_id"))), 'has_online_sales_channel', (EXISTS ( SELECT 1
           FROM ("public"."ticket_types" "tt2"
             JOIN "public"."ticket_type_channels" "ttc" ON (("ttc"."ticket_type_id" = "tt2"."id")))
          WHERE (("tt2"."event_id" = "e"."id") AND ("ttc"."channel" = 'online'::"public"."sales_channel") AND (COALESCE(("tt2"."sales_status")::"text", 'on_sale'::"text") = ANY (ARRAY['on_sale'::"text", 'paused'::"text"]))))), 'has_refund_or_support', (
        CASE
            WHEN ("e"."refund_policy" IS NULL) THEN false
            WHEN ("jsonb_typeof"("e"."refund_policy") = 'object'::"text") THEN ("e"."refund_policy" <> '{}'::"jsonb")
            WHEN ("jsonb_typeof"("e"."refund_policy") = 'array'::"text") THEN ("jsonb_array_length"("e"."refund_policy") > 0)
            WHEN ("jsonb_typeof"("e"."refund_policy") = 'string'::"text") THEN ("length"(TRIM(BOTH FROM ("e"."refund_policy" #>> '{}'::"text"[]))) > 0)
            ELSE true
        END OR (NULLIF(TRIM(BOTH FROM COALESCE("e"."confirmation_message", ''::"text")), ''::"text") IS NOT NULL)), 'has_active_staff', (EXISTS ( SELECT 1
           FROM "public"."event_staff" "es"
          WHERE (("es"."event_id" = "e"."id") AND (COALESCE("es"."active", true) = true)))), 'has_live_stats_row', (EXISTS ( SELECT 1
           FROM "public"."event_live_stats" "els"
          WHERE ("els"."event_id" = "e"."id")))) AS "checks"
   FROM ("public"."events" "e"
     LEFT JOIN "public"."ticket_types" "tt" ON (("tt"."event_id" = "e"."id")))
  GROUP BY "e"."id";



CREATE OR REPLACE VIEW "public"."event_catalog" WITH ("security_invoker"='on') AS
 SELECT "e"."id" AS "event_id",
    "e"."org_id",
    "e"."title",
    "e"."slug",
    "e"."cover_image_url",
    COALESCE("e"."starts_at", ( SELECT "min"("d"."starts_at") AS "min"
           FROM "public"."event_dates" "d"
          WHERE ("d"."event_id" = "e"."id"))) AS "starts_at",
    "e"."city",
    "e"."country_code",
    "jsonb_agg"("jsonb_build_object"('ticket_type_id', "tt"."id", 'name', "tt"."name", 'price_cents', "tt"."price_cents", 'currency', "tt"."currency", 'quota', "tt"."quota") ORDER BY "tt"."price_cents") FILTER (WHERE ("tt"."id" IS NOT NULL)) AS "ticket_types"
   FROM ("public"."events" "e"
     LEFT JOIN "public"."ticket_types" "tt" ON (("tt"."event_id" = "e"."id")))
  GROUP BY "e"."id";



CREATE OR REPLACE TRIGGER "artists_set_updated_at" BEFORE UPDATE ON "public"."artists" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "event_dates_set_updated_at" BEFORE UPDATE ON "public"."event_dates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "order_items_set_updated_at" BEFORE UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "order_items_status_transition_trig" BEFORE UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."order_items_status_transition_guard"();



CREATE OR REPLACE TRIGGER "orders_prevent_buyer_contact_update" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_buyer_contact_update"();



CREATE OR REPLACE TRIGGER "payment_methods_set_updated_at" BEFORE UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "resale_listings_updated_at_trg" BEFORE UPDATE ON "public"."resale_listings" FOR EACH ROW EXECUTE FUNCTION "public"."resale_listings_updated_at"();



CREATE OR REPLACE TRIGGER "seats_set_updated_at" BEFORE UPDATE ON "public"."seats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "t_check_order_currency" BEFORE INSERT ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."trg_check_order_currency"();



CREATE OR REPLACE TRIGGER "t_feature_flags_touch" BEFORE UPDATE ON "public"."feature_flags" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "t_reprice_order_adjustments_del" AFTER DELETE ON "public"."order_adjustments" FOR EACH ROW EXECUTE FUNCTION "public"."trg_reprice_order_after_adjustments"();



CREATE OR REPLACE TRIGGER "t_reprice_order_adjustments_ins" AFTER INSERT ON "public"."order_adjustments" FOR EACH ROW EXECUTE FUNCTION "public"."trg_reprice_order_after_adjustments"();



CREATE OR REPLACE TRIGGER "t_reprice_order_adjustments_upd" AFTER UPDATE ON "public"."order_adjustments" FOR EACH ROW EXECUTE FUNCTION "public"."trg_reprice_order_after_adjustments"();



CREATE OR REPLACE TRIGGER "t_reprice_order_items_del" AFTER DELETE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."trg_reprice_order_after_items"();



CREATE OR REPLACE TRIGGER "t_reprice_order_items_ins" AFTER INSERT ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."trg_reprice_order_after_items"();



CREATE OR REPLACE TRIGGER "t_reprice_order_items_upd" AFTER UPDATE OF "ticket_type_id", "order_id" ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."trg_reprice_order_after_items"();



CREATE OR REPLACE TRIGGER "t_reprice_order_status" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_reprice_order_on_status"();



CREATE OR REPLACE TRIGGER "t_transfers_touch" BEFORE UPDATE ON "public"."transfers" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "ticket_types_set_updated_at" BEFORE UPDATE ON "public"."ticket_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tr_enforce_order_currency_matches_pricing" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_order_currency_matches_pricing"();



CREATE OR REPLACE TRIGGER "tr_event_series_set_updated_at" BEFORE UPDATE ON "public"."event_series" FOR EACH ROW EXECUTE FUNCTION "public"."event_series_set_updated_at"();



CREATE OR REPLACE TRIGGER "tr_handle_refund_processed" AFTER INSERT OR UPDATE ON "public"."refunds" FOR EACH ROW EXECUTE FUNCTION "public"."handle_refund_processed"();



CREATE OR REPLACE TRIGGER "tr_prevent_pricing_changes_after_paid" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_pricing_changes_after_paid"();



CREATE OR REPLACE TRIGGER "tr_prevent_scans_on_refunded_items" BEFORE INSERT ON "public"."scans" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_scans_on_refunded_items"();



CREATE OR REPLACE TRIGGER "tr_user_connections_set_responded_at" BEFORE UPDATE ON "public"."user_connections" FOR EACH ROW EXECUTE FUNCTION "public"."fn_user_connections_set_responded_at"();



CREATE OR REPLACE TRIGGER "tr_user_handles_check_reserved" BEFORE INSERT OR UPDATE OF "handle" ON "public"."user_handles" FOR EACH ROW EXECUTE FUNCTION "public"."fn_check_reserved_handle"();



CREATE OR REPLACE TRIGGER "transfers_validate_order_item_status_trig" BEFORE INSERT OR UPDATE ON "public"."transfers" FOR EACH ROW EXECUTE FUNCTION "public"."validate_transfer_order_item_status"();



CREATE OR REPLACE TRIGGER "trg_devices_require_event_for_scanner" BEFORE INSERT OR UPDATE ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."fn_devices_require_event_for_scanner"();



CREATE OR REPLACE TRIGGER "trg_disputes_updated_at" BEFORE UPDATE ON "public"."disputes" FOR EACH ROW EXECUTE FUNCTION "public"."fn_disputes_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_emit_order_paid" AFTER INSERT OR UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."fn_trg_emit_order_paid"();



CREATE OR REPLACE TRIGGER "trg_emit_payout_paid" AFTER INSERT OR UPDATE OF "status" ON "public"."payouts" FOR EACH ROW EXECUTE FUNCTION "public"."fn_trg_emit_payout_paid"();



CREATE OR REPLACE TRIGGER "trg_emit_ticket_transferred" AFTER INSERT OR UPDATE OF "status" ON "public"."transfers" FOR EACH ROW EXECUTE FUNCTION "public"."fn_trg_emit_ticket_transferred"();



CREATE OR REPLACE TRIGGER "trg_enforce_pricing_plan_org" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_pricing_plan_org_cohesion"();



CREATE OR REPLACE TRIGGER "trg_event_artists_refresh_search" AFTER INSERT OR DELETE OR UPDATE ON "public"."event_artists" FOR EACH ROW EXECUTE FUNCTION "public"."fn_event_artists_refresh_event_search"();



CREATE OR REPLACE TRIGGER "trg_event_categories_updated_at" BEFORE UPDATE ON "public"."event_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_event_categories_updated_at"();



CREATE OR REPLACE TRIGGER "trg_event_metrics_org_match" BEFORE INSERT OR UPDATE ON "public"."event_metrics_daily" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_event_metrics_org"();



CREATE OR REPLACE TRIGGER "trg_event_staff_must_be_org_member" BEFORE INSERT OR UPDATE ON "public"."event_staff" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_event_staff_in_org"();



CREATE OR REPLACE TRIGGER "trg_events_notify_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."notify_event_change"();



CREATE OR REPLACE TRIGGER "trg_events_refresh_search" BEFORE INSERT OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."fn_events_refresh_search"();



CREATE OR REPLACE TRIGGER "trg_feature_flags_touch" BEFORE UPDATE ON "public"."feature_flags" FOR EACH ROW EXECUTE FUNCTION "public"."fn_feature_flags_touch_last_changed"();



CREATE OR REPLACE TRIGGER "trg_guard_scanner_checkin_only" BEFORE UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."guard_scanner_checkin_only"();



CREATE OR REPLACE TRIGGER "trg_issue_order_items_when_order_paid" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."issue_order_items_when_order_paid"();



CREATE OR REPLACE TRIGGER "trg_payment_outbox_updated_at" BEFORE UPDATE ON "public"."payment_outbox" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payment_provider_settings_updated_at" BEFORE UPDATE ON "public"."payment_provider_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_payment_provider_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payment_routing_rules_touch" BEFORE UPDATE ON "public"."payment_routing_rules" FOR EACH ROW EXECUTE FUNCTION "public"."fn_payment_routing_rules_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prepare_credential_entitlement" BEFORE INSERT OR UPDATE OF "order_item_id", "event_id", "holder_user_id" ON "public"."credential_entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."fn_prepare_credential_entitlement"();



CREATE OR REPLACE TRIGGER "trg_prevent_totals_after_paid" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_totals_change_after_paid"();



CREATE OR REPLACE TRIGGER "trg_recalc_event_live_stats_order_items" AFTER INSERT OR DELETE OR UPDATE OF "status", "ticket_type_id", "order_id", "revoked_at", "refunded_at", "checked_in_at" ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."fn_recalculate_event_live_stats_from_order_item"();



CREATE OR REPLACE TRIGGER "trg_recalc_event_live_stats_orders" AFTER INSERT OR UPDATE OF "status", "total_cents" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."fn_recalculate_event_live_stats_from_order"();



CREATE OR REPLACE TRIGGER "trg_recalc_event_live_stats_payments" AFTER INSERT OR UPDATE OF "status", "amount_cents", "order_id" ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."fn_recalculate_event_live_stats_from_payment"();



CREATE OR REPLACE TRIGGER "trg_recalc_event_live_stats_scans" AFTER INSERT OR DELETE OR UPDATE OF "event_id", "outcome", "scanned_at" ON "public"."scans" FOR EACH ROW EXECUTE FUNCTION "public"."fn_recalculate_event_live_stats_from_scan"();



CREATE OR REPLACE TRIGGER "trg_recalc_event_live_stats_ticket_types" AFTER INSERT OR DELETE OR UPDATE OF "quota", "event_id", "sales_status" ON "public"."ticket_types" FOR EACH ROW EXECUTE FUNCTION "public"."fn_recalculate_event_live_stats_from_ticket_type"();



CREATE OR REPLACE TRIGGER "trg_recompute_order_totals" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "app"."recompute_order_totals"();



CREATE OR REPLACE TRIGGER "trg_resale_listing_guard" BEFORE INSERT OR UPDATE ON "public"."resale_listings" FOR EACH ROW EXECUTE FUNCTION "public"."resale_listing_guard"();



CREATE OR REPLACE TRIGGER "trg_touch_credential_batches_updated_at" BEFORE UPDATE ON "public"."credential_batches" FOR EACH ROW EXECUTE FUNCTION "public"."fn_touch_tapband_credentials_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_credential_entitlements_updated_at" BEFORE UPDATE ON "public"."credential_entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."fn_touch_tapband_credentials_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_credential_inventory_updated_at" BEFORE UPDATE ON "public"."credential_inventory" FOR EACH ROW EXECUTE FUNCTION "public"."fn_touch_tapband_credentials_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_event_live_stats_updated_at" BEFORE UPDATE ON "public"."event_live_stats" FOR EACH ROW EXECUTE FUNCTION "public"."fn_touch_event_live_stats_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_physical_credentials_updated_at" BEFORE UPDATE ON "public"."physical_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."fn_touch_tapband_credentials_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_tapband_feature_configs_updated_at" BEFORE UPDATE ON "public"."tapband_feature_configs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_touch_tapband_feature_configs_updated_at"();



CREATE OR REPLACE TRIGGER "trg_transfers_owner" BEFORE INSERT OR UPDATE ON "public"."transfers" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_transfer_owner"();



CREATE OR REPLACE TRIGGER "trg_upcase_ticket_code" BEFORE INSERT OR UPDATE OF "ticket_code" ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "app"."upcase_ticket_code"();



CREATE OR REPLACE TRIGGER "trg_validate_event_category_slug" BEFORE INSERT OR UPDATE OF "category" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_category_slug"();



CREATE OR REPLACE TRIGGER "trg_validate_scan_org" BEFORE INSERT ON "public"."scans" FOR EACH ROW EXECUTE FUNCTION "app"."validate_scan_org"();



CREATE OR REPLACE TRIGGER "trg_webhook_endpoints_touch" BEFORE UPDATE ON "public"."webhook_endpoints" FOR EACH ROW EXECUTE FUNCTION "public"."fn_webhook_endpoints_touch_updated_at"();



ALTER TABLE ONLY "private"."organizer_identity_details"
    ADD CONSTRAINT "organizer_identity_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."credential_batches"
    ADD CONSTRAINT "credential_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_batches"
    ADD CONSTRAINT "credential_batches_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_batches"
    ADD CONSTRAINT "credential_batches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_batches"
    ADD CONSTRAINT "credential_batches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_entitlements"
    ADD CONSTRAINT "credential_entitlements_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_entitlements"
    ADD CONSTRAINT "credential_entitlements_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."physical_credentials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credential_entitlements"
    ADD CONSTRAINT "credential_entitlements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credential_entitlements"
    ADD CONSTRAINT "credential_entitlements_holder_user_id_fkey" FOREIGN KEY ("holder_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_entitlements"
    ADD CONSTRAINT "credential_entitlements_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credential_entitlements"
    ADD CONSTRAINT "credential_entitlements_removed_by_fkey" FOREIGN KEY ("removed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_inventory"
    ADD CONSTRAINT "credential_inventory_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."credential_batches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."credential_inventory"
    ADD CONSTRAINT "credential_inventory_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_inventory"
    ADD CONSTRAINT "credential_inventory_current_credential_id_fkey" FOREIGN KEY ("current_credential_id") REFERENCES "public"."physical_credentials"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_inventory"
    ADD CONSTRAINT "credential_inventory_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_inventory"
    ADD CONSTRAINT "credential_inventory_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_inventory"
    ADD CONSTRAINT "credential_inventory_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_taps"
    ADD CONSTRAINT "credential_taps_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."physical_credentials"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_taps"
    ADD CONSTRAINT "credential_taps_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_taps"
    ADD CONSTRAINT "credential_taps_device_session_id_fkey" FOREIGN KEY ("device_session_id") REFERENCES "public"."device_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_taps"
    ADD CONSTRAINT "credential_taps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_taps"
    ADD CONSTRAINT "credential_taps_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."credential_inventory"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_taps"
    ADD CONSTRAINT "credential_taps_operator_user_id_fkey" FOREIGN KEY ("operator_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_taps"
    ADD CONSTRAINT "credential_taps_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_sessions"
    ADD CONSTRAINT "device_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_setup_codes"
    ADD CONSTRAINT "device_setup_codes_claimed_device_id_fkey" FOREIGN KEY ("claimed_device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_setup_codes"
    ADD CONSTRAINT "device_setup_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_setup_codes"
    ADD CONSTRAINT "device_setup_codes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_setup_codes"
    ADD CONSTRAINT "device_setup_codes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "public"."refunds"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_artists"
    ADD CONSTRAINT "event_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_artists"
    ADD CONSTRAINT "event_artists_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_dates"
    ADD CONSTRAINT "event_dates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_favourites"
    ADD CONSTRAINT "event_favourites_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_favourites"
    ADD CONSTRAINT "event_favourites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_invitations"
    ADD CONSTRAINT "event_invitations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_invitations"
    ADD CONSTRAINT "event_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_invitations"
    ADD CONSTRAINT "event_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_live_stats"
    ADD CONSTRAINT "event_live_stats_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_series"
    ADD CONSTRAINT "event_series_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_staff"
    ADD CONSTRAINT "event_staff_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_staff"
    ADD CONSTRAINT "event_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."event_series"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_last_changed_by_fkey" FOREIGN KEY ("last_changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_owner_fkey" FOREIGN KEY ("owner") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_reconciliation_issues"
    ADD CONSTRAINT "finance_reconciliation_issues_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_reconciliation_issues"
    ADD CONSTRAINT "finance_reconciliation_issues_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_reconciliation_issues"
    ADD CONSTRAINT "finance_reconciliation_issues_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_reconciliation_issues"
    ADD CONSTRAINT "finance_reconciliation_issues_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_reconciliation_issues"
    ADD CONSTRAINT "finance_reconciliation_issues_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "public"."refunds"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guestlist_entries"
    ADD CONSTRAINT "guestlist_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guestlist_entries"
    ADD CONSTRAINT "guestlist_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guestlist_entries"
    ADD CONSTRAINT "guestlist_entries_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guestlist_fulfillments"
    ADD CONSTRAINT "guestlist_fulfillments_guestlist_entry_id_fkey" FOREIGN KEY ("guestlist_entry_id") REFERENCES "public"."guestlist_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guestlist_fulfillments"
    ADD CONSTRAINT "guestlist_fulfillments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "public"."refunds"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."membership_invites"
    ADD CONSTRAINT "membership_invites_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membership_invites"
    ADD CONSTRAINT "membership_invites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_mutes"
    ADD CONSTRAINT "notification_mutes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_adjustments"
    ADD CONSTRAINT "order_adjustments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_adjustments"
    ADD CONSTRAINT "order_adjustments_price_rule_id_fkey" FOREIGN KEY ("price_rule_id") REFERENCES "public"."price_rules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_adjustments"
    ADD CONSTRAINT "order_adjustments_target_order_item_id_fkey" FOREIGN KEY ("target_order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_current_owner_id_fkey" FOREIGN KEY ("current_owner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_holder_user_id_fkey" FOREIGN KEY ("holder_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_transferred_from_order_item_id_fkey" FOREIGN KEY ("transferred_from_order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_cashier_user_id_fkey" FOREIGN KEY ("cashier_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_device_session_id_fkey" FOREIGN KEY ("device_session_id") REFERENCES "public"."device_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pos_shift_id_fkey" FOREIGN KEY ("pos_shift_id") REFERENCES "public"."pos_shifts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pricing_plan_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "public"."pricing_plans"("id");



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_outbox"
    ADD CONSTRAINT "payment_outbox_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_outbox"
    ADD CONSTRAINT "payment_outbox_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_provider_settings"
    ADD CONSTRAINT "payment_provider_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_routing_rules"
    ADD CONSTRAINT "payment_routing_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout_accounts"
    ADD CONSTRAINT "payout_accounts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physical_credentials"
    ADD CONSTRAINT "physical_credentials_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physical_credentials"
    ADD CONSTRAINT "physical_credentials_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."credential_inventory"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physical_credentials"
    ADD CONSTRAINT "physical_credentials_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physical_credentials"
    ADD CONSTRAINT "physical_credentials_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "public"."physical_credentials"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physical_credentials"
    ADD CONSTRAINT "physical_credentials_replacement_of_id_fkey" FOREIGN KEY ("replacement_of_id") REFERENCES "public"."physical_credentials"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physical_credentials"
    ADD CONSTRAINT "physical_credentials_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physical_credentials"
    ADD CONSTRAINT "physical_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pos_shifts"
    ADD CONSTRAINT "pos_shifts_cashier_user_id_fkey" FOREIGN KEY ("cashier_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pos_shifts"
    ADD CONSTRAINT "pos_shifts_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pos_shifts"
    ADD CONSTRAINT "pos_shifts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pos_shifts"
    ADD CONSTRAINT "pos_shifts_device_session_id_fkey" FOREIGN KEY ("device_session_id") REFERENCES "public"."device_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pos_shifts"
    ADD CONSTRAINT "pos_shifts_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pos_shifts"
    ADD CONSTRAINT "pos_shifts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."price_rule_redemptions"
    ADD CONSTRAINT "price_rule_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."price_rule_redemptions"
    ADD CONSTRAINT "price_rule_redemptions_price_rule_id_fkey" FOREIGN KEY ("price_rule_id") REFERENCES "public"."price_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_rule_redemptions"
    ADD CONSTRAINT "price_rule_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "price_rules_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "price_rules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "price_rules_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pricing_plans"
    ADD CONSTRAINT "pricing_plans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_settlement_items"
    ADD CONSTRAINT "provider_settlement_items_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_settlement_items"
    ADD CONSTRAINT "provider_settlement_items_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "public"."provider_settlements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refund_items"
    ADD CONSTRAINT "refund_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."refund_items"
    ADD CONSTRAINT "refund_items_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "public"."refunds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."resale_listings"
    ADD CONSTRAINT "resale_listings_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resale_listings"
    ADD CONSTRAINT "resale_listings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."resale_listings"
    ADD CONSTRAINT "resale_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."resale_listings"
    ADD CONSTRAINT "resale_listings_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_device_session_id_fkey" FOREIGN KEY ("device_session_id") REFERENCES "public"."device_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."seat_holds"
    ADD CONSTRAINT "seat_holds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."seat_holds"
    ADD CONSTRAINT "seat_holds_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seat_holds"
    ADD CONSTRAINT "seat_holds_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seat_maps"
    ADD CONSTRAINT "seat_maps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seat_reservations"
    ADD CONSTRAINT "seat_reservations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seat_reservations"
    ADD CONSTRAINT "seat_reservations_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seat_reservations"
    ADD CONSTRAINT "seat_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seats"
    ADD CONSTRAINT "seats_seat_map_id_fkey" FOREIGN KEY ("seat_map_id") REFERENCES "public"."seat_maps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."series_follows"
    ADD CONSTRAINT "series_follows_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."event_series"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."series_follows"
    ADD CONSTRAINT "series_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tapband_alerts"
    ADD CONSTRAINT "tapband_alerts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tapband_alerts"
    ADD CONSTRAINT "tapband_alerts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tapband_alerts"
    ADD CONSTRAINT "tapband_alerts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tapband_feature_configs"
    ADD CONSTRAINT "tapband_feature_configs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tapband_feature_configs"
    ADD CONSTRAINT "tapband_feature_configs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tapband_feature_configs"
    ADD CONSTRAINT "tapband_feature_configs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tapband_feature_configs"
    ADD CONSTRAINT "tapband_feature_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tapband_kill_switches"
    ADD CONSTRAINT "tapband_kill_switches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tapband_kill_switches"
    ADD CONSTRAINT "tapband_kill_switches_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tapband_kill_switches"
    ADD CONSTRAINT "tapband_kill_switches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tapband_kill_switches"
    ADD CONSTRAINT "tapband_kill_switches_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tapband_telemetry_events"
    ADD CONSTRAINT "tapband_telemetry_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tapband_telemetry_events"
    ADD CONSTRAINT "tapband_telemetry_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tapband_telemetry_events"
    ADD CONSTRAINT "tapband_telemetry_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_type_channels"
    ADD CONSTRAINT "ticket_type_channels_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_types"
    ADD CONSTRAINT "ticket_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_connections"
    ADD CONSTRAINT "user_connections_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_connections"
    ADD CONSTRAINT "user_connections_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_handles"
    ADD CONSTRAINT "user_handles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_privacy_settings"
    ADD CONSTRAINT "user_privacy_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_private_profiles"
    ADD CONSTRAINT "user_private_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlists"
    ADD CONSTRAINT "waitlists_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlists"
    ADD CONSTRAINT "waitlists_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlists"
    ADD CONSTRAINT "waitlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_deliveries"
    ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_endpoints"
    ADD CONSTRAINT "webhook_endpoints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."webhook_endpoints"
    ADD CONSTRAINT "webhook_endpoints_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "authenticated_select" ON "_internal"."policy_backups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "deny_anon" ON "_internal"."policy_backups" TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "deny_authenticated_delete" ON "_internal"."policy_backups" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "deny_authenticated_insert" ON "_internal"."policy_backups" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "deny_authenticated_update" ON "_internal"."policy_backups" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "_internal"."policy_backups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "_internal"."project_docs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_docs_delete_owner" ON "_internal"."project_docs" FOR DELETE TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "project_docs_insert_owner" ON "_internal"."project_docs" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "project_docs_select_owner" ON "_internal"."project_docs" FOR SELECT TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "project_docs_update_owner" ON "_internal"."project_docs" FOR UPDATE TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")) WITH CHECK ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



ALTER TABLE "private"."organizer_identity_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Authenticated delete by seller_or_org" ON "public"."resale_listings" FOR DELETE TO "authenticated" USING (((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "seller_id") OR ("org_id" IN ( SELECT "org_members"."org_id"
   FROM "public"."org_members"
  WHERE ("org_members"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))));



CREATE POLICY "Authenticated insert by seller_or_org" ON "public"."resale_listings" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "seller_id") OR ("org_id" IN ( SELECT "org_members"."org_id"
   FROM "public"."org_members"
  WHERE ("org_members"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))));



CREATE POLICY "Authenticated update by seller_or_org" ON "public"."resale_listings" FOR UPDATE TO "authenticated" USING (((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "seller_id") OR ("org_id" IN ( SELECT "org_members"."org_id"
   FROM "public"."org_members"
  WHERE ("org_members"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")))))) WITH CHECK (((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "seller_id") OR ("org_id" IN ( SELECT "org_members"."org_id"
   FROM "public"."org_members"
  WHERE ("org_members"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))));



CREATE POLICY "Event delete" ON "public"."ticket_type_channels" FOR DELETE TO "authenticated" USING (("public"."get_ticket_type_event"("ticket_type_id") = ((( SELECT ( SELECT "auth"."jwt"() AS "jwt") AS "jwt") ->> 'event_id'::"text"))::"uuid"));



CREATE POLICY "Event insert" ON "public"."ticket_type_channels" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_ticket_type_event"("ticket_type_id") = ((( SELECT ( SELECT "auth"."jwt"() AS "jwt") AS "jwt") ->> 'event_id'::"text"))::"uuid"));



CREATE POLICY "Event select" ON "public"."ticket_type_channels" FOR SELECT TO "authenticated" USING (("public"."get_ticket_type_event"("ticket_type_id") = ((( SELECT ( SELECT "auth"."jwt"() AS "jwt") AS "jwt") ->> 'event_id'::"text"))::"uuid"));



CREATE POLICY "Event update" ON "public"."ticket_type_channels" FOR UPDATE TO "authenticated" USING (("public"."get_ticket_type_event"("ticket_type_id") = ((( SELECT ( SELECT "auth"."jwt"() AS "jwt") AS "jwt") ->> 'event_id'::"text"))::"uuid")) WITH CHECK (("public"."get_ticket_type_event"("ticket_type_id") = ((( SELECT ( SELECT "auth"."jwt"() AS "jwt") AS "jwt") ->> 'event_id'::"text"))::"uuid"));



CREATE POLICY "Public select active" ON "public"."resale_listings" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "Users can delete their own favourites" ON "public"."event_favourites" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own series follows" ON "public"."series_follows" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own favourites" ON "public"."event_favourites" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own series follows" ON "public"."series_follows" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own favourites" ON "public"."event_favourites" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own series follows" ON "public"."series_follows" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."admin_action_catalog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_action_catalog_delete" ON "public"."admin_action_catalog" FOR DELETE TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "admin_action_catalog_insert" ON "public"."admin_action_catalog" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_platform_admin"());



CREATE POLICY "admin_action_catalog_select" ON "public"."admin_action_catalog" FOR SELECT TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "admin_action_catalog_update" ON "public"."admin_action_catalog" FOR UPDATE TO "authenticated" USING ("app"."is_platform_admin"()) WITH CHECK ("app"."is_platform_admin"());



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_users_delete" ON "public"."admin_users" FOR DELETE TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "admin_users_insert" ON "public"."admin_users" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_platform_admin"());



CREATE POLICY "admin_users_select" ON "public"."admin_users" FOR SELECT TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "admin_users_update" ON "public"."admin_users" FOR UPDATE TO "authenticated" USING ("app"."is_platform_admin"()) WITH CHECK ("app"."is_platform_admin"());



ALTER TABLE "public"."app_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "artists_delete" ON "public"."artists" FOR DELETE TO "authenticated" USING ((("primary_user_id" = "app"."uid"()) OR (("org_id" IS NOT NULL) AND "app"."is_org_owner"("org_id"))));



CREATE POLICY "artists_insert_authenticated_merged" ON "public"."artists" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("org_id" = "public"."get_user_org"())));



CREATE POLICY "artists_public_lineup_select" ON "public"."artists" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM ("public"."event_artists" "ea"
     JOIN "public"."events" "e" ON (("e"."id" = "ea"."event_id")))
  WHERE (("ea"."artist_id" = "artists"."id") AND ("e"."visibility" = 'public'::"text")))));



CREATE POLICY "artists_select" ON "public"."artists" FOR SELECT TO "authenticated" USING ((("primary_user_id" = "app"."uid"()) OR (("org_id" IS NOT NULL) AND "app"."is_org_member_of"("org_id"))));



CREATE POLICY "artists_update" ON "public"."artists" FOR UPDATE TO "authenticated" USING ((("primary_user_id" = "app"."uid"()) OR (("org_id" IS NOT NULL) AND "app"."is_org_admin_of"("org_id")))) WITH CHECK ((("primary_user_id" = "app"."uid"()) OR (("org_id" IS NOT NULL) AND "app"."is_org_admin_of"("org_id"))));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log_archive" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_insert_auth" ON "public"."audit_log" FOR INSERT TO "authenticated" WITH CHECK (("app"."uid"() IS NOT NULL));



CREATE POLICY "audit_log_no_anon_access" ON "public"."app_audit_log" TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "audit_log_select_combined" ON "public"."app_audit_log" FOR SELECT TO "authenticated" USING (("app"."is_platform_admin"() OR ((("row_data" ->> 'org_id'::"text"))::"uuid" = "public"."get_user_org"())));



CREATE POLICY "audit_log_select_org" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (("org_id" = "public"."get_user_org"()));



CREATE POLICY "audit_log_update_own" ON "public"."audit_log" FOR UPDATE TO "authenticated" USING (("actor_id" = "app"."uid"())) WITH CHECK (("actor_id" = "app"."uid"()));



ALTER TABLE "public"."credential_batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credential_batches_delete" ON "public"."credential_batches" FOR DELETE TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "credential_batches_insert" ON "public"."credential_batches" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_platform_admin"());



CREATE POLICY "credential_batches_select" ON "public"."credential_batches" FOR SELECT TO "authenticated" USING (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_manager"("org_id")) OR (("event_id" IS NOT NULL) AND "app"."can_read_tapband_event"("event_id"))));



CREATE POLICY "credential_batches_update" ON "public"."credential_batches" FOR UPDATE TO "authenticated" USING ("app"."is_platform_admin"()) WITH CHECK ("app"."is_platform_admin"());



ALTER TABLE "public"."credential_entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credential_entitlements_delete" ON "public"."credential_entitlements" FOR DELETE TO "authenticated" USING ("app"."can_administer_tapband_event"("event_id"));



CREATE POLICY "credential_entitlements_insert" ON "public"."credential_entitlements" FOR INSERT TO "authenticated" WITH CHECK ("app"."can_administer_tapband_event"("event_id"));



CREATE POLICY "credential_entitlements_select" ON "public"."credential_entitlements" FOR SELECT TO "authenticated" USING ("app"."can_read_tapband_entitlement"("id"));



CREATE POLICY "credential_entitlements_update" ON "public"."credential_entitlements" FOR UPDATE TO "authenticated" USING ("app"."can_administer_tapband_event"("event_id")) WITH CHECK ("app"."can_administer_tapband_event"("event_id"));



ALTER TABLE "public"."credential_inventory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credential_inventory_delete" ON "public"."credential_inventory" FOR DELETE TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "credential_inventory_insert" ON "public"."credential_inventory" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_platform_admin"());



CREATE POLICY "credential_inventory_select" ON "public"."credential_inventory" FOR SELECT TO "authenticated" USING ("app"."can_read_tapband_inventory"("id"));



CREATE POLICY "credential_inventory_update" ON "public"."credential_inventory" FOR UPDATE TO "authenticated" USING ("app"."is_platform_admin"()) WITH CHECK ("app"."is_platform_admin"());



ALTER TABLE "public"."credential_taps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credential_taps_delete" ON "public"."credential_taps" FOR DELETE TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "credential_taps_insert" ON "public"."credential_taps" FOR INSERT TO "authenticated" WITH CHECK (("app"."is_platform_admin"() OR (("event_id" IS NOT NULL) AND "app"."can_record_tapband_event_tap"("event_id"))));



CREATE POLICY "credential_taps_select" ON "public"."credential_taps" FOR SELECT TO "authenticated" USING ("app"."can_read_tapband_tap"("id"));



CREATE POLICY "credential_taps_update" ON "public"."credential_taps" FOR UPDATE TO "authenticated" USING ("app"."is_platform_admin"()) WITH CHECK ("app"."is_platform_admin"());



CREATE POLICY "dashboard_user_update_ticket_types" ON "public"."ticket_types" FOR UPDATE TO "dashboard_user" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "ticket_types"."event_id") AND "app"."is_org_manager"("e"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "ticket_types"."event_id") AND "app"."is_org_manager"("e"."org_id")))));



CREATE POLICY "deny_delete_to_authenticated" ON "public"."payment_attempts" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "deny_update_to_authenticated" ON "public"."payment_attempts" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."device_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_sessions_select" ON "public"."device_sessions" FOR SELECT TO "authenticated" USING ((((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ended_at" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."devices" "d"
  WHERE (("d"."id" = "device_sessions"."device_id") AND "app"."is_org_manager"("d"."org_id"))))));



ALTER TABLE "public"."device_setup_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_setup_codes_insert" ON "public"."device_setup_codes" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_org_manager"("org_id"));



CREATE POLICY "device_setup_codes_select" ON "public"."device_setup_codes" FOR SELECT TO "authenticated" USING ("app"."is_org_manager"("org_id"));



CREATE POLICY "device_setup_codes_update" ON "public"."device_setup_codes" FOR UPDATE TO "authenticated" USING ("app"."is_org_manager"("org_id")) WITH CHECK ("app"."is_org_manager"("org_id"));



ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "devices_select" ON "public"."devices" FOR SELECT TO "authenticated" USING ("app"."is_org_manager"("org_id"));



ALTER TABLE "public"."disputes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_artists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_artists_manage" ON "public"."event_artists" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_artists"."event_id") AND "app"."is_org_manager"("e"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_artists"."event_id") AND "app"."is_org_manager"("e"."org_id")))));



CREATE POLICY "event_artists_public_select" ON "public"."event_artists" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_artists"."event_id") AND ("e"."visibility" = 'public'::"text")))));



ALTER TABLE "public"."event_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_categories_delete" ON "public"."event_categories" FOR DELETE TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "event_categories_insert" ON "public"."event_categories" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_platform_admin"());



CREATE POLICY "event_categories_select" ON "public"."event_categories" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) OR "app"."is_platform_admin"()));



CREATE POLICY "event_categories_update" ON "public"."event_categories" FOR UPDATE TO "authenticated" USING ("app"."is_platform_admin"()) WITH CHECK ("app"."is_platform_admin"());



ALTER TABLE "public"."event_dates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_dates_select_anon" ON "public"."event_dates" FOR SELECT TO "anon" USING ("public"."fn_event_is_public_now"("event_id"));



CREATE POLICY "event_dates_select_authenticated" ON "public"."event_dates" FOR SELECT TO "authenticated" USING (("public"."fn_event_is_public_now"("event_id") OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_dates"."event_id") AND "app"."is_org_manager"("e"."org_id"))))));



ALTER TABLE "public"."event_favourites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_invitations_select_participants" ON "public"."event_invitations" FOR SELECT TO "authenticated" USING (("app"."is_claimed_account"() AND (("inviter_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("invitee_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."event_live_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_live_stats_org_read" ON "public"."event_live_stats" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_live_stats"."event_id") AND (("e"."status")::"text" = 'published'::"text") AND ("e"."visibility" = 'public'::"text") AND (("e"."publish_at" IS NULL) OR ("e"."publish_at" <= "now"())) AND (("e"."unpublish_at" IS NULL) OR ("e"."unpublish_at" > "now"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_live_stats"."event_id") AND "app"."is_org_member_of"("e"."org_id")))) OR "app"."is_platform_admin"()));



CREATE POLICY "event_live_stats_public_read" ON "public"."event_live_stats" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_live_stats"."event_id") AND (("e"."status")::"text" = 'published'::"text") AND ("e"."visibility" = 'public'::"text") AND (("e"."publish_at" IS NULL) OR ("e"."publish_at" <= "now"())) AND (("e"."unpublish_at" IS NULL) OR ("e"."unpublish_at" > "now"()))))));



ALTER TABLE "public"."event_metrics_daily" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_metrics_daily_insert" ON "public"."event_metrics_daily" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "event_metrics_daily_select" ON "public"."event_metrics_daily" FOR SELECT TO "authenticated" USING ("app"."is_org_member_of"("org_id"));



ALTER TABLE "public"."event_series" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_series_org_admin_delete" ON "public"."event_series" FOR DELETE TO "authenticated" USING ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "event_series_org_admin_insert" ON "public"."event_series" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "event_series_org_admin_update" ON "public"."event_series" FOR UPDATE TO "authenticated" USING ("app"."is_org_admin_of"("org_id")) WITH CHECK ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "event_series_public_select" ON "public"."event_series" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."event_staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_staff_select_anon_merged" ON "public"."event_staff" FOR SELECT TO "anon" USING (false);



CREATE POLICY "event_staff_select_authenticated_merged" ON "public"."event_staff" FOR SELECT TO "authenticated" USING (false);



CREATE POLICY "event_staff_select_authenticator_merged" ON "public"."event_staff" FOR SELECT TO "authenticator" USING (false);



CREATE POLICY "event_staff_select_dashboard_user_merged" ON "public"."event_staff" FOR SELECT TO "dashboard_user" USING (false);



CREATE POLICY "event_staff_select_organiser_merged" ON "public"."event_staff" FOR SELECT TO "organiser" USING (false);



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_delete_authenticated" ON "public"."events" FOR DELETE TO "authenticated" USING (("app"."can_delete_event"("id") OR ("public"."can_manage_event"("id", ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'draft'::"public"."event_status"))));



CREATE POLICY "events_insert_authenticated" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_org_manager"("org_id"));



CREATE POLICY "events_select_anon" ON "public"."events" FOR SELECT TO "anon" USING (("visibility" = 'public'::"text"));



CREATE POLICY "events_select_authenticated" ON "public"."events" FOR SELECT TO "authenticated" USING (((("visibility" = 'public'::"text") AND (("status" = 'published'::"public"."event_status") OR ("publish_at" <= "now"()))) OR "app"."is_event_public_now"("id") OR "app"."is_platform_admin"() OR "app"."is_org_member_of"("org_id") OR "app"."is_event_staff_of"("id", NULL::"public"."app_role"[])));



CREATE POLICY "events_update_authenticated" ON "public"."events" FOR UPDATE TO "authenticated" USING (("app"."is_org_admin_of"("org_id") OR "public"."can_manage_event"("id", "app"."uid"()))) WITH CHECK (("app"."is_org_admin_of"("org_id") OR "public"."can_manage_event"("id", "app"."uid"())));



CREATE POLICY "events_update_guardrail" ON "public"."events" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING (("status" <> 'archived'::"public"."event_status")) WITH CHECK (("status" <> 'archived'::"public"."event_status"));



ALTER TABLE "public"."feature_flags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_flags_delete" ON "public"."feature_flags" FOR DELETE TO "authenticated" USING ((("org_id" IS NULL) AND "app"."is_platform_admin"()));



CREATE POLICY "feature_flags_insert" ON "public"."feature_flags" FOR INSERT TO "authenticated" WITH CHECK ((("org_id" IS NULL) AND "app"."is_platform_admin"()));



CREATE POLICY "feature_flags_select" ON "public"."feature_flags" FOR SELECT TO "authenticated" USING (("app"."is_org_member_of"("org_id") OR "app"."is_platform_admin"()));



CREATE POLICY "feature_flags_update" ON "public"."feature_flags" FOR UPDATE TO "authenticated" USING ((("org_id" IS NULL) AND "app"."is_platform_admin"())) WITH CHECK ((("org_id" IS NULL) AND "app"."is_platform_admin"()));



ALTER TABLE "public"."finance_reconciliation_issues" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "finance_reconciliation_issues_read" ON "public"."finance_reconciliation_issues" FOR SELECT TO "authenticated" USING (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_finance_viewer"("org_id"))));



ALTER TABLE "public"."guestlist_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guestlist_entries_delete" ON "public"."guestlist_entries" FOR DELETE TO "authenticated" USING (("app"."can_manage_guestlist_entry"("event_id") OR ("created_by" = "app"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "guestlist_entries"."event_id") AND "app"."is_org_admin_of"("e"."org_id"))))));



CREATE POLICY "guestlist_entries_select" ON "public"."guestlist_entries" FOR SELECT TO "authenticated" USING ((("created_by" = "app"."uid"()) OR "app"."is_event_staff_of"("event_id", NULL::"public"."app_role"[])));



CREATE POLICY "guestlist_entries_update" ON "public"."guestlist_entries" FOR UPDATE TO "authenticated" USING ("app"."can_update_guestlist_entry"("app"."uid"(), "event_id", "created_by")) WITH CHECK ("app"."can_update_guestlist_entry"("app"."uid"(), "event_id", "created_by"));



ALTER TABLE "public"."guestlist_fulfillments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guestlist_fulfillments_delete" ON "public"."guestlist_fulfillments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."guestlist_entries" "ge"
     JOIN "public"."events" "e" ON (("e"."id" = "ge"."event_id")))
  WHERE (("ge"."id" = "guestlist_fulfillments"."guestlist_entry_id") AND ("app"."is_event_staff_of"("ge"."event_id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]) OR "app"."is_org_admin_of"("e"."org_id"))))));



CREATE POLICY "guestlist_fulfillments_insert" ON "public"."guestlist_fulfillments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."guestlist_entries" "ge"
  WHERE (("ge"."id" = "guestlist_fulfillments"."guestlist_entry_id") AND "app"."is_event_staff_of"("ge"."event_id", NULL::"public"."app_role"[])))));



CREATE POLICY "guestlist_fulfillments_select" ON "public"."guestlist_fulfillments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."guestlist_entries" "ge"
  WHERE (("ge"."id" = "guestlist_fulfillments"."guestlist_entry_id") AND (("ge"."created_by" = "app"."uid"()) OR "app"."is_event_staff_of"("ge"."event_id", NULL::"public"."app_role"[]))))));



CREATE POLICY "insert_by_buyer" ON "public"."payment_attempts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payment_attempts"."order_id") AND ("o"."buyer_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))));



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs_org_read" ON "public"."jobs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE ("m"."user_id" = "app"."uid"()))));



ALTER TABLE "public"."ledger_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ledger_entries_select" ON "public"."ledger_entries" FOR SELECT TO "authenticated" USING ("app"."is_org_finance_viewer"("org_id"));



ALTER TABLE "public"."membership_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "membership_invites_admin_select" ON "public"."membership_invites" FOR SELECT TO "authenticated" USING ("app"."is_org_admin_of"("org_id"));



ALTER TABLE "public"."notification_mutes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_per_user" ON "public"."notifications" FOR DELETE TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "notifications_insert_per_user" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "notifications_select_per_user" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "notifications_update_per_user" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")) WITH CHECK ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



ALTER TABLE "public"."ops_cron_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_adjustments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_adjustments_read_org_member" ON "public"."order_adjustments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."org_members" "m" ON (("m"."org_id" = "o"."org_id")))
  WHERE (("o"."id" = "order_adjustments"."order_id") AND ("m"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_select_anon" ON "public"."order_items" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."buyer_id" = "app"."uid"())))));



CREATE POLICY "order_items_select_authenticated" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((("current_owner_id" = "app"."uid"()) OR ("holder_user_id" = "app"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND (("o"."buyer_id" = "app"."uid"()) OR "app"."is_org_manager"("o"."org_id"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."ticket_types" "tt"
     JOIN "public"."events" "e" ON (("e"."id" = "tt"."event_id")))
  WHERE (("tt"."id" = "order_items"."ticket_type_id") AND "app"."is_event_staff_of"("e"."id", NULL::"public"."app_role"[]))))));



CREATE POLICY "order_items_update_status" ON "public"."order_items" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."ticket_types" "tt"
     JOIN "public"."events" "e" ON (("e"."id" = "tt"."event_id")))
  WHERE (("tt"."id" = "order_items"."ticket_type_id") AND "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role", 'scanner'::"public"."app_role"])))) OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."buyer_id" = "app"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."ticket_types" "tt"
     JOIN "public"."events" "e" ON (("e"."id" = "tt"."event_id")))
  WHERE (("tt"."id" = "order_items"."ticket_type_id") AND "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role", 'scanner'::"public"."app_role"])))) OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."buyer_id" = "app"."uid"()))))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_delete" ON "public"."orders" FOR DELETE TO "authenticated" USING (("app"."is_org_manager"("org_id") OR (("buyer_id" = "app"."uid"()) AND ("status" = 'pending'::"public"."order_status"))));



CREATE POLICY "orders_insert" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ((("buyer_id" = "app"."uid"()) OR "app"."is_org_manager"("org_id")));



CREATE POLICY "orders_insert_guest" ON "public"."orders" FOR INSERT TO "anon" WITH CHECK (("buyer_id" = "app"."uid"()));



CREATE POLICY "orders_select" ON "public"."orders" FOR SELECT TO "authenticated" USING ((("buyer_id" = "app"."uid"()) OR "app"."is_org_manager"("org_id")));



CREATE POLICY "orders_update" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((("buyer_id" = "app"."uid"()) OR "app"."is_org_manager"("org_id"))) WITH CHECK ((("buyer_id" = "app"."uid"()) OR "app"."is_org_manager"("org_id")));



ALTER TABLE "public"."org_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_members_delete" ON "public"."org_members" FOR DELETE TO "authenticated" USING ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "org_members_insert" ON "public"."org_members" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "org_members_select" ON "public"."org_members" FOR SELECT TO "authenticated" USING ("app"."is_org_member_of"("org_id"));



CREATE POLICY "org_members_update" ON "public"."org_members" FOR UPDATE TO "authenticated" USING ("app"."is_org_admin_of"("org_id")) WITH CHECK ("app"."is_org_admin_of"("org_id"));



ALTER TABLE "public"."org_metrics_daily" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_metrics_delete" ON "public"."org_metrics_daily" FOR DELETE TO "authenticated" USING ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "org_metrics_insert" ON "public"."org_metrics_daily" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "org_metrics_select" ON "public"."org_metrics_daily" FOR SELECT TO "authenticated" USING ("app"."is_org_member_of"("org_id"));



CREATE POLICY "org_metrics_update" ON "public"."org_metrics_daily" FOR UPDATE TO "authenticated" USING ("app"."is_org_admin_of"("org_id")) WITH CHECK ("app"."is_org_admin_of"("org_id"));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_anon_public_event_read" ON "public"."organizations" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."org_id" = "organizations"."id") AND ("e"."status" = 'published'::"public"."event_status") AND ("e"."visibility" = 'public'::"text") AND (("e"."publish_at" IS NULL) OR ("e"."publish_at" <= "now"())) AND (("e"."unpublish_at" IS NULL) OR ("e"."unpublish_at" > "now"()))))));



CREATE POLICY "organizations_select" ON "public"."organizations" FOR SELECT TO "authenticated" USING ("app"."is_org_member_of"("id"));



CREATE POLICY "organizations_update" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ("app"."is_org_admin_of"("id")) WITH CHECK ("app"."is_org_admin_of"("id"));



CREATE POLICY "own_payment_methods_delete" ON "public"."payment_methods" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "own_payment_methods_insert" ON "public"."payment_methods" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "own_payment_methods_select" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "own_payment_methods_update" ON "public"."payment_methods" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."payment_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_provider_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_provider_settings_no_client_access" ON "public"."payment_provider_settings" TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."payment_routing_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_routing_rules_delete" ON "public"."payment_routing_rules" FOR DELETE TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "payment_routing_rules_insert" ON "public"."payment_routing_rules" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_platform_admin"());



CREATE POLICY "payment_routing_rules_select" ON "public"."payment_routing_rules" FOR SELECT TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "payment_routing_rules_update" ON "public"."payment_routing_rules" FOR UPDATE TO "authenticated" USING ("app"."is_platform_admin"()) WITH CHECK ("app"."is_platform_admin"());



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND ("o"."buyer_id" = "app"."uid"())))));



ALTER TABLE "public"."payout_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payout_accounts_delete" ON "public"."payout_accounts" FOR DELETE TO "authenticated" USING ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "payout_accounts_insert" ON "public"."payout_accounts" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "payout_accounts_select" ON "public"."payout_accounts" FOR SELECT TO "authenticated" USING (("app"."is_org_admin_of"("org_id") OR "app"."is_org_finance_viewer"("org_id")));



CREATE POLICY "payout_accounts_update" ON "public"."payout_accounts" FOR UPDATE TO "authenticated" USING ("app"."is_org_admin_of"("org_id")) WITH CHECK ("app"."is_org_admin_of"("org_id"));



ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payouts_delete" ON "public"."payouts" FOR DELETE TO "authenticated" USING ("app"."is_org_admin_of"("org_id"));



ALTER TABLE "public"."physical_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "physical_credentials_delete" ON "public"."physical_credentials" FOR DELETE TO "authenticated" USING ("app"."is_platform_admin"());



CREATE POLICY "physical_credentials_insert" ON "public"."physical_credentials" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_platform_admin"());



CREATE POLICY "physical_credentials_select" ON "public"."physical_credentials" FOR SELECT TO "authenticated" USING ("app"."can_read_tapband_credential"("id"));



CREATE POLICY "physical_credentials_update" ON "public"."physical_credentials" FOR UPDATE TO "authenticated" USING ("app"."is_platform_admin"()) WITH CHECK ("app"."is_platform_admin"());



ALTER TABLE "public"."pos_shifts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pos_shifts_select" ON "public"."pos_shifts" FOR SELECT TO "authenticated" USING (("app"."is_claimed_account"() AND (("cashier_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "app"."is_org_manager"("org_id") OR "app"."is_org_finance_viewer"("org_id") OR "app"."is_platform_admin"())));



ALTER TABLE "public"."price_rule_redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "price_rule_redemptions_select" ON "public"."price_rule_redemptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."price_rules" "pr"
  WHERE (("pr"."id" = "price_rule_redemptions"."price_rule_id") AND "app"."is_org_manager"("pr"."org_id")))));



ALTER TABLE "public"."price_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "price_rules_delete" ON "public"."price_rules" FOR DELETE TO "authenticated" USING ("app"."is_org_manager"("org_id"));



CREATE POLICY "price_rules_select" ON "public"."price_rules" FOR SELECT TO "authenticated" USING ("app"."is_org_manager"("org_id"));



ALTER TABLE "public"."pricing_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pricing_plans_delete" ON "public"."pricing_plans" FOR DELETE TO "authenticated" USING ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "pricing_plans_insert" ON "public"."pricing_plans" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "pricing_plans_select" ON "public"."pricing_plans" FOR SELECT TO "authenticated" USING ("app"."is_org_member_of"("org_id"));



CREATE POLICY "pricing_plans_update" ON "public"."pricing_plans" FOR UPDATE TO "authenticated" USING ("app"."is_org_admin_of"("org_id")) WITH CHECK ("app"."is_org_admin_of"("org_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_anon_select" ON "public"."profiles" FOR SELECT USING ("public"."fn_profile_can_read"("user_id"));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



COMMENT ON POLICY "profiles_self_update" ON "public"."profiles" IS 'Users can update their own profile row. Phone is managed by the auth.users mirror trigger.';



ALTER TABLE "public"."provider_settlement_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_settlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_devices_select_own" ON "public"."push_devices" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_subscriptions_select_own" ON "public"."push_subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."refund_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "refund_items_owner_delete" ON "public"."refund_items" FOR DELETE TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "refund_items_owner_insert" ON "public"."refund_items" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "refund_items_owner_select" ON "public"."refund_items" FOR SELECT TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "refund_items_owner_update" ON "public"."refund_items" FOR UPDATE TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")) WITH CHECK ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



ALTER TABLE "public"."refunds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "refunds_delete" ON "public"."refunds" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."payments" "py"
     JOIN "public"."orders" "o" ON (("o"."id" = "py"."order_id")))
  WHERE (("py"."id" = "refunds"."payment_id") AND "app"."is_org_admin_of"("o"."org_id")))));



CREATE POLICY "refunds_insert" ON "public"."refunds" FOR INSERT TO "authenticated" WITH CHECK (("app"."is_claimed_account"() AND ("initiated_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'requested'::"public"."refund_status") AND ("processed_at" IS NULL) AND ("provider_ref" IS NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."payments" "py"
     JOIN "public"."orders" "o" ON (("o"."id" = "py"."order_id")))
  WHERE (("py"."id" = "refunds"."payment_id") AND (("o"."buyer_id" = ( SELECT "auth"."uid"() AS "uid")) OR "app"."is_org_finance_viewer"("o"."org_id") OR "app"."is_org_admin_of"("o"."org_id")))))));



CREATE POLICY "refunds_select" ON "public"."refunds" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."payments" "py"
     JOIN "public"."orders" "o" ON (("o"."id" = "py"."order_id")))
  WHERE (("py"."id" = "refunds"."payment_id") AND "app"."is_org_finance_viewer"("o"."org_id")))));



ALTER TABLE "public"."resale_listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scans_archive" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scans_insert" ON "public"."scans" FOR INSERT TO "authenticated" WITH CHECK (("app"."is_event_staff_of"("event_id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role", 'scanner'::"public"."app_role", 'organizer_scanner'::"public"."app_role"]) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "scans"."event_id") AND "app"."is_org_admin_of"("e"."org_id"))))));



CREATE POLICY "scans_select" ON "public"."scans" FOR SELECT TO "authenticated" USING (("app"."is_event_staff_of"("event_id", NULL::"public"."app_role"[]) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "scans"."event_id") AND "app"."is_org_member_of"("e"."org_id"))))));



ALTER TABLE "public"."seat_holds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seat_holds_delete" ON "public"."seat_holds" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "seat_holds"."event_id") AND "app"."is_org_manager"("e"."org_id")))));



ALTER TABLE "public"."seat_maps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seat_maps_select" ON "public"."seat_maps" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "seat_maps"."event_id") AND ("app"."is_org_manager"("e"."org_id") OR "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))));



CREATE POLICY "seat_maps_update" ON "public"."seat_maps" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "seat_maps"."event_id") AND ("app"."is_org_manager"("e"."org_id") OR "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "seat_maps"."event_id") AND ("app"."is_org_manager"("e"."org_id") OR "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))));



ALTER TABLE "public"."seat_reservations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seat_reservations_delete" ON "public"."seat_reservations" FOR DELETE TO "authenticated" USING (("user_id" = "app"."uid"()));



CREATE POLICY "seat_reservations_insert" ON "public"."seat_reservations" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "app"."uid"()));



CREATE POLICY "seat_reservations_select_anon" ON "public"."seat_reservations" FOR SELECT TO "anon" USING ((("user_id" = "app"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "seat_reservations"."event_id") AND "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))));



CREATE POLICY "seat_reservations_select_authenticated" ON "public"."seat_reservations" FOR SELECT TO "authenticated" USING ((("user_id" = "app"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "seat_reservations"."event_id") AND "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))));



CREATE POLICY "seat_reservations_update" ON "public"."seat_reservations" FOR UPDATE TO "authenticated" USING (("user_id" = "app"."uid"())) WITH CHECK (("user_id" = "app"."uid"()));



ALTER TABLE "public"."seats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seats_select" ON "public"."seats" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."seat_maps" "sm"
     JOIN "public"."events" "e" ON (("e"."id" = "sm"."event_id")))
  WHERE (("sm"."id" = "seats"."seat_map_id") AND ("app"."is_org_manager"("e"."org_id") OR "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))));



CREATE POLICY "seats_update" ON "public"."seats" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."seat_maps" "sm"
     JOIN "public"."events" "e" ON (("e"."id" = "sm"."event_id")))
  WHERE (("sm"."id" = "seats"."seat_map_id") AND ("app"."is_org_manager"("e"."org_id") OR "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."seat_maps" "sm"
     JOIN "public"."events" "e" ON (("e"."id" = "sm"."event_id")))
  WHERE (("sm"."id" = "seats"."seat_map_id") AND ("app"."is_org_manager"("e"."org_id") OR "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))));



CREATE POLICY "select_authenticated" ON "public"."payment_attempts" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payment_attempts"."order_id") AND ("o"."buyer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."org_members" "m" ON (("m"."org_id" = "o"."org_id")))
  WHERE (("o"."id" = "payment_attempts"."order_id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."series_follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tapband_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tapband_alerts_select" ON "public"."tapband_alerts" FOR SELECT TO "authenticated" USING (((("org_id" IS NOT NULL) AND "app"."is_org_manager"("org_id")) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_alerts"."event_id") AND "app"."is_org_manager"("e"."org_id"))))));



ALTER TABLE "public"."tapband_feature_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tapband_feature_configs_delete" ON "public"."tapband_feature_configs" FOR DELETE TO "authenticated" USING (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_admin_of"("org_id")) OR (("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_feature_configs"."event_id") AND "app"."is_org_admin_of"("e"."org_id")))))));



CREATE POLICY "tapband_feature_configs_insert" ON "public"."tapband_feature_configs" FOR INSERT TO "authenticated" WITH CHECK (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_admin_of"("org_id")) OR (("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_feature_configs"."event_id") AND "app"."is_org_admin_of"("e"."org_id")))))));



CREATE POLICY "tapband_feature_configs_select" ON "public"."tapband_feature_configs" FOR SELECT TO "authenticated" USING (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_manager"("org_id")) OR (("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_feature_configs"."event_id") AND "app"."is_org_manager"("e"."org_id")))))));



CREATE POLICY "tapband_feature_configs_update" ON "public"."tapband_feature_configs" FOR UPDATE TO "authenticated" USING (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_admin_of"("org_id")) OR (("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_feature_configs"."event_id") AND "app"."is_org_admin_of"("e"."org_id"))))))) WITH CHECK (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_admin_of"("org_id")) OR (("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_feature_configs"."event_id") AND "app"."is_org_admin_of"("e"."org_id")))))));



ALTER TABLE "public"."tapband_kill_switches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tapband_kill_switches_delete" ON "public"."tapband_kill_switches" FOR DELETE TO "authenticated" USING (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_admin_of"("org_id")) OR (("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_kill_switches"."event_id") AND "app"."is_org_admin_of"("e"."org_id")))))));



CREATE POLICY "tapband_kill_switches_insert" ON "public"."tapband_kill_switches" FOR INSERT TO "authenticated" WITH CHECK (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_admin_of"("org_id")) OR (("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_kill_switches"."event_id") AND "app"."is_org_admin_of"("e"."org_id")))))));



CREATE POLICY "tapband_kill_switches_select" ON "public"."tapband_kill_switches" FOR SELECT TO "authenticated" USING (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_manager"("org_id")) OR (("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_kill_switches"."event_id") AND "app"."is_org_manager"("e"."org_id")))))));



CREATE POLICY "tapband_kill_switches_update" ON "public"."tapband_kill_switches" FOR UPDATE TO "authenticated" USING (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_admin_of"("org_id")) OR (("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_kill_switches"."event_id") AND "app"."is_org_admin_of"("e"."org_id"))))))) WITH CHECK (("app"."is_platform_admin"() OR (("org_id" IS NOT NULL) AND "app"."is_org_admin_of"("org_id")) OR (("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_kill_switches"."event_id") AND "app"."is_org_admin_of"("e"."org_id")))))));



ALTER TABLE "public"."tapband_telemetry_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tapband_telemetry_events_select" ON "public"."tapband_telemetry_events" FOR SELECT TO "authenticated" USING (((("org_id" IS NOT NULL) AND "app"."is_org_manager"("org_id")) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "tapband_telemetry_events"."event_id") AND "app"."is_org_manager"("e"."org_id"))))));



ALTER TABLE "public"."ticket_type_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket_types_anon_select" ON "public"."ticket_types" FOR SELECT TO "anon" USING (("app"."is_event_public_now"("event_id") AND ("sales_status" = ANY (ARRAY['on_sale'::"public"."ticket_type_sales_status", 'paused'::"public"."ticket_type_sales_status", 'sold_out'::"public"."ticket_type_sales_status"]))));



CREATE POLICY "ticket_types_dashboard_user_select" ON "public"."ticket_types" FOR SELECT TO "dashboard_user" USING (((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "ticket_types"."event_id") AND ("e"."status" = 'published'::"public"."event_status") AND ("e"."visibility" = 'public'::"text") AND (("e"."publish_at" IS NULL) OR ("e"."publish_at" <= "now"())) AND (("e"."unpublish_at" IS NULL) OR ("e"."unpublish_at" >= "now"()))))) OR "app"."is_published"(( SELECT "e".*::"public"."events" AS "e"
   FROM "public"."events" "e"
  WHERE ("e"."id" = "ticket_types"."event_id"))) OR "public"."fn_event_is_public_now"("event_id") OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "ticket_types"."event_id") AND ("e"."org_id" IN ( SELECT "current_user_org_ids"."current_user_org_ids"
           FROM "public"."current_user_org_ids"() "current_user_org_ids"("current_user_org_ids"))))))));



CREATE POLICY "ticket_types_read_consolidated" ON "public"."ticket_types" FOR SELECT TO "authenticated" USING (("app"."is_event_public_now"("event_id") OR "app"."is_event_staff_of"("event_id", NULL::"public"."app_role"[]) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "ticket_types"."event_id") AND "app"."is_org_manager"("e"."org_id"))))));



CREATE POLICY "ticket_types_update_consolidated" ON "public"."ticket_types" FOR UPDATE TO "authenticated" USING ("public"."can_update_ticket_types_by_user"(( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"), "event_id"));



ALTER TABLE "public"."transfers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transfers_delete_admin" ON "public"."transfers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON (("oi"."order_id" = "o"."id")))
  WHERE (("oi"."id" = "transfers"."order_item_id") AND "app"."is_org_admin_of"("o"."org_id")))));



CREATE POLICY "transfers_select" ON "public"."transfers" FOR SELECT TO "authenticated" USING ((("from_user_id" = "app"."uid"()) OR ("to_user_id" = "app"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON (("oi"."order_id" = "o"."id")))
  WHERE (("oi"."id" = "transfers"."order_item_id") AND "app"."is_org_admin_of"("o"."org_id")))) OR (EXISTS ( SELECT 1
   FROM (("public"."order_items" "oi"
     JOIN "public"."ticket_types" "tt" ON (("tt"."id" = "oi"."ticket_type_id")))
     JOIN "public"."events" "e" ON (("e"."id" = "tt"."event_id")))
  WHERE (("oi"."id" = "transfers"."order_item_id") AND "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))));



ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_blocks_delete_blocker" ON "public"."user_blocks" FOR DELETE TO "authenticated" USING (("blocker_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_blocks_insert_blocker" ON "public"."user_blocks" FOR INSERT TO "authenticated" WITH CHECK (("blocker_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_blocks_select_parties" ON "public"."user_blocks" FOR SELECT TO "authenticated" USING ((("blocker_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("blocked_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."user_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_connections_delete_own" ON "public"."user_connections" FOR DELETE TO "authenticated" USING ((("requester_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("recipient_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "user_connections_insert_self" ON "public"."user_connections" FOR INSERT TO "authenticated" WITH CHECK ((("requester_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'pending'::"public"."connection_status")));



CREATE POLICY "user_connections_select_own" ON "public"."user_connections" FOR SELECT TO "authenticated" USING ((("requester_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("recipient_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "user_connections_update_authenticated" ON "public"."user_connections" FOR UPDATE TO "authenticated" USING ((((("requester_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("recipient_id" = ( SELECT "auth"."uid"() AS "uid"))) AND ("status" = 'accepted'::"public"."connection_status")) OR (("recipient_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'pending'::"public"."connection_status")))) WITH CHECK ((((("requester_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("recipient_id" = ( SELECT "auth"."uid"() AS "uid"))) AND ("status" = 'blocked'::"public"."connection_status")) OR (("recipient_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = ANY (ARRAY['accepted'::"public"."connection_status", 'declined'::"public"."connection_status", 'blocked'::"public"."connection_status"])))));



ALTER TABLE "public"."user_handles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_handles_delete_self" ON "public"."user_handles" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_handles_insert_self" ON "public"."user_handles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_handles_select_all" ON "public"."user_handles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "user_handles_update_self" ON "public"."user_handles" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_notification_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_notification_prefs_delete" ON "public"."user_notification_preferences" FOR DELETE TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "user_notification_prefs_insert" ON "public"."user_notification_preferences" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "user_notification_prefs_select" ON "public"."user_notification_preferences" FOR SELECT TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "user_notification_prefs_update" ON "public"."user_notification_preferences" FOR UPDATE TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id")) WITH CHECK ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "user_own_mutes" ON "public"."notification_mutes" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."user_privacy_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_privacy_settings_insert_self" ON "public"."user_privacy_settings" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "user_privacy_settings_select_authenticated" ON "public"."user_privacy_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "user_privacy_settings_update_self" ON "public"."user_privacy_settings" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."user_private_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_private_profiles_select_self" ON "public"."user_private_profiles" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_reports_insert_own" ON "public"."user_reports" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_reports_select_own" ON "public"."user_reports" FOR SELECT TO "authenticated" USING (("reporter_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."venues" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "venues_anon_public_event_read" ON "public"."venues" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."venue_id" = "venues"."id") AND ("e"."status" = 'published'::"public"."event_status") AND ("e"."visibility" = 'public'::"text") AND (("e"."publish_at" IS NULL) OR ("e"."publish_at" <= "now"())) AND (("e"."unpublish_at" IS NULL) OR ("e"."unpublish_at" > "now"()))))));



CREATE POLICY "venues_dashboard_user_select" ON "public"."venues" FOR SELECT TO "dashboard_user" USING (("app"."is_org_manager"("org_id") OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."venue_id" = "venues"."id") AND "public"."fn_event_is_public_now"("e"."id"))))));



CREATE POLICY "venues_select_authenticated" ON "public"."venues" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."venue_id" = "venues"."id") AND "public"."fn_event_is_public_now"("e"."id")))) OR "app"."is_org_manager"("org_id")));



CREATE POLICY "venues_update_authenticated" ON "public"."venues" FOR UPDATE TO "authenticated" USING ("app"."is_org_manager"("org_id")) WITH CHECK ("app"."is_org_manager"("org_id"));



ALTER TABLE "public"."waitlists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "waitlists_delete" ON "public"."waitlists" FOR DELETE TO "authenticated" USING ((("user_id" = "app"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "waitlists"."event_id") AND "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))));



CREATE POLICY "waitlists_insert" ON "public"."waitlists" FOR INSERT TO "authenticated" WITH CHECK ((("status" = 'active'::"text") OR (("app"."uid"() IS NOT NULL) AND (("user_id" = "app"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "waitlists"."event_id") AND "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))))));



CREATE POLICY "waitlists_select" ON "public"."waitlists" FOR SELECT TO "authenticated" USING ((("user_id" = "app"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "waitlists"."event_id") AND "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))));



CREATE POLICY "waitlists_update" ON "public"."waitlists" FOR UPDATE TO "authenticated" USING ((("user_id" = "app"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "waitlists"."event_id") AND "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"])))))) WITH CHECK ((("user_id" = "app"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "waitlists"."event_id") AND "app"."is_event_staff_of"("e"."id", ARRAY['organizer_admin'::"public"."app_role", 'organizer_staff'::"public"."app_role"]))))));



ALTER TABLE "public"."webhook_deliveries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_deliveries_select" ON "public"."webhook_deliveries" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."webhook_endpoints" "e"
  WHERE (("e"."id" = "webhook_deliveries"."endpoint_id") AND "app"."is_org_admin_of"("e"."org_id")))));



ALTER TABLE "public"."webhook_endpoints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_endpoints_delete" ON "public"."webhook_endpoints" FOR DELETE TO "authenticated" USING ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "webhook_endpoints_insert" ON "public"."webhook_endpoints" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "webhook_endpoints_select" ON "public"."webhook_endpoints" FOR SELECT TO "authenticated" USING ("app"."is_org_admin_of"("org_id"));



CREATE POLICY "webhook_endpoints_update" ON "public"."webhook_endpoints" FOR UPDATE TO "authenticated" USING ("app"."is_org_admin_of"("org_id")) WITH CHECK ("app"."is_org_admin_of"("org_id"));



ALTER TABLE "public"."webhooks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhooks_org_read" ON "public"."webhooks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE ("m"."user_id" = "app"."uid"()))));



GRANT USAGE ON SCHEMA "_internal" TO "service_role";



GRANT USAGE ON SCHEMA "app" TO "authenticated";
GRANT USAGE ON SCHEMA "app" TO "anon";



GRANT USAGE ON SCHEMA "private" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "app"."can_administer_tapband_event"("p_event" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."can_administer_tapband_event"("p_event" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."can_delete_event"("event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."can_delete_event"("event_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."can_manage_guestlist_entry"("p_event" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."can_manage_guestlist_entry"("p_event" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."can_read_tapband_credential"("p_credential" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."can_read_tapband_credential"("p_credential" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."can_read_tapband_entitlement"("p_entitlement" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."can_read_tapband_entitlement"("p_entitlement" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."can_read_tapband_event"("p_event" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."can_read_tapband_event"("p_event" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."can_read_tapband_inventory"("p_inventory" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."can_read_tapband_inventory"("p_inventory" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."can_read_tapband_order_item"("p_order_item" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."can_read_tapband_order_item"("p_order_item" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."can_read_tapband_tap"("p_tap" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."can_read_tapband_tap"("p_tap" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."can_record_tapband_event_tap"("p_event" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."can_record_tapband_event_tap"("p_event" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."fn_purchase_items"("p_buyer" "uuid", "p_ticket_type" "uuid", "p_qty" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."fn_purchase_items"("p_buyer" "uuid", "p_ticket_type" "uuid", "p_qty" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "app"."fn_revoke_item"("p_order_item" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."fn_revoke_item"("p_order_item" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."is_claimed_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."is_claimed_account"() TO "authenticated";
GRANT ALL ON FUNCTION "app"."is_claimed_account"() TO "service_role";



REVOKE ALL ON FUNCTION "app"."is_event_staff_of"("p_event" "uuid", "p_roles" "public"."app_role"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."is_event_staff_of"("p_event" "uuid", "p_roles" "public"."app_role"[]) TO "authenticated";
GRANT ALL ON FUNCTION "app"."is_event_staff_of"("p_event" "uuid", "p_roles" "public"."app_role"[]) TO "anon";
GRANT ALL ON FUNCTION "app"."is_event_staff_of"("p_event" "uuid", "p_roles" "public"."app_role"[]) TO "dashboard_user";



REVOKE ALL ON FUNCTION "app"."is_org_admin_of"("p_org" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."is_org_admin_of"("p_org" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "app"."is_org_admin_of"("p_org" "uuid") TO "anon";
GRANT ALL ON FUNCTION "app"."is_org_admin_of"("p_org" "uuid") TO "dashboard_user";



REVOKE ALL ON FUNCTION "app"."is_org_finance_viewer"("p_org" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."is_org_finance_viewer"("p_org" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "app"."is_org_finance_viewer"("p_org" "uuid") TO "anon";
GRANT ALL ON FUNCTION "app"."is_org_finance_viewer"("p_org" "uuid") TO "dashboard_user";



REVOKE ALL ON FUNCTION "app"."is_org_manager"("p_org" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."is_org_manager"("p_org" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "app"."is_org_manager"("p_org" "uuid") TO "anon";
GRANT ALL ON FUNCTION "app"."is_org_manager"("p_org" "uuid") TO "dashboard_user";



REVOKE ALL ON FUNCTION "app"."is_org_member_of"("p_org" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."is_org_member_of"("p_org" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "app"."is_org_member_of"("p_org" "uuid") TO "anon";
GRANT ALL ON FUNCTION "app"."is_org_member_of"("p_org" "uuid") TO "dashboard_user";



REVOKE ALL ON FUNCTION "app"."is_org_owner"("p_org" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."is_org_owner"("p_org" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "app"."is_org_owner"("p_org" "uuid") TO "anon";
GRANT ALL ON FUNCTION "app"."is_org_owner"("p_org" "uuid") TO "dashboard_user";



REVOKE ALL ON FUNCTION "app"."is_platform_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."is_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "app"."is_platform_admin"() TO "dashboard_user";
GRANT ALL ON FUNCTION "app"."is_platform_admin"() TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



REVOKE ALL ON FUNCTION "app"."org_has_role"("p_org" "uuid", "p_roles" "public"."app_role"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."org_has_role"("p_org" "uuid", "p_roles" "public"."app_role"[]) TO "authenticated";
GRANT ALL ON FUNCTION "app"."org_has_role"("p_org" "uuid", "p_roles" "public"."app_role"[]) TO "anon";
GRANT ALL ON FUNCTION "app"."org_has_role"("p_org" "uuid", "p_roles" "public"."app_role"[]) TO "dashboard_user";



REVOKE ALL ON FUNCTION "app"."recompute_order_totals"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."require_claimed_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."require_claimed_account"() TO "authenticated";
GRANT ALL ON FUNCTION "app"."require_claimed_account"() TO "service_role";



REVOKE ALL ON FUNCTION "app"."ticket_order_context"("p_order_item_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."ticket_order_context"("p_order_item_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."uid"() FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."uid"() TO "authenticated";
GRANT ALL ON FUNCTION "app"."uid"() TO "anon";
GRANT ALL ON FUNCTION "app"."uid"() TO "dashboard_user";



REVOKE ALL ON FUNCTION "app"."validate_scan_org"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."admin_create_pricing_plan_version"("p_org_id" "uuid", "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_fee_cents" integer, "p_currency" "text", "p_actor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_create_pricing_plan_version"("p_org_id" "uuid", "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_fee_cents" integer, "p_currency" "text", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_pricing_plan_version"("p_org_id" "uuid", "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_fee_cents" integer, "p_currency" "text", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_pricing_plan_version"("p_org_id" "uuid", "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_fee_cents" integer, "p_currency" "text", "p_actor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_log_action"("p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "text", "p_action" "public"."audit_action", "p_changes" "jsonb", "p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_log_action"("p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "text", "p_action" "public"."audit_action", "p_changes" "jsonb", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_log_action"("p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "text", "p_action" "public"."audit_action", "p_changes" "jsonb", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_log_action"("p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "text", "p_action" "public"."audit_action", "p_changes" "jsonb", "p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_reencrypt_payout_account"("p_account_id" "uuid", "p_expected_sha256" "text", "p_encrypted_details" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_reencrypt_payout_account"("p_account_id" "uuid", "p_expected_sha256" "text", "p_encrypted_details" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_reencrypt_payout_account"("p_account_id" "uuid", "p_expected_sha256" "text", "p_encrypted_details" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_reencrypt_payout_account"("p_account_id" "uuid", "p_expected_sha256" "text", "p_encrypted_details" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."app_audit_if_table_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."app_audit_if_table_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_audit_if_table_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."attach_app_audit"("table_schema" "text", "table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."attach_app_audit"("table_schema" "text", "table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."attach_app_audit"("table_schema" "text", "table_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_event"("p_event_id" "uuid", "p_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_event"("p_event_id" "uuid", "p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_event"("p_event_id" "uuid", "p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_event"("p_event_id" "uuid", "p_user" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_org"("p_org_id" "uuid", "p_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_org"("p_org_id" "uuid", "p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_org"("p_org_id" "uuid", "p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_org"("p_org_id" "uuid", "p_user" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_update_ticket_types_by_user"("p_user" "uuid", "p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_update_ticket_types_by_user"("p_user" "uuid", "p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_update_ticket_types_by_user"("p_user" "uuid", "p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_update_ticket_types_by_user"("p_user" "uuid", "p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_order_payment_status"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."compute_order_payment_status"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_order_payment_status"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_event_draft"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_event_draft"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_event_draft"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_event_draft"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_event_draft_unchecked"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_event_draft_unchecked"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_event_draft_unchecked"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_event_draft_unchecked"("p_org_id" "uuid", "p_title" "text", "p_visibility" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_org_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_org_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_org_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_org_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_uid"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_uid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_uid"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_order_currency_matches_pricing"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_order_currency_matches_pricing"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_order_currency_matches_pricing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_order_currency_matches_pricing"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_pricing_plan_org_cohesion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_pricing_plan_org_cohesion"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_pricing_plan_org_cohesion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_pricing_plan_org_cohesion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_event_metrics_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_event_metrics_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_event_metrics_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_event_staff_in_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_event_staff_in_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_event_staff_in_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_transfer_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_transfer_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_transfer_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."event_series_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."event_series_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_series_set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_accept_membership_invite"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_accept_membership_invite"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_accept_membership_invite"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_accept_membership_invite"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_accept_membership_invite_unchecked"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_accept_membership_invite_unchecked"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_accept_membership_invite_unchecked"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_accept_membership_invite_unchecked"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_admin_schedule_webhook_dispatch"("p_function_url" "text", "p_anon_jwt" "text", "p_schedule" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_admin_schedule_webhook_dispatch"("p_function_url" "text", "p_anon_jwt" "text", "p_schedule" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_admin_schedule_webhook_dispatch"("p_function_url" "text", "p_anon_jwt" "text", "p_schedule" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_admin_schedule_webhook_dispatch"("p_function_url" "text", "p_anon_jwt" "text", "p_schedule" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_anon_users_to_delete"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_anon_users_to_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_anon_users_to_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_anon_users_to_delete"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_apply_pricing_to_order"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_apply_pricing_to_order"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_apply_pricing_to_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_apply_pricing_to_order"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_apply_promo_code_to_order"("p_order_id" "uuid", "p_code" "text", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_apply_promo_code_to_order"("p_order_id" "uuid", "p_code" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_apply_promo_code_to_order"("p_order_id" "uuid", "p_code" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_apply_promo_code_to_order"("p_order_id" "uuid", "p_code" "text", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_archive_audit_log"("p_retention" interval, "p_batch_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_archive_audit_log"("p_retention" interval, "p_batch_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_archive_audit_log"("p_retention" interval, "p_batch_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_archive_audit_log"("p_retention" interval, "p_batch_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_archive_scans"("p_retention" interval, "p_batch_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_archive_scans"("p_retention" interval, "p_batch_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_archive_scans"("p_retention" interval, "p_batch_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_archive_scans"("p_retention" interval, "p_batch_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_array_has_dups"("anyarray") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_array_has_dups"("anyarray") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_array_has_dups"("anyarray") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_array_has_dups"("anyarray") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_backfill_event_live_stats"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_backfill_event_live_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_backfill_event_live_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_backfill_event_live_stats"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_bootstrap_ticketiv_user"("p_user_id" "uuid", "p_email" "text", "p_phone" "text", "p_display_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_bootstrap_ticketiv_user"("p_user_id" "uuid", "p_email" "text", "p_phone" "text", "p_display_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_bootstrap_ticketiv_user"("p_user_id" "uuid", "p_email" "text", "p_phone" "text", "p_display_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_bootstrap_ticketiv_user"("p_user_id" "uuid", "p_email" "text", "p_phone" "text", "p_display_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_bulk_check_in"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_bulk_check_in"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_bulk_check_in"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_bulk_check_in"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_bulk_check_in_unchecked"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_bulk_check_in_unchecked"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_bulk_check_in_unchecked"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_bulk_check_in_unchecked"("p_order_item_ids" "uuid"[], "p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_cancel_event_invitation"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_cancel_event_invitation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_cancel_event_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_cancel_event_invitation"("p_invitation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_cancel_transfer"("p_transfer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_cancel_transfer"("p_transfer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_cancel_transfer"("p_transfer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_cancel_transfer"("p_transfer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_check_in"("p_scan_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_scan_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_scan_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_scan_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_check_in"("p_order_item_id" "uuid", "p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_order_item_id" "uuid", "p_device_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_order_item_id" "uuid", "p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_order_item_id" "uuid", "p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_device_id" "uuid", "p_gate" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_device_id" "uuid", "p_gate" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_device_id" "uuid", "p_gate" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_device_id" "uuid", "p_gate" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_event_id" "uuid", "p_device_id" "uuid", "p_gate" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_event_id" "uuid", "p_device_id" "uuid", "p_gate" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_event_id" "uuid", "p_device_id" "uuid", "p_gate" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_check_in"("p_ticket_code" "text", "p_event_id" "uuid", "p_device_id" "uuid", "p_gate" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_check_reserved_handle"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_check_reserved_handle"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_check_reserved_handle"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_claim_email_broadcast"("p_org_id" "uuid", "p_event_id" "uuid", "p_recipient_count" integer, "p_audience" "text", "p_subject" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_claim_email_broadcast"("p_org_id" "uuid", "p_event_id" "uuid", "p_recipient_count" integer, "p_audience" "text", "p_subject" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_claim_email_broadcast"("p_org_id" "uuid", "p_event_id" "uuid", "p_recipient_count" integer, "p_audience" "text", "p_subject" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_claim_email_broadcast"("p_org_id" "uuid", "p_event_id" "uuid", "p_recipient_count" integer, "p_audience" "text", "p_subject" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_claim_guest_orders"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_claim_guest_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_claim_guest_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_claim_guest_orders"() TO "service_role";



GRANT ALL ON TABLE "public"."payment_outbox" TO "anon";
GRANT ALL ON TABLE "public"."payment_outbox" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_outbox" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_claim_payment_outbox"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_claim_payment_outbox"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_claim_payment_outbox"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_claim_payment_outbox"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_cleanup_anon_users"("p_dry_run" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_cleanup_anon_users"("p_dry_run" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_cleanup_anon_users"("p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_cleanup_anon_users"("p_dry_run" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_cleanup_anonymous_users"("p_dry_run" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_cleanup_anonymous_users"("p_dry_run" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_cleanup_anonymous_users"("p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_cleanup_anonymous_users"("p_dry_run" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_close_pos_shift"("p_shift_id" "uuid", "p_closing_cash_cents" integer, "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_close_pos_shift"("p_shift_id" "uuid", "p_closing_cash_cents" integer, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_close_pos_shift"("p_shift_id" "uuid", "p_closing_cash_cents" integer, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_close_pos_shift"("p_shift_id" "uuid", "p_closing_cash_cents" integer, "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_complete_order_payment"("p_order_id" "uuid", "p_provider" "text", "p_ext_payment_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_complete_order_payment"("p_order_id" "uuid", "p_provider" "text", "p_ext_payment_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_complete_order_payment"("p_order_id" "uuid", "p_provider" "text", "p_ext_payment_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_complete_order_payment"("p_order_id" "uuid", "p_provider" "text", "p_ext_payment_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_complete_organizer_signup"("p_first_name" "text", "p_surname" "text", "p_phone" "text", "p_id_number" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_complete_organizer_signup"("p_first_name" "text", "p_surname" "text", "p_phone" "text", "p_id_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_complete_organizer_signup"("p_first_name" "text", "p_surname" "text", "p_phone" "text", "p_id_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_complete_organizer_signup"("p_first_name" "text", "p_surname" "text", "p_phone" "text", "p_id_number" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_complete_resale_after_payment"("p_listing_id" "uuid", "p_payment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_complete_resale_after_payment"("p_listing_id" "uuid", "p_payment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_complete_resale_after_payment"("p_listing_id" "uuid", "p_payment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_complete_resale_after_payment"("p_listing_id" "uuid", "p_payment_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_complete_resale_after_payment_webhook"("p_payment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_complete_resale_after_payment_webhook"("p_payment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_complete_resale_after_payment_webhook"("p_payment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_complete_resale_after_payment_webhook"("p_payment_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_complete_transfer"("p_transfer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_complete_transfer"("p_transfer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_complete_transfer"("p_transfer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_complete_transfer"("p_transfer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_complete_transfer_unchecked"("p_transfer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_complete_transfer_unchecked"("p_transfer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_complete_transfer_unchecked"("p_transfer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_complete_transfer_unchecked"("p_transfer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_complete_waitlist_after_payment"("p_waitlist_id" "uuid", "p_payment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_complete_waitlist_after_payment"("p_waitlist_id" "uuid", "p_payment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_complete_waitlist_after_payment"("p_waitlist_id" "uuid", "p_payment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_complete_waitlist_after_payment"("p_waitlist_id" "uuid", "p_payment_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_complete_waitlist_after_payment_webhook"("p_payment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_complete_waitlist_after_payment_webhook"("p_payment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_complete_waitlist_after_payment_webhook"("p_payment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_complete_waitlist_after_payment_webhook"("p_payment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_compute_order_money"("p_subtotal_cents" integer, "p_adjustments_cents" integer, "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_cents" integer, "p_max_platform_cents" integer, "p_fees_paid_by" "public"."fee_payer") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_compute_order_money"("p_subtotal_cents" integer, "p_adjustments_cents" integer, "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_cents" integer, "p_max_platform_cents" integer, "p_fees_paid_by" "public"."fee_payer") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_compute_order_money"("p_subtotal_cents" integer, "p_adjustments_cents" integer, "p_platform_percent_bps" integer, "p_processor_percent_bps" integer, "p_processor_fixed_cents" integer, "p_min_platform_cents" integer, "p_max_platform_cents" integer, "p_fees_paid_by" "public"."fee_payer") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_contact_phone_key"("p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_contact_phone_key"("p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_contact_phone_key"("p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_contact_phone_key"("p_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_inventory_protected_order"("p_event_id" "uuid", "p_buyer_id" "uuid", "p_buyer_email" "text", "p_items" "jsonb", "p_holder_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_inventory_protected_order"("p_event_id" "uuid", "p_buyer_id" "uuid", "p_buyer_email" "text", "p_items" "jsonb", "p_holder_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_inventory_protected_order"("p_event_id" "uuid", "p_buyer_id" "uuid", "p_buyer_email" "text", "p_items" "jsonb", "p_holder_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_inventory_protected_order"("p_event_id" "uuid", "p_buyer_id" "uuid", "p_buyer_email" "text", "p_items" "jsonb", "p_holder_name" "text") TO "service_role";



GRANT ALL ON TABLE "public"."membership_invites" TO "anon";
GRANT ALL ON TABLE "public"."membership_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_invites" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_membership_invite"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid", "p_invited_email" "text", "p_expires_in" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_membership_invite"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid", "p_invited_email" "text", "p_expires_in" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_membership_invite"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid", "p_invited_email" "text", "p_expires_in" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_membership_invite"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid", "p_invited_email" "text", "p_expires_in" interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_membership_invite_unchecked"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid", "p_invited_email" "text", "p_expires_in" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_membership_invite_unchecked"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid", "p_invited_email" "text", "p_expires_in" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_membership_invite_unchecked"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid", "p_invited_email" "text", "p_expires_in" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_membership_invite_unchecked"("p_org_id" "uuid", "p_kind" "text", "p_role" "public"."app_role", "p_event_id" "uuid", "p_invited_email" "text", "p_expires_in" interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_organization"("p_name" "text", "p_currency" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_organization"("p_name" "text", "p_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_organization"("p_name" "text", "p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_organization"("p_name" "text", "p_currency" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_organization_unchecked"("p_name" "text", "p_currency" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_organization_unchecked"("p_name" "text", "p_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_organization_unchecked"("p_name" "text", "p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_organization_unchecked"("p_name" "text", "p_currency" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_resale_checkout_order"("p_listing_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_resale_checkout_order"("p_listing_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_resale_checkout_order"("p_listing_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_resale_checkout_order"("p_listing_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer, "p_ticket_type_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer, "p_ticket_type_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer, "p_ticket_type_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_seat_hold"("p_event_id" "uuid", "p_quantity" integer, "p_ticket_type_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_talent_profile"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_talent_profile"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_talent_profile"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_talent_profile"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_talent_profile_unchecked"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_talent_profile_unchecked"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_talent_profile_unchecked"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_talent_profile_unchecked"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_waitlist_checkout_order"("p_waitlist_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_waitlist_checkout_order"("p_waitlist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_waitlist_checkout_order"("p_waitlist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_waitlist_checkout_order"("p_waitlist_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_db_slow_queries"("p_limit" integer, "p_min_mean_ms" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_db_slow_queries"("p_limit" integer, "p_min_mean_ms" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_db_slow_queries"("p_limit" integer, "p_min_mean_ms" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_db_slow_queries"("p_limit" integer, "p_min_mean_ms" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_deactivate_payment_method"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_deactivate_payment_method"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_deactivate_payment_method"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_deactivate_payment_method"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_deactivate_payment_method_unchecked"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_deactivate_payment_method_unchecked"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_deactivate_payment_method_unchecked"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_deactivate_payment_method_unchecked"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_decline_transfer"("p_transfer_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_decline_transfer"("p_transfer_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_decline_transfer"("p_transfer_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_decline_transfer"("p_transfer_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_delete_account_for_user"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_delete_account_for_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_delete_account_for_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_delete_account_for_user"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_delete_organization"("p_org_id" "uuid", "p_confirm_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_delete_organization"("p_org_id" "uuid", "p_confirm_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_delete_organization"("p_org_id" "uuid", "p_confirm_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_delete_organization"("p_org_id" "uuid", "p_confirm_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_delete_organization_unchecked"("p_org_id" "uuid", "p_confirm_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_delete_organization_unchecked"("p_org_id" "uuid", "p_confirm_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_delete_organization_unchecked"("p_org_id" "uuid", "p_confirm_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_delete_organization_unchecked"("p_org_id" "uuid", "p_confirm_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_detect_oversold_ticket_types"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_detect_oversold_ticket_types"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_detect_oversold_ticket_types"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_detect_oversold_ticket_types"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_devices_require_event_for_scanner"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_devices_require_event_for_scanner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_devices_require_event_for_scanner"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_disable_push_device_token"("p_service" "text", "p_token" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_disable_push_device_token"("p_service" "text", "p_token" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_disable_push_device_token"("p_service" "text", "p_token" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_disable_push_device_token"("p_service" "text", "p_token" "text", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_dismiss_event_invitation"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_dismiss_event_invitation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_dismiss_event_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_dismiss_event_invitation"("p_invitation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_dispute_counts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_dispute_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_dispute_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_dispute_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_disputes_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_disputes_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_disputes_touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_duplicate_event"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_duplicate_event"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_duplicate_event"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_duplicate_event"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_duplicate_event_unchecked"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_duplicate_event_unchecked"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_duplicate_event_unchecked"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_duplicate_event_unchecked"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."device_sessions" TO "anon";
GRANT ALL ON TABLE "public"."device_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."device_sessions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_end_device_session"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_end_device_session"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_end_device_session"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_end_device_session"("p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_enqueue_webhook"("p_event_type" "text", "p_payload" "jsonb", "p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_enqueue_webhook"("p_event_type" "text", "p_payload" "jsonb", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_enqueue_webhook"("p_event_type" "text", "p_payload" "jsonb", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_enqueue_webhook"("p_event_type" "text", "p_payload" "jsonb", "p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_event_artists_refresh_event_search"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_event_artists_refresh_event_search"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_event_artists_refresh_event_search"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_event_artists_refresh_event_search"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_event_category_slug_exists"("p_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_event_category_slug_exists"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_event_category_slug_exists"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_event_category_slug_exists"("p_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_event_friend_signals"("p_event_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_event_friend_signals"("p_event_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_event_friend_signals"("p_event_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_event_friend_signals"("p_event_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_event_invite_candidates"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_event_invite_candidates"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_event_invite_candidates"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_event_invite_candidates"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_event_is_public_now"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_event_is_public_now"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_event_is_public_now"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_event_sales_public"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_event_sales_public"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_event_sales_public"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_event_sales_public"() TO "service_role";
GRANT ALL ON FUNCTION "public"."fn_event_sales_public"() TO "organiser";



REVOKE ALL ON FUNCTION "public"."fn_events_refresh_search"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_events_refresh_search"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_events_refresh_search"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_events_refresh_search"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_expire_stale_checkout_holds"("p_grace" interval, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_expire_stale_checkout_holds"("p_grace" interval, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_expire_stale_checkout_holds"("p_grace" interval, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_expire_stale_checkout_holds"("p_grace" interval, "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_export_rpc_permissions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_export_rpc_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_export_rpc_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_export_rpc_permissions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_feature_flags_touch_last_changed"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_feature_flags_touch_last_changed"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_feature_flags_touch_last_changed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_feature_flags_touch_last_changed"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_finalize_email_broadcast"("p_notification_id" "uuid", "p_sent_count" integer, "p_failed_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_finalize_email_broadcast"("p_notification_id" "uuid", "p_sent_count" integer, "p_failed_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_finalize_email_broadcast"("p_notification_id" "uuid", "p_sent_count" integer, "p_failed_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_finalize_email_broadcast"("p_notification_id" "uuid", "p_sent_count" integer, "p_failed_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_find_claimable_guest_orders"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_find_claimable_guest_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_find_claimable_guest_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_find_claimable_guest_orders"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_friend_block"("p_handle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_friend_block"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_friend_block"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_friend_block"("p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_friend_cancel"("p_handle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_friend_cancel"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_friend_cancel"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_friend_cancel"("p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_friend_request"("p_handle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_friend_request"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_friend_request"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_friend_request"("p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_friend_respond"("p_handle" "text", "p_accept" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_friend_respond"("p_handle" "text", "p_accept" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_friend_respond"("p_handle" "text", "p_accept" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_friend_respond"("p_handle" "text", "p_accept" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_friend_unblock"("p_handle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_friend_unblock"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_friend_unblock"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_friend_unblock"("p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_friend_unfriend"("p_handle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_friend_unfriend"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_friend_unfriend"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_friend_unfriend"("p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_account_deletion_status_for_user"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_account_deletion_status_for_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_account_deletion_status_for_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_account_deletion_status_for_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_effective_payment_providers"("p_org_id" "uuid", "p_event_id" "uuid", "p_ticket_type_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_effective_payment_providers"("p_org_id" "uuid", "p_event_id" "uuid", "p_ticket_type_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_effective_payment_providers"("p_org_id" "uuid", "p_event_id" "uuid", "p_ticket_type_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_my_account_deletion_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_my_account_deletion_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_account_deletion_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_account_deletion_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_my_notification_mutes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_my_notification_mutes"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_notification_mutes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_notification_mutes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_my_order_totals"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_my_order_totals"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_order_totals"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_order_totals"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_my_order_totals_json"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_my_order_totals_json"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_order_totals_json"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_order_totals_json"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_my_ticketiv_roles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_my_ticketiv_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_ticketiv_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_ticketiv_roles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_or_create_artist"("p_name" "text", "p_bio" "text", "p_image_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_or_create_artist"("p_name" "text", "p_bio" "text", "p_image_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_or_create_artist"("p_name" "text", "p_bio" "text", "p_image_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_or_create_artist"("p_name" "text", "p_bio" "text", "p_image_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_or_create_venue"("p_name" "text", "p_city" "text", "p_address" "text", "p_tz" "text", "p_capacity" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_or_create_venue"("p_name" "text", "p_city" "text", "p_address" "text", "p_tz" "text", "p_capacity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_or_create_venue"("p_name" "text", "p_city" "text", "p_address" "text", "p_tz" "text", "p_capacity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_or_create_venue"("p_name" "text", "p_city" "text", "p_address" "text", "p_tz" "text", "p_capacity" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_get_ticketiv_effective_roles"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_get_ticketiv_effective_roles"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_ticketiv_effective_roles"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_ticketiv_effective_roles"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_invite_friends_to_event"("p_event_id" "uuid", "p_handles" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_invite_friends_to_event"("p_event_id" "uuid", "p_handles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_invite_friends_to_event"("p_event_id" "uuid", "p_handles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_invite_friends_to_event"("p_event_id" "uuid", "p_handles" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_is_event_scanner"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_is_event_scanner"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_is_event_scanner"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_is_event_staff"("p_event_id" "uuid", "p_min_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_is_event_staff"("p_event_id" "uuid", "p_min_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_is_event_staff"("p_event_id" "uuid", "p_min_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_issue_guestlist"("p_guestlist_entry_id" "uuid", "p_allocate" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_issue_guestlist"("p_guestlist_entry_id" "uuid", "p_allocate" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_issue_guestlist"("p_guestlist_entry_id" "uuid", "p_allocate" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_issue_guestlist"("p_guestlist_entry_id" "uuid", "p_allocate" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_issue_guestlist_unchecked"("p_guestlist_entry_id" "uuid", "p_allocate" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_issue_guestlist_unchecked"("p_guestlist_entry_id" "uuid", "p_allocate" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_issue_guestlist_unchecked"("p_guestlist_entry_id" "uuid", "p_allocate" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_issue_guestlist_unchecked"("p_guestlist_entry_id" "uuid", "p_allocate" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_link_event_artist_by_name"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text", "p_bio" "text", "p_image_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_link_event_artist_by_name"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text", "p_bio" "text", "p_image_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_link_event_artist_by_name"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text", "p_bio" "text", "p_image_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_link_event_artist_by_name"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text", "p_bio" "text", "p_image_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_link_event_artist_by_name_unchecked"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text", "p_bio" "text", "p_image_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_link_event_artist_by_name_unchecked"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text", "p_bio" "text", "p_image_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_link_event_artist_by_name_unchecked"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text", "p_bio" "text", "p_image_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_link_event_artist_by_name_unchecked"("p_event_id" "uuid", "p_artist_name" "text", "p_role" "text", "p_bio" "text", "p_image_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_list_my_order_totals"("limit_rows" integer, "offset_rows" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_list_my_order_totals"("limit_rows" integer, "offset_rows" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_list_my_order_totals"("limit_rows" integer, "offset_rows" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_list_my_order_totals"("limit_rows" integer, "offset_rows" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_lookup_transfer_recipient"("p_identifier" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_lookup_transfer_recipient"("p_identifier" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_lookup_transfer_recipient"("p_identifier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_lookup_transfer_recipient"("p_identifier" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_match_friend_contacts"("p_phones" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_match_friend_contacts"("p_phones" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_match_friend_contacts"("p_phones" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_match_friend_contacts"("p_phones" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_mint_tickets"("p_order_item_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_mint_tickets"("p_order_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_mint_tickets"("p_order_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_mint_tickets"("p_order_item_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_my_friends_going"("p_event_ids" "uuid"[], "p_from" timestamp with time zone, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_my_friends_going"("p_event_ids" "uuid"[], "p_from" timestamp with time zone, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_my_friends_going"("p_event_ids" "uuid"[], "p_from" timestamp with time zone, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_my_friends_going"("p_event_ids" "uuid"[], "p_from" timestamp with time zone, "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_my_waitlist_positions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_my_waitlist_positions"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_my_waitlist_positions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_my_waitlist_positions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_normalize_email"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_normalize_email"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_normalize_email"("p" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_normalize_phone"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_normalize_phone"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_normalize_phone"("p" "text") TO "service_role";



GRANT ALL ON TABLE "public"."disputes" TO "anon";
GRANT ALL ON TABLE "public"."disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."disputes" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_open_dispute"("p_kind" "public"."dispute_kind", "p_order_id" "uuid", "p_payment_id" "uuid", "p_reason" "text", "p_amount_cents" integer, "p_raised_by" "uuid", "p_dedupe_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_open_dispute"("p_kind" "public"."dispute_kind", "p_order_id" "uuid", "p_payment_id" "uuid", "p_reason" "text", "p_amount_cents" integer, "p_raised_by" "uuid", "p_dedupe_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_open_dispute"("p_kind" "public"."dispute_kind", "p_order_id" "uuid", "p_payment_id" "uuid", "p_reason" "text", "p_amount_cents" integer, "p_raised_by" "uuid", "p_dedupe_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_open_dispute"("p_kind" "public"."dispute_kind", "p_order_id" "uuid", "p_payment_id" "uuid", "p_reason" "text", "p_amount_cents" integer, "p_raised_by" "uuid", "p_dedupe_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."pos_shifts" TO "anon";
GRANT ALL ON TABLE "public"."pos_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_shifts" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_open_pos_shift"("p_org_id" "uuid", "p_device_id" "uuid", "p_device_session_id" "uuid", "p_opening_cash_cents" integer, "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_open_pos_shift"("p_org_id" "uuid", "p_device_id" "uuid", "p_device_session_id" "uuid", "p_opening_cash_cents" integer, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_open_pos_shift"("p_org_id" "uuid", "p_device_id" "uuid", "p_device_session_id" "uuid", "p_opening_cash_cents" integer, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_open_pos_shift"("p_org_id" "uuid", "p_device_id" "uuid", "p_device_session_id" "uuid", "p_opening_cash_cents" integer, "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_ops_alerts_tick"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_ops_alerts_tick"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ops_alerts_tick"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ops_alerts_tick"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_ops_reconciliation_counts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_ops_reconciliation_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ops_reconciliation_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ops_reconciliation_counts"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_org_finance_summary"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_org_finance_summary"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_org_finance_summary"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_org_finance_summary"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_org_finance_summary_unchecked"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_org_finance_summary_unchecked"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_org_finance_summary_unchecked"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_org_finance_summary_unchecked"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_payment_routing_rules_touch_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_payment_routing_rules_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_payment_routing_rules_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_payment_routing_rules_touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_pos_charge"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_pos_charge"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_pos_charge"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_pos_charge"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_pos_charge_unchecked"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_pos_charge_unchecked"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_pos_charge_unchecked"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_pos_charge_unchecked"("p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_pos_charge_with_shift"("p_shift_id" "uuid", "p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_pos_charge_with_shift"("p_shift_id" "uuid", "p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_pos_charge_with_shift"("p_shift_id" "uuid", "p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_pos_charge_with_shift"("p_shift_id" "uuid", "p_event_id" "uuid", "p_items" "jsonb", "p_payment_method" "text", "p_buyer_name" "text", "p_buyer_email" "text", "p_buyer_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_pos_receipt"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_pos_receipt"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_pos_receipt"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_pos_receipt"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_pos_shift_summary"("p_shift_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_pos_shift_summary"("p_shift_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_pos_shift_summary"("p_shift_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_pos_shift_summary"("p_shift_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_pos_shift_transactions"("p_shift_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_pos_shift_transactions"("p_shift_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_pos_shift_transactions"("p_shift_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_pos_shift_transactions"("p_shift_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_prepare_credential_entitlement"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_prepare_credential_entitlement"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_prepare_credential_entitlement"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_preview_pricing"("p_org_id" "uuid", "p_ticket_type_ids" "uuid"[], "p_quantities" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_preview_pricing"("p_org_id" "uuid", "p_ticket_type_ids" "uuid"[], "p_quantities" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_preview_pricing"("p_org_id" "uuid", "p_ticket_type_ids" "uuid"[], "p_quantities" integer[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_preview_promo_code"("p_event_id" "uuid", "p_code" "text", "p_channel" "public"."sales_channel") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_preview_promo_code"("p_event_id" "uuid", "p_code" "text", "p_channel" "public"."sales_channel") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_preview_promo_code"("p_event_id" "uuid", "p_code" "text", "p_channel" "public"."sales_channel") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_preview_promo_code"("p_event_id" "uuid", "p_code" "text", "p_channel" "public"."sales_channel") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_profile_can_read"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_profile_can_read"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_profile_can_read"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_provider_settlement_counts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_provider_settlement_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_provider_settlement_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_provider_settlement_counts"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_publish_resale_listing"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_publish_resale_listing"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_publish_resale_listing"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_publish_resale_listing"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_publish_resale_listing_unchecked"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_publish_resale_listing_unchecked"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_publish_resale_listing_unchecked"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_publish_resale_listing_unchecked"("p_order_item_id" "uuid", "p_price_cents" integer, "p_listing_hours" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_push_targets_for_user"("p_user_id" "uuid", "p_notification_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_push_targets_for_user"("p_user_id" "uuid", "p_notification_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_push_targets_for_user"("p_user_id" "uuid", "p_notification_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_push_targets_for_user"("p_user_id" "uuid", "p_notification_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_quote_order"("p_items" "jsonb", "p_currency" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_quote_order"("p_items" "jsonb", "p_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_quote_order"("p_items" "jsonb", "p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_quote_order"("p_items" "jsonb", "p_currency" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_quote_order"("p_event_id" "uuid", "p_items" "jsonb", "p_channel" "public"."sales_channel", "p_coupon" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_quote_order"("p_event_id" "uuid", "p_items" "jsonb", "p_channel" "public"."sales_channel", "p_coupon" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_quote_order"("p_event_id" "uuid", "p_items" "jsonb", "p_channel" "public"."sales_channel", "p_coupon" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_quote_order"("p_event_id" "uuid", "p_items" "jsonb", "p_channel" "public"."sales_channel", "p_coupon" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_rate_limit_edge"("p_bucket" "text", "p_key" "text", "p_max" integer, "p_window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_rate_limit_edge"("p_bucket" "text", "p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_rate_limit_edge"("p_bucket" "text", "p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_rate_limit_edge"("p_bucket" "text", "p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_rate_limit_gc"("p_older_than" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_rate_limit_gc"("p_older_than" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_rate_limit_gc"("p_older_than" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_rate_limit_gc"("p_older_than" interval) TO "service_role";



GRANT ALL ON TABLE "public"."event_live_stats" TO "anon";
GRANT ALL ON TABLE "public"."event_live_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."event_live_stats" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_recalculate_event_live_stats"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_order"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_order"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_order_item"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_order_item"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_order_item"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_order_item"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_payment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_payment"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_scan"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_scan"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_scan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_scan"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_ticket_type"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_ticket_type"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_ticket_type"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recalculate_event_live_stats_from_ticket_type"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_record_chargeback"("p_payment_id" "uuid", "p_provider_ref" "text", "p_amount_cents" integer, "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_record_chargeback"("p_payment_id" "uuid", "p_provider_ref" "text", "p_amount_cents" integer, "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_record_chargeback"("p_payment_id" "uuid", "p_provider_ref" "text", "p_amount_cents" integer, "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_record_chargeback"("p_payment_id" "uuid", "p_provider_ref" "text", "p_amount_cents" integer, "p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_refresh_finance_reconciliation_issues"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_refresh_finance_reconciliation_issues"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_refresh_finance_reconciliation_issues"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_refresh_finance_reconciliation_issues"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_refund_reconciliation_tick"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_refund_reconciliation_tick"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_refund_reconciliation_tick"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_refund_reconciliation_tick"() TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_register_device"("p_org_id" "uuid", "p_event_id" "uuid", "p_label" "text", "p_device_role" "public"."device_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_register_device"("p_org_id" "uuid", "p_event_id" "uuid", "p_label" "text", "p_device_role" "public"."device_role") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_register_device"("p_org_id" "uuid", "p_event_id" "uuid", "p_label" "text", "p_device_role" "public"."device_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_register_device"("p_org_id" "uuid", "p_event_id" "uuid", "p_label" "text", "p_device_role" "public"."device_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_register_push_device"("p_service" "text", "p_token" "text", "p_device_id" "text", "p_app_id" "text", "p_platform_version" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_register_push_device"("p_service" "text", "p_token" "text", "p_device_id" "text", "p_app_id" "text", "p_platform_version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_register_push_device"("p_service" "text", "p_token" "text", "p_device_id" "text", "p_app_id" "text", "p_platform_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_register_push_device"("p_service" "text", "p_token" "text", "p_device_id" "text", "p_app_id" "text", "p_platform_version" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_remove_push_subscription"("p_endpoint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_remove_push_subscription"("p_endpoint" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_remove_push_subscription"("p_endpoint" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_remove_push_subscription"("p_endpoint" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_report_user"("p_handle" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_report_user"("p_handle" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_report_user"("p_handle" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_report_user"("p_handle" "text", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_request_payout"("p_org_id" "uuid", "p_amount_cents" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_request_payout"("p_org_id" "uuid", "p_amount_cents" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_request_payout"("p_org_id" "uuid", "p_amount_cents" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_request_payout"("p_org_id" "uuid", "p_amount_cents" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_request_payout_unchecked"("p_org_id" "uuid", "p_amount_cents" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_request_payout_unchecked"("p_org_id" "uuid", "p_amount_cents" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_request_payout_unchecked"("p_org_id" "uuid", "p_amount_cents" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_request_payout_unchecked"("p_org_id" "uuid", "p_amount_cents" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_request_transfer_by_email"("p_order_item_id" "uuid", "p_recipient_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_request_transfer_by_email"("p_order_item_id" "uuid", "p_recipient_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_request_transfer_by_email"("p_order_item_id" "uuid", "p_recipient_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_request_transfer_by_email"("p_order_item_id" "uuid", "p_recipient_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_request_transfer_by_email_unchecked"("p_order_item_id" "uuid", "p_recipient_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_request_transfer_by_email_unchecked"("p_order_item_id" "uuid", "p_recipient_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_request_transfer_by_email_unchecked"("p_order_item_id" "uuid", "p_recipient_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_request_transfer_by_email_unchecked"("p_order_item_id" "uuid", "p_recipient_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_request_transfer_by_phone"("p_order_item_id" "uuid", "p_recipient_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_request_transfer_by_phone"("p_order_item_id" "uuid", "p_recipient_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_request_transfer_by_phone"("p_order_item_id" "uuid", "p_recipient_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_request_transfer_by_phone"("p_order_item_id" "uuid", "p_recipient_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_request_transfer_to_user"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_request_transfer_to_user"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_request_transfer_to_user"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_request_transfer_to_user"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_request_transfer_to_user_unchecked"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_request_transfer_to_user_unchecked"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_request_transfer_to_user_unchecked"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_request_transfer_to_user_unchecked"("p_order_item_id" "uuid", "p_recipient_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_resolve_payment_outbox"("p_id" "uuid", "p_ok" boolean, "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_resolve_payment_outbox"("p_id" "uuid", "p_ok" boolean, "p_error" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_resolve_payment_outbox"("p_id" "uuid", "p_ok" boolean, "p_error" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_resolve_payment_outbox"("p_id" "uuid", "p_ok" boolean, "p_error" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_revoke_membership_invite"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_revoke_membership_invite"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_revoke_membership_invite"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_revoke_membership_invite"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_revoke_membership_invite_unchecked"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_revoke_membership_invite_unchecked"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_revoke_membership_invite_unchecked"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_revoke_membership_invite_unchecked"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_rollup_metrics"("p_day" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_rollup_metrics"("p_day" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_rollup_metrics"("p_day" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_scan_ticket"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_gate" "text", "p_scanned_at" timestamp with time zone, "p_attempt_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_scan_ticket"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_gate" "text", "p_scanned_at" timestamp with time zone, "p_attempt_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_scan_ticket"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_gate" "text", "p_scanned_at" timestamp with time zone, "p_attempt_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_scan_ticket"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_gate" "text", "p_scanned_at" timestamp with time zone, "p_attempt_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_scan_ticket_unchecked"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_gate" "text", "p_scanned_at" timestamp with time zone, "p_attempt_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_scan_ticket_unchecked"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_gate" "text", "p_scanned_at" timestamp with time zone, "p_attempt_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_scan_ticket_unchecked"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_gate" "text", "p_scanned_at" timestamp with time zone, "p_attempt_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_scan_ticket_unchecked"("p_ticket_code" "text", "p_event_id" "uuid", "p_scanned_by" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_gate" "text", "p_scanned_at" timestamp with time zone, "p_attempt_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_search_events"("p_query" "text", "p_category" "text", "p_city" "text", "p_starts_after" timestamp with time zone, "p_starts_before" timestamp with time zone, "p_max_price_cents" integer, "p_only_free" boolean, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_search_events"("p_query" "text", "p_category" "text", "p_city" "text", "p_starts_after" timestamp with time zone, "p_starts_before" timestamp with time zone, "p_max_price_cents" integer, "p_only_free" boolean, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_search_events"("p_query" "text", "p_category" "text", "p_city" "text", "p_starts_after" timestamp with time zone, "p_starts_before" timestamp with time zone, "p_max_price_cents" integer, "p_only_free" boolean, "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_search_friend_profiles"("p_query" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_search_friend_profiles"("p_query" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_search_friend_profiles"("p_query" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_search_friend_profiles"("p_query" "text", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_seed_uat_fixtures"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_seed_uat_fixtures"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_seed_uat_fixtures"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_seed_uat_fixtures"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_seller_completed_resales"("p_seller_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_seller_completed_resales"("p_seller_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_seller_completed_resales"("p_seller_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_seller_completed_resales"("p_seller_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_set_default_payment_method"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_set_default_payment_method"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_default_payment_method"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_default_payment_method"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_set_default_payment_method_unchecked"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_set_default_payment_method_unchecked"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_default_payment_method_unchecked"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_default_payment_method_unchecked"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_set_my_avatar_url"("p_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_set_my_avatar_url"("p_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_my_avatar_url"("p_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_my_avatar_url"("p_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_set_my_locale"("p_locale" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_set_my_locale"("p_locale" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_my_locale"("p_locale" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_my_locale"("p_locale" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_settlement_ingest_tick"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_settlement_ingest_tick"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_settlement_ingest_tick"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_settlement_ingest_tick"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_start_device_session"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_start_device_session"("p_device_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_start_device_session"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_start_device_session"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_store_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_user_agent" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_store_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_store_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_store_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_user_agent" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tapband_activate_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_verification_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tapband_activate_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_verification_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tapband_activate_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_verification_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tapband_activate_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_verification_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tapband_actor_can_manage_event"("p_actor_id" "uuid", "p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tapband_actor_can_manage_event"("p_actor_id" "uuid", "p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tapband_actor_can_manage_event"("p_actor_id" "uuid", "p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tapband_actor_can_manage_event"("p_actor_id" "uuid", "p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tapband_actor_is_platform_admin"("p_actor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tapband_actor_is_platform_admin"("p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tapband_actor_is_platform_admin"("p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tapband_actor_is_platform_admin"("p_actor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tapband_assign_entitlement"("p_credential_id" "uuid", "p_order_item_id" "uuid", "p_event_id" "uuid", "p_actor_id" "uuid", "p_assignment_source" "text", "p_attempt_id" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tapband_assign_entitlement"("p_credential_id" "uuid", "p_order_item_id" "uuid", "p_event_id" "uuid", "p_actor_id" "uuid", "p_assignment_source" "text", "p_attempt_id" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tapband_assign_entitlement"("p_credential_id" "uuid", "p_order_item_id" "uuid", "p_event_id" "uuid", "p_actor_id" "uuid", "p_assignment_source" "text", "p_attempt_id" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tapband_assign_entitlement"("p_credential_id" "uuid", "p_order_item_id" "uuid", "p_event_id" "uuid", "p_actor_id" "uuid", "p_assignment_source" "text", "p_attempt_id" "text", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tapband_audit_lifecycle"("p_org_id" "uuid", "p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "uuid", "p_action" "text", "p_changes" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tapband_audit_lifecycle"("p_org_id" "uuid", "p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "uuid", "p_action" "text", "p_changes" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tapband_audit_lifecycle"("p_org_id" "uuid", "p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "uuid", "p_action" "text", "p_changes" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tapband_audit_lifecycle"("p_org_id" "uuid", "p_actor_id" "uuid", "p_table_name" "text", "p_record_id" "uuid", "p_action" "text", "p_changes" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tapband_customer_credentials"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tapband_customer_credentials"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tapband_customer_credentials"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tapband_customer_credentials"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tapband_issue_credential"("p_inventory_id" "uuid", "p_user_id" "uuid", "p_credential_public_id" "text", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tapband_issue_credential"("p_inventory_id" "uuid", "p_user_id" "uuid", "p_credential_public_id" "text", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tapband_issue_credential"("p_inventory_id" "uuid", "p_user_id" "uuid", "p_credential_public_id" "text", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tapband_issue_credential"("p_inventory_id" "uuid", "p_user_id" "uuid", "p_credential_public_id" "text", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tapband_replace_credential"("p_old_credential_id" "uuid", "p_new_inventory_id" "uuid", "p_new_credential_public_id" "text", "p_actor_id" "uuid", "p_attempt_id" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tapband_replace_credential"("p_old_credential_id" "uuid", "p_new_inventory_id" "uuid", "p_new_credential_public_id" "text", "p_actor_id" "uuid", "p_attempt_id" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tapband_replace_credential"("p_old_credential_id" "uuid", "p_new_inventory_id" "uuid", "p_new_credential_public_id" "text", "p_actor_id" "uuid", "p_attempt_id" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tapband_replace_credential"("p_old_credential_id" "uuid", "p_new_inventory_id" "uuid", "p_new_credential_public_id" "text", "p_actor_id" "uuid", "p_attempt_id" "text", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tapband_resolve_credential_for_event"("p_credential_public_id" "text", "p_event_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_gate" "text", "p_scanned_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tapband_resolve_credential_for_event"("p_credential_public_id" "text", "p_event_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_gate" "text", "p_scanned_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tapband_resolve_credential_for_event"("p_credential_public_id" "text", "p_event_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_gate" "text", "p_scanned_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tapband_resolve_credential_for_event"("p_credential_public_id" "text", "p_event_id" "uuid", "p_actor_id" "uuid", "p_device_id" "uuid", "p_session_id" "uuid", "p_attempt_id" "text", "p_gate" "text", "p_scanned_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tapband_revoke_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_reason" "text", "p_new_status" "text", "p_attempt_id" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tapband_revoke_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_reason" "text", "p_new_status" "text", "p_attempt_id" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_tapband_revoke_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_reason" "text", "p_new_status" "text", "p_attempt_id" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_tapband_revoke_credential"("p_credential_id" "uuid", "p_actor_id" "uuid", "p_reason" "text", "p_new_status" "text", "p_attempt_id" "text", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_teardown_uat_fixtures"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_teardown_uat_fixtures"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_teardown_uat_fixtures"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_teardown_uat_fixtures"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_ticket_is_transferable"("p_order_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ticket_is_transferable"("p_order_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ticket_is_transferable"("p_order_item_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_ticket_type_remaining"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_ticket_type_remaining"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ticket_type_remaining"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ticket_type_remaining"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_toggle_favourite"("p_event_id" "uuid", "p_save" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_toggle_favourite"("p_event_id" "uuid", "p_save" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_toggle_favourite"("p_event_id" "uuid", "p_save" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_toggle_favourite"("p_event_id" "uuid", "p_save" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_toggle_notification_mute"("p_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_toggle_notification_mute"("p_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_toggle_notification_mute"("p_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_toggle_notification_mute"("p_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_touch_event_live_stats_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_touch_event_live_stats_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_touch_event_live_stats_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_touch_event_live_stats_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_touch_tapband_credentials_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_touch_tapband_credentials_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_touch_tapband_credentials_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_touch_tapband_feature_configs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_touch_tapband_feature_configs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_touch_tapband_feature_configs_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_transition_dispute"("p_dispute_id" "uuid", "p_status" "public"."dispute_status", "p_resolution" "text", "p_refund_id" "uuid", "p_assigned_to" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_transition_dispute"("p_dispute_id" "uuid", "p_status" "public"."dispute_status", "p_resolution" "text", "p_refund_id" "uuid", "p_assigned_to" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_transition_dispute"("p_dispute_id" "uuid", "p_status" "public"."dispute_status", "p_resolution" "text", "p_refund_id" "uuid", "p_assigned_to" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_transition_dispute"("p_dispute_id" "uuid", "p_status" "public"."dispute_status", "p_resolution" "text", "p_refund_id" "uuid", "p_assigned_to" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_transition_event_status"("p_event_id" "uuid", "p_new_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_transition_event_status"("p_event_id" "uuid", "p_new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_transition_event_status"("p_event_id" "uuid", "p_new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_transition_event_status"("p_event_id" "uuid", "p_new_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_transition_event_status_unchecked"("p_event_id" "uuid", "p_new_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_transition_event_status_unchecked"("p_event_id" "uuid", "p_new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_transition_event_status_unchecked"("p_event_id" "uuid", "p_new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_transition_event_status_unchecked"("p_event_id" "uuid", "p_new_status" "text") TO "service_role";



GRANT ALL ON TABLE "public"."payouts" TO "anon";
GRANT ALL ON TABLE "public"."payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."payouts" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_transition_payout"("p_payout_id" "uuid", "p_new_status" "public"."payout_status", "p_destination_ref" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_transition_payout"("p_payout_id" "uuid", "p_new_status" "public"."payout_status", "p_destination_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_transition_payout"("p_payout_id" "uuid", "p_new_status" "public"."payout_status", "p_destination_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_transition_payout"("p_payout_id" "uuid", "p_new_status" "public"."payout_status", "p_destination_ref" "text") TO "service_role";



GRANT ALL ON TABLE "public"."refunds" TO "anon";
GRANT ALL ON TABLE "public"."refunds" TO "authenticated";
GRANT ALL ON TABLE "public"."refunds" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_transition_refund"("p_refund_id" "uuid", "p_new_status" "public"."refund_status", "p_provider_ref" "text", "p_provider_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_transition_refund"("p_refund_id" "uuid", "p_new_status" "public"."refund_status", "p_provider_ref" "text", "p_provider_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_transition_refund"("p_refund_id" "uuid", "p_new_status" "public"."refund_status", "p_provider_ref" "text", "p_provider_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_transition_refund"("p_refund_id" "uuid", "p_new_status" "public"."refund_status", "p_provider_ref" "text", "p_provider_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_trg_emit_order_paid"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_trg_emit_order_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_trg_emit_order_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_trg_emit_order_paid"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_trg_emit_payout_paid"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_trg_emit_payout_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_trg_emit_payout_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_trg_emit_payout_paid"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_trg_emit_ticket_transferred"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_trg_emit_ticket_transferred"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_trg_emit_ticket_transferred"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_trg_emit_ticket_transferred"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_unregister_push_device"("p_service" "text", "p_device_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_unregister_push_device"("p_service" "text", "p_device_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_unregister_push_device"("p_service" "text", "p_device_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_unregister_push_device"("p_service" "text", "p_device_id" "text") TO "service_role";



GRANT ALL ON TABLE "public"."finance_reconciliation_issues" TO "anon";
GRANT ALL ON TABLE "public"."finance_reconciliation_issues" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_reconciliation_issues" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_update_finance_reconciliation_issue"("p_issue_id" "uuid", "p_new_status" "text", "p_resolution_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_update_finance_reconciliation_issue"("p_issue_id" "uuid", "p_new_status" "text", "p_resolution_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_finance_reconciliation_issue"("p_issue_id" "uuid", "p_new_status" "text", "p_resolution_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_finance_reconciliation_issue"("p_issue_id" "uuid", "p_new_status" "text", "p_resolution_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_update_my_notification_preferences"("p_email_opt_in" boolean, "p_sms_opt_in" boolean, "p_push_opt_in" boolean, "p_in_app_opt_in" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_update_my_notification_preferences"("p_email_opt_in" boolean, "p_sms_opt_in" boolean, "p_push_opt_in" boolean, "p_in_app_opt_in" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_my_notification_preferences"("p_email_opt_in" boolean, "p_sms_opt_in" boolean, "p_push_opt_in" boolean, "p_in_app_opt_in" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_my_notification_preferences"("p_email_opt_in" boolean, "p_sms_opt_in" boolean, "p_push_opt_in" boolean, "p_in_app_opt_in" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_update_my_profile"("p_display_name" "text", "p_name" "text", "p_surname" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_update_my_profile"("p_display_name" "text", "p_name" "text", "p_surname" "text", "p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_my_profile"("p_display_name" "text", "p_name" "text", "p_surname" "text", "p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_my_profile"("p_display_name" "text", "p_name" "text", "p_surname" "text", "p_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_update_my_profile_unchecked"("p_display_name" "text", "p_name" "text", "p_surname" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_update_my_profile_unchecked"("p_display_name" "text", "p_name" "text", "p_surname" "text", "p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_my_profile_unchecked"("p_display_name" "text", "p_name" "text", "p_surname" "text", "p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_my_profile_unchecked"("p_display_name" "text", "p_name" "text", "p_surname" "text", "p_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean, "p_discover_by_phone" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean, "p_discover_by_phone" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean, "p_discover_by_phone" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_my_social_privacy"("p_profile_discoverability" "text", "p_allow_friend_requests" boolean, "p_show_events_going_to_friends" boolean, "p_allow_friend_suggestions" boolean, "p_discover_by_phone" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_upsert_provider_settlement"("p_provider" "text", "p_ext_settlement_id" "text", "p_status" "text", "p_currency" "text", "p_gross_cents" integer, "p_fees_cents" integer, "p_net_cents" integer, "p_settled_at" timestamp with time zone, "p_payload" "jsonb", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_upsert_provider_settlement"("p_provider" "text", "p_ext_settlement_id" "text", "p_status" "text", "p_currency" "text", "p_gross_cents" integer, "p_fees_cents" integer, "p_net_cents" integer, "p_settled_at" timestamp with time zone, "p_payload" "jsonb", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_upsert_provider_settlement"("p_provider" "text", "p_ext_settlement_id" "text", "p_status" "text", "p_currency" "text", "p_gross_cents" integer, "p_fees_cents" integer, "p_net_cents" integer, "p_settled_at" timestamp with time zone, "p_payload" "jsonb", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_upsert_provider_settlement"("p_provider" "text", "p_ext_settlement_id" "text", "p_status" "text", "p_currency" "text", "p_gross_cents" integer, "p_fees_cents" integer, "p_net_cents" integer, "p_settled_at" timestamp with time zone, "p_payload" "jsonb", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_user_connections_set_responded_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_user_connections_set_responded_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_user_connections_set_responded_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_webhook_endpoints_touch_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_webhook_endpoints_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_webhook_endpoints_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_webhook_endpoints_touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_event_kpis"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_event_kpis"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_event_kpis"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_event_kpis"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_event_kpis_unchecked"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_event_kpis_unchecked"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_event_kpis_unchecked"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_event_kpis_unchecked"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_organizer_kpis"("p_range" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organizer_kpis"("p_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organizer_kpis"("p_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organizer_kpis"("p_range" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_organizer_kpis_unchecked"("p_range" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organizer_kpis_unchecked"("p_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organizer_kpis_unchecked"("p_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organizer_kpis_unchecked"("p_range" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_profile"("p_handle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_profile"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_profile"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_profile"("p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_social_public_profile"("p_handle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_social_public_profile"("p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_social_public_profile"("p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_social_public_profile"("p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_ticket_type_event"("ticket_type_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_ticket_type_event"("ticket_type_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ticket_type_event"("ticket_type_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ticket_type_event"("ticket_type_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_orgs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_orgs"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_orgs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_orgs"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."grant_seeded_super_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."grant_seeded_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."grant_seeded_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_seeded_super_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_scanner_checkin_only"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_scanner_checkin_only"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_scanner_checkin_only"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_scanner_checkin_only"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_refund_processed"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_refund_processed"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_refund_processed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_refund_processed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_app_role"("r" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_app_role"("r" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_app_role"("r" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."insert_job_secure"("p_kind" "text", "p_payload" "jsonb", "p_run_after" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."insert_job_secure"("p_kind" "text", "p_payload" "jsonb", "p_run_after" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."insert_job_secure"("p_kind" "text", "p_payload" "jsonb", "p_run_after" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_job_secure"("p_kind" "text", "p_payload" "jsonb", "p_run_after" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_event_organizer"("p_user_id" "uuid", "p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_event_organizer"("p_user_id" "uuid", "p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_event_organizer"("p_user_id" "uuid", "p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_event_organizer"("p_user_id" "uuid", "p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_org_admin"("p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_org_admin"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"("p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_org_finance_viewer"("p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_org_finance_viewer"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_finance_viewer"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_finance_viewer"("p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_org_staff"("user_uuid" "uuid", "org_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_org_staff"("user_uuid" "uuid", "org_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_staff"("user_uuid" "uuid", "org_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_staff"("user_uuid" "uuid", "org_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_super_admin"("check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_super_admin"("check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"("check_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."issue_comp_ticket"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."issue_comp_ticket"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer, "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."issue_comp_ticket"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer, "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."issue_comp_ticket"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer, "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."issue_comp_ticket_unchecked"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."issue_comp_ticket_unchecked"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer, "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."issue_comp_ticket_unchecked"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer, "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."issue_comp_ticket_unchecked"("p_org_id" "uuid", "p_ticket_type_id" "uuid", "p_recipient_email" "text", "p_qty" integer, "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."issue_order_items_when_order_paid"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."issue_order_items_when_order_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."issue_order_items_when_order_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."issue_order_items_when_order_paid"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_event_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_event_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_event_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_event_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."order_items_status_transition_guard"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."order_items_status_transition_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."order_items_status_transition_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_items_status_transition_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."order_ledger_summary_fn"() TO "anon";
GRANT ALL ON FUNCTION "public"."order_ledger_summary_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_ledger_summary_fn"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."order_ledger_summary_fn_definer"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."order_ledger_summary_fn_definer"() TO "anon";
GRANT ALL ON FUNCTION "public"."order_ledger_summary_fn_definer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_ledger_summary_fn_definer"() TO "service_role";
GRANT ALL ON FUNCTION "public"."order_ledger_summary_fn_definer"() TO "dashboard_user";



REVOKE ALL ON FUNCTION "public"."order_ledger_summary_fn_impl"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."order_ledger_summary_fn_impl"() TO "anon";
GRANT ALL ON FUNCTION "public"."order_ledger_summary_fn_impl"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_ledger_summary_fn_impl"() TO "service_role";



GRANT ALL ON FUNCTION "public"."order_ledger_summary_for_order"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."order_ledger_summary_for_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_ledger_summary_for_order"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_buyer_contact_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_buyer_contact_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_buyer_contact_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_buyer_contact_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_pricing_changes_after_paid"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_pricing_changes_after_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_pricing_changes_after_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_pricing_changes_after_paid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_scans_on_refunded_items"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_scans_on_refunded_items"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_scans_on_refunded_items"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_totals_change_after_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_totals_change_after_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_totals_change_after_paid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resale_listing_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."resale_listing_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."resale_listing_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resale_listings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."resale_listings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."resale_listings_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."run_analyze"("schemas" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."run_analyze"("schemas" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."run_analyze"("schemas" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_analyze"("schemas" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."scanner_mark_checkin"("p_order_item_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."scanner_mark_checkin"("p_order_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."scanner_mark_checkin"("p_order_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."scanner_mark_checkin"("p_order_item_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_event_categories_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_event_categories_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_event_categories_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_event_categories_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_payment_provider_settings_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_payment_provider_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_payment_provider_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_payment_provider_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."slugify_text"("p_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."slugify_text"("p_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify_text"("p_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify_text"("p_value" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_order_status_from_ledger"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_order_status_from_ledger"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_order_status_from_ledger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_order_status_from_ledger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_check_order_currency"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_check_order_currency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_check_order_currency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_reprice_order_after_adjustments"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_reprice_order_after_adjustments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_reprice_order_after_adjustments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_reprice_order_after_items"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_reprice_order_after_items"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_reprice_order_after_items"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_reprice_order_on_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_reprice_order_on_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_reprice_order_on_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_org_role"("p_org" "uuid", "p_roles" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_org_role"("p_org" "uuid", "p_roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_org_role"("p_org" "uuid", "p_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_org_role"("p_org" "uuid", "p_roles" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_event_category_slug"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_event_category_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_event_category_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_category_slug"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_scan_and_checkin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_scan_and_checkin"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_scan_and_checkin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_scan_and_checkin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_transfer_order_item_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_transfer_order_item_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_transfer_order_item_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_transfer_order_item_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_ticket_signature"("ticket_code" "text", "provided_sig" "text", "secret" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_ticket_signature"("ticket_code" "text", "provided_sig" "text", "secret" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_ticket_signature"("ticket_code" "text", "provided_sig" "text", "secret" "text") TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "_internal"."policy_backups" TO "anon";
GRANT ALL ON TABLE "_internal"."policy_backups" TO "authenticated";
GRANT ALL ON TABLE "_internal"."policy_backups" TO "service_role";



GRANT ALL ON SEQUENCE "_internal"."policy_backups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "_internal"."policy_backups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "_internal"."policy_backups_id_seq" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "_internal"."project_docs" TO "anon";
GRANT ALL ON TABLE "_internal"."project_docs" TO "authenticated";
GRANT ALL ON TABLE "_internal"."project_docs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "private"."organizer_identity_details" TO "service_role";



GRANT ALL ON TABLE "public"."admin_action_catalog" TO "anon";
GRANT ALL ON TABLE "public"."admin_action_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_action_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."payment_attempts" TO "anon";
GRANT ALL ON TABLE "public"."payment_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."admin_attention_queue" TO "anon";
GRANT ALL ON TABLE "public"."admin_attention_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_attention_queue" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."scans" TO "anon";
GRANT ALL ON TABLE "public"."scans" TO "authenticated";
GRANT ALL ON TABLE "public"."scans" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_types" TO "anon";
GRANT ALL ON TABLE "public"."ticket_types" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_types" TO "service_role";



GRANT ALL ON TABLE "public"."webhooks" TO "anon";
GRANT ALL ON TABLE "public"."webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."admin_command_centre_metrics" TO "anon";
GRANT ALL ON TABLE "public"."admin_command_centre_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_command_centre_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."admin_event_readiness" TO "anon";
GRANT ALL ON TABLE "public"."admin_event_readiness" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_event_readiness" TO "service_role";



GRANT ALL ON TABLE "public"."app_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."app_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."app_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_recent_operations" TO "anon";
GRANT ALL ON TABLE "public"."admin_recent_operations" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_recent_operations" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."admin_workspace_actions" TO "anon";
GRANT ALL ON TABLE "public"."admin_workspace_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_workspace_actions" TO "service_role";



GRANT ALL ON TABLE "public"."feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_flags" TO "service_role";



GRANT ALL ON TABLE "public"."org_members" TO "anon";
GRANT ALL ON TABLE "public"."org_members" TO "authenticated";
GRANT ALL ON TABLE "public"."org_members" TO "service_role";



GRANT ALL ON TABLE "public"."price_rules" TO "anon";
GRANT ALL ON TABLE "public"."price_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."price_rules" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_plans" TO "anon";
GRANT ALL ON TABLE "public"."pricing_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_plans" TO "service_role";



GRANT ALL ON TABLE "public"."seat_holds" TO "anon";
GRANT ALL ON TABLE "public"."seat_holds" TO "authenticated";
GRANT ALL ON TABLE "public"."seat_holds" TO "service_role";



GRANT ALL ON TABLE "public"."admin_workspace_operating_counts" TO "anon";
GRANT ALL ON TABLE "public"."admin_workspace_operating_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_workspace_operating_counts" TO "service_role";



GRANT ALL ON TABLE "public"."artists" TO "anon";
GRANT ALL ON TABLE "public"."artists" TO "authenticated";
GRANT ALL ON TABLE "public"."artists" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log_archive" TO "anon";
GRANT ALL ON TABLE "public"."audit_log_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log_archive" TO "service_role";



GRANT ALL ON TABLE "public"."credential_batches" TO "anon";
GRANT ALL ON TABLE "public"."credential_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."credential_batches" TO "service_role";



GRANT ALL ON TABLE "public"."credential_entitlements" TO "anon";
GRANT ALL ON TABLE "public"."credential_entitlements" TO "authenticated";
GRANT ALL ON TABLE "public"."credential_entitlements" TO "service_role";



GRANT ALL ON TABLE "public"."credential_inventory" TO "anon";
GRANT ALL ON TABLE "public"."credential_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."credential_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."credential_taps" TO "anon";
GRANT ALL ON TABLE "public"."credential_taps" TO "authenticated";
GRANT ALL ON TABLE "public"."credential_taps" TO "service_role";



GRANT ALL ON TABLE "public"."device_setup_codes" TO "anon";
GRANT ALL ON TABLE "public"."device_setup_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."device_setup_codes" TO "service_role";



GRANT ALL ON TABLE "public"."event_artists" TO "anon";
GRANT ALL ON TABLE "public"."event_artists" TO "authenticated";
GRANT ALL ON TABLE "public"."event_artists" TO "service_role";



GRANT ALL ON TABLE "public"."event_catalog" TO "anon";
GRANT ALL ON TABLE "public"."event_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."event_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."event_categories" TO "anon";
GRANT ALL ON TABLE "public"."event_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."event_categories" TO "service_role";



GRANT ALL ON TABLE "public"."event_dates" TO "anon";
GRANT ALL ON TABLE "public"."event_dates" TO "authenticated";
GRANT ALL ON TABLE "public"."event_dates" TO "service_role";



GRANT ALL ON TABLE "public"."event_favourites" TO "anon";
GRANT ALL ON TABLE "public"."event_favourites" TO "authenticated";
GRANT ALL ON TABLE "public"."event_favourites" TO "service_role";



GRANT ALL ON TABLE "public"."event_invitations" TO "anon";
GRANT ALL ON TABLE "public"."event_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."event_metrics_daily" TO "anon";
GRANT ALL ON TABLE "public"."event_metrics_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."event_metrics_daily" TO "service_role";



GRANT ALL ON TABLE "public"."event_series" TO "anon";
GRANT ALL ON TABLE "public"."event_series" TO "authenticated";
GRANT ALL ON TABLE "public"."event_series" TO "service_role";



GRANT ALL ON TABLE "public"."event_staff" TO "anon";
GRANT ALL ON TABLE "public"."event_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."event_staff" TO "service_role";



GRANT ALL ON TABLE "public"."event_summary" TO "anon";
GRANT ALL ON TABLE "public"."event_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."event_summary" TO "service_role";



GRANT ALL ON TABLE "public"."guestlist_entries" TO "anon";
GRANT ALL ON TABLE "public"."guestlist_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."guestlist_entries" TO "service_role";



GRANT ALL ON TABLE "public"."guestlist_fulfillments" TO "anon";
GRANT ALL ON TABLE "public"."guestlist_fulfillments" TO "authenticated";
GRANT ALL ON TABLE "public"."guestlist_fulfillments" TO "service_role";



GRANT ALL ON TABLE "public"."ledger_entries" TO "anon";
GRANT ALL ON TABLE "public"."ledger_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."ledger_entries" TO "service_role";



GRANT ALL ON TABLE "public"."mv_event_sales" TO "anon";
GRANT ALL ON TABLE "public"."mv_event_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_event_sales" TO "service_role";



GRANT ALL ON TABLE "public"."mv_revenue_breakdown" TO "anon";
GRANT ALL ON TABLE "public"."mv_revenue_breakdown" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_revenue_breakdown" TO "service_role";



GRANT ALL ON TABLE "public"."notification_mutes" TO "anon";
GRANT ALL ON TABLE "public"."notification_mutes" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_mutes" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."ops_cron_runs" TO "anon";
GRANT ALL ON TABLE "public"."ops_cron_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."ops_cron_runs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ops_cron_runs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ops_cron_runs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ops_cron_runs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."order_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."order_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."order_financials" TO "anon";
GRANT ALL ON TABLE "public"."order_financials" TO "authenticated";
GRANT ALL ON TABLE "public"."order_financials" TO "service_role";



GRANT ALL ON TABLE "public"."order_ledger_summary" TO "anon";
GRANT ALL ON TABLE "public"."order_ledger_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."order_ledger_summary" TO "service_role";



GRANT ALL ON TABLE "public"."org_metrics_daily" TO "anon";
GRANT ALL ON TABLE "public"."org_metrics_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."org_metrics_daily" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."payment_provider_settings" TO "anon";
GRANT ALL ON TABLE "public"."payment_provider_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_provider_settings" TO "service_role";



GRANT ALL ON TABLE "public"."payment_routing_rules" TO "anon";
GRANT ALL ON TABLE "public"."payment_routing_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_routing_rules" TO "service_role";



GRANT ALL ON TABLE "public"."payout_accounts" TO "anon";
GRANT ALL ON TABLE "public"."payout_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."payout_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."physical_credentials" TO "anon";
GRANT ALL ON TABLE "public"."physical_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."physical_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."price_rule_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."price_rule_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."price_rule_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT("user_id") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("user_id") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("display_name") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("display_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("created_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("name") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("name") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("surname") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("surname") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("locale") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("locale") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("avatar_url") ON TABLE "public"."profiles" TO "anon";
GRANT SELECT("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."provider_settlement_items" TO "anon";
GRANT ALL ON TABLE "public"."provider_settlement_items" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_settlement_items" TO "service_role";



GRANT ALL ON TABLE "public"."provider_settlements" TO "anon";
GRANT ALL ON TABLE "public"."provider_settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_settlements" TO "service_role";



GRANT ALL ON TABLE "public"."push_devices" TO "anon";
GRANT ALL ON TABLE "public"."push_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."push_devices" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."refund_items" TO "anon";
GRANT ALL ON TABLE "public"."refund_items" TO "authenticated";
GRANT ALL ON TABLE "public"."refund_items" TO "service_role";



GRANT ALL ON TABLE "public"."resale_listings" TO "anon";
GRANT ALL ON TABLE "public"."resale_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."resale_listings" TO "service_role";



GRANT ALL ON TABLE "public"."scans_archive" TO "anon";
GRANT ALL ON TABLE "public"."scans_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."scans_archive" TO "service_role";



GRANT ALL ON TABLE "public"."seat_maps" TO "anon";
GRANT ALL ON TABLE "public"."seat_maps" TO "authenticated";
GRANT ALL ON TABLE "public"."seat_maps" TO "service_role";



GRANT ALL ON TABLE "public"."seat_reservations" TO "anon";
GRANT ALL ON TABLE "public"."seat_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."seat_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."seats" TO "anon";
GRANT ALL ON TABLE "public"."seats" TO "authenticated";
GRANT ALL ON TABLE "public"."seats" TO "service_role";



GRANT ALL ON TABLE "public"."series_follows" TO "anon";
GRANT ALL ON TABLE "public"."series_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."series_follows" TO "service_role";



GRANT ALL ON TABLE "public"."tapband_alerts" TO "anon";
GRANT ALL ON TABLE "public"."tapband_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."tapband_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."tapband_feature_configs" TO "anon";
GRANT ALL ON TABLE "public"."tapband_feature_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."tapband_feature_configs" TO "service_role";



GRANT ALL ON TABLE "public"."tapband_kill_switches" TO "anon";
GRANT ALL ON TABLE "public"."tapband_kill_switches" TO "authenticated";
GRANT ALL ON TABLE "public"."tapband_kill_switches" TO "service_role";



GRANT ALL ON TABLE "public"."tapband_telemetry_events" TO "anon";
GRANT ALL ON TABLE "public"."tapband_telemetry_events" TO "authenticated";
GRANT ALL ON TABLE "public"."tapband_telemetry_events" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_type_channels" TO "anon";
GRANT ALL ON TABLE "public"."ticket_type_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_type_channels" TO "service_role";



GRANT ALL ON TABLE "public"."transfers" TO "anon";
GRANT ALL ON TABLE "public"."transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."transfers" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_connections" TO "anon";
GRANT ALL ON TABLE "public"."user_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."user_connections" TO "service_role";



GRANT ALL ON TABLE "public"."user_friends" TO "anon";
GRANT ALL ON TABLE "public"."user_friends" TO "authenticated";
GRANT ALL ON TABLE "public"."user_friends" TO "service_role";



GRANT ALL ON TABLE "public"."user_handles" TO "anon";
GRANT ALL ON TABLE "public"."user_handles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_handles" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_privacy_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_privacy_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_privacy_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_private_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_private_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_private_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_reports" TO "anon";
GRANT ALL ON TABLE "public"."user_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."user_reports" TO "service_role";



GRANT ALL ON TABLE "public"."venues" TO "anon";
GRANT ALL ON TABLE "public"."venues" TO "authenticated";
GRANT ALL ON TABLE "public"."venues" TO "service_role";



GRANT ALL ON TABLE "public"."v_events_public" TO "anon";
GRANT ALL ON TABLE "public"."v_events_public" TO "authenticated";
GRANT ALL ON TABLE "public"."v_events_public" TO "service_role";



GRANT ALL ON TABLE "public"."v_artist_events_public" TO "anon";
GRANT ALL ON TABLE "public"."v_artist_events_public" TO "authenticated";
GRANT ALL ON TABLE "public"."v_artist_events_public" TO "service_role";



GRANT ALL ON TABLE "public"."v_artist_public" TO "anon";
GRANT ALL ON TABLE "public"."v_artist_public" TO "authenticated";
GRANT ALL ON TABLE "public"."v_artist_public" TO "service_role";



GRANT ALL ON TABLE "public"."v_event_kpis" TO "anon";
GRANT ALL ON TABLE "public"."v_event_kpis" TO "authenticated";
GRANT ALL ON TABLE "public"."v_event_kpis" TO "service_role";



GRANT ALL ON TABLE "public"."v_event_lineup_public" TO "anon";
GRANT ALL ON TABLE "public"."v_event_lineup_public" TO "authenticated";
GRANT ALL ON TABLE "public"."v_event_lineup_public" TO "service_role";



GRANT ALL ON TABLE "public"."v_event_public" TO "anon";
GRANT ALL ON TABLE "public"."v_event_public" TO "authenticated";
GRANT ALL ON TABLE "public"."v_event_public" TO "service_role";



GRANT ALL ON TABLE "public"."v_event_sales_public" TO "anon";
GRANT ALL ON TABLE "public"."v_event_sales_public" TO "authenticated";
GRANT ALL ON TABLE "public"."v_event_sales_public" TO "service_role";
GRANT SELECT ON TABLE "public"."v_event_sales_public" TO PUBLIC;



GRANT ALL ON TABLE "public"."v_finance_reconciliation_queue" TO "anon";
GRANT ALL ON TABLE "public"."v_finance_reconciliation_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."v_finance_reconciliation_queue" TO "service_role";



GRANT ALL ON TABLE "public"."v_inbound_transfers" TO "anon";
GRANT ALL ON TABLE "public"."v_inbound_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."v_inbound_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."v_my_order_ledger_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_my_order_ledger_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_my_order_ledger_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_my_tickets" TO "anon";
GRANT ALL ON TABLE "public"."v_my_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."v_my_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."v_organizer_events_public" TO "anon";
GRANT ALL ON TABLE "public"."v_organizer_events_public" TO "authenticated";
GRANT ALL ON TABLE "public"."v_organizer_events_public" TO "service_role";



GRANT ALL ON TABLE "public"."v_organizer_public" TO "anon";
GRANT ALL ON TABLE "public"."v_organizer_public" TO "authenticated";
GRANT ALL ON TABLE "public"."v_organizer_public" TO "service_role";



GRANT ALL ON TABLE "public"."v_public_event_cards" TO "anon";
GRANT ALL ON TABLE "public"."v_public_event_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."v_public_event_cards" TO "service_role";



GRANT ALL ON TABLE "public"."v_user_events" TO "anon";
GRANT ALL ON TABLE "public"."v_user_events" TO "authenticated";
GRANT ALL ON TABLE "public"."v_user_events" TO "service_role";



GRANT ALL ON TABLE "public"."v_user_orgs" TO "anon";
GRANT ALL ON TABLE "public"."v_user_orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."v_user_orgs" TO "service_role";



GRANT ALL ON TABLE "public"."waitlists" TO "anon";
GRANT ALL ON TABLE "public"."waitlists" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlists" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."webhook_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_endpoints" TO "anon";
GRANT ALL ON TABLE "public"."webhook_endpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_endpoints" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








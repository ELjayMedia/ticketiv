-- =====================================================================
-- Ticketiv — public-schema STRUCTURAL baseline (TICK-171)
-- =====================================================================
-- Captured 2026-06-20 from the live DB (project radsfmlsjznqvcpogluo)
-- via read-only pg_catalog introspection through the Supabase MCP.
--
-- SCOPE / LIMITATIONS — READ BEFORE USING FOR DISASTER RECOVERY:
--   * This file covers the PUBLIC schema STRUCTURE ONLY:
--       extensions (noted), enum types, tables, constraints, indexes.
--   * It does NOT include: the 174 public + 28 app SECURITY DEFINER
--     functions, 27 views, 2 materialized views (mv_event_sales,
--     mv_revenue_breakdown), 177 RLS policies, 65 triggers, GRANTs,
--     or the auth / app / storage / monitoring / realtime schemas.
--   * It is therefore NOT a standalone restorable migration. A fresh
--     Postgres restored from this file alone will NOT reproduce the
--     full schema (RLS, RPCs, views, cross-schema deps are missing).
--
-- CANONICAL BASELINE (do this in an environment with the DB connection
-- string + Supabase CLI — see docs/MIGRATION_RECONCILIATION.md):
--     supabase db pull            # writes a faithful schema migration
--   or
--     pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL"
--
-- This artifact is committed as a reviewed REFERENCE of the public
-- table layout while the canonical CLI-generated baseline is produced.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions in use (installed in the `extensions` schema by Supabase):
--   plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault,
--   hypopg, pg_cron, index_advisor, btree_gist, pg_trgm, pg_net
-- btree_gist backs the seat_reservations EXCLUDE constraint; pg_trgm
-- backs the events title trigram index. Ensure both exist before the
-- constraints/indexes below are applied.
-- ---------------------------------------------------------------------

-- ============ ENUM TYPES ============
CREATE TYPE public.admin_role_tier AS ENUM ('super_admin', 'finance_admin', 'support_admin', 'event_ops_admin', 'read_only_admin');
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'venue', 'artist', 'attendee', 'scanner', 'pos', 'organizer_owner', 'organizer_admin', 'organizer_staff', 'finance', 'organizer_scanner', 'device');
CREATE TYPE public.audit_action AS ENUM ('insert', 'update', 'delete', 'login', 'logout', 'other');
CREATE TYPE public.connection_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
CREATE TYPE public.device_role AS ENUM ('organizer_pos', 'organizer_scanner', 'organizer_kiosk', 'scanner_unassigned');
CREATE TYPE public.event_format AS ENUM ('single_day', 'multi_day');
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.fee_payer AS ENUM ('buyer', 'organizer');
CREATE TYPE public.order_item_status AS ENUM ('pending', 'issued', 'transferred', 'checked_in', 'revoked', 'refunded');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.payment_status AS ENUM ('pending', 'authorized', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'chargeback', 'void');
CREATE TYPE public.payments_status AS ENUM ('succeeded', 'failed', 'pending', 'refunded');
CREATE TYPE public.payout_status AS ENUM ('requested', 'processing', 'paid', 'failed', 'cancelled');
CREATE TYPE public.price_rule_type AS ENUM ('absolute_discount', 'percent_discount', 'abs_fee', 'percent_fee', 'tax');
CREATE TYPE public.refund_status AS ENUM ('requested', 'processing', 'processed', 'failed', 'cancelled');
CREATE TYPE public.refund_type AS ENUM ('full', 'partial');
CREATE TYPE public.sales_channel AS ENUM ('online', 'pos', 'reseller', 'import');
CREATE TYPE public.seat_hold_status AS ENUM ('active', 'released', 'expired');
CREATE TYPE public.series_type AS ENUM ('tour', 'recurring', 'season');
CREATE TYPE public.ticket_type_sales_status AS ENUM ('on_sale', 'paused', 'sold_out', 'hidden');
CREATE TYPE public.transfer_status AS ENUM ('requested', 'pending', 'accepted', 'declined', 'cancelled', 'completed');

-- ============ TABLES ============
-- NOTE: FK columns reference auth.users(id) — that schema is provided by
-- Supabase and is out of scope for this file. See header.

CREATE TABLE public.admin_action_catalog (
    key text NOT NULL,
    workspace_key text NOT NULL,
    label text NOT NULL,
    description text NOT NULL,
    target_table text NOT NULL,
    required_role text DEFAULT 'super_admin'::text NOT NULL,
    backend_function text,
    is_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.admin_users (
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role_tier admin_role_tier DEFAULT 'super_admin'::admin_role_tier NOT NULL,
    active boolean DEFAULT true NOT NULL,
    notes text
);

CREATE TABLE public.app_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    schema_name text NOT NULL,
    table_name text NOT NULL,
    operation text NOT NULL,
    row_data jsonb,
    changed_by uuid,
    change_query text
);

CREATE TABLE public.artists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    name text NOT NULL,
    bio text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    primary_user_id uuid,
    slug text NOT NULL,
    image_url text,
    name_key text DEFAULT lower(regexp_replace(TRIM(BOTH FROM name), '\s+'::text, ' '::text, 'g'::text))
);

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    actor_id uuid,
    table_name text NOT NULL,
    record_id text,
    action audit_action NOT NULL,
    changes jsonb,
    ip text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.device_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid NOT NULL,
    user_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone
);

CREATE TABLE public.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    event_id uuid,
    registered_by uuid,
    label text,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    max_scans_per_minute integer,
    device_role device_role DEFAULT 'scanner_unassigned'::device_role NOT NULL
);

CREATE TABLE public.event_artists (
    event_id uuid NOT NULL,
    artist_id uuid NOT NULL,
    role text
);

CREATE TABLE public.event_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon text,
    color text,
    sort_order integer DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.event_favourites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_live_stats (
    event_id uuid NOT NULL,
    tickets_sold integer DEFAULT 0 NOT NULL,
    tickets_available integer DEFAULT 0 NOT NULL,
    gross_sales_cents bigint DEFAULT 0 NOT NULL,
    successful_payments integer DEFAULT 0 NOT NULL,
    failed_payments integer DEFAULT 0 NOT NULL,
    checked_in_count integer DEFAULT 0 NOT NULL,
    last_order_at timestamp with time zone,
    last_scan_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_metrics_daily (
    org_id uuid NOT NULL,
    event_id uuid NOT NULL,
    day date NOT NULL,
    tickets_sold integer DEFAULT 0 NOT NULL,
    gross_revenue_cents bigint DEFAULT 0 NOT NULL,
    refunds_cents bigint DEFAULT 0 NOT NULL,
    unique_buyers integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_series (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text,
    series_type series_type NOT NULL,
    cover_image_url text,
    recurrence_pattern jsonb,
    starts_on date,
    ends_on date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_staff (
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    status event_status DEFAULT 'draft'::event_status NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    tz text DEFAULT 'Africa/Mbabane'::text,
    created_at timestamp with time zone DEFAULT now(),
    publish_at timestamp with time zone,
    unpublish_at timestamp with time zone,
    visibility text DEFAULT 'public'::text NOT NULL,
    cover_image_url text,
    category text,
    city text,
    country_code text,
    created_by uuid,
    published_at timestamp with time zone,
    description text,
    event_format event_format DEFAULT 'single_day'::event_format NOT NULL,
    series_id uuid,
    refund_policy jsonb,
    attendee_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    confirmation_message text,
    resale_cap_bps integer,
    featured_priority integer,
    search_text text,
    search_tsv tsvector,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    key text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    config jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    rollout_percent integer,
    owner uuid,
    description text,
    tags text[] DEFAULT ARRAY[]::text[] NOT NULL,
    last_changed_by uuid,
    last_changed_at timestamp with time zone
);

CREATE TABLE public.guestlist_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    ticket_type_id uuid,
    full_name text NOT NULL,
    email text,
    phone text,
    allocation integer DEFAULT 1 NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.guestlist_fulfillments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guestlist_entry_id uuid NOT NULL,
    order_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    payload jsonb NOT NULL,
    run_after timestamp with time zone DEFAULT now(),
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 8,
    last_error text,
    created_at timestamp with time zone DEFAULT now(),
    locked_at timestamp with time zone
);

CREATE TABLE public.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    event_id uuid,
    order_id uuid,
    payment_id uuid,
    refund_id uuid,
    payout_id uuid,
    type text NOT NULL,
    amount_cents integer NOT NULL,
    currency text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb
);

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    payload jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    channel text,
    dedupe_key text,
    read_at timestamp with time zone
);

CREATE TABLE public.order_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    price_rule_id uuid,
    type price_rule_type NOT NULL,
    scope text NOT NULL,
    target_order_item_id uuid,
    amount_cents integer NOT NULL,
    label text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    ticket_type_id uuid NOT NULL,
    seat_id uuid,
    ticket_code text NOT NULL,
    checked_in_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    name text,
    holder_name text,
    holder_email text,
    holder_phone text,
    transferred_from_order_item_id uuid,
    revoked_at timestamp with time zone,
    status order_item_status DEFAULT 'pending'::order_item_status NOT NULL,
    refunded_at timestamp with time zone,
    current_owner_id uuid
);

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    total_cents integer NOT NULL,
    currency text DEFAULT 'SZL'::text NOT NULL,
    status order_status DEFAULT 'pending'::order_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    channel sales_channel DEFAULT 'online'::sales_channel NOT NULL,
    device_id uuid,
    email text,
    phone text,
    subtotal_cents integer,
    item_count integer,
    platform_fee_cents integer,
    processor_fee_cents integer,
    fees_paid_by fee_payer,
    pricing_plan_id uuid,
    totals_computed_at timestamp with time zone,
    order_price_cents integer,
    order_platform_fee_cents integer,
    order_processor_fee_cents integer,
    order_currency text,
    pricing_plan_snapshot jsonb,
    buyer_email text,
    buyer_phone text,
    hold_expires_at timestamp with time zone
);

CREATE TABLE public.org_members (
    org_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role app_role DEFAULT 'organizer_staff'::app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.org_metrics_daily (
    org_id uuid NOT NULL,
    day date NOT NULL,
    tickets_sold integer DEFAULT 0 NOT NULL,
    gross_revenue_cents bigint DEFAULT 0 NOT NULL,
    refunds_cents bigint DEFAULT 0 NOT NULL,
    active_events integer DEFAULT 0 NOT NULL,
    unique_buyers integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    slug text NOT NULL,
    bio text,
    logo text,
    default_currency text DEFAULT 'SZL'::text NOT NULL
);

CREATE TABLE public.payment_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    provider text NOT NULL,
    attempt_no integer NOT NULL,
    status text NOT NULL,
    ext_ref text,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_id uuid
);

CREATE TABLE public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    method_type text DEFAULT 'card'::text NOT NULL,
    brand text,
    last4 text,
    exp_month integer,
    exp_year integer,
    token text,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payment_provider_settings (
    provider text NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    mode text DEFAULT 'test'::text NOT NULL,
    public_key text,
    secret_key text,
    webhook_secret text,
    callback_url text,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payment_routing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    country_code text,
    currency text,
    provider text NOT NULL,
    fallback_provider text,
    is_active boolean DEFAULT true NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    provider text NOT NULL,
    amount_cents integer NOT NULL,
    currency text NOT NULL,
    ext_payment_id text,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now(),
    status payments_status DEFAULT 'pending'::payments_status,
    channel sales_channel
);

CREATE TABLE public.payout_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    provider text NOT NULL,
    details_encrypted text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'SZL'::text NOT NULL,
    provider text NOT NULL,
    destination_ref text,
    created_at timestamp with time zone DEFAULT now(),
    paid_at timestamp with time zone,
    status payout_status DEFAULT 'requested'::payout_status NOT NULL
);

CREATE TABLE public.price_rule_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    price_rule_id uuid NOT NULL,
    user_id uuid,
    order_id uuid,
    redeemed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.price_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    event_id uuid,
    ticket_type_id uuid,
    code text,
    type price_rule_type NOT NULL,
    value_numeric numeric(10,2) NOT NULL,
    applies_to text DEFAULT 'item'::text NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    max_redemptions integer,
    per_user_limit integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    channel sales_channel[] DEFAULT '{}'::sales_channel[]
);

CREATE TABLE public.pricing_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    platform_percent_bps integer DEFAULT 500 NOT NULL,
    platform_fixed_cents integer DEFAULT 250 NOT NULL,
    processor_percent_bps integer DEFAULT 200 NOT NULL,
    processor_fixed_cents integer DEFAULT 0 NOT NULL,
    platform_fee_payer fee_payer DEFAULT 'buyer'::fee_payer NOT NULL,
    processor_fee_payer fee_payer DEFAULT 'buyer'::fee_payer NOT NULL,
    min_platform_fee_cents integer DEFAULT 0,
    max_platform_fee_cents integer,
    currency text DEFAULT 'SZL'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.profiles (
    user_id uuid NOT NULL,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    surname text,
    phone text,
    role app_role DEFAULT 'attendee'::app_role NOT NULL
);

CREATE TABLE public.refund_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refund_id uuid NOT NULL,
    order_item_id uuid,
    amount_cents integer NOT NULL,
    currency text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid
);

CREATE TABLE public.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    amount_cents integer NOT NULL,
    currency text NOT NULL,
    type refund_type DEFAULT 'full'::refund_type NOT NULL,
    status refund_status DEFAULT 'requested'::refund_status NOT NULL,
    provider_ref text,
    provider_payload jsonb,
    initiated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone
);

CREATE TABLE public.resale_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    org_id uuid NOT NULL,
    price_cents integer NOT NULL,
    currency text DEFAULT 'SZL'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    listing_expires_at timestamp with time zone,
    transfer_fee_cents integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    transfer_id uuid
);

CREATE TABLE public.scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    order_item_id uuid,
    ticket_code text NOT NULL,
    outcome text NOT NULL,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    device_id uuid,
    device_session_id uuid,
    gate text,
    notes text,
    request_hash text,
    source_ip inet
);

CREATE TABLE public.seat_holds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    ticket_type_id uuid,
    hold_code text,
    status seat_hold_status DEFAULT 'active'::seat_hold_status NOT NULL,
    quantity integer NOT NULL,
    expires_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.seat_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    schema jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.seat_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    seat_id uuid NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    active boolean DEFAULT true
);

CREATE TABLE public.seats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seat_map_id uuid NOT NULL,
    label text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.series_follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    series_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.ticket_type_channels (
    ticket_type_id uuid NOT NULL,
    channel sales_channel NOT NULL,
    quota integer,
    per_order_limit integer
);

CREATE TABLE public.ticket_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    name text NOT NULL,
    price_cents integer NOT NULL,
    currency text DEFAULT 'SZL'::text NOT NULL,
    quota integer NOT NULL,
    per_user_limit integer DEFAULT 10,
    is_reserved_seating boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sales_status ticket_type_sales_status DEFAULT 'on_sale'::ticket_type_sales_status NOT NULL,
    sales_paused_at timestamp with time zone,
    sales_pause_reason text
);

CREATE TABLE public.transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid,
    from_user_id uuid,
    to_user_id uuid,
    status transfer_status DEFAULT 'requested'::transfer_status NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    status connection_status DEFAULT 'pending'::connection_status NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone
);

CREATE TABLE public.user_handles (
    user_id uuid NOT NULL,
    handle text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_notification_preferences (
    user_id uuid NOT NULL,
    email_opt_in boolean DEFAULT true NOT NULL,
    sms_opt_in boolean DEFAULT false NOT NULL,
    push_opt_in boolean DEFAULT true NOT NULL,
    in_app_opt_in boolean DEFAULT true NOT NULL,
    preferred_channel text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.venues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    name text NOT NULL,
    address text,
    tz text DEFAULT 'Africa/Mbabane'::text,
    capacity integer,
    created_at timestamp with time zone DEFAULT now(),
    city text,
    slug text NOT NULL,
    name_key text DEFAULT lower(regexp_replace(TRIM(BOTH FROM name), '\s+'::text, ' '::text, 'g'::text)),
    city_key text DEFAULT lower(regexp_replace(TRIM(BOTH FROM COALESCE(city, ''::text)), '\s+'::text, ' '::text, 'g'::text))
);

CREATE TABLE public.waitlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    ticket_type_id uuid,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    email text,
    first_name text,
    last_name text,
    quantity_requested integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    offer_expires_at timestamp with time zone,
    notified_at timestamp with time zone,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    attempt_no integer DEFAULT 1 NOT NULL,
    response_status integer,
    response_body text,
    duration_ms integer,
    delivered_at timestamp with time zone,
    next_retry_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.webhook_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    url text NOT NULL,
    description text,
    secret text,
    events text[] DEFAULT ARRAY[]::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_delivery_at timestamp with time zone,
    last_status_code integer
);

CREATE TABLE public.webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    signature text,
    payload jsonb NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    provider_event_id text
);

-- ============ PRIMARY KEYS / UNIQUE / CHECK / FOREIGN KEYS ============
-- (FKs to auth.users assume the Supabase auth schema is present.)
ALTER TABLE public.admin_action_catalog ADD CONSTRAINT admin_action_catalog_pkey PRIMARY KEY (key);
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_pkey PRIMARY KEY (user_id);
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.app_audit_log ADD CONSTRAINT app_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.artists ADD CONSTRAINT artists_pkey PRIMARY KEY (id);
ALTER TABLE public.artists ADD CONSTRAINT artists_slug_format CHECK (((slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text) AND ((length(slug) >= 2) AND (length(slug) <= 80))));
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);
ALTER TABLE public.device_sessions ADD CONSTRAINT device_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.device_sessions ADD CONSTRAINT device_sessions_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;
ALTER TABLE public.device_sessions ADD CONSTRAINT device_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.devices ADD CONSTRAINT uq_devices_org_label UNIQUE (org_id, label);
ALTER TABLE public.devices ADD CONSTRAINT devices_pkey PRIMARY KEY (id);
ALTER TABLE public.devices ADD CONSTRAINT devices_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE public.devices ADD CONSTRAINT devices_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.devices ADD CONSTRAINT devices_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES auth.users(id);
ALTER TABLE public.event_artists ADD CONSTRAINT event_artists_pkey PRIMARY KEY (event_id, artist_id);
ALTER TABLE public.event_artists ADD CONSTRAINT event_artists_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;
ALTER TABLE public.event_artists ADD CONSTRAINT event_artists_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.event_categories ADD CONSTRAINT event_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.event_categories ADD CONSTRAINT event_categories_name_not_blank CHECK ((length(TRIM(BOTH FROM name)) > 0));
ALTER TABLE public.event_categories ADD CONSTRAINT event_categories_slug_format CHECK (((slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text) AND ((length(slug) >= 2) AND (length(slug) <= 80))));
ALTER TABLE public.event_dates ADD CONSTRAINT event_dates_pkey PRIMARY KEY (id);
ALTER TABLE public.event_dates ADD CONSTRAINT event_dates_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.event_dates ADD CONSTRAINT event_dates_starts_before_ends CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (starts_at < ends_at)));
ALTER TABLE public.event_dates ADD CONSTRAINT event_dates_starts_ends_chk CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (starts_at <= ends_at)));
ALTER TABLE public.event_dates ADD CONSTRAINT event_dates_time_range CHECK ((ends_at > starts_at));
ALTER TABLE public.event_favourites ADD CONSTRAINT event_favourites_user_id_event_id_key UNIQUE (user_id, event_id);
ALTER TABLE public.event_favourites ADD CONSTRAINT event_favourites_pkey PRIMARY KEY (id);
ALTER TABLE public.event_favourites ADD CONSTRAINT event_favourites_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.event_favourites ADD CONSTRAINT event_favourites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.event_live_stats ADD CONSTRAINT event_live_stats_pkey PRIMARY KEY (event_id);
ALTER TABLE public.event_live_stats ADD CONSTRAINT event_live_stats_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.event_live_stats ADD CONSTRAINT event_live_stats_checked_in_count_check CHECK ((checked_in_count >= 0));
ALTER TABLE public.event_live_stats ADD CONSTRAINT event_live_stats_failed_payments_check CHECK ((failed_payments >= 0));
ALTER TABLE public.event_live_stats ADD CONSTRAINT event_live_stats_gross_sales_cents_check CHECK ((gross_sales_cents >= 0));
ALTER TABLE public.event_live_stats ADD CONSTRAINT event_live_stats_successful_payments_check CHECK ((successful_payments >= 0));
ALTER TABLE public.event_live_stats ADD CONSTRAINT event_live_stats_tickets_available_check CHECK ((tickets_available >= 0));
ALTER TABLE public.event_live_stats ADD CONSTRAINT event_live_stats_tickets_sold_check CHECK ((tickets_sold >= 0));
ALTER TABLE public.event_metrics_daily ADD CONSTRAINT event_metrics_daily_pkey PRIMARY KEY (event_id, day);
ALTER TABLE public.event_series ADD CONSTRAINT event_series_slug_key UNIQUE (slug);
ALTER TABLE public.event_series ADD CONSTRAINT event_series_pkey PRIMARY KEY (id);
ALTER TABLE public.event_series ADD CONSTRAINT event_series_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.event_series ADD CONSTRAINT event_series_date_order CHECK (((starts_on IS NULL) OR (ends_on IS NULL) OR (ends_on >= starts_on)));
ALTER TABLE public.event_series ADD CONSTRAINT event_series_recurrence_only_for_recurring CHECK (((series_type = 'recurring'::series_type) OR (recurrence_pattern IS NULL)));
ALTER TABLE public.event_series ADD CONSTRAINT event_series_slug_format CHECK (((slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text) AND ((length(slug) >= 2) AND (length(slug) <= 80))));
ALTER TABLE public.event_staff ADD CONSTRAINT event_staff_pkey PRIMARY KEY (event_id, user_id);
ALTER TABLE public.event_staff ADD CONSTRAINT event_staff_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.event_staff ADD CONSTRAINT event_staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.event_staff ADD CONSTRAINT event_staff_role_check CHECK ((role = ANY (ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role, 'scanner'::app_role])));
ALTER TABLE public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE public.events ADD CONSTRAINT events_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.events ADD CONSTRAINT events_series_id_fkey FOREIGN KEY (series_id) REFERENCES event_series(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD CONSTRAINT events_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT;
ALTER TABLE public.events ADD CONSTRAINT events_featured_priority_check CHECK (((featured_priority IS NULL) OR ((featured_priority >= 0) AND (featured_priority <= 1000))));
ALTER TABLE public.events ADD CONSTRAINT events_multi_day_requires_dates CHECK (((event_format = 'single_day'::event_format) OR ((starts_at IS NOT NULL) AND (ends_at IS NOT NULL) AND (ends_at > starts_at))));
ALTER TABLE public.events ADD CONSTRAINT events_publish_unpublish_chk CHECK (((publish_at IS NULL) OR (unpublish_at IS NULL) OR (publish_at <= unpublish_at)));
ALTER TABLE public.events ADD CONSTRAINT events_publish_window CHECK (((publish_at IS NULL) OR (unpublish_at IS NULL) OR (publish_at <= unpublish_at)));
ALTER TABLE public.events ADD CONSTRAINT events_publish_window_chk CHECK (((publish_at IS NULL) OR (unpublish_at IS NULL) OR (publish_at < unpublish_at)));
ALTER TABLE public.events ADD CONSTRAINT events_resale_cap_bps_check CHECK (((resale_cap_bps IS NULL) OR ((resale_cap_bps >= 0) AND (resale_cap_bps <= 100000))));
ALTER TABLE public.events ADD CONSTRAINT events_slug_not_blank_chk CHECK ((length(TRIM(BOTH FROM slug)) > 0));
ALTER TABLE public.events ADD CONSTRAINT events_starts_before_ends CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (starts_at < ends_at)));
ALTER TABLE public.events ADD CONSTRAINT events_starts_ends_chk CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (starts_at <= ends_at)));
ALTER TABLE public.events ADD CONSTRAINT events_time_order CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (starts_at <= ends_at)));
ALTER TABLE public.events ADD CONSTRAINT events_time_range CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (ends_at > starts_at)));
ALTER TABLE public.events ADD CONSTRAINT events_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'unlisted'::text, 'private'::text])));
ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);
ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_last_changed_by_fkey FOREIGN KEY (last_changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_owner_fkey FOREIGN KEY (owner) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_rollout_percent_check CHECK (((rollout_percent IS NULL) OR ((rollout_percent >= 0) AND (rollout_percent <= 100))));
ALTER TABLE public.guestlist_entries ADD CONSTRAINT guestlist_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.guestlist_entries ADD CONSTRAINT guestlist_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.guestlist_entries ADD CONSTRAINT guestlist_entries_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.guestlist_entries ADD CONSTRAINT guestlist_entries_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE SET NULL;
ALTER TABLE public.guestlist_entries ADD CONSTRAINT guestlist_entries_allocation_check CHECK ((allocation > 0));
ALTER TABLE public.guestlist_fulfillments ADD CONSTRAINT ux_guestlist_fulfillments_once UNIQUE (guestlist_entry_id, order_id);
ALTER TABLE public.guestlist_fulfillments ADD CONSTRAINT guestlist_fulfillments_pkey PRIMARY KEY (id);
ALTER TABLE public.guestlist_fulfillments ADD CONSTRAINT guestlist_fulfillments_guestlist_entry_id_fkey FOREIGN KEY (guestlist_entry_id) REFERENCES guestlist_entries(id) ON DELETE CASCADE;
ALTER TABLE public.guestlist_fulfillments ADD CONSTRAINT guestlist_fulfillments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE SET NULL;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_refund_id_fkey FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE SET NULL;
ALTER TABLE public.ledger_entries ADD CONSTRAINT check_ledger_entries_type_allow_reversal CHECK ((type = ANY (ARRAY['order_gross'::text, 'fee'::text, 'tax'::text, 'discount'::text, 'payment_net'::text, 'refund'::text, 'payout'::text, 'reversal'::text])));
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_type_check CHECK ((type = ANY (ARRAY['order_gross'::text, 'fee'::text, 'tax'::text, 'discount'::text, 'payment_net'::text, 'refund'::text, 'payout'::text])));
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT check_notifications_type_channel CHECK (((type = ANY (ARRAY['email_confirmation'::text, 'ticket_delivery'::text, 'transfer_notification'::text, 'refund_alert'::text, 'generic'::text])) AND ((channel IS NULL) OR (channel = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text, 'in_app'::text])))));
ALTER TABLE public.order_adjustments ADD CONSTRAINT order_adjustments_pkey PRIMARY KEY (id);
ALTER TABLE public.order_adjustments ADD CONSTRAINT order_adjustments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_adjustments ADD CONSTRAINT order_adjustments_price_rule_id_fkey FOREIGN KEY (price_rule_id) REFERENCES price_rules(id) ON DELETE SET NULL;
ALTER TABLE public.order_adjustments ADD CONSTRAINT order_adjustments_target_order_item_id_fkey FOREIGN KEY (target_order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;
ALTER TABLE public.order_adjustments ADD CONSTRAINT order_adjustments_scope_check CHECK ((scope = ANY (ARRAY['order'::text, 'item'::text])));
ALTER TABLE public.order_items ADD CONSTRAINT order_items_ticket_code_key UNIQUE (ticket_code);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_current_owner_id_fkey FOREIGN KEY (current_owner_id) REFERENCES auth.users(id);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_transferred_from_order_item_id_fkey FOREIGN KEY (transferred_from_order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.orders ADD CONSTRAINT orders_pricing_plan_id_fkey FOREIGN KEY (pricing_plan_id) REFERENCES pricing_plans(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_currency_iso CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.orders ADD CONSTRAINT orders_order_currency_check CHECK ((order_currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.orders ADD CONSTRAINT orders_total_cents_check CHECK ((total_cents >= 0));
ALTER TABLE public.orders ADD CONSTRAINT orders_total_nonneg CHECK ((total_cents >= 0));
ALTER TABLE public.org_members ADD CONSTRAINT org_members_pkey PRIMARY KEY (org_id, user_id);
ALTER TABLE public.org_members ADD CONSTRAINT org_members_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.org_members ADD CONSTRAINT org_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.org_metrics_daily ADD CONSTRAINT org_metrics_daily_pkey PRIMARY KEY (org_id, day);
ALTER TABLE public.organizations ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);
ALTER TABLE public.organizations ADD CONSTRAINT organizations_default_currency_check CHECK ((default_currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.organizations ADD CONSTRAINT organizations_slug_format CHECK (((slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text) AND ((length(slug) >= 2) AND (length(slug) <= 80))));
ALTER TABLE public.payment_attempts ADD CONSTRAINT payment_attempts_order_id_provider_attempt_no_key UNIQUE (order_id, provider, attempt_no);
ALTER TABLE public.payment_attempts ADD CONSTRAINT payment_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.payment_attempts ADD CONSTRAINT payment_attempts_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.payment_attempts ADD CONSTRAINT payment_attempts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE public.payment_attempts ADD CONSTRAINT payment_attempts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'timed_out'::text, 'cancelled'::text])));
ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);
ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.payment_provider_settings ADD CONSTRAINT payment_provider_settings_pkey PRIMARY KEY (provider);
ALTER TABLE public.payment_provider_settings ADD CONSTRAINT payment_provider_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.payment_provider_settings ADD CONSTRAINT payment_provider_settings_mode_check CHECK ((mode = ANY (ARRAY['test'::text, 'live'::text])));
ALTER TABLE public.payment_provider_settings ADD CONSTRAINT payment_provider_settings_provider_check CHECK ((provider = ANY (ARRAY['paystack'::text, 'deltapay'::text, 'flutterwave'::text, 'manual'::text])));
ALTER TABLE public.payment_routing_rules ADD CONSTRAINT payment_routing_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.payment_routing_rules ADD CONSTRAINT payment_routing_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE public.payments ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD CONSTRAINT payments_currency_iso CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.payout_accounts ADD CONSTRAINT payout_accounts_pkey PRIMARY KEY (id);
ALTER TABLE public.payout_accounts ADD CONSTRAINT payout_accounts_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);
ALTER TABLE public.payouts ADD CONSTRAINT payouts_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_amount_cents_check CHECK ((amount_cents >= 0));
ALTER TABLE public.payouts ADD CONSTRAINT payouts_currency_iso CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.price_rule_redemptions ADD CONSTRAINT price_rule_redemptions_pkey PRIMARY KEY (id);
ALTER TABLE public.price_rule_redemptions ADD CONSTRAINT price_rule_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);
ALTER TABLE public.price_rule_redemptions ADD CONSTRAINT price_rule_redemptions_price_rule_id_fkey FOREIGN KEY (price_rule_id) REFERENCES price_rules(id) ON DELETE CASCADE;
ALTER TABLE public.price_rule_redemptions ADD CONSTRAINT price_rule_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.price_rules ADD CONSTRAINT uq_price_rules_event_code UNIQUE (event_id, code);
ALTER TABLE public.price_rules ADD CONSTRAINT price_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.price_rules ADD CONSTRAINT price_rules_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.price_rules ADD CONSTRAINT price_rules_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.price_rules ADD CONSTRAINT price_rules_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE;
ALTER TABLE public.price_rules ADD CONSTRAINT ck_price_rules_channel_no_dups CHECK ((NOT fn_array_has_dups(channel)));
ALTER TABLE public.price_rules ADD CONSTRAINT price_rules_applies_to_check CHECK ((applies_to = ANY (ARRAY['item'::text, 'order'::text])));
ALTER TABLE public.pricing_plans ADD CONSTRAINT pricing_plans_org_id_active_key UNIQUE (org_id, active) DEFERRABLE;
ALTER TABLE public.pricing_plans ADD CONSTRAINT pricing_plans_pkey PRIMARY KEY (id);
ALTER TABLE public.pricing_plans ADD CONSTRAINT pricing_plans_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.pricing_plans ADD CONSTRAINT pricing_plans_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.refund_items ADD CONSTRAINT refund_items_pkey PRIMARY KEY (id);
ALTER TABLE public.refund_items ADD CONSTRAINT refund_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
ALTER TABLE public.refund_items ADD CONSTRAINT refund_items_refund_id_fkey FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE CASCADE;
ALTER TABLE public.refund_items ADD CONSTRAINT refund_items_amount_cents_check CHECK ((amount_cents >= 0));
ALTER TABLE public.refund_items ADD CONSTRAINT refund_items_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.refunds ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);
ALTER TABLE public.refunds ADD CONSTRAINT refunds_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.refunds ADD CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT;
ALTER TABLE public.refunds ADD CONSTRAINT refunds_amount_cents_check CHECK ((amount_cents >= 0));
ALTER TABLE public.refunds ADD CONSTRAINT refunds_currency_iso CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.resale_listings ADD CONSTRAINT resale_listings_pkey PRIMARY KEY (id);
ALTER TABLE public.resale_listings ADD CONSTRAINT resale_listings_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;
ALTER TABLE public.resale_listings ADD CONSTRAINT resale_listings_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);
ALTER TABLE public.resale_listings ADD CONSTRAINT resale_listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id);
ALTER TABLE public.resale_listings ADD CONSTRAINT resale_listings_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE SET NULL;
ALTER TABLE public.resale_listings ADD CONSTRAINT resale_listings_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.resale_listings ADD CONSTRAINT resale_listings_price_cents_check CHECK ((price_cents >= 0));
ALTER TABLE public.resale_listings ADD CONSTRAINT resale_listings_status_check CHECK ((status = ANY (ARRAY['active'::text, 'sold'::text, 'cancelled'::text, 'expired'::text])));
ALTER TABLE public.resale_listings ADD CONSTRAINT resale_listings_transfer_fee_cents_check CHECK ((transfer_fee_cents >= 0));
ALTER TABLE public.scans ADD CONSTRAINT scans_pkey PRIMARY KEY (id);
ALTER TABLE public.scans ADD CONSTRAINT scans_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL;
ALTER TABLE public.scans ADD CONSTRAINT scans_device_session_id_fkey FOREIGN KEY (device_session_id) REFERENCES device_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.scans ADD CONSTRAINT scans_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.scans ADD CONSTRAINT scans_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
ALTER TABLE public.scans ADD CONSTRAINT scans_outcome_check CHECK ((outcome = ANY (ARRAY['valid'::text, 'already_used'::text, 'revoked'::text, 'invalid'::text, 'wrong_event'::text])));
ALTER TABLE public.seat_holds ADD CONSTRAINT seat_holds_pkey PRIMARY KEY (id);
ALTER TABLE public.seat_holds ADD CONSTRAINT seat_holds_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.seat_holds ADD CONSTRAINT seat_holds_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.seat_holds ADD CONSTRAINT seat_holds_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE;
ALTER TABLE public.seat_holds ADD CONSTRAINT seat_holds_quantity_check CHECK ((quantity > 0));
ALTER TABLE public.seat_maps ADD CONSTRAINT seat_maps_pkey PRIMARY KEY (id);
ALTER TABLE public.seat_maps ADD CONSTRAINT seat_maps_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.seat_reservations ADD CONSTRAINT no_overlapping_seat_reservations EXCLUDE USING gist (seat_id WITH =, tstzrange(created_at, expires_at, '[]'::text) WITH &&) WHERE (active) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.seat_reservations ADD CONSTRAINT seat_reservations_pkey PRIMARY KEY (id);
ALTER TABLE public.seat_reservations ADD CONSTRAINT seat_reservations_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.seat_reservations ADD CONSTRAINT seat_reservations_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE;
ALTER TABLE public.seat_reservations ADD CONSTRAINT seat_reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public.seats ADD CONSTRAINT seats_unique_label_per_map UNIQUE (seat_map_id, label);
ALTER TABLE public.seats ADD CONSTRAINT seats_pkey PRIMARY KEY (id);
ALTER TABLE public.seats ADD CONSTRAINT seats_seat_map_id_fkey FOREIGN KEY (seat_map_id) REFERENCES seat_maps(id) ON DELETE CASCADE;
ALTER TABLE public.series_follows ADD CONSTRAINT series_follows_user_id_series_id_key UNIQUE (user_id, series_id);
ALTER TABLE public.series_follows ADD CONSTRAINT series_follows_pkey PRIMARY KEY (id);
ALTER TABLE public.series_follows ADD CONSTRAINT series_follows_series_id_fkey FOREIGN KEY (series_id) REFERENCES event_series(id) ON DELETE CASCADE;
ALTER TABLE public.series_follows ADD CONSTRAINT series_follows_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ticket_type_channels ADD CONSTRAINT ticket_type_channels_pkey PRIMARY KEY (ticket_type_id, channel);
ALTER TABLE public.ticket_type_channels ADD CONSTRAINT ticket_type_channels_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE;
ALTER TABLE public.ticket_type_channels ADD CONSTRAINT ticket_type_channels_per_order_limit_check CHECK ((per_order_limit >= 0));
ALTER TABLE public.ticket_type_channels ADD CONSTRAINT ticket_type_channels_quota_check CHECK ((quota >= 0));
ALTER TABLE public.ticket_types ADD CONSTRAINT ux_ticket_types_event_name UNIQUE (event_id, name);
ALTER TABLE public.ticket_types ADD CONSTRAINT ticket_types_pkey PRIMARY KEY (id);
ALTER TABLE public.ticket_types ADD CONSTRAINT ticket_types_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.ticket_types ADD CONSTRAINT ticket_types_currency_iso CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.ticket_types ADD CONSTRAINT ticket_types_per_user_limit_check CHECK ((per_user_limit >= 0));
ALTER TABLE public.ticket_types ADD CONSTRAINT ticket_types_price_cents_check CHECK ((price_cents >= 0));
ALTER TABLE public.ticket_types ADD CONSTRAINT ticket_types_quota_check CHECK ((quota >= 0));
ALTER TABLE public.transfers ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);
ALTER TABLE public.transfers ADD CONSTRAINT transfers_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES auth.users(id);
ALTER TABLE public.transfers ADD CONSTRAINT transfers_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
ALTER TABLE public.transfers ADD CONSTRAINT transfers_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES auth.users(id);
ALTER TABLE public.user_connections ADD CONSTRAINT user_connections_pkey PRIMARY KEY (id);
ALTER TABLE public.user_connections ADD CONSTRAINT user_connections_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_connections ADD CONSTRAINT user_connections_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_connections ADD CONSTRAINT user_connections_no_self CHECK ((requester_id <> recipient_id));
ALTER TABLE public.user_handles ADD CONSTRAINT user_handles_pkey PRIMARY KEY (user_id);
ALTER TABLE public.user_handles ADD CONSTRAINT user_handles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_handles ADD CONSTRAINT user_handles_handle_format CHECK (((handle ~ '^[a-z0-9][a-z0-9_]{2,29}$'::text) AND (handle = lower(handle))));
ALTER TABLE public.user_notification_preferences ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (user_id);
ALTER TABLE public.user_notification_preferences ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.venues ADD CONSTRAINT venues_pkey PRIMARY KEY (id);
ALTER TABLE public.venues ADD CONSTRAINT venues_capacity_check CHECK ((capacity >= 0));
ALTER TABLE public.venues ADD CONSTRAINT venues_slug_format CHECK (((slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text) AND ((length(slug) >= 2) AND (length(slug) <= 80))));
ALTER TABLE public.waitlists ADD CONSTRAINT waitlists_ticket_type_id_user_id_key UNIQUE (ticket_type_id, user_id);
ALTER TABLE public.waitlists ADD CONSTRAINT waitlists_pkey PRIMARY KEY (id);
ALTER TABLE public.waitlists ADD CONSTRAINT waitlists_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.waitlists ADD CONSTRAINT waitlists_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE;
ALTER TABLE public.waitlists ADD CONSTRAINT waitlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.waitlists ADD CONSTRAINT waitlists_identity_present CHECK (((email IS NOT NULL) OR (user_id IS NOT NULL)));
ALTER TABLE public.waitlists ADD CONSTRAINT waitlists_quantity_requested_check CHECK ((quantity_requested > 0));
ALTER TABLE public.waitlists ADD CONSTRAINT waitlists_status_check CHECK ((status = ANY (ARRAY['active'::text, 'offered'::text, 'converted'::text, 'expired'::text, 'cancelled'::text])));
ALTER TABLE public.webhook_deliveries ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);
ALTER TABLE public.webhook_deliveries ADD CONSTRAINT webhook_deliveries_endpoint_id_fkey FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints(id) ON DELETE CASCADE;
ALTER TABLE public.webhook_endpoints ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);
ALTER TABLE public.webhook_endpoints ADD CONSTRAINT webhook_endpoints_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.webhook_endpoints ADD CONSTRAINT webhook_endpoints_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.webhooks ADD CONSTRAINT ux_webhooks_provider_sig UNIQUE (provider, signature);
ALTER TABLE public.webhooks ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);

-- ============ INDEXES (non-constraint) ============
-- Depends on extensions pg_trgm (gin_trgm_ops) and the app.normalize_ticket_code
-- function (idx_order_items_norm_code) — both out of scope for this file.
CREATE INDEX idx_admin_users_user ON public.admin_users USING btree (user_id);
CREATE INDEX idx_app_audit_log_changed_by ON public.app_audit_log USING btree (changed_by);
CREATE INDEX idx_app_audit_log_occurred_at ON public.app_audit_log USING btree (occurred_at);
CREATE INDEX idx_app_audit_log_schema_table ON public.app_audit_log USING btree (schema_name, table_name);
CREATE UNIQUE INDEX artists_global_name_unique ON public.artists USING btree (name_key);
CREATE UNIQUE INDEX artists_slug_unique ON public.artists USING btree (slug);
CREATE INDEX idx_artists_primary_user_id ON public.artists USING btree (primary_user_id);
CREATE INDEX idx_audit_log_actor_id ON public.audit_log USING btree (actor_id);
CREATE INDEX idx_audit_log_org_id ON public.audit_log USING btree (org_id);
CREATE INDEX idx_device_sessions_device_id ON public.device_sessions USING btree (device_id);
CREATE INDEX idx_device_sessions_user_id ON public.device_sessions USING btree (user_id);
CREATE INDEX devices_event_idx ON public.devices USING btree (event_id);
CREATE INDEX devices_org_idx ON public.devices USING btree (org_id);
CREATE INDEX idx_devices_registered_by ON public.devices USING btree (registered_by);
CREATE INDEX idx_event_artists_artist_id ON public.event_artists USING btree (artist_id);
CREATE INDEX event_categories_active_sort_idx ON public.event_categories USING btree (is_active, sort_order, name);
CREATE UNIQUE INDEX event_categories_name_unique ON public.event_categories USING btree (lower(TRIM(BOTH FROM name)));
CREATE UNIQUE INDEX event_categories_slug_unique ON public.event_categories USING btree (slug);
CREATE INDEX idx_event_dates_event_starts ON public.event_dates USING btree (event_id, starts_at);
CREATE INDEX idx_event_favourites_event_id ON public.event_favourites USING btree (event_id);
CREATE INDEX idx_event_favourites_user_id ON public.event_favourites USING btree (user_id);
CREATE INDEX idx_event_metrics_daily_org_day ON public.event_metrics_daily USING btree (org_id, day);
CREATE INDEX event_series_org_idx ON public.event_series USING btree (org_id);
CREATE INDEX idx_event_staff_event_user_role_active ON public.event_staff USING btree (event_id, user_id, role, active);
CREATE INDEX idx_event_staff_user ON public.event_staff USING btree (user_id, event_id);
CREATE UNIQUE INDEX events_org_slug_unique ON public.events USING btree (org_id, slug);
CREATE INDEX events_public_idx ON public.events USING btree (status, visibility, publish_at, unpublish_at);
CREATE INDEX events_series_id_idx ON public.events USING btree (series_id) WHERE (series_id IS NOT NULL);
CREATE INDEX idx_events_created_by ON public.events USING btree (created_by);
CREATE INDEX idx_events_featured_priority ON public.events USING btree (featured_priority DESC NULLS LAST, starts_at) WHERE (featured_priority IS NOT NULL);
CREATE INDEX idx_events_org_id ON public.events USING btree (org_id);
CREATE INDEX idx_events_org_visibility_publish_status ON public.events USING btree (org_id, visibility, publish_at, unpublish_at, status);
CREATE INDEX idx_events_public_window ON public.events USING btree (visibility, publish_at, unpublish_at, status);
CREATE INDEX idx_events_publish_at ON public.events USING btree (publish_at);
CREATE INDEX idx_events_publish_window ON public.events USING btree (publish_at, unpublish_at);
CREATE INDEX idx_events_published_future ON public.events USING btree (starts_at) WHERE ((status = 'published'::event_status) AND (starts_at IS NOT NULL));
CREATE INDEX idx_events_search_tsv ON public.events USING gin (search_tsv);
CREATE INDEX idx_events_slug ON public.events USING btree (slug);
CREATE INDEX idx_events_starts_at ON public.events USING btree (starts_at);
CREATE INDEX idx_events_status ON public.events USING btree (status);
CREATE INDEX idx_events_status_visibility ON public.events USING btree (status, visibility);
CREATE INDEX idx_events_time ON public.events USING btree (starts_at, ends_at);
CREATE INDEX idx_events_title_trgm ON public.events USING gin (title gin_trgm_ops);
CREATE INDEX idx_events_venue_id ON public.events USING btree (venue_id);
CREATE INDEX idx_feature_flags_last_changed_by ON public.feature_flags USING btree (last_changed_by);
CREATE INDEX idx_feature_flags_org_id ON public.feature_flags USING btree (org_id);
CREATE INDEX idx_feature_flags_owner ON public.feature_flags USING btree (owner);
CREATE UNIQUE INDEX ux_feature_flags_org_scoped_key ON public.feature_flags USING btree (org_id, key) WHERE (org_id IS NOT NULL);
CREATE UNIQUE INDEX ux_feature_flags_platform_key ON public.feature_flags USING btree (key) WHERE (org_id IS NULL);
CREATE INDEX idx_guestlist_entries_created_by ON public.guestlist_entries USING btree (created_by);
CREATE INDEX idx_guestlist_entries_event_id ON public.guestlist_entries USING btree (event_id);
CREATE INDEX idx_guestlist_entries_ticket_type ON public.guestlist_entries USING btree (ticket_type_id);
CREATE INDEX idx_guestlist_fulfillments_entry ON public.guestlist_fulfillments USING btree (guestlist_entry_id);
CREATE INDEX idx_guestlist_fulfillments_order ON public.guestlist_fulfillments USING btree (order_id);
CREATE INDEX idx_jobs_locked_at ON public.jobs USING btree (locked_at);
CREATE INDEX idx_jobs_run_after ON public.jobs USING btree (run_after) WHERE (locked_at IS NULL);
CREATE INDEX idx_jobs_run_after_locked_at ON public.jobs USING btree (run_after, locked_at);
CREATE INDEX idx_ledger_entries_event_id ON public.ledger_entries USING btree (event_id);
CREATE INDEX idx_ledger_entries_payment_id ON public.ledger_entries USING btree (payment_id);
CREATE INDEX idx_ledger_entries_payout_id ON public.ledger_entries USING btree (payout_id);
CREATE INDEX idx_ledger_entries_refund_id ON public.ledger_entries USING btree (refund_id);
CREATE INDEX idx_ledger_order ON public.ledger_entries USING btree (order_id);
CREATE INDEX idx_ledger_org_event_occurred_at ON public.ledger_entries USING btree (org_id, event_id, occurred_at);
CREATE INDEX idx_ledger_org_id ON public.ledger_entries USING btree (org_id);
CREATE INDEX idx_notifications_scheduled_at ON public.notifications USING btree (scheduled_at);
CREATE INDEX idx_notifications_status ON public.notifications USING btree (status);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_notifications_user_read_created ON public.notifications USING btree (user_id, read_at, created_at DESC);
CREATE UNIQUE INDEX notifications_dedupe_key_unique ON public.notifications USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL);
CREATE INDEX idx_order_adjustments_order_id ON public.order_adjustments USING btree (order_id);
CREATE INDEX idx_order_adjustments_price_rule_id ON public.order_adjustments USING btree (price_rule_id);
CREATE INDEX idx_order_adjustments_target_order_item_id ON public.order_adjustments USING btree (target_order_item_id);
CREATE INDEX idx_items_ticket_code ON public.order_items USING btree (ticket_code);
CREATE INDEX idx_order_items_order_id_ticket_type_id ON public.order_items USING btree (order_id, ticket_type_id);
CREATE INDEX idx_order_items_order_ticket_checked ON public.order_items USING btree (order_id, ticket_type_id, ticket_code, checked_in_at);
CREATE INDEX idx_order_items_ticket_order ON public.order_items USING btree (ticket_type_id, order_id);
CREATE INDEX idx_order_items_ticket_type_id ON public.order_items USING btree (ticket_type_id);
CREATE INDEX idx_order_items_transferred_from_order_item_id ON public.order_items USING btree (transferred_from_order_item_id);
CREATE INDEX order_items_event_ticket_idx ON public.order_items USING btree (ticket_type_id, created_at DESC);
CREATE INDEX order_items_order_idx ON public.order_items USING btree (order_id);
CREATE INDEX order_items_ticket_code_norm_idx ON public.order_items USING btree (regexp_replace(upper(ticket_code), '[^A-Z0-9]'::text, ''::text, 'g'::text));
CREATE UNIQUE INDEX seat_sold_once ON public.order_items USING btree (seat_id) WHERE ((seat_id IS NOT NULL) AND (revoked_at IS NULL) AND (refunded_at IS NULL));
CREATE INDEX idx_orders_buyer ON public.orders USING btree (buyer_id);
CREATE INDEX idx_orders_buyer_created ON public.orders USING btree (buyer_id, created_at DESC);
CREATE INDEX idx_orders_buyer_org ON public.orders USING btree (buyer_id, org_id);
CREATE INDEX idx_orders_buyer_status_created ON public.orders USING btree (buyer_id, status, created_at);
CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);
CREATE INDEX idx_orders_device_id ON public.orders USING btree (device_id);
CREATE INDEX idx_orders_id_buyer ON public.orders USING btree (id, buyer_id);
CREATE INDEX idx_orders_org ON public.orders USING btree (org_id);
CREATE INDEX idx_orders_org_created ON public.orders USING btree (org_id, created_at DESC);
CREATE INDEX idx_orders_org_id_buyer_id_created_at ON public.orders USING btree (org_id, buyer_id, created_at DESC);
CREATE INDEX idx_orders_org_id_pending_created_at ON public.orders USING btree (org_id, created_at DESC) WHERE (status = 'pending'::order_status);
CREATE INDEX idx_orders_org_status ON public.orders USING btree (org_id, status, created_at DESC);
CREATE INDEX idx_orders_pending_hold_expiry ON public.orders USING btree (hold_expires_at) WHERE (status = 'pending'::order_status);
CREATE INDEX idx_orders_pricing_plan_id ON public.orders USING btree (pricing_plan_id);
CREATE INDEX idx_orders_status ON public.orders USING btree (status);
CREATE INDEX idx_orders_status_created_at ON public.orders USING btree (status, created_at DESC);
CREATE INDEX idx_org_members_org_user_role ON public.org_members USING btree (org_id, user_id, role);
CREATE INDEX idx_org_members_user ON public.org_members USING btree (user_id, org_id);
CREATE INDEX idx_org_members_user_role_org ON public.org_members USING btree (user_id, role, org_id);
CREATE INDEX idx_org_metrics_daily_day ON public.org_metrics_daily USING btree (day);
CREATE UNIQUE INDEX organizations_slug_unique ON public.organizations USING btree (slug);
CREATE INDEX idx_payment_attempts_order_id ON public.payment_attempts USING btree (order_id);
CREATE INDEX idx_payment_attempts_payment_id ON public.payment_attempts USING btree (payment_id);
CREATE INDEX payment_methods_user_id_idx ON public.payment_methods USING btree (user_id);
CREATE INDEX idx_payment_provider_settings_updated_by ON public.payment_provider_settings USING btree (updated_by);
CREATE INDEX idx_payment_routing_rules_created_by ON public.payment_routing_rules USING btree (created_by);
CREATE INDEX idx_payment_routing_rules_match ON public.payment_routing_rules USING btree (country_code, currency) WHERE (is_active = true);
CREATE INDEX idx_payment_routing_rules_priority ON public.payment_routing_rules USING btree (priority, is_active);
CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);
CREATE UNIQUE INDEX ui_payments_provider_ext ON public.payments USING btree (provider, ext_payment_id) WHERE (ext_payment_id IS NOT NULL);
CREATE INDEX idx_payout_accounts_org_id ON public.payout_accounts USING btree (org_id);
CREATE INDEX idx_payouts_org_id ON public.payouts USING btree (org_id);
CREATE INDEX idx_payouts_org_status_paidat ON public.payouts USING btree (org_id, status, paid_at);
CREATE INDEX idx_price_rule_redemptions_order_id ON public.price_rule_redemptions USING btree (order_id);
CREATE INDEX idx_price_rule_redemptions_price_rule_id ON public.price_rule_redemptions USING btree (price_rule_id);
CREATE INDEX idx_price_rule_redemptions_user_id ON public.price_rule_redemptions USING btree (user_id);
CREATE INDEX idx_price_rules_active ON public.price_rules USING btree (is_active);
CREATE INDEX idx_price_rules_active_window ON public.price_rules USING btree (is_active, starts_at, ends_at);
CREATE INDEX idx_price_rules_channel_gin ON public.price_rules USING gin (channel);
CREATE INDEX idx_price_rules_event_active ON public.price_rules USING btree (event_id, is_active, starts_at, ends_at);
CREATE INDEX idx_price_rules_event_id ON public.price_rules USING btree (event_id);
CREATE INDEX idx_price_rules_event_ticket ON public.price_rules USING btree (event_id, ticket_type_id);
CREATE INDEX idx_price_rules_event_window ON public.price_rules USING btree (event_id, starts_at, ends_at);
CREATE INDEX idx_price_rules_org_event ON public.price_rules USING btree (org_id, event_id);
CREATE INDEX idx_price_rules_org_event_active ON public.price_rules USING btree (org_id, event_id, is_active, starts_at, ends_at);
CREATE INDEX idx_price_rules_org_id ON public.price_rules USING btree (org_id);
CREATE INDEX idx_price_rules_ticket_type ON public.price_rules USING btree (ticket_type_id);
CREATE UNIQUE INDEX uq_price_rules_org_code ON public.price_rules USING btree (org_id, code) WHERE (code IS NOT NULL);
CREATE INDEX idx_pricing_plans_org ON public.pricing_plans USING btree (org_id) WHERE (active = true);
CREATE INDEX idx_pricing_plans_org_id ON public.pricing_plans USING btree (org_id);
CREATE UNIQUE INDEX uq_pricing_plans_org_active ON public.pricing_plans USING btree (org_id) WHERE (active = true);
CREATE INDEX idx_refund_items_order_item_id ON public.refund_items USING btree (order_item_id);
CREATE INDEX idx_refund_items_refund_id ON public.refund_items USING btree (refund_id);
CREATE INDEX idx_refunds_initiated_by ON public.refunds USING btree (initiated_by);
CREATE INDEX idx_refunds_payment_id ON public.refunds USING btree (payment_id);
CREATE INDEX idx_resale_listings_order_item_id ON public.resale_listings USING btree (order_item_id);
CREATE INDEX idx_resale_listings_org_id ON public.resale_listings USING btree (org_id);
CREATE INDEX idx_resale_listings_seller_id ON public.resale_listings USING btree (seller_id);
CREATE INDEX idx_resale_listings_status ON public.resale_listings USING btree (status);
CREATE INDEX resale_listings_transfer_id_idx ON public.resale_listings USING btree (transfer_id) WHERE (transfer_id IS NOT NULL);
CREATE INDEX idx_scans_device_id ON public.scans USING btree (device_id);
CREATE INDEX idx_scans_device_session_id ON public.scans USING btree (device_session_id);
CREATE INDEX idx_scans_event_id ON public.scans USING btree (event_id);
CREATE INDEX idx_scans_event_id_ticket_code ON public.scans USING btree (event_id, ticket_code);
CREATE INDEX idx_scans_event_time ON public.scans USING btree (event_id, scanned_at DESC);
CREATE INDEX idx_scans_order_item_id ON public.scans USING btree (order_item_id);
CREATE INDEX idx_scans_scanned_at ON public.scans USING btree (scanned_at);
CREATE INDEX idx_scans_ticket_code ON public.scans USING btree (ticket_code);
CREATE INDEX scans_event_id_ticket_code_scanned_at_idx ON public.scans USING btree (event_id, ticket_code, scanned_at DESC);
CREATE UNIQUE INDEX scans_one_success_per_ticket ON public.scans USING btree (event_id, ticket_code) WHERE (outcome = 'valid'::text);
CREATE UNIQUE INDEX scans_unique_request_hash ON public.scans USING btree (request_hash) WHERE (request_hash IS NOT NULL);
CREATE INDEX idx_seat_holds_created_by ON public.seat_holds USING btree (created_by);
CREATE INDEX idx_seat_holds_event_id ON public.seat_holds USING btree (event_id);
CREATE INDEX idx_seat_holds_ticket_type_id ON public.seat_holds USING btree (ticket_type_id);
CREATE INDEX idx_seat_maps_event_id ON public.seat_maps USING btree (event_id);
CREATE INDEX idx_seat_res_event_seat ON public.seat_reservations USING btree (event_id, seat_id);
CREATE INDEX idx_seat_res_user ON public.seat_reservations USING btree (user_id);
CREATE INDEX idx_seat_reservations_active_expires_at ON public.seat_reservations USING btree (expires_at) WHERE (active = true);
CREATE INDEX idx_seat_reservations_event_id ON public.seat_reservations USING btree (event_id);
CREATE INDEX idx_seat_reservations_seat_id ON public.seat_reservations USING btree (seat_id);
CREATE INDEX idx_seat_reservations_seat_user_event ON public.seat_reservations USING btree (seat_id, user_id, event_id);
CREATE INDEX ix_seat_res_expiry ON public.seat_reservations USING btree (expires_at);
CREATE UNIQUE INDEX seat_one_active_reservation ON public.seat_reservations USING btree (seat_id) WHERE (active = true);
CREATE INDEX seat_reservations_lookup ON public.seat_reservations USING btree (event_id, seat_id, user_id);
CREATE UNIQUE INDEX seat_reservations_unique_active ON public.seat_reservations USING btree (event_id, seat_id) WHERE (active = true);
CREATE INDEX ix_seats_seat_map ON public.seats USING btree (seat_map_id);
CREATE INDEX series_follows_series_id_idx ON public.series_follows USING btree (series_id);
CREATE INDEX idx_ticket_type_channels_ticket_type_id ON public.ticket_type_channels USING btree (ticket_type_id);
CREATE INDEX idx_ticket_types_event_id ON public.ticket_types USING btree (event_id);
CREATE INDEX idx_transfers_from_user_id ON public.transfers USING btree (from_user_id);
CREATE INDEX idx_transfers_order_item_id ON public.transfers USING btree (order_item_id);
CREATE INDEX idx_transfers_to_user_id ON public.transfers USING btree (to_user_id);
CREATE UNIQUE INDEX ui_active_transfer_per_item ON public.transfers USING btree (order_item_id) WHERE (status = 'requested'::transfer_status);
CREATE UNIQUE INDEX ux_transfers_active ON public.transfers USING btree (order_item_id) WHERE (status = ANY (ARRAY['requested'::transfer_status, 'pending'::transfer_status, 'accepted'::transfer_status]));
CREATE UNIQUE INDEX user_connections_pair_unique ON public.user_connections USING btree (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));
CREATE INDEX user_connections_recipient_status_idx ON public.user_connections USING btree (recipient_id, status);
CREATE INDEX user_connections_requester_status_idx ON public.user_connections USING btree (requester_id, status);
CREATE UNIQUE INDEX user_handles_handle_unique ON public.user_handles USING btree (handle);
CREATE INDEX idx_unp_preferred_channel ON public.user_notification_preferences USING btree (preferred_channel);
CREATE INDEX idx_user_notification_preferences_user_id ON public.user_notification_preferences USING btree (user_id);
CREATE UNIQUE INDEX venues_global_name_city_unique ON public.venues USING btree (name_key, city_key);
CREATE UNIQUE INDEX venues_slug_unique ON public.venues USING btree (slug);
CREATE INDEX idx_waitlists_event_id ON public.waitlists USING btree (event_id);
CREATE INDEX idx_waitlists_user_id ON public.waitlists USING btree (user_id);
CREATE UNIQUE INDEX waitlists_event_email_uniq ON public.waitlists USING btree (event_id, lower(email)) WHERE (email IS NOT NULL);
CREATE INDEX idx_webhook_deliveries_endpoint ON public.webhook_deliveries USING btree (endpoint_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_pending ON public.webhook_deliveries USING btree (next_retry_at) WHERE ((delivered_at IS NULL) AND (next_retry_at IS NOT NULL));
CREATE INDEX idx_webhook_endpoints_active ON public.webhook_endpoints USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_webhook_endpoints_created_by ON public.webhook_endpoints USING btree (created_by);
CREATE INDEX idx_webhook_endpoints_org ON public.webhook_endpoints USING btree (org_id);
CREATE INDEX idx_webhooks_received ON public.webhooks USING btree (received_at);
CREATE INDEX idx_webhooks_unprocessed ON public.webhooks USING btree (received_at) WHERE (processed_at IS NULL);
CREATE UNIQUE INDEX webhooks_provider_event_uidx ON public.webhooks USING btree (provider, provider_event_id) WHERE (provider_event_id IS NOT NULL);

-- NOTE: index_advisor / duplicate-index review is tracked in TICK-181
-- (e.g. webhooks_provider_event_uidx vs webhooks_provider_event_uniq;
--  idx_orders_org vs idx_orders_org_created; several overlapping events
--  publish-window indexes). Do not blindly drop — validate against query
--  patterns first.
-- =====================================================================
-- END public-schema structural baseline.
-- Functions (174 public + 28 app), views (27), matviews (2), RLS policies
-- (177), triggers (65), GRANTs, and the auth/app/storage/monitoring
-- schemas are intentionally NOT in this file — generate the canonical
-- restorable baseline with `supabase db pull`. See
-- docs/MIGRATION_RECONCILIATION.md.
-- =====================================================================

-- =====================================================================
-- Ticketiv — public-schema FULL baseline (TICK-171)
-- =====================================================================
-- Captured 2026-06-23 from the live DB (project radsfmlsjznqvcpogluo)
-- via read-only pg_catalog introspection through the Supabase MCP.
--
-- COVERAGE:
--   * Extensions (noted)
--   * 21 enum types
--   * 61 base tables with all columns, PKs, FKs, UNIQUE constraints
--   * 214 non-PK indexes
--   * 25 views (CREATE OR REPLACE)
--   * 2 materialized views (mv_event_sales, mv_revenue_breakdown)
--   * 191 functions (CREATE OR REPLACE)
--   * 96 triggers across 25 tables
--   * 179 RLS policies across 61 tables (with ENABLE ROW LEVEL SECURITY)
--
-- LIMITATIONS / MISSING:
--   * GRANTs to specific roles (use `pg_dump --schema-only` to capture)
--   * Cross-schema objects: auth.*, app.*, storage.*, realtime.*, cron.*
--   * The `malicious` schema (empty, flagged in MIGRATION_RECONCILIATION.md)
--   * This is a REFERENCE file — NOT a standalone restorable migration.
--     A fresh Postgres restored from this file alone will NOT fully
--     reproduce the live schema (cross-schema deps, GRANTs missing).
--
-- CANONICAL RESTORABLE BASELINE:
--     supabase db pull            # writes a faithful schema migration
--   or
--     pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL"
--
-- See docs/MIGRATION_RECONCILIATION.md for the full reconciliation.
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

-- ============ VIEWS ============
CREATE OR REPLACE VIEW public.admin_attention_queue WITH (security_invoker = true) AS
  SELECT 'pending_payout'::text AS kind, (p.id)::text AS record_id, 'Payout needs review'::text AS title, concat(p.currency, ' ', (((p.amount_cents)::numeric / (100)::numeric))::text, ' payout is ', (p.status)::text) AS detail, p.created_at, ('/super-admin/payouts/'::text || (p.id)::text) AS href FROM payouts p WHERE (p.status = ANY (ARRAY['requested'::payout_status, 'processing'::payout_status])) UNION ALL SELECT 'open_refund'::text AS kind, (r.id)::text AS record_id, 'Refund needs review'::text AS title, concat(r.currency, ' ', (((r.amount_cents)::numeric / (100)::numeric))::text, ' refund is ', (r.status)::text) AS detail, r.created_at, ('/super-admin/refunds/'::text || (r.id)::text) AS href FROM refunds r WHERE (r.status = ANY (ARRAY['requested'::refund_status, 'processing'::refund_status])) UNION ALL SELECT 'failed_payment'::text AS kind, (pa.id)::text AS record_id, 'Payment attempt failed'::text AS title, concat(pa.provider, ' attempt #', (pa.attempt_no)::text, ' failed') AS detail, pa.created_at, ('/super-admin/orders/'::text || (pa.order_id)::text) AS href FROM payment_attempts pa WHERE (pa.status = 'failed'::text) UNION ALL SELECT 'failed_job'::text AS kind, (j.id)::text AS record_id, 'Background job exhausted retries'::text AS title, concat(j.kind, ': ', COALESCE(j.last_error, 'unknown error'::text)) AS detail, j.created_at, '/super-admin/reliability'::text AS href FROM jobs j WHERE ((j.last_error IS NOT NULL) AND (j.attempts >= j.max_attempts));

CREATE OR REPLACE VIEW public.admin_command_centre_metrics WITH (security_invoker = true) AS
  SELECT ( SELECT count(*) FROM organizations) AS total_organizations, ( SELECT count(*) FROM events) AS total_events, ( SELECT count(*) FROM events WHERE (events.status = 'published'::event_status)) AS published_events, ( SELECT count(*) FROM events WHERE (events.status = 'draft'::event_status)) AS draft_events, ( SELECT count(*) FROM events WHERE ((events.status = 'published'::event_status) AND (events.starts_at >= now()))) AS upcoming_events, ( SELECT count(*) FROM ticket_types) AS ticket_types, ( SELECT count(*) FROM orders) AS total_orders, ( SELECT count(*) FROM orders WHERE (orders.status = 'paid'::order_status)) AS paid_orders, ( SELECT COALESCE(sum(orders.total_cents), (0)::bigint) FROM orders WHERE (orders.status = 'paid'::order_status)) AS gross_revenue_cents, ( SELECT COALESCE(sum(orders.platform_fee_cents), (0)::bigint) FROM orders WHERE (orders.status = 'paid'::order_status)) AS platform_fee_cents, ( SELECT count(*) FROM payments WHERE (payments.status = 'failed'::payments_status)) AS failed_payments, ( SELECT count(*) FROM payment_attempts WHERE (payment_attempts.status = 'failed'::text)) AS failed_payment_attempts, ( SELECT count(*) FROM payouts WHERE (payouts.status = ANY (ARRAY['requested'::payout_status, 'processing'::payout_status]))) AS pending_payouts, ( SELECT COALESCE(sum(payouts.amount_cents), (0)::bigint) FROM payouts WHERE (payouts.status = ANY (ARRAY['requested'::payout_status, 'processing'::payout_status]))) AS pending_payout_cents, ( SELECT count(*) FROM refunds WHERE (refunds.status = ANY (ARRAY['requested'::refund_status, 'processing'::refund_status]))) AS open_refunds, ( SELECT COALESCE(sum(refunds.amount_cents), (0)::bigint) FROM refunds WHERE (refunds.status = ANY (ARRAY['requested'::refund_status, 'processing'::refund_status]))) AS open_refund_cents, ( SELECT count(*) FROM order_items WHERE (order_items.status = ANY (ARRAY['issued'::order_item_status, 'checked_in'::order_item_status, 'transferred'::order_item_status]))) AS tickets_issued, ( SELECT count(*) FROM order_items WHERE ((order_items.checked_in_at IS NOT NULL) OR (order_items.status = 'checked_in'::order_item_status))) AS tickets_checked_in, ( SELECT count(*) FROM scans WHERE (scans.scanned_at >= (now() - '24:00:00'::interval))) AS scans_last_24h, ( SELECT count(*) FROM webhooks WHERE (webhooks.processed_at IS NULL)) AS unprocessed_webhooks, ( SELECT count(*) FROM jobs WHERE ((jobs.last_error IS NOT NULL) AND (jobs.attempts >= jobs.max_attempts))) AS failed_jobs;

CREATE OR REPLACE VIEW public.admin_event_readiness WITH (security_invoker = true) AS
  SELECT e.id AS event_id, e.org_id, e.title, e.status, e.visibility, e.starts_at, e.ends_at, e.cover_image_url, e.description, e.venue_id, count(tt.id) FILTER (WHERE ((COALESCE((tt.sales_status)::text, 'on_sale'::text) = 'on_sale'::text) AND (tt.quota > 0))) AS on_sale_ticket_types, (EXISTS ( SELECT 1 FROM pricing_plans pp WHERE ((pp.org_id = e.org_id) AND (pp.active IS TRUE)))) AS has_active_pricing_plan, (EXISTS ( SELECT 1 FROM payout_accounts pa WHERE (pa.org_id = e.org_id))) AS has_payout_account, jsonb_build_object('has_organization', (e.org_id IS NOT NULL), 'has_venue', (e.venue_id IS NOT NULL), 'has_title', (NULLIF(TRIM(BOTH FROM COALESCE(e.title, ''::text)), ''::text) IS NOT NULL), 'has_slug', (NULLIF(TRIM(BOTH FROM COALESCE(e.slug, ''::text)), ''::text) IS NOT NULL), 'has_start_date', (e.starts_at IS NOT NULL), 'has_valid_date_range', ((e.ends_at IS NULL) OR (e.starts_at IS NULL) OR (e.ends_at > e.starts_at)), 'has_cover_image', (NULLIF(TRIM(BOTH FROM COALESCE(e.cover_image_url, ''::text)), ''::text) IS NOT NULL), 'has_description', (NULLIF(TRIM(BOTH FROM COALESCE(e.description, ''::text)), ''::text) IS NOT NULL), 'has_on_sale_ticket_type', (count(tt.id) FILTER (WHERE ((COALESCE((tt.sales_status)::text, 'on_sale'::text) = 'on_sale'::text) AND (tt.quota > 0))) > 0), 'has_active_pricing_plan', (EXISTS ( SELECT 1 FROM pricing_plans pp WHERE ((pp.org_id = e.org_id) AND (pp.active IS TRUE)))), 'has_payout_account', (EXISTS ( SELECT 1 FROM payout_accounts pa WHERE (pa.org_id = e.org_id))), 'has_online_sales_channel', (EXISTS ( SELECT 1 FROM (ticket_types tt2 JOIN ticket_type_channels ttc ON ((ttc.ticket_type_id = tt2.id))) WHERE ((tt2.event_id = e.id) AND (ttc.channel = 'online'::sales_channel) AND (COALESCE((tt2.sales_status)::text, 'on_sale'::text) = ANY (ARRAY['on_sale'::text, 'paused'::text]))))), 'has_refund_or_support', ( CASE WHEN (e.refund_policy IS NULL) THEN false WHEN (jsonb_typeof(e.refund_policy) = 'object'::text) THEN (e.refund_policy <> '{}'::jsonb) WHEN (jsonb_typeof(e.refund_policy) = 'array'::text) THEN (jsonb_array_length(e.refund_policy) > 0) WHEN (jsonb_typeof(e.refund_policy) = 'string'::text) THEN (length(TRIM(BOTH FROM (e.refund_policy #>> '{}'::text[]))) > 0) ELSE true END OR (NULLIF(TRIM(BOTH FROM COALESCE(e.confirmation_message, ''::text)), ''::text) IS NOT NULL)), 'has_active_staff', (EXISTS ( SELECT 1 FROM event_staff es WHERE ((es.event_id = e.id) AND (COALESCE(es.active, true) = true)))), 'has_live_stats_row', (EXISTS ( SELECT 1 FROM event_live_stats els WHERE (els.event_id = e.id)))) AS checks FROM (events e LEFT JOIN ticket_types tt ON ((tt.event_id = e.id))) GROUP BY e.id;

CREATE OR REPLACE VIEW public.admin_recent_operations WITH (security_invoker = true) AS
  SELECT 'audit'::text AS source, (al.id)::text AS record_id, (al.action)::text AS action, al.table_name AS entity, al.record_id AS entity_id, al.created_at AS occurred_at FROM audit_log al UNION ALL SELECT 'app_audit'::text AS source, (aal.id)::text AS record_id, aal.operation AS action, concat(aal.schema_name, '.', aal.table_name) AS entity, NULL::text AS entity_id, aal.occurred_at FROM app_audit_log aal;

CREATE OR REPLACE VIEW public.admin_workspace_actions WITH (security_invoker = true) AS
  SELECT key, workspace_key, label, description, target_table, backend_function, is_enabled, created_at FROM admin_action_catalog ORDER BY workspace_key, label;

CREATE OR REPLACE VIEW public.admin_workspace_operating_counts WITH (security_invoker = true) AS
  SELECT 'event-operations'::text AS workspace_key, ( SELECT count(*) FROM events WHERE (events.status = 'draft'::event_status)) AS needs_review_count, ( SELECT count(*) FROM events WHERE ((events.status = 'published'::event_status) AND (events.starts_at >= now()))) AS active_count, ( SELECT count(*) FROM events WHERE (events.status = 'archived'::event_status)) AS closed_count UNION ALL SELECT 'organizer-operations'::text AS workspace_key, ( SELECT count(*) FROM organizations) AS needs_review_count, ( SELECT count(*) FROM org_members) AS active_count, (0)::bigint AS closed_count UNION ALL SELECT 'ticket-inventory'::text AS workspace_key, ( SELECT count(*) FROM ticket_types WHERE (ticket_types.quota <= 0)) AS needs_review_count, ( SELECT count(*) FROM ticket_types WHERE (ticket_types.quota > 0)) AS active_count, ( SELECT count(*) FROM seat_holds WHERE (seat_holds.status = ANY (ARRAY['released'::seat_hold_status, 'expired'::seat_hold_status]))) AS closed_count UNION ALL SELECT 'sales-orders'::text AS workspace_key, ( SELECT count(*) FROM orders WHERE (orders.status = ANY (ARRAY['pending'::order_status, 'failed'::order_status]))) AS needs_review_count, ( SELECT count(*) FROM orders WHERE (orders.status = 'paid'::order_status)) AS active_count, ( SELECT count(*) FROM orders WHERE (orders.status = 'refunded'::order_status)) AS closed_count UNION ALL SELECT 'payments-finance'::text AS workspace_key, (( SELECT count(*) FROM payment_attempts WHERE (payment_attempts.status = 'failed'::text)) + ( SELECT count(*) FROM refunds WHERE (refunds.status = ANY (ARRAY['requested'::refund_status, 'processing'::refund_status])))) AS needs_review_count, ( SELECT count(*) FROM payments WHERE (payments.status = 'succeeded'::payments_status)) AS active_count, ( SELECT count(*) FROM payouts WHERE (payouts.status = ANY (ARRAY['paid'::payout_status, 'cancelled'::payout_status, 'failed'::payout_status]))) AS closed_count UNION ALL SELECT 'access-control'::text AS workspace_key, ( SELECT count(*) FROM scans WHERE (scans.outcome <> 'valid'::text)) AS needs_review_count, ( SELECT count(*) FROM devices WHERE (devices.last_seen_at >= (now() - '24:00:00'::interval))) AS active_count, ( SELECT count(*) FROM device_sessions WHERE (device_sessions.ended_at IS NOT NULL)) AS closed_count UNION ALL SELECT 'promotions-controls'::text AS workspace_key, ( SELECT count(*) FROM price_rules WHERE ((price_rules.is_active = true) AND (price_rules.ends_at IS NOT NULL) AND (price_rules.ends_at < now()))) AS needs_review_count, (( SELECT count(*) FROM feature_flags WHERE (feature_flags.enabled = true)) + ( SELECT count(*) FROM price_rules WHERE (price_rules.is_active = true))) AS active_count, ( SELECT count(*) FROM price_rules WHERE (price_rules.is_active = false)) AS closed_count UNION ALL SELECT 'reliability-audit'::text AS workspace_key, (( SELECT count(*) FROM webhooks WHERE (webhooks.processed_at IS NULL)) + ( SELECT count(*) FROM jobs WHERE ((jobs.last_error IS NOT NULL) AND (jobs.attempts >= jobs.max_attempts)))) AS needs_review_count, ( SELECT count(*) FROM jobs WHERE (jobs.locked_at IS NOT NULL)) AS active_count, (( SELECT count(*) FROM audit_log) + ( SELECT count(*) FROM app_audit_log)) AS closed_count UNION ALL SELECT 'platform-settings'::text AS workspace_key, ( SELECT count(*) FROM admin_users) AS needs_review_count, ( SELECT count(*) FROM pricing_plans WHERE (pricing_plans.active = true)) AS active_count, ( SELECT count(*) FROM pricing_plans WHERE (pricing_plans.active = false)) AS closed_count;

CREATE OR REPLACE VIEW public.event_catalog WITH (security_invoker = true) AS
  SELECT e.id AS event_id, e.org_id, e.title, e.slug, e.cover_image_url, COALESCE(e.starts_at, ( SELECT min(d.starts_at) FROM event_dates d WHERE (d.event_id = e.id))) AS starts_at, e.city, e.country_code, jsonb_agg(jsonb_build_object('ticket_type_id', tt.id, 'name', tt.name, 'price_cents', tt.price_cents, 'currency', tt.currency, 'quota', tt.quota) ORDER BY tt.price_cents) FILTER (WHERE (tt.id IS NOT NULL)) AS ticket_types FROM (events e LEFT JOIN ticket_types tt ON ((tt.event_id = e.id))) GROUP BY e.id;

CREATE OR REPLACE VIEW public.event_summary WITH (security_invoker = true) AS
  SELECT e.id AS event_id, e.org_id, e.title, e.slug, count(DISTINCT d.id) AS dates_count FROM (events e LEFT JOIN event_dates d ON ((d.event_id = e.id))) GROUP BY e.id, e.org_id, e.title, e.slug;

CREATE OR REPLACE VIEW public.order_financials WITH (security_invoker = true) AS
  SELECT o.id AS order_id, o.org_id, o.created_at, o.status, o.currency, o.item_count, o.subtotal_cents, o.platform_fee_cents, o.processor_fee_cents, o.total_cents, ((o.subtotal_cents - CASE WHEN (pp.platform_fee_payer = 'organizer'::fee_payer) THEN o.platform_fee_cents ELSE 0 END) - CASE WHEN (pp.processor_fee_payer = 'organizer'::fee_payer) THEN o.processor_fee_cents ELSE 0 END) AS organizer_gross_if_buyer_pays_fees, pp.platform_percent_bps, pp.platform_fixed_cents, pp.processor_percent_bps, pp.processor_fixed_cents FROM (orders o LEFT JOIN pricing_plans pp ON ((pp.id = o.pricing_plan_id)));

CREATE OR REPLACE VIEW public.order_ledger_summary WITH (security_invoker = true) AS
  SELECT order_id, gross_cents, payment_net_cents, refund_cents, net_cents FROM order_ledger_summary_fn() t(order_id, gross_cents, payment_net_cents, refund_cents, net_cents);

CREATE OR REPLACE VIEW public.user_friends WITH (security_invoker = true) AS
  SELECT CASE WHEN (requester_id = ( SELECT auth.uid() AS uid)) THEN recipient_id ELSE requester_id END AS friend_id, responded_at AS connected_at, id AS connection_id FROM user_connections WHERE ((status = 'accepted'::connection_status) AND ((( SELECT auth.uid() AS uid) = requester_id) OR (( SELECT auth.uid() AS uid) = recipient_id)));

CREATE OR REPLACE VIEW public.v_artist_events_public WITH (security_invoker = true) AS
  SELECT ev.id, ev.title, ev.slug, ev.category, ev.city, ev.country, ev.poster_url, ev.starts_at, ev.venue_id, ev.venue_name, ev.venue_address, ev.venue_tz, ev.min_price_cents, ev.max_price_cents, ev.currency, ev.organizer_id, ev.organizer_name, ev.organizer_logo_url, ea.artist_id FROM (v_events_public ev JOIN event_artists ea ON ((ea.event_id = ev.id)));

CREATE OR REPLACE VIEW public.v_artist_public WITH (security_invoker = true) AS
  SELECT id, name, slug, bio, image_url AS photo_url, NULL::text AS genre, NULL::jsonb AS social_links FROM artists a;

CREATE OR REPLACE VIEW public.v_event_friends_going WITH (security_invoker = true) AS
  WITH my_friends AS ( SELECT CASE WHEN (uc.requester_id = ( SELECT auth.uid() AS uid)) THEN uc.recipient_id ELSE uc.requester_id END AS friend_id FROM user_connections uc WHERE ((uc.status = 'accepted'::connection_status) AND ((( SELECT auth.uid() AS uid) = uc.requester_id) OR (( SELECT auth.uid() AS uid) = uc.recipient_id)))) SELECT DISTINCT tt.event_id, p.user_id AS friend_id, COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, p.name, p.surname)), ''::text), p.display_name) AS friend_name, uh.handle AS friend_handle FROM (((((orders o JOIN order_items oi ON ((oi.order_id = o.id))) JOIN ticket_types tt ON ((tt.id = oi.ticket_type_id))) JOIN my_friends mf ON ((mf.friend_id = o.buyer_id))) JOIN profiles p ON ((p.user_id = o.buyer_id))) LEFT JOIN user_handles uh ON ((uh.user_id = p.user_id))) WHERE ((o.status = 'paid'::order_status) AND (oi.revoked_at IS NULL));

CREATE OR REPLACE VIEW public.v_event_kpis WITH (security_invoker = true) AS
  SELECT e.org_id, e.id AS event_id, e.title, e.slug, count(DISTINCT o.id) FILTER (WHERE (o.status = 'paid'::order_status)) AS paid_orders, count(oi.id) FILTER (WHERE (oi.revoked_at IS NULL)) AS tickets_issued, count(oi.id) FILTER (WHERE (oi.checked_in_at IS NOT NULL)) AS tickets_checked_in, COALESCE(sum(o.total_cents) FILTER (WHERE (o.status = 'paid'::order_status)), (0)::bigint) AS revenue_cents, max(o.currency) FILTER (WHERE (o.status = 'paid'::order_status)) AS currency FROM (((events e LEFT JOIN ticket_types tt ON ((tt.event_id = e.id))) LEFT JOIN order_items oi ON ((oi.ticket_type_id = tt.id))) LEFT JOIN orders o ON ((o.id = oi.order_id))) GROUP BY e.org_id, e.id, e.title, e.slug;

CREATE OR REPLACE VIEW public.v_event_lineup_public WITH (security_invoker = true) AS
  SELECT ea.event_id, a.id AS artist_id, a.name AS artist_name, a.slug AS artist_slug, a.image_url AS artist_image_url, ea.role FROM ((event_artists ea JOIN artists a ON ((a.id = ea.artist_id))) JOIN events e ON ((e.id = ea.event_id))) WHERE (e.visibility = 'public'::text) ORDER BY ea.event_id, a.name;

CREATE OR REPLACE VIEW public.v_event_public WITH (security_invoker = true) AS
  SELECT ev.id, ev.title, ev.slug, ev.category, ev.city, ev.country, ev.poster_url, ev.starts_at, ev.venue_id, ev.venue_name, ev.venue_address, ev.venue_tz, ev.min_price_cents, ev.max_price_cents, ev.currency, ev.organizer_id, ev.organizer_name, ev.organizer_logo_url, e.description, e.visibility, v.capacity AS venue_capacity FROM ((v_events_public ev JOIN events e ON ((e.id = ev.id))) LEFT JOIN venues v ON ((v.id = ev.venue_id)));

CREATE OR REPLACE VIEW public.v_event_sales_public WITH (security_invoker = true) AS
  SELECT event_id, tickets_sold, gross_cents AS gross_revenue_cents FROM mv_event_sales;

CREATE OR REPLACE VIEW public.v_events_public WITH (security_invoker = true) AS
  SELECT e.id, e.title, e.slug, e.category, COALESCE(e.city, v.city) AS city, e.country_code AS country, e.cover_image_url AS poster_url, e.starts_at, e.venue_id, v.name AS venue_name, v.address AS venue_address, v.tz AS venue_tz, tp.min_price_cents, tp.max_price_cents, tp.currency, e.org_id AS organizer_id, o.name AS organizer_name, o.logo AS organizer_logo_url, e.featured_priority FROM (((events e LEFT JOIN venues v ON ((v.id = e.venue_id))) LEFT JOIN organizations o ON ((o.id = e.org_id))) LEFT JOIN LATERAL ( SELECT min(t.price_cents) AS min_price_cents, max(t.price_cents) AS max_price_cents, ( SELECT t2.currency FROM ticket_types t2 WHERE ((t2.event_id = e.id) AND (t2.sales_status = 'on_sale'::ticket_type_sales_status)) ORDER BY t2.price_cents LIMIT 1) AS currency FROM ticket_types t WHERE ((t.event_id = e.id) AND (t.sales_status = 'on_sale'::ticket_type_sales_status))) tp ON (true)) WHERE ((e.status = 'published'::event_status) AND (e.visibility = 'public'::text));

CREATE OR REPLACE VIEW public.v_inbound_transfers WITH (security_invoker = true) AS
  SELECT t.id AS transfer_id, t.order_item_id, t.from_user_id, t.to_user_id, t.status, t.created_at AS offered_at, t.updated_at, (t.created_at + '24:00:00'::interval) AS expires_at, COALESCE(fp.display_name, NULLIF(TRIM(BOTH FROM ((COALESCE(fp.name, ''::text) || ' '::text) || COALESCE(fp.surname, ''::text))), ''::text), 'Friend'::text) AS from_name, fh.handle AS from_handle, oi.ticket_code, oi.ticket_type_id, tt.name AS ticket_type_name, tt.price_cents, tt.currency, e.id AS event_id, e.title AS event_title, e.starts_at AS event_starts_at, e.cover_image_url, v.name AS venue_name FROM ((((((transfers t JOIN order_items oi ON ((oi.id = t.order_item_id))) LEFT JOIN ticket_types tt ON ((tt.id = oi.ticket_type_id))) LEFT JOIN events e ON ((e.id = tt.event_id))) LEFT JOIN venues v ON ((v.id = e.venue_id))) LEFT JOIN profiles fp ON ((fp.user_id = t.from_user_id))) LEFT JOIN user_handles fh ON ((fh.user_id = t.from_user_id))) WHERE ((t.status = 'pending'::transfer_status) AND (t.to_user_id = auth.uid()));

CREATE OR REPLACE VIEW public.v_my_order_ledger_summary WITH (security_invoker = true) AS
  SELECT s.order_id, s.gross_cents, s.payment_net_cents, s.refund_cents, s.net_cents FROM (orders o CROSS JOIN LATERAL order_ledger_summary_for_order(o.id) s(order_id, gross_cents, payment_net_cents, refund_cents, net_cents)) WHERE (o.buyer_id = auth.uid());

CREATE OR REPLACE VIEW public.v_my_tickets WITH (security_invoker = true) AS
  SELECT o.id AS order_id, o.buyer_id, o.status AS order_status, o.created_at AS ordered_at, oi.id AS order_item_id, oi.ticket_code, oi.checked_in_at, oi.revoked_at, tt.id AS ticket_type_id, tt.name AS ticket_type_name, tt.price_cents, tt.currency, e.id AS event_id, e.title AS event_title, e.slug AS event_slug, e.city, e.cover_image_url, v.name AS venue_name, v.address AS venue_address, COALESCE(nextd.starts_at, lastd.starts_at) AS event_starts_at, oi.status AS order_item_status, oi.refunded_at, oi.transferred_from_order_item_id, oi.current_owner_id FROM ((((((order_items oi JOIN orders o ON ((o.id = oi.order_id))) JOIN ticket_types tt ON ((tt.id = oi.ticket_type_id))) JOIN events e ON ((e.id = tt.event_id))) LEFT JOIN venues v ON ((v.id = e.venue_id))) LEFT JOIN LATERAL ( SELECT d.starts_at FROM event_dates d WHERE ((d.event_id = e.id) AND (d.starts_at >= now())) ORDER BY d.starts_at LIMIT 1) nextd ON (true)) LEFT JOIN LATERAL ( SELECT d.starts_at FROM event_dates d WHERE ((d.event_id = e.id) AND (d.starts_at < now())) ORDER BY d.starts_at DESC LIMIT 1) lastd ON (true)) WHERE ((o.buyer_id = ( SELECT auth.uid() AS uid)) OR (oi.current_owner_id = ( SELECT auth.uid() AS uid)));

CREATE OR REPLACE VIEW public.v_organizer_events_public WITH (security_invoker = true) AS
  SELECT id, title, slug, category, city, country, poster_url, starts_at, venue_id, venue_name, venue_address, venue_tz, min_price_cents, max_price_cents, currency, organizer_id, organizer_name, organizer_logo_url FROM v_events_public;

CREATE OR REPLACE VIEW public.v_organizer_public WITH (security_invoker = true) AS
  SELECT id, name, slug, bio, logo AS logo_url, NULL::text AS website, NULL::jsonb AS social_links, ( SELECT count(*) FROM events e WHERE ((e.org_id = o.id) AND (e.status = 'published'::event_status) AND (e.visibility = 'public'::text))) AS event_count FROM organizations o;

CREATE OR REPLACE VIEW public.v_public_event_cards WITH (security_invoker = true) AS
  SELECT e.id, e.title, e.slug, e.category, COALESCE(e.city, v.city) AS city, e.country_code AS country, e.cover_image_url AS poster_url, e.starts_at, e.venue_id, v.name AS venue_name, v.address AS venue_address, v.tz AS venue_tz, tp.min_price_cents, tp.max_price_cents, tp.currency, e.org_id AS organizer_id, o.name AS organizer_name, o.logo AS organizer_logo_url, e.featured_priority, COALESCE(els.tickets_sold, 0) AS tickets_sold, COALESCE(els.tickets_available, 0) AS tickets_available, COALESCE(els.checked_in_count, 0) AS checked_in_count, els.last_order_at, els.last_scan_at, els.updated_at AS live_stats_updated_at FROM ((((events e LEFT JOIN venues v ON ((v.id = e.venue_id))) LEFT JOIN organizations o ON ((o.id = e.org_id))) LEFT JOIN event_live_stats els ON ((els.event_id = e.id))) LEFT JOIN LATERAL ( SELECT min(t.price_cents) AS min_price_cents, max(t.price_cents) AS max_price_cents, ( SELECT t2.currency FROM ticket_types t2 WHERE ((t2.event_id = e.id) AND (t2.sales_status = 'on_sale'::ticket_type_sales_status)) ORDER BY t2.price_cents LIMIT 1) AS currency FROM ticket_types t WHERE ((t.event_id = e.id) AND (t.sales_status = 'on_sale'::ticket_type_sales_status))) tp ON (true)) WHERE ((e.status = 'published'::event_status) AND (e.visibility = 'public'::text) AND ((e.publish_at IS NULL) OR (e.publish_at <= now())) AND ((e.unpublish_at IS NULL) OR (e.unpublish_at > now())));

CREATE OR REPLACE VIEW public.v_user_events WITH (security_invoker = true) AS
  SELECT event_id FROM event_staff es WHERE ((user_id = auth.uid()) AND active);

CREATE OR REPLACE VIEW public.v_user_orgs WITH (security_invoker = true) AS
  SELECT org_id FROM org_members WHERE (user_id = auth.uid());

-- ============ MATERIALIZED VIEWS ============
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_event_sales AS
  SELECT e.id AS event_id, count(oi.id) AS tickets_sold, count(oi.created_at) AS tickets_issued, count(*) FILTER (WHERE ((o.status)::text = 'paid'::text)) AS paid_orders, COALESCE(sum( CASE WHEN ((o.status)::text = 'paid'::text) THEN o.total_cents ELSE 0 END), (0)::bigint) AS gross_cents FROM (((events e LEFT JOIN ticket_types tt ON ((tt.event_id = e.id))) LEFT JOIN order_items oi ON ((oi.ticket_type_id = tt.id))) LEFT JOIN orders o ON ((o.id = oi.order_id))) GROUP BY e.id;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_revenue_breakdown AS
  SELECT o.org_id, o.id AS order_id, oi.order_id AS oi_order_id, tt.event_id, date_trunc('day'::text, o.created_at) AS day, sum(oi_rev.price_cents) AS revenue_cents FROM (((orders o JOIN order_items oi ON ((oi.order_id = o.id))) JOIN ticket_types tt ON ((tt.id = oi.ticket_type_id))) LEFT JOIN ( SELECT oi2.id, COALESCE(o2.total_cents, 0) AS price_cents FROM (order_items oi2 LEFT JOIN orders o2 ON ((o2.id = oi2.order_id)))) oi_rev ON ((oi_rev.id = oi.id))) WHERE (o.status = 'paid'::order_status) GROUP BY o.org_id, o.id, oi.order_id, tt.event_id, (date_trunc('day'::text, o.created_at));

-- ============ FUNCTIONS (191 public) ============
CREATE OR REPLACE FUNCTION public.admin_log_action(p_actor_id uuid, p_table_name text, p_record_id text, p_action audit_action, p_changes jsonb DEFAULT '{}'::jsonb, p_org_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (p_org_id, p_actor_id, p_table_name, p_record_id, p_action, p_changes);
end;
$function$;

CREATE OR REPLACE FUNCTION public.app_audit_if_table_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.attach_app_audit(table_schema text, table_name text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS app_audit_trigger ON %I.%I', table_schema, table_name);
  EXECUTE format('CREATE TRIGGER app_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.app_audit_if_table_changes()', table_schema, table_name);
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_event(p_event_id uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_global_admin(p_user)
    or exists (
      select 1
      from public.event_staff es
      where es.event_id = p_event_id
        and es.user_id = p_user
        and es.role::text in ('organizer_admin','organizer_staff')
    )
    or exists (
      select 1
      from public.events e
      join public.org_members om on om.org_id = e.org_id
      where e.id = p_event_id
        and om.user_id = p_user
        and om.role::text in ('organizer_admin')
    );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_org(p_org_id uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = p_user
      and om.role::text in ('organizer_admin')
  ) or public.is_global_admin(p_user);
$function$;

CREATE OR REPLACE FUNCTION public.can_update_ticket_types_by_user(p_user uuid, p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'app'
AS $function$
  SELECT
    (
      -- org admin / org owner for the event's org
      user_has_org_role(
        (SELECT e.org_id FROM public.events e WHERE e.id = p_event_id),
        ARRAY['organizer_admin'::text, 'organizer_owner'::text]
      )
      OR
      -- event staff (manager/owner roles used by ticket_types_manage)
      app.role_in_event_staff(p_event_id, app.current_user_id(), ARRAY['manager'::text, 'owner'::text])
      OR
      -- app.is_event_staff with event_id + roles (matches staff_manage_ticket_types and write_merged)
      app.is_event_staff(p_event_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role])
      OR
      -- org member roles
      app.is_org_member_roles(
        (SELECT e.org_id FROM public.events e WHERE e.id = p_event_id),
        VARIADIC ARRAY['organizer_admin'::text, 'organizer_staff'::text]
      )
      OR
      -- explicit JWT claim allowing management
      (((SELECT auth.jwt()) ->> 'can_manage_ticket_types'::text)::boolean IS TRUE)
    );
$function$;

CREATE OR REPLACE FUNCTION public.compute_order_payment_status(p_order_id uuid)
 RETURNS TABLE(expected_total_cents integer, net_cents bigint, derived_status text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.create_event_draft(p_org_id uuid, p_title text, p_visibility text DEFAULT 'private'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_user uuid;
begin
  v_user := (select auth.uid());
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_org(p_org_id, v_user) then
    raise exception 'Not allowed for this org';
  end if;

  insert into public.events (org_id, title, status, visibility, created_by)
  values (p_org_id, p_title, 'draft', coalesce(p_visibility,'private'), v_user)
  returning id into v_event_id;

  -- Make creator an event organizer admin automatically
  insert into public.event_staff (event_id, user_id, role)
  values (v_event_id, v_user, 'organizer_admin')
  on conflict (event_id, user_id) do update set role = excluded.role;

  return v_event_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_org_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT org_id
  FROM public.profiles
  WHERE user_id = public.current_user_uid()
    AND role in ('admin','organizer')
    AND org_id is not null;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT (SELECT auth.uid())::uuid;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_order_currency_matches_pricing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.enforce_pricing_plan_org_cohesion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.pricing_plan_id IS NOT NULL THEN
    IF (SELECT org_id FROM public.pricing_plans WHERE id = NEW.pricing_plan_id) IS DISTINCT FROM NEW.org_id THEN
      RAISE EXCEPTION 'pricing_plan.org_id does not match order.org_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_event_metrics_org()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  evt_org uuid;
BEGIN
  SELECT org_id INTO evt_org FROM public.events WHERE id = NEW.event_id;
  IF evt_org IS DISTINCT FROM NEW.org_id THEN
    RAISE EXCEPTION 'org_id mismatch for event_metrics_daily row for event %', NEW.event_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_event_staff_in_org()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.ensure_transfer_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
END $function$;

CREATE OR REPLACE FUNCTION public.event_series_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_admin_schedule_webhook_dispatch(p_function_url text, p_anon_jwt text, p_schedule text DEFAULT '* * * * *'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_anon_users_to_delete()
 RETURNS TABLE(user_id uuid, reason text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_apply_pricing_to_order(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_org_id uuid;
  v_currency text;
  v_plan public.pricing_plans%ROWTYPE;
  v_subtotal integer;
  v_adjustments integer;
  v_count integer;
  v_platform_pct_fee integer;
  v_platform_fixed_fee integer;
  v_platform_fee integer;
  v_processor_fee_base integer;
  v_processor_fee integer;
  v_total integer;
  v_now timestamptz := now();
begin
  select org_id, currency into v_org_id, v_currency
  from public.orders where id = p_order_id for update;

  if v_org_id is null then raise exception 'Order % not found', p_order_id; end if;

  select * into v_plan
  from public.pricing_plans
  where org_id = v_org_id and active = true
  order by effective_from desc
  limit 1;

  if not found then raise exception 'No active pricing plan for org %', v_org_id; end if;

  select coalesce(sum(tt.price_cents), 0), count(*)
    into v_subtotal, v_count
  from public.order_items oi
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  where oi.order_id = p_order_id;

  select coalesce(sum(amount_cents), 0)
    into v_adjustments
  from public.order_adjustments
  where order_id = p_order_id;

  v_platform_pct_fee := round(v_subtotal * v_plan.platform_percent_bps / 10000.0);
  v_platform_fixed_fee := v_plan.platform_fixed_cents * v_count;
  v_platform_fee := v_platform_pct_fee + v_platform_fixed_fee;

  if v_plan.min_platform_fee_cents is not null and v_platform_fee < v_plan.min_platform_fee_cents then
    v_platform_fee := v_plan.min_platform_fee_cents;
  end if;
  if v_plan.max_platform_fee_cents is not null and v_platform_fee > v_plan.max_platform_fee_cents then
    v_platform_fee := v_plan.max_platform_fee_cents;
  end if;

  if v_plan.platform_fee_payer = 'buyer' then
    v_processor_fee_base := v_subtotal + v_adjustments + v_platform_fee;
  else
    v_processor_fee_base := v_subtotal + v_adjustments;
  end if;
  v_processor_fee := round(v_processor_fee_base * v_plan.processor_percent_bps / 10000.0) + v_plan.processor_fixed_cents;

  if v_plan.platform_fee_payer = 'buyer' and v_plan.processor_fee_payer = 'buyer' then
    v_total := v_subtotal + v_adjustments + v_platform_fee + v_processor_fee;
  elsif v_plan.platform_fee_payer = 'organizer' and v_plan.processor_fee_payer = 'organizer' then
    v_total := v_subtotal + v_adjustments;
  elsif v_plan.platform_fee_payer = 'buyer' and v_plan.processor_fee_payer = 'organizer' then
    v_total := v_subtotal + v_adjustments + v_platform_fee;
  elsif v_plan.platform_fee_payer = 'organizer' and v_plan.processor_fee_payer = 'buyer' then
    v_total := v_subtotal + v_adjustments + v_processor_fee;
  else
    v_total := v_subtotal + v_adjustments + v_platform_fee + v_processor_fee;
  end if;

  if v_total < 0 then v_total := 0; end if;

  update public.orders
  set subtotal_cents = v_subtotal,
      item_count = v_count,
      platform_fee_cents = v_platform_fee,
      processor_fee_cents = v_processor_fee,
      fees_paid_by = case
        when v_plan.platform_fee_payer = 'buyer' and v_plan.processor_fee_payer = 'buyer' then 'buyer'::fee_payer
        when v_plan.platform_fee_payer = 'organizer' and v_plan.processor_fee_payer = 'organizer' then 'organizer'::fee_payer
        else null
      end,
      pricing_plan_id = v_plan.id,
      total_cents = v_total,
      currency = coalesce(v_currency, v_plan.currency),
      totals_computed_at = v_now
  where id = p_order_id;

  delete from public.ledger_entries where order_id = p_order_id and type in ('order_gross', 'fee');
  insert into public.ledger_entries (org_id, order_id, type, amount_cents, currency, occurred_at, meta)
  values
    (v_org_id, p_order_id, 'order_gross', v_subtotal, v_currency, v_now, jsonb_build_object('detail', 'ticket subtotal')),
    (v_org_id, p_order_id, 'fee', v_platform_fee, v_currency, v_now,
       jsonb_build_object('kind', 'platform', 'percent_bps', v_plan.platform_percent_bps, 'fixed_cents', v_plan.platform_fixed_cents, 'items', v_count)),
    (v_org_id, p_order_id, 'fee', v_processor_fee, v_currency, v_now,
       jsonb_build_object('kind', 'processor', 'percent_bps', v_plan.processor_percent_bps, 'fixed_cents', v_plan.processor_fixed_cents, 'base', v_processor_fee_base));
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_apply_promo_code_to_order(p_order_id uuid, p_code text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_array_has_dups(anyarray)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_backfill_event_live_stats()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_bootstrap_ticketiv_user(p_user_id uuid, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_display_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_caller uuid := auth.uid();
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = 'P0001';
  end if;

  if v_caller is null or v_caller <> p_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.profiles (user_id, display_name, phone, role)
  values (
    p_user_id,
    nullif(trim(coalesce(p_display_name, split_part(coalesce(p_email, ''), '@', 1), '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    'attendee'::public.app_role
  )
  on conflict (user_id) do update
    set
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      phone = coalesce(public.profiles.phone, excluded.phone),
      role = coalesce(public.profiles.role, 'attendee'::public.app_role)
  returning * into v_profile;

  return to_jsonb(v_profile);
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_bulk_check_in(p_order_item_ids uuid[], p_org_id uuid)
 RETURNS TABLE(checked_count integer, skipped_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_check_in(p_ticket_code text, p_device_id uuid, p_gate text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
end$function$;

CREATE OR REPLACE FUNCTION public.fn_check_in(p_order_item_id uuid, p_device_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_check_in(p_scan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  -- stub: check-in logic placeholder
  RETURN;
END; $function$;

CREATE OR REPLACE FUNCTION public.fn_check_in(p_ticket_code text)
 RETURNS TABLE(ok boolean, message text, checked_in_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_check_in(p_ticket_code text, p_event_id uuid, p_device_id uuid, p_gate text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
END $function$;

CREATE OR REPLACE FUNCTION public.fn_check_reserved_handle()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_claim_email_broadcast(p_org_id uuid, p_event_id uuid, p_recipient_count integer, p_audience text, p_subject text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_cleanup_anon_users(p_dry_run boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_cleanup_anonymous_users(p_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_complete_resale_after_payment(p_listing_id uuid, p_payment_id uuid)
 RETURNS TABLE(listing_id uuid, transfer_id uuid, buyer_order_id uuid, buyer_order_item_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_complete_resale_after_payment_webhook(p_payment_id uuid)
 RETURNS TABLE(listing_id uuid, transfer_id uuid, buyer_order_id uuid, buyer_order_item_id uuid, already_completed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_complete_transfer(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_transfer  public.transfers;
  v_actor_id  uuid := (select auth.uid());
begin
  -- Lock the transfer row to prevent concurrent completions.
  select * into v_transfer
  from public.transfers
  where id = p_transfer_id
  for update;

  if not found then
    raise exception 'transfer_not_found';
  end if;

  if v_transfer.to_user_id != v_actor_id then
    raise exception 'transfer_unauthorized';
  end if;

  if v_transfer.status not in ('pending', 'accepted') then
    raise exception 'transfer_invalid_state';
  end if;

  if not exists (
    select 1 from public.order_items
    where id = v_transfer.order_item_id
      and status in ('issued', 'transferred')
  ) then
    raise exception 'ticket_not_transferable';
  end if;

  update public.transfers
  set status = 'completed', updated_at = now()
  where id = p_transfer_id
  returning * into v_transfer;

  update public.order_items
  set current_owner_id = v_transfer.to_user_id,
      status           = 'transferred',
      updated_at       = now()
  where id = v_transfer.order_item_id;

  return jsonb_build_object(
    'transfer_id',   v_transfer.id,
    'order_item_id', v_transfer.order_item_id,
    'new_owner_id',  v_transfer.to_user_id
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_complete_waitlist_after_payment(p_waitlist_id uuid, p_payment_id uuid)
 RETURNS TABLE(waitlist_id uuid, order_id uuid, issued_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_complete_waitlist_after_payment_webhook(p_payment_id uuid)
 RETURNS TABLE(waitlist_id uuid, order_id uuid, issued_count integer, already_completed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_create_inventory_protected_order(p_event_id uuid, p_buyer_id uuid, p_buyer_email text, p_items jsonb, p_holder_name text DEFAULT NULL::text)
 RETURNS TABLE(order_row jsonb, order_items jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order_id uuid;
  v_org_id uuid;
  v_currency text;
  v_subtotal_cents integer := 0;
  v_total_cents integer := 0;
  v_item_count integer := 0;
  v_ticket_type record;
  v_requested_qty integer;
  v_reserved_qty integer;
  v_existing_user_qty integer;
  v_channel_row record;
  v_hold_window interval := interval '10 minutes';
  v_order_row jsonb;
  v_order_items jsonb;
begin
  if p_event_id is null then raise exception 'event_id_required' using errcode = 'P0001'; end if;
  if p_buyer_id is null then raise exception 'buyer_id_required' using errcode = 'P0001'; end if;
  if p_buyer_email is null or length(trim(p_buyer_email)) = 0 then
    raise exception 'buyer_email_required' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items_required' using errcode = 'P0001';
  end if;

  create temporary table if not exists pg_temp.checkout_items (
    ticket_type_id uuid primary key,
    quantity integer not null check (quantity > 0)
  ) on commit drop;
  truncate table pg_temp.checkout_items;

  insert into pg_temp.checkout_items(ticket_type_id, quantity)
  select
    (item->>'ticketTypeId')::uuid,
    greatest(1, floor(coalesce(nullif(item->>'quantity', '')::numeric, 1))::integer)
  from jsonb_array_elements(p_items) as item
  where item ? 'ticketTypeId'
  on conflict (ticket_type_id) do update
    set quantity = pg_temp.checkout_items.quantity + excluded.quantity;

  if not exists (select 1 from pg_temp.checkout_items) then
    raise exception 'items_required' using errcode = 'P0001';
  end if;

  perform 1
  from public.ticket_types tt
  join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
  where tt.event_id = p_event_id
  order by tt.id
  for update of tt;

  if (select count(*) from pg_temp.checkout_items) <> (
    select count(*) from public.ticket_types tt
    join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
    where tt.event_id = p_event_id
  ) then
    raise exception 'ticket_type_not_found' using errcode = 'P0001';
  end if;

  for v_ticket_type in
    select
      tt.id, tt.event_id, tt.name, tt.price_cents, tt.currency,
      tt.quota, tt.per_user_limit,
      coalesce(tt.sales_status::text, 'on_sale') as sales_status,
      e.org_id, e.status as event_status, ci.quantity
    from public.ticket_types tt
    join public.events e on e.id = tt.event_id
    join pg_temp.checkout_items ci on ci.ticket_type_id = tt.id
    where tt.event_id = p_event_id
    order by tt.id
  loop
    v_requested_qty := v_ticket_type.quantity;

    if v_ticket_type.event_status <> 'published' then
      raise exception 'event_not_available' using errcode = 'P0001';
    end if;
    if v_ticket_type.sales_status <> 'on_sale' then
      raise exception 'ticket_type_not_on_sale:%', v_ticket_type.name using errcode = 'P0001';
    end if;

    select count(*)::integer into v_existing_user_qty
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = v_ticket_type.id
      and o.buyer_id = p_buyer_id
      and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
      and (
        o.status = 'paid'
        or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now()))
      );

    if v_ticket_type.per_user_limit is not null
       and v_ticket_type.per_user_limit > 0
       and (v_existing_user_qty + v_requested_qty) > v_ticket_type.per_user_limit then
      raise exception 'per_user_limit_exceeded:%', v_ticket_type.name using errcode = 'P0001';
    end if;

    if exists (select 1 from public.ticket_type_channels c where c.ticket_type_id = v_ticket_type.id) then
      select c.quota, c.per_order_limit into v_channel_row
      from public.ticket_type_channels c
      where c.ticket_type_id = v_ticket_type.id
        and c.channel = 'online'::public.sales_channel;

      if not found then
        raise exception 'channel_not_available:%', v_ticket_type.name using errcode = 'P0001';
      end if;

      if v_channel_row.per_order_limit is not null
         and v_channel_row.per_order_limit > 0
         and v_requested_qty > v_channel_row.per_order_limit then
        raise exception 'channel_per_order_limit_exceeded:%', v_ticket_type.name using errcode = 'P0001';
      end if;

      if v_channel_row.quota is not null and v_channel_row.quota >= 0 then
        select count(*)::integer into v_reserved_qty
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where oi.ticket_type_id = v_ticket_type.id
          and o.channel = 'online'::public.sales_channel
          and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
          and (
            o.status = 'paid'
            or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now()))
          );
        if (v_reserved_qty + v_requested_qty) > v_channel_row.quota then
          raise exception 'channel_sold_out:%', v_ticket_type.name using errcode = 'P0001';
        end if;
      end if;
    end if;

    select count(*)::integer into v_reserved_qty
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = v_ticket_type.id
      and oi.status in ('pending', 'issued', 'transferred', 'checked_in')
      and (
        o.status = 'paid'
        or (o.status = 'pending' and (o.hold_expires_at is null or o.hold_expires_at > now()))
      );

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
    org_id, buyer_id, email, buyer_email,
    total_cents, subtotal_cents, item_count,
    platform_fee_cents, processor_fee_cents,
    currency, order_currency,
    order_price_cents, order_platform_fee_cents, order_processor_fee_cents,
    status, channel, hold_expires_at
  ) values (
    v_org_id, p_buyer_id, p_buyer_email, p_buyer_email,
    v_total_cents, v_subtotal_cents, v_item_count,
    0, 0,
    v_currency, v_currency,
    v_subtotal_cents, 0, 0,
    'pending', 'online', now() + v_hold_window
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, ticket_type_id, ticket_code, status, holder_name, holder_email
  )
  select
    v_order_id,
    ci.ticket_type_id,
    gen_random_uuid()::text,
    'pending',
    nullif(trim(coalesce(p_holder_name, '')), ''),
    p_buyer_email
  from pg_temp.checkout_items ci
  cross join lateral generate_series(1, ci.quantity);

  select to_jsonb(o.*) into v_order_row
  from public.orders o where o.id = v_order_id;

  select coalesce(jsonb_agg(to_jsonb(oi.*) order by oi.created_at, oi.id), '[]'::jsonb)
    into v_order_items
  from public.order_items oi
  where oi.order_id = v_order_id;

  return query select v_order_row, v_order_items;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_create_organization(p_name text, p_currency text DEFAULT 'SZL'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_name text := nullif(trim(p_name), '');
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'SZL'));
  v_base_slug text;
  v_slug text;
  v_suffix integer := 0;
  v_org_id uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if v_name is null then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  v_base_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug = '' then
    v_base_slug := 'org';
  end if;

  v_slug := v_base_slug;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.organizations (name, slug, default_currency)
  values (v_name, v_slug, v_currency)
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, v_user, 'organizer_owner');

  return jsonb_build_object('id', v_org_id, 'slug', v_slug, 'name', v_name, 'currency', v_currency);
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_create_resale_checkout_order(p_listing_id uuid)
 RETURNS TABLE(order_id uuid, payment_id uuid, listing_id uuid, total_cents integer, currency text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_create_seat_hold(p_event_id uuid, p_quantity integer DEFAULT 1, p_ticket_type_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_hold_code text;
begin
  v_hold_code := replace(gen_random_uuid()::text, '-', '');

  insert into seat_holds (event_id, hold_code, quantity, ticket_type_id, expires_at, created_by)
  values (
    p_event_id,
    v_hold_code,
    p_quantity,
    p_ticket_type_id,
    now() + interval '10 minutes',
    (select auth.uid())
  );

  return v_hold_code;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_create_seat_hold(p_event_id uuid, p_quantity integer DEFAULT 1)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_hold_code text;
begin
  v_hold_code := replace(gen_random_uuid()::text, '-', '');

  insert into seat_holds (event_id, hold_code, quantity, expires_at, created_by)
  values (
    p_event_id,
    v_hold_code,
    p_quantity,
    now() + interval '10 minutes',
    (select auth.uid())
  );

  return v_hold_code;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_create_waitlist_checkout_order(p_waitlist_id uuid)
 RETURNS TABLE(order_id uuid, payment_id uuid, waitlist_id uuid, total_cents integer, currency text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_current_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT public.current_user_uid();
$function$;

CREATE OR REPLACE FUNCTION public.fn_db_slow_queries(p_limit integer DEFAULT 10, p_min_mean_ms numeric DEFAULT 5)
 RETURNS TABLE(query text, calls bigint, total_exec_ms double precision, mean_exec_ms double precision, rows bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_devices_require_event_for_scanner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.device_role = 'organizer_scanner'::public.device_role AND NEW.event_id IS NULL THEN
    RAISE EXCEPTION 'Assigned scanner devices (organizer_scanner) must reference an event_id';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_duplicate_event(p_event_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND role    = ANY(ARRAY['admin','organizer','organizer_owner','organizer_admin']::text[])
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_enqueue_webhook(p_event_type text, p_payload jsonb, p_org_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_event_artists_refresh_event_search()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_event uuid;
begin
  v_event := coalesce(new.event_id, old.event_id);
  if v_event is not null then
    update public.events set updated_at = now() where id = v_event;
  end if;
  return coalesce(new, old);
end
$function$;

CREATE OR REPLACE FUNCTION public.fn_event_category_slug_exists(p_slug text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.event_categories
    where slug = p_slug
      and is_active = true
  )
$function$;

CREATE OR REPLACE FUNCTION public.fn_event_is_public_now(p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.status = 'published'::event_status
      and e.visibility = 'public'
      and (e.publish_at is null or now() at time zone 'utc' >= e.publish_at)
      and (e.unpublish_at is null or now() at time zone 'utc' <  e.unpublish_at)
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_event_sales_public()
 RETURNS TABLE(event_id uuid, tickets_sold bigint, gross_revenue_cents bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_events_refresh_search()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_feature_flags_touch_last_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_finalize_email_broadcast(p_notification_id uuid, p_sent_count integer, p_failed_count integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_user uuid;
BEGIN
  SELECT (select auth.uid()) INTO v_user;

  UPDATE public.notifications
  SET status = 'sent',
      sent_at = now(),
      payload = payload || jsonb_build_object(
        'sent_count', p_sent_count,
        'failed_count', p_failed_count
      )
  WHERE id = p_notification_id
    AND type = 'email_broadcast'
    AND user_id = v_user;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_my_notification_mutes()
 RETURNS text[]
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(array_agg(notification_type), '{}')
  from public.notification_mutes
  where user_id = (select auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_my_order_totals(p_order_id uuid)
 RETURNS order_totals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_my_order_totals_json(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_my_ticketiv_roles()
 RETURNS TABLE(user_id uuid, role_key text, role_label text, source text, source_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select * from public.fn_get_ticketiv_effective_roles(auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_or_create_artist(p_name text, p_bio text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_or_create_venue(p_name text, p_city text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_tz text DEFAULT 'Africa/Mbabane'::text, p_capacity integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_ticketiv_effective_roles(p_user_id uuid)
 RETURNS TABLE(user_id uuid, role_key text, role_label text, source text, source_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.user_id, 'attendee'::text, 'Attendee'::text, 'profiles'::text, p.user_id
  from public.profiles p
  where p.user_id = p_user_id

  union

  select om.user_id, 'organizer'::text, 'Organizer'::text, 'org_members'::text, om.org_id
  from public.org_members om
  where om.user_id = p_user_id
    and om.role in ('organizer'::public.app_role, 'organizer_owner'::public.app_role, 'organizer_admin'::public.app_role, 'organizer_staff'::public.app_role, 'finance'::public.app_role)

  union

  select e.created_by, 'organizer'::text, 'Organizer'::text, 'events.created_by'::text, e.id
  from public.events e
  where e.created_by = p_user_id

  union

  select es.user_id, 'scanner'::text, 'Scanner'::text, 'event_staff'::text, es.event_id
  from public.event_staff es
  where es.user_id = p_user_id
    and es.active is true
    and es.role in ('scanner'::public.app_role, 'organizer_scanner'::public.app_role)

  union

  select a.primary_user_id, 'talent'::text, 'Talent'::text, 'artists.primary_user_id'::text, a.id
  from public.artists a
  where a.primary_user_id = p_user_id;
$function$;

CREATE OR REPLACE FUNCTION public.fn_is_event_scanner(p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT exists (
    SELECT 1 FROM public.event_staff es
    WHERE es.event_id = p_event_id
      AND es.user_id = public.current_user_uid()
      AND es.role = 'scanner'::app_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_is_event_staff(p_event_id uuid, p_min_role app_role DEFAULT 'organizer_staff'::app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT exists (
    SELECT 1
    FROM public.event_staff es
    WHERE es.event_id = p_event_id
      AND es.user_id = public.current_user_uid()
      AND es.role = ANY(ARRAY['organizer_admin'::app_role,'organizer_staff'::app_role])
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_is_org_member(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT exists (
    SELECT 1
    FROM public.org_members m
    WHERE m.org_id = p_org_id
      AND m.user_id = public.current_user_uid()
      AND m.role = ANY(ARRAY['organizer_admin'::app_role,'organizer_staff'::app_role])
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_issue_guestlist(p_guestlist_entry_id uuid, p_allocate integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_entry public.guestlist_entries%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_tt public.ticket_types%ROWTYPE;
  v_user uuid := (select auth.uid());
  v_fulfilled integer;
  v_remaining integer;
  v_qty integer;
  v_buyer uuid;
  v_order_id uuid;
  v_currency text;
begin
  select * into v_entry from public.guestlist_entries where id = p_guestlist_entry_id;
  if v_entry.id is null then
    raise exception 'guestlist_entry_not_found' using errcode = 'P0001';
  end if;

  select * into v_event from public.events where id = v_entry.event_id;
  if v_event.id is null then
    raise exception 'event_not_found' using errcode = 'P0001';
  end if;

  if not (
    exists (
      select 1 from public.event_staff es
      where es.event_id = v_entry.event_id and es.user_id = v_user and es.active = true
    )
    or public.is_org_admin(v_event.org_id)
    or public.is_global_admin(v_user)
  ) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if v_entry.ticket_type_id is null then
    raise exception 'no_ticket_type' using errcode = 'P0001';
  end if;

  select * into v_tt from public.ticket_types where id = v_entry.ticket_type_id and event_id = v_entry.event_id;
  if v_tt.id is null then
    raise exception 'ticket_type_not_found' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_fulfilled
  from public.guestlist_fulfillments gf
  join public.order_items oi on oi.order_id = gf.order_id
  where gf.guestlist_entry_id = v_entry.id;

  v_remaining := greatest(0, v_entry.allocation - v_fulfilled);
  if v_remaining <= 0 then
    raise exception 'already_fulfilled' using errcode = 'P0001';
  end if;

  v_qty := least(coalesce(nullif(p_allocate, 0), v_remaining), v_remaining);
  if v_qty <= 0 then
    raise exception 'invalid_quantity' using errcode = 'P0001';
  end if;

  if v_entry.email is not null then
    select id into v_buyer from auth.users where lower(email) = lower(v_entry.email) limit 1;
  end if;
  v_buyer := coalesce(v_buyer, v_entry.created_by, v_user);
  if v_buyer is null then
    raise exception 'no_buyer' using errcode = 'P0001';
  end if;

  v_currency := coalesce(v_tt.currency, v_event.currency, 'SZL');

  insert into public.orders (
    org_id, buyer_id, total_cents, subtotal_cents, item_count,
    currency, status, channel, email, phone, buyer_email
  ) values (
    v_event.org_id, v_buyer, 0, 0, v_qty,
    v_currency, 'paid', 'online', v_entry.email, v_entry.phone, v_entry.email
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, ticket_type_id, ticket_code, status, name, holder_name, holder_email, holder_phone
  )
  select
    v_order_id, v_tt.id, gen_random_uuid()::text, 'issued', v_tt.name,
    v_entry.full_name, v_entry.email, v_entry.phone
  from generate_series(1, v_qty);

  insert into public.guestlist_fulfillments (guestlist_entry_id, order_id)
  select v_entry.id, v_order_id from generate_series(1, v_qty);

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (
    v_event.org_id, v_user, 'guestlist_fulfillments', v_entry.id::text, 'insert',
    jsonb_build_object(
      'event_id', v_entry.event_id,
      'guestlist_entry_id', v_entry.id,
      'order_id', v_order_id,
      'ticket_type_id', v_tt.id,
      'quantity', v_qty,
      'buyer_id', v_buyer,
      'holder_name', v_entry.full_name
    )
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'quantity', v_qty,
    'fulfilled_count', v_fulfilled + v_qty,
    'remaining_count', v_remaining - v_qty
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_link_event_artist_by_name(p_event_id uuid, p_artist_name text, p_role text DEFAULT NULL::text, p_bio text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_my_order_totals(limit_rows integer DEFAULT 50, offset_rows integer DEFAULT 0)
 RETURNS SETOF order_totals
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_mint_tickets(p_order_item_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  -- stub: minting logic placeholder
  RETURN;
END; $function$;

CREATE OR REPLACE FUNCTION public.fn_mirror_user_phone_to_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    UPDATE public.profiles
       SET phone = NEW.phone::text
     WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_my_waitlist_positions()
 RETURNS TABLE(waitlist_id uuid, "position" bigint, queue_length bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_org_finance_summary(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_currency text;
  v_gross integer := 0;
  v_fees integer := 0;
  v_net integer := 0;
  v_refunds integer := 0;
  v_committed integer := 0;
  v_pending integer := 0;
  v_paid integer := 0;
  v_available integer := 0;
begin
  if p_org_id is null then
    raise exception 'org_id_required' using errcode = 'P0001';
  end if;

  if not (public.is_org_member(p_org_id, auth.uid()) or public.is_super_admin(auth.uid())) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  select coalesce(default_currency, 'SZL') into v_currency
  from public.organizations where id = p_org_id;
  v_currency := coalesce(v_currency, 'SZL');

  select
    coalesce(sum(amount_cents) filter (where type = 'order_gross'), 0),
    coalesce(sum(abs(amount_cents)) filter (where type = 'fee'), 0),
    coalesce(sum(amount_cents) filter (where type = 'payment_net'), 0),
    coalesce(sum(amount_cents) filter (where type = 'refund'), 0)
  into v_gross, v_fees, v_net, v_refunds
  from public.ledger_entries
  where org_id = p_org_id;

  select
    coalesce(sum(amount_cents) filter (where status in ('requested', 'processing', 'paid')), 0),
    coalesce(sum(amount_cents) filter (where status in ('requested', 'processing')), 0),
    coalesce(sum(amount_cents) filter (where status = 'paid'), 0)
  into v_committed, v_pending, v_paid
  from public.payouts
  where org_id = p_org_id;

  v_available := greatest(0, v_net - v_refunds - v_committed);

  return jsonb_build_object(
    'currency', v_currency,
    'gross_cents', v_gross,
    'fees_cents', v_fees,
    'net_cents', v_net,
    'refunds_cents', v_refunds,
    'paid_out_cents', v_paid,
    'pending_payout_cents', v_pending,
    'available_cents', v_available
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_payment_routing_rules_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin new.updated_at := now(); return new; end
$function$;

CREATE OR REPLACE FUNCTION public.fn_pos_charge(p_event_id uuid, p_items jsonb, p_payment_method text, p_buyer_name text DEFAULT NULL::text, p_buyer_email text DEFAULT NULL::text, p_buyer_phone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  select public.fn_create_inventory_protected_order(
    p_event_id  := p_event_id,
    p_buyer_id  := v_caller,
    p_buyer_email := coalesce(p_buyer_email, ''),
    p_items     := p_items,
    p_holder_name := p_buyer_name
  ) into v_created;

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
$function$;

CREATE OR REPLACE FUNCTION public.fn_preview_pricing(p_org_id uuid, p_ticket_type_ids uuid[], p_quantities integer[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_profile_can_read(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    p_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.org_members om1
      JOIN public.org_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = (SELECT auth.uid())
        AND om2.user_id = p_user_id
    );
$function$;

CREATE OR REPLACE FUNCTION public.fn_publish_resale_listing(p_order_item_id uuid, p_price_cents integer, p_listing_hours integer DEFAULT 24)
 RETURNS TABLE(listing_id uuid, order_item_id uuid, price_cents integer, currency text, listing_expires_at timestamp with time zone, transfer_fee_cents integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_quote_order(p_items jsonb, p_currency text DEFAULT 'SZL'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  result jsonb := '{}'::jsonb;
BEGIN
  result := jsonb_build_object('items', p_items, 'currency', p_currency, 'total_cents', 0);
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_quote_order(p_event_id uuid, p_items jsonb, p_channel sales_channel, p_coupon text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  RETURN jsonb_build_object('total_cents', 0, 'breakdown', '[]'::jsonb);
END $function$;

CREATE OR REPLACE FUNCTION public.fn_recalculate_event_live_stats(p_event_id uuid)
 RETURNS event_live_stats
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_stats public.event_live_stats;
begin
  if p_event_id is null then
    raise exception 'event id is required';
  end if;

  insert into public.event_live_stats as els (
    event_id,
    tickets_sold,
    tickets_available,
    gross_sales_cents,
    successful_payments,
    failed_payments,
    checked_in_count,
    last_order_at,
    last_scan_at,
    updated_at
  )
  select
    e.id,
    coalesce(issued.tickets_sold, 0)::integer as tickets_sold,
    greatest(
      coalesce(capacity.total_quota, 0) - coalesce(issued.tickets_sold, 0),
      0
    )::integer as tickets_available,
    coalesce(payments.gross_sales_cents, 0)::bigint as gross_sales_cents,
    coalesce(payments.successful_payments, 0)::integer as successful_payments,
    coalesce(payments.failed_payments, 0)::integer as failed_payments,
    coalesce(scans.checked_in_count, 0)::integer as checked_in_count,
    payments.last_order_at,
    scans.last_scan_at,
    now()
  from public.events e

  left join lateral (
    select coalesce(sum(greatest(tt.quota, 0)), 0)::integer as total_quota
    from public.ticket_types tt
    where tt.event_id = e.id
  ) capacity on true

  left join lateral (
    select count(*)::integer as tickets_sold
    from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    join public.orders o on o.id = oi.order_id
    where tt.event_id = e.id
      and o.status::text = 'paid'
      and oi.status::text in ('issued', 'checked_in', 'transferred')
      and oi.revoked_at is null
      and oi.refunded_at is null
  ) issued on true

  left join lateral (
    select
      coalesce(
        sum(
          case
            when p.status::text = 'succeeded' then p.amount_cents
            else 0
          end
        ),
        0
      )::bigint as gross_sales_cents,
      count(*) filter (where p.status::text = 'succeeded')::integer as successful_payments,
      count(*) filter (where p.status::text = 'failed')::integer as failed_payments,
      max(o.created_at) filter (where p.status::text = 'succeeded') as last_order_at
    from public.orders o
    join public.payments p on p.order_id = o.id
    where exists (
      select 1
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      where oi.order_id = o.id
        and tt.event_id = e.id
    )
  ) payments on true

  left join lateral (
    select
      count(*) filter (where s.outcome = 'valid')::integer as checked_in_count,
      max(s.scanned_at) filter (where s.outcome = 'valid') as last_scan_at
    from public.scans s
    where s.event_id = e.id
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

  if not found then
    raise exception 'event % not found', p_event_id;
  end if;

  return v_stats;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_recalculate_event_live_stats_from_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_recalculate_event_live_stats_from_order_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_recalculate_event_live_stats_from_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_recalculate_event_live_stats_from_scan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op <> 'DELETE' and new.event_id is not null then
    perform public.fn_recalculate_event_live_stats(new.event_id);
  end if;

  if tg_op <> 'INSERT' and old.event_id is not null then
    perform public.fn_recalculate_event_live_stats(old.event_id);
  end if;

  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_recalculate_event_live_stats_from_ticket_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op <> 'DELETE' and new.event_id is not null then
    perform public.fn_recalculate_event_live_stats(new.event_id);
  end if;

  if tg_op <> 'INSERT' and old.event_id is not null then
    perform public.fn_recalculate_event_live_stats(old.event_id);
  end if;

  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_remove_push_subscription(p_endpoint text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_request_payout(p_org_id uuid, p_amount_cents integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_currency text;
  v_provider text;
  v_available integer;
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

  v_summary := public.fn_org_finance_summary(p_org_id);
  v_available := (v_summary->>'available_cents')::integer;
  v_currency := v_summary->>'currency';

  if p_amount_cents > v_available then
    raise exception 'insufficient_balance' using errcode = 'P0001';
  end if;

  insert into public.payouts (org_id, amount_cents, currency, provider, status)
  values (p_org_id, p_amount_cents, v_currency, v_provider, 'requested')
  returning id into v_payout_id;

  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (
    p_org_id, v_actor, 'payouts', v_payout_id::text, 'insert',
    jsonb_build_object('amount_cents', p_amount_cents, 'currency', v_currency, 'status', 'requested', 'provider', v_provider)
  );

  return jsonb_build_object('payout_id', v_payout_id, 'status', 'requested', 'amount_cents', p_amount_cents, 'currency', v_currency);
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_request_transfer_by_email(p_order_item_id uuid, p_recipient_email text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from_user_id uuid := (SELECT auth.uid());
  v_to_user_id   uuid;
  v_transfer_id  uuid;
BEGIN
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT id INTO v_to_user_id
  FROM auth.users
  WHERE email = lower(trim(p_recipient_email))
  LIMIT 1;

  IF v_to_user_id IS NULL THEN
    RAISE EXCEPTION 'No Ticketiv account found for that email address';
  END IF;

  IF v_to_user_id = v_from_user_id THEN
    RAISE EXCEPTION 'Cannot transfer a ticket to yourself';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE id = p_order_item_id
      AND current_owner_id = v_from_user_id
      AND status = 'issued'
  ) THEN
    RAISE EXCEPTION 'Ticket is not available for transfer';
  END IF;

  INSERT INTO transfers (order_item_id, from_user_id, to_user_id, status)
  VALUES (p_order_item_id, v_from_user_id, v_to_user_id, 'pending')
  RETURNING id INTO v_transfer_id;

  RETURN json_build_object('transfer_id', v_transfer_id, 'to_user_id', v_to_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_rollup_metrics(p_day date)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_scan_ticket(p_ticket_code text, p_event_id uuid, p_scanned_by uuid, p_device_id uuid DEFAULT NULL::uuid, p_session_id uuid DEFAULT NULL::uuid, p_gate text DEFAULT NULL::text, p_scanned_at timestamp with time zone DEFAULT now(), p_attempt_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id     uuid;
  v_authorized boolean := false;
  v_item       record;
  v_scan_id    uuid;
  v_existing   record;
begin
  -- Idempotency: return stored result if this attempt was already processed.
  if p_attempt_id is not null then
    select * into v_existing
    from public.scans
    where request_hash = p_attempt_id
    limit 1;

    if found then
      return jsonb_build_object(
        'outcome',       v_existing.outcome,
        'valid',         v_existing.outcome = 'valid',
        'message',       'Already processed',
        'scan_id',       v_existing.id,
        'order_item_id', v_existing.order_item_id,
        'idempotent',    true
      );
    end if;
  end if;

  -- Authorization -----------------------------------------------------------

  select e.org_id into v_org_id
  from public.events e
  where e.id = p_event_id;

  if v_org_id is null then
    return jsonb_build_object('outcome', 'error', 'valid', false, 'message', 'Event not found');
  end if;

  if exists (select 1 from public.admin_users where user_id = p_scanned_by and active = true) then
    v_authorized := true;
  end if;

  if not v_authorized and exists (
    select 1 from public.org_members
    where org_id = v_org_id
      and user_id = p_scanned_by
      and role in ('admin','organizer','organizer_owner','organizer_admin','organizer_staff','scanner')
  ) then
    v_authorized := true;
  end if;

  if not v_authorized and exists (
    select 1 from public.event_staff
    where event_id = p_event_id
      and user_id = p_scanned_by
      and active = true
      and role in ('admin','organizer_admin','organizer_staff','scanner','event_staff','event_admin')
  ) then
    v_authorized := true;
  end if;

  if not v_authorized then
    return jsonb_build_object('outcome', 'unauthorized', 'valid', false, 'message', 'Not authorized to scan for this event');
  end if;

  -- Ticket lookup + row lock ------------------------------------------------
  -- FOR UPDATE OF oi locks only the order_items row. The second concurrent
  -- scan of the same ticket will wait here until the first transaction commits,
  -- then see status = 'checked_in' and return 'duplicate'.

  select oi.id,
         oi.status,
         oi.checked_in_at,
         tt.event_id  as tt_event_id,
         tt.name      as ticket_type_name,
         o.status     as order_status
  into   v_item
  from   public.order_items  oi
  join   public.ticket_types tt on tt.id  = oi.ticket_type_id
  join   public.orders        o  on  o.id = oi.order_id
  where  oi.ticket_code = p_ticket_code
  for update of oi;

  if not found then
    insert into public.scans
      (event_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, p_ticket_code, 'invalid', p_device_id, p_session_id, p_gate, p_scanned_at, 'Ticket code not found', p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'not_found', 'valid', false, 'message', 'Ticket not found', 'scan_id', v_scan_id);
  end if;

  -- Wrong event
  if v_item.tt_event_id != p_event_id then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'wrong_event', p_device_id, p_session_id, p_gate, p_scanned_at, 'Ticket belongs to a different event', p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'wrong_event', 'valid', false, 'message', 'Ticket is for a different event', 'scan_id', v_scan_id, 'order_item_id', v_item.id);
  end if;

  -- Unpaid order
  if v_item.order_status != 'paid' then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'invalid', p_device_id, p_session_id, p_gate, p_scanned_at, 'Order has not been paid', p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'not_paid', 'valid', false, 'message', 'Order has not been paid', 'scan_id', v_scan_id, 'order_item_id', v_item.id);
  end if;

  -- Refunded
  if v_item.status = 'refunded' then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'revoked', p_device_id, p_session_id, p_gate, p_scanned_at, 'Ticket has been refunded', p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'refunded', 'valid', false, 'message', 'Ticket has been refunded', 'scan_id', v_scan_id, 'order_item_id', v_item.id);
  end if;

  -- Revoked
  if v_item.status = 'revoked' then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'revoked', p_device_id, p_session_id, p_gate, p_scanned_at, 'Ticket has been revoked', p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'revoked', 'valid', false, 'message', 'Ticket has been revoked', 'scan_id', v_scan_id, 'order_item_id', v_item.id);
  end if;

  -- Already checked in (status or timestamp — both checked so nothing slips through)
  if v_item.status = 'checked_in' or v_item.checked_in_at is not null then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'already_used', p_device_id, p_session_id, p_gate, p_scanned_at, p_attempt_id)
    returning id into v_scan_id;

    return jsonb_build_object('outcome', 'duplicate', 'valid', false, 'message', 'Ticket was already scanned', 'scan_id', v_scan_id, 'order_item_id', v_item.id);
  end if;

  -- Valid first-time scan: insert scan + update order_items atomically.
  -- The scans_one_success_per_ticket unique index provides a second-layer
  -- guard if two transactions somehow both reach this point.

  insert into public.scans
    (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, request_hash)
  values
    (p_event_id, v_item.id, p_ticket_code, 'valid', p_device_id, p_session_id, p_gate, p_scanned_at, p_attempt_id)
  returning id into v_scan_id;

  update public.order_items
  set    status       = 'checked_in',
         checked_in_at = p_scanned_at,
         updated_at   = now()
  where  id = v_item.id;

  return jsonb_build_object(
    'outcome',          'validated',
    'valid',            true,
    'message',          'Ticket validated',
    'scan_id',          v_scan_id,
    'order_item_id',    v_item.id,
    'ticket_type_name', v_item.ticket_type_name,
    'checked_in_at',    p_scanned_at
  );

exception
  -- Two transactions raced past the status check. The unique partial index on
  -- (event_id, ticket_code) WHERE outcome = 'valid' stops the second insert.
  -- Return duplicate so the scanner UI behaves correctly.
  when unique_violation then
    insert into public.scans
      (event_id, order_item_id, ticket_code, outcome, device_id, device_session_id, gate, scanned_at, notes, request_hash)
    values
      (p_event_id, v_item.id, p_ticket_code, 'already_used', p_device_id, p_session_id, p_gate, p_scanned_at, 'Concurrent scan', p_attempt_id)
    on conflict do nothing;

    return jsonb_build_object('outcome', 'duplicate', 'valid', false, 'message', 'Ticket was already scanned (concurrent)', 'order_item_id', v_item.id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_search_events(p_query text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_starts_after timestamp with time zone DEFAULT NULL::timestamp with time zone, p_starts_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_max_price_cents integer DEFAULT NULL::integer, p_only_free boolean DEFAULT false, p_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, slug text, cover_image_url text, starts_at timestamp with time zone, city text, category text, venue_name text, min_price_cents integer, currency text, organizer_name text, organizer_logo_url text, tickets_sold integer, rank real)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_store_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_ticket_is_transferable(p_order_item_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.id = p_order_item_id
      AND (
        oi.checked_in_at IS NOT NULL
        OR oi.revoked_at IS NOT NULL
        OR oi.refunded_at IS NOT NULL
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_ticket_type_remaining(p_event_id uuid)
 RETURNS TABLE(ticket_type_id uuid, remaining integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    tt.id,
    greatest(0, tt.quota - coalesce(sold.cnt, 0))::integer
  from public.ticket_types tt
  left join lateral (
    select count(*)::integer as cnt
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = tt.id
      and oi.status in ('issued', 'checked_in')
      and o.status = 'paid'
  ) sold on true
  where tt.event_id = p_event_id;
$function$;

CREATE OR REPLACE FUNCTION public.fn_toggle_favourite(p_event_id uuid, p_save boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_toggle_notification_mute(p_type text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_touch_event_live_stats_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_transition_event_status(p_event_id uuid, p_new_status text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND role    = ANY(ARRAY['organizer_owner', 'organizer_admin']::text[])
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_trg_emit_order_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_trg_emit_payout_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_trg_emit_ticket_transferred()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_org_id uuid;
begin
  if new.status::text = 'accepted'
     and (tg_op = 'INSERT' or old.status::text <> 'accepted')
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_update_my_notification_preferences(p_email_opt_in boolean DEFAULT NULL::boolean, p_sms_opt_in boolean DEFAULT NULL::boolean, p_push_opt_in boolean DEFAULT NULL::boolean, p_in_app_opt_in boolean DEFAULT NULL::boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_update_my_profile(p_display_name text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_surname text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.profiles
  set
    display_name = nullif(btrim(coalesce(p_display_name, display_name)), ''),
    name = nullif(btrim(coalesce(p_name, name)), ''),
    surname = nullif(btrim(coalesce(p_surname, surname)), ''),
    phone = nullif(btrim(coalesce(p_phone, phone)), '')
  where user_id = v_user;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_user_connections_set_responded_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    NEW.responded_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_webhook_endpoints_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin new.updated_at := now(); return new; end
$function$;

CREATE OR REPLACE FUNCTION public.get_event_kpis(p_event_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_organizer_kpis(p_range text DEFAULT '30d'::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_ticket_type_event(ticket_type_uuid uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT event_id FROM public.ticket_types WHERE id = ticket_type_uuid;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_org()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT om.org_id
  FROM public.org_members om
  WHERE om.user_id = (SELECT auth.uid())
  ORDER BY om.created_at ASC
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_orgs()
 RETURNS TABLE(org_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT org_id FROM public.org_members WHERE user_id = public.current_user_uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_user_orgs(p_user_id uuid)
 RETURNS TABLE(org_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT org_id FROM public.org_members WHERE user_id = p_user_id;
$function$;

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$;

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$;

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$;

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$;

CREATE OR REPLACE FUNCTION public.grant_seeded_super_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$;

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$;

CREATE OR REPLACE FUNCTION public.guard_scanner_checkin_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Allow updates that only touch checked_in_at
  if (row_to_json(NEW)::jsonb - 'checked_in_at') = (row_to_json(OLD)::jsonb - 'checked_in_at') then
    return NEW;
  end if;

  -- Otherwise block non-service updates
  if auth.role() <> 'service_role' then
    raise exception 'Scanners may only update checked_in_at';
  end if;

  return NEW;
end $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, phone)
  VALUES (NEW.id, NEW.phone::text)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_refund_processed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  oi record;
  payout_paid boolean;
  notif_payload jsonb;
BEGIN
  -- Only act when refund status becomes 'processed'
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'processed' OR NEW.status <> 'processed' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'processed' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Existing logic: create refund_items and ledger entries
  IF NEW.payload ? 'items' THEN
    FOR oi IN SELECT * FROM jsonb_to_recordset(NEW.payload->'items') AS (order_item_id uuid, amount_cents int, currency text) LOOP
      INSERT INTO public.refund_items (refund_id, order_item_id, amount_cents, currency, reason)
      VALUES (NEW.id, oi.order_item_id, oi.amount_cents, COALESCE(oi.currency, NEW.currency), NULL)
      ON CONFLICT DO NOTHING;

      IF oi.order_item_id IS NOT NULL THEN
        UPDATE public.order_items SET refunded_at = COALESCE(refunded_at, now()) WHERE id = oi.order_item_id;
      END IF;

      INSERT INTO public.ledger_entries (id, org_id, order_id, payment_id, refund_id, type, amount_cents, currency, occurred_at, meta)
      VALUES (gen_random_uuid(), NEW.org_id, NULL, NEW.payment_id, NEW.id, 'refund', oi.amount_cents, COALESCE(oi.currency, NEW.currency), now(), jsonb_build_object('refund_item_order_item_id', oi.order_item_id)) ;
    END LOOP;
  ELSE
    INSERT INTO public.refund_items (refund_id, order_item_id, amount_cents, currency, reason)
    VALUES (NEW.id, NULL, COALESCE(NEW.amount_cents, 0), COALESCE(NEW.currency, 'USD'), NULL)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.ledger_entries (id, org_id, order_id, payment_id, refund_id, type, amount_cents, currency, occurred_at, meta)
    VALUES (gen_random_uuid(), NEW.org_id, NEW.order_id, NEW.payment_id, NEW.id, 'refund', COALESCE(NEW.amount_cents,0), COALESCE(NEW.currency,'USD'), now(), NULL);
  END IF;

  IF NEW.refund_for_payout_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.payouts p WHERE p.id = NEW.refund_for_payout_id AND p.status = 'paid') INTO payout_paid;
    IF payout_paid THEN
      INSERT INTO public.ledger_entries (id, org_id, payout_id, refund_id, type, amount_cents, currency, occurred_at, meta)
      VALUES (gen_random_uuid(), NEW.org_id, NEW.refund_for_payout_id, NEW.id, 'reversal', COALESCE(NEW.amount_cents,0), COALESCE(NEW.currency,'USD'), now(), jsonb_build_object('note','payout clawback placeholder'));
    END IF;
  END IF;

  -- 3) Insert notification row for refund alert
  notif_payload := jsonb_build_object(
    'refund_id', NEW.id,
    'amount_cents', COALESCE(NEW.amount_cents, 0),
    'currency', COALESCE(NEW.currency, 'USD'),
    'reason', COALESCE(NEW.reason, NULL)
  );

  INSERT INTO public.notifications (id, user_id, type, payload, status, created_at, channel)
  VALUES (gen_random_uuid(), NEW.user_id, 'refund_alert', notif_payload, 'pending', now(), 'email')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_app_role(r text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.insert_job_secure(p_kind text, p_payload jsonb, p_run_after timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_event_organizer(p_user_id uuid, p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.org_members m ON e.org_id = m.org_id
    WHERE e.id = p_event_id AND m.user_id = p_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_event_staff(user_uuid uuid, event_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.event_staff es
    WHERE es.user_id = user_uuid AND es.event_id = event_uuid
      AND es.role IN ('organizer_admin'::app_role,'organizer_staff'::app_role,'scanner'::app_role)
      AND coalesce(es.active, true) = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_global_admin(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = p_user
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_order_item_buyer(order_item_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- ensure deterministic name resolution
  SET LOCAL search_path = pg_catalog, public;

  RETURN EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_id
      AND o.buyer_id = (SELECT auth.uid())
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_order_item_org_member(order_item_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id = order_item_id
      AND (
        app.is_org_member(o.org_id)
        OR o.org_id IN (SELECT current_user_org_ids.current_user_org_ids FROM current_user_org_ids() current_user_org_ids(current_user_org_ids))
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role = ANY(ARRAY['organizer_owner','organizer_admin']::public.app_role[])
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin(user_uuid uuid, org_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = user_uuid AND om.org_id = org_uuid AND om.role = 'organizer_admin'::public.app_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = p_user
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_staff(user_uuid uuid, org_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = user_uuid AND om.org_id = org_uuid
      AND om.role IN (
        'organizer_staff'::app_role,'organizer_admin'::app_role,'organizer_owner'::app_role,'organizer'::app_role
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = check_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.issue_comp_ticket(p_org_id uuid, p_ticket_type_id uuid, p_recipient_email text, p_qty integer DEFAULT 1, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.issue_order_items_when_order_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_event_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.order_items_status_transition_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  old_status public.order_item_status;
  new_status public.order_item_status;
BEGIN
  old_status := OLD.status;
  new_status := NEW.status;

  IF old_status = new_status THEN
    RETURN NEW;
  END IF;

  -- terminal states cannot be changed
  IF old_status IN ('revoked','refunded') THEN
    RAISE EXCEPTION 'cannot change status from terminal state %', old_status;
  END IF;

  -- Disallow transferring after checked_in
  IF old_status = 'checked_in' AND new_status = 'transferred' THEN
    RAISE EXCEPTION 'cannot transfer an order_item that is already checked in';
  END IF;

  -- Enforce allowed transitions (conservative)
  IF NOT ( (old_status = 'issued' AND new_status IN ('transferred','checked_in','revoked','refunded'))
        OR (old_status = 'transferred' AND new_status IN ('checked_in','revoked','refunded')) ) THEN
    RAISE EXCEPTION 'invalid status transition from % to %', old_status, new_status;
  END IF;

  IF new_status = 'checked_in' THEN
    NEW.checked_in_at := COALESCE(NEW.checked_in_at, now());
  END IF;

  IF new_status = 'revoked' THEN
    NEW.revoked_at := COALESCE(NEW.revoked_at, now());
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.order_ledger_summary_fn()
 RETURNS TABLE(order_id uuid, gross_cents bigint, payment_net_cents bigint, refund_cents bigint, net_cents bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.order_ledger_summary_fn_definer()
 RETURNS TABLE(order_id uuid, gross_cents bigint, payment_net_cents bigint, refund_cents bigint, net_cents bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    order_id,
    sum(CASE WHEN (type = 'order_gross') THEN amount_cents ELSE 0 END) AS gross_cents,
    sum(CASE WHEN (type = 'payment_net') THEN amount_cents ELSE 0 END) AS payment_net_cents,
    sum(CASE WHEN (type = 'refund') THEN amount_cents ELSE 0 END) AS refund_cents,
    sum(amount_cents) AS net_cents
  FROM public.ledger_entries le
  WHERE order_id IS NOT NULL
  GROUP BY order_id;
$function$;

CREATE OR REPLACE FUNCTION public.order_ledger_summary_fn_impl()
 RETURNS TABLE(order_id uuid, gross_cents bigint, payment_net_cents bigint, refund_cents bigint, net_cents bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT * FROM public.order_ledger_summary_fn_definer();
$function$;

CREATE OR REPLACE FUNCTION public.order_ledger_summary_for_order(p_order_id uuid)
 RETURNS TABLE(order_id uuid, gross_cents bigint, payment_net_cents bigint, refund_cents bigint, net_cents bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.prevent_buyer_contact_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.buyer_email IS DISTINCT FROM NEW.buyer_email) OR (OLD.buyer_phone IS DISTINCT FROM NEW.buyer_phone) THEN
      RAISE EXCEPTION 'buyer_email and buyer_phone are immutable once set';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_pricing_changes_after_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.prevent_scans_on_refunded_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.prevent_totals_change_after_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.resale_listing_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.resale_listings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.run_analyze(schemas text[] DEFAULT ARRAY['public'::text])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
END;$function$;

CREATE OR REPLACE FUNCTION public.scanner_mark_checkin(p_order_item_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_event_categories_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$;

CREATE OR REPLACE FUNCTION public.set_payment_provider_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$;

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$;

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$;

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$;

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$;

CREATE OR REPLACE FUNCTION public.slugify_text(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select trim(both '-' from regexp_replace(regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'))
$function$;

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$;

CREATE OR REPLACE FUNCTION public.sync_order_status_from_ledger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.trg_check_order_currency()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
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
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_reprice_order_after_adjustments()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
begin
  perform public.fn_apply_pricing_to_order(coalesce(new.order_id, old.order_id));
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.trg_reprice_order_after_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.fn_apply_pricing_to_order(COALESCE(NEW.order_id, OLD.order_id));
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_reprice_order_on_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.fn_apply_pricing_to_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_org_role(p_org uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members m WHERE m.org_id = p_org AND m.user_id = public.current_user_uid() AND m.role = ANY(p_roles::app_role[])
  );
$function$;

CREATE OR REPLACE FUNCTION public.validate_event_category_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_scan_and_checkin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  oi_status public.order_item_status;
BEGIN
  -- enforce deterministic resolution of unqualified names
  PERFORM set_config('search_path', 'public,pg_catalog', true);

  IF NEW.order_item_id IS NULL THEN
    RAISE EXCEPTION 'scan must reference an order_item';
  END IF;

  SELECT status INTO oi_status FROM public.order_items WHERE id = NEW.order_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_item % not found', NEW.order_item_id;
  END IF;

  IF oi_status <> 'issued' THEN
    -- map existing states to outcomes for scan attempts (client may handle)
    RAISE EXCEPTION 'cannot scan: order_item % has status %', NEW.order_item_id, oi_status;
  END IF;

  -- atomically set checked_in_at and status
  UPDATE public.order_items
    SET checked_in_at = COALESCE(checked_in_at, now()), status = 'checked_in', updated_at = now()
    WHERE id = NEW.order_item_id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_transfer_order_item_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.verify_ticket_signature(ticket_code text, provided_sig text, secret text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT encode(extensions.hmac(ticket_code::text, secret::text, 'sha256'), 'hex') = lower(provided_sig);
$function$;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$;

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$;

-- ============ TRIGGERS ============
CREATE OR REPLACE TRIGGER artists_set_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER t_artists_touch
  BEFORE UPDATE ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER trg_devices_require_event_for_scanner
  BEFORE INSERT OR UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION fn_devices_require_event_for_scanner();

CREATE OR REPLACE TRIGGER trg_event_artists_refresh_search
  AFTER DELETE OR INSERT OR UPDATE ON public.event_artists
  FOR EACH ROW
  EXECUTE FUNCTION fn_event_artists_refresh_event_search();

CREATE OR REPLACE TRIGGER trg_event_categories_updated_at
  BEFORE UPDATE ON public.event_categories
  FOR EACH ROW
  EXECUTE FUNCTION set_event_categories_updated_at();

CREATE OR REPLACE TRIGGER event_dates_set_updated_at
  BEFORE UPDATE ON public.event_dates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER t_event_dates_touch
  BEFORE UPDATE ON public.event_dates
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER trg_touch_event_live_stats_updated_at
  BEFORE UPDATE ON public.event_live_stats
  FOR EACH ROW
  EXECUTE FUNCTION fn_touch_event_live_stats_updated_at();

CREATE OR REPLACE TRIGGER trg_event_metrics_org_match
  BEFORE INSERT OR UPDATE ON public.event_metrics_daily
  FOR EACH ROW
  EXECUTE FUNCTION ensure_event_metrics_org();

CREATE OR REPLACE TRIGGER tr_event_series_set_updated_at
  BEFORE UPDATE ON public.event_series
  FOR EACH ROW
  EXECUTE FUNCTION event_series_set_updated_at();

CREATE OR REPLACE TRIGGER trg_event_staff_must_be_org_member
  BEFORE INSERT OR UPDATE ON public.event_staff
  FOR EACH ROW
  EXECUTE FUNCTION ensure_event_staff_in_org();

CREATE OR REPLACE TRIGGER trg_events_notify_change
  AFTER DELETE OR INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_change();

CREATE OR REPLACE TRIGGER trg_events_refresh_search
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION fn_events_refresh_search();

CREATE OR REPLACE TRIGGER trg_validate_event_category_slug
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_category_slug();

CREATE OR REPLACE TRIGGER t_feature_flags_touch
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER trg_feature_flags_touch
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION fn_feature_flags_touch_last_changed();

CREATE OR REPLACE TRIGGER ledger_sync_order_status_trig
  AFTER INSERT OR UPDATE ON public.ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_status_from_ledger();

CREATE OR REPLACE TRIGGER t_reprice_order_adjustments_del
  AFTER DELETE ON public.order_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION trg_reprice_order_after_adjustments();

CREATE OR REPLACE TRIGGER t_reprice_order_adjustments_ins
  AFTER INSERT ON public.order_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION trg_reprice_order_after_adjustments();

CREATE OR REPLACE TRIGGER t_reprice_order_adjustments_upd
  AFTER UPDATE ON public.order_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION trg_reprice_order_after_adjustments();

CREATE OR REPLACE TRIGGER order_items_set_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER order_items_status_transition_trig
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION order_items_status_transition_guard();

CREATE OR REPLACE TRIGGER t_check_order_currency
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_check_order_currency();

CREATE OR REPLACE TRIGGER t_order_items_touch
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER t_reprice_order_items_del
  AFTER DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_reprice_order_after_items();

CREATE OR REPLACE TRIGGER t_reprice_order_items_ins
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_reprice_order_after_items();

CREATE OR REPLACE TRIGGER t_reprice_order_items_upd
  AFTER UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_reprice_order_after_items();

CREATE OR REPLACE TRIGGER trg_guard_scanner_checkin_only
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION guard_scanner_checkin_only();

CREATE OR REPLACE TRIGGER trg_recalc_event_live_stats_order_items
  AFTER DELETE OR INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalculate_event_live_stats_from_order_item();

CREATE OR REPLACE TRIGGER trg_upcase_ticket_code
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION app.upcase_ticket_code();

CREATE OR REPLACE TRIGGER orders_prevent_buyer_contact_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_buyer_contact_update();

CREATE OR REPLACE TRIGGER t_reprice_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_reprice_order_on_status();

CREATE OR REPLACE TRIGGER tr_enforce_order_currency_matches_pricing
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION enforce_order_currency_matches_pricing();

CREATE OR REPLACE TRIGGER tr_prevent_pricing_changes_after_paid
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_pricing_changes_after_paid();

CREATE OR REPLACE TRIGGER trg_emit_order_paid
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_emit_order_paid();

CREATE OR REPLACE TRIGGER trg_enforce_pricing_plan_org
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION enforce_pricing_plan_org_cohesion();

CREATE OR REPLACE TRIGGER trg_issue_order_items_when_order_paid
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION issue_order_items_when_order_paid();

CREATE OR REPLACE TRIGGER trg_prevent_totals_after_paid
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_totals_change_after_paid();

CREATE OR REPLACE TRIGGER trg_recalc_event_live_stats_orders
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalculate_event_live_stats_from_order();

CREATE OR REPLACE TRIGGER trg_recompute_order_totals
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION app.recompute_order_totals();

CREATE OR REPLACE TRIGGER payment_methods_set_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_payment_provider_settings_updated_at
  BEFORE UPDATE ON public.payment_provider_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_provider_settings_updated_at();

CREATE OR REPLACE TRIGGER trg_payment_routing_rules_touch
  BEFORE UPDATE ON public.payment_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION fn_payment_routing_rules_touch_updated_at();

CREATE OR REPLACE TRIGGER trg_mint_on_payment_success
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION app.mint_on_payment_success();

CREATE OR REPLACE TRIGGER trg_recalc_event_live_stats_payments
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalculate_event_live_stats_from_payment();

CREATE OR REPLACE TRIGGER trg_emit_payout_paid
  AFTER INSERT OR UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_emit_payout_paid();

CREATE OR REPLACE TRIGGER tr_handle_refund_processed
  AFTER INSERT OR UPDATE ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION handle_refund_processed();

CREATE OR REPLACE TRIGGER resale_listings_updated_at_trg
  BEFORE UPDATE ON public.resale_listings
  FOR EACH ROW
  EXECUTE FUNCTION resale_listings_updated_at();

CREATE OR REPLACE TRIGGER trg_resale_listing_guard
  BEFORE INSERT OR UPDATE ON public.resale_listings
  FOR EACH ROW
  EXECUTE FUNCTION resale_listing_guard();

CREATE OR REPLACE TRIGGER scans_validate_and_checkin_trig
  BEFORE INSERT ON public.scans
  FOR EACH ROW
  EXECUTE FUNCTION validate_scan_and_checkin();

CREATE OR REPLACE TRIGGER tr_prevent_scans_on_refunded_items
  BEFORE INSERT ON public.scans
  FOR EACH ROW
  EXECUTE FUNCTION prevent_scans_on_refunded_items();

CREATE OR REPLACE TRIGGER trg_recalc_event_live_stats_scans
  AFTER DELETE OR INSERT OR UPDATE ON public.scans
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalculate_event_live_stats_from_scan();

CREATE OR REPLACE TRIGGER trg_validate_scan_org
  BEFORE INSERT ON public.scans
  FOR EACH ROW
  EXECUTE FUNCTION app.validate_scan_org();

CREATE OR REPLACE TRIGGER seats_set_updated_at
  BEFORE UPDATE ON public.seats
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER t_seats_touch
  BEFORE UPDATE ON public.seats
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER t_ticket_types_touch
  BEFORE UPDATE ON public.ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER ticket_types_set_updated_at
  BEFORE UPDATE ON public.ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_recalc_event_live_stats_ticket_types
  AFTER DELETE OR INSERT OR UPDATE ON public.ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalculate_event_live_stats_from_ticket_type();

CREATE OR REPLACE TRIGGER t_transfers_touch
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER transfers_validate_order_item_status_trig
  BEFORE INSERT OR UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION validate_transfer_order_item_status();

CREATE OR REPLACE TRIGGER trg_emit_ticket_transferred
  AFTER INSERT OR UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_emit_ticket_transferred();

CREATE OR REPLACE TRIGGER trg_transfers_owner
  BEFORE INSERT OR UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION ensure_transfer_owner();

CREATE OR REPLACE TRIGGER tr_user_connections_set_responded_at
  BEFORE UPDATE ON public.user_connections
  FOR EACH ROW
  EXECUTE FUNCTION fn_user_connections_set_responded_at();

CREATE OR REPLACE TRIGGER tr_user_handles_check_reserved
  BEFORE INSERT OR UPDATE ON public.user_handles
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_reserved_handle();

CREATE OR REPLACE TRIGGER trg_webhook_endpoints_touch
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION fn_webhook_endpoints_touch_updated_at();

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE public.admin_action_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_live_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestlist_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_rule_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resale_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_type_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_handles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "admin_action_catalog_super_admin_delete" ON public.admin_action_catalog;
CREATE POLICY "admin_action_catalog_super_admin_delete" ON public.admin_action_catalog AS PERMISSIVE FOR DELETE TO authenticated USING (is_super_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "admin_action_catalog_super_admin_insert" ON public.admin_action_catalog;
CREATE POLICY "admin_action_catalog_super_admin_insert" ON public.admin_action_catalog AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_super_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "admin_action_catalog_super_admin_select" ON public.admin_action_catalog;
CREATE POLICY "admin_action_catalog_super_admin_select" ON public.admin_action_catalog AS PERMISSIVE FOR SELECT TO authenticated USING (is_super_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "admin_action_catalog_super_admin_update" ON public.admin_action_catalog;
CREATE POLICY "admin_action_catalog_super_admin_update" ON public.admin_action_catalog AS PERMISSIVE FOR UPDATE TO authenticated USING (is_super_admin(( SELECT auth.uid() AS uid))) WITH CHECK (is_super_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "admin_users_super_admin_delete" ON public.admin_users;
CREATE POLICY "admin_users_super_admin_delete" ON public.admin_users AS PERMISSIVE FOR DELETE TO authenticated USING ((is_super_admin(( SELECT auth.uid() AS uid)) OR is_admin()));
DROP POLICY IF EXISTS "admin_users_super_admin_insert" ON public.admin_users;
CREATE POLICY "admin_users_super_admin_insert" ON public.admin_users AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_super_admin(( SELECT auth.uid() AS uid)) OR is_admin()));
DROP POLICY IF EXISTS "admin_users_super_admin_select" ON public.admin_users;
CREATE POLICY "admin_users_super_admin_select" ON public.admin_users AS PERMISSIVE FOR SELECT TO authenticated USING ((is_super_admin(( SELECT auth.uid() AS uid)) OR is_admin()));
DROP POLICY IF EXISTS "admin_users_super_admin_update" ON public.admin_users;
CREATE POLICY "admin_users_super_admin_update" ON public.admin_users AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_super_admin(( SELECT auth.uid() AS uid)) OR is_admin())) WITH CHECK ((is_super_admin(( SELECT auth.uid() AS uid)) OR is_admin()));
DROP POLICY IF EXISTS "audit_log_no_anon_access" ON public.app_audit_log;
CREATE POLICY "audit_log_no_anon_access" ON public.app_audit_log AS PERMISSIVE FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "audit_log_select_combined" ON public.app_audit_log;
CREATE POLICY "audit_log_select_combined" ON public.app_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR is_org_admin(changed_by) OR (((row_data ->> 'org_id'::text))::uuid = get_user_org())));
DROP POLICY IF EXISTS "artists_delete_authenticated" ON public.artists;
CREATE POLICY "artists_delete_authenticated" ON public.artists AS PERMISSIVE FOR DELETE TO authenticated USING (((primary_user_id = ( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM org_members m
  WHERE ((m.org_id = artists.org_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'organizer_owner'::app_role)))))));
DROP POLICY IF EXISTS "artists_insert_authenticated_merged" ON public.artists;
CREATE POLICY "artists_insert_authenticated_merged" ON public.artists AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (org_id = get_user_org())));
DROP POLICY IF EXISTS "artists_select_authenticated_merged" ON public.artists;
CREATE POLICY "artists_select_authenticated_merged" ON public.artists AS PERMISSIVE FOR SELECT TO authenticated USING ((((primary_user_id IS NOT NULL) AND (primary_user_id = ( SELECT auth.uid() AS uid))) OR ((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM org_members m
  WHERE ((m.org_id = artists.org_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role, 'organizer_staff'::app_role, 'organizer'::app_role]))))))));
DROP POLICY IF EXISTS "artists_update_authenticated_merged" ON public.artists;
CREATE POLICY "artists_update_authenticated_merged" ON public.artists AS PERMISSIVE FOR UPDATE TO authenticated USING (((primary_user_id = ( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM org_members m
  WHERE ((m.org_id = artists.org_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role])))))))) WITH CHECK (((primary_user_id = ( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM org_members m
  WHERE ((m.org_id = artists.org_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role]))))))));
DROP POLICY IF EXISTS "audit_log_delete_admin" ON public.audit_log;
CREATE POLICY "audit_log_delete_admin" ON public.audit_log AS PERMISSIVE FOR DELETE TO authenticated USING (((( SELECT auth.jwt() AS jwt) ->> 'user_role'::text) = 'admin'::text));
DROP POLICY IF EXISTS "audit_log_insert_auth" ON public.audit_log;
CREATE POLICY "audit_log_insert_auth" ON public.audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));
DROP POLICY IF EXISTS "audit_log_select_org" ON public.audit_log;
CREATE POLICY "audit_log_select_org" ON public.audit_log AS PERMISSIVE FOR SELECT TO authenticated USING ((org_id = get_user_org()));
DROP POLICY IF EXISTS "audit_log_update_own" ON public.audit_log;
CREATE POLICY "audit_log_update_own" ON public.audit_log AS PERMISSIVE FOR UPDATE TO authenticated USING ((actor_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((actor_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));
DROP POLICY IF EXISTS "staff_read_device_sessions" ON public.device_sessions;
CREATE POLICY "staff_read_device_sessions" ON public.device_sessions AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM devices d
  WHERE ((d.id = device_sessions.device_id) AND app.is_org_member(d.org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role])))));
DROP POLICY IF EXISTS "devices_select_authenticated_merged" ON public.devices;
CREATE POLICY "devices_select_authenticated_merged" ON public.devices AS PERMISSIVE FOR SELECT TO authenticated USING (app.is_org_member(org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]));
DROP POLICY IF EXISTS "event_artists_org_rw_restrict" ON public.event_artists;
CREATE POLICY "event_artists_org_rw_restrict" ON public.event_artists AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_artists.event_id) AND fn_is_org_member(e.org_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_artists.event_id) AND fn_is_org_member(e.org_id)))));
DROP POLICY IF EXISTS "event_artists_public_select" ON public.event_artists;
CREATE POLICY "event_artists_public_select" ON public.event_artists AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_artists.event_id) AND ((e.visibility = 'public'::text) OR (EXISTS ( SELECT 1
           FROM org_members om
          WHERE ((om.org_id = e.org_id) AND (om.user_id = ( SELECT auth.uid() AS uid))))))))));
DROP POLICY IF EXISTS "event_categories_read_active_or_super_admin" ON public.event_categories;
CREATE POLICY "event_categories_read_active_or_super_admin" ON public.event_categories AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_active = true) OR is_global_admin(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "event_categories_super_admin_delete" ON public.event_categories;
CREATE POLICY "event_categories_super_admin_delete" ON public.event_categories AS PERMISSIVE FOR DELETE TO authenticated USING (is_global_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "event_categories_super_admin_insert" ON public.event_categories;
CREATE POLICY "event_categories_super_admin_insert" ON public.event_categories AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_global_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "event_categories_super_admin_update" ON public.event_categories;
CREATE POLICY "event_categories_super_admin_update" ON public.event_categories AS PERMISSIVE FOR UPDATE TO authenticated USING (is_global_admin(( SELECT auth.uid() AS uid))) WITH CHECK (is_global_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "event_dates_authenticated_public_or_org_read" ON public.event_dates;
CREATE POLICY "event_dates_authenticated_public_or_org_read" ON public.event_dates AS PERMISSIVE FOR SELECT TO authenticated USING ((fn_event_is_public_now(event_id) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_dates.event_id) AND fn_is_org_member(e.org_id))))));
DROP POLICY IF EXISTS "event_dates_public_or_org_read" ON public.event_dates;
CREATE POLICY "event_dates_public_or_org_read" ON public.event_dates AS PERMISSIVE FOR SELECT TO anon USING ((fn_event_is_public_now(event_id) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_dates.event_id) AND fn_is_org_member(e.org_id))))));
DROP POLICY IF EXISTS "Users can delete their own favourites" ON public.event_favourites;
CREATE POLICY "Users can delete their own favourites" ON public.event_favourites AS PERMISSIVE FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
DROP POLICY IF EXISTS "Users can insert their own favourites" ON public.event_favourites;
CREATE POLICY "Users can insert their own favourites" ON public.event_favourites AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
DROP POLICY IF EXISTS "Users can view their own favourites" ON public.event_favourites;
CREATE POLICY "Users can view their own favourites" ON public.event_favourites AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
DROP POLICY IF EXISTS "event_live_stats_org_read" ON public.event_live_stats;
CREATE POLICY "event_live_stats_org_read" ON public.event_live_stats AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_live_stats.event_id) AND ((e.status)::text = 'published'::text) AND (e.visibility = 'public'::text) AND ((e.publish_at IS NULL) OR (e.publish_at <= now())) AND ((e.unpublish_at IS NULL) OR (e.unpublish_at > now()))))) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_live_stats.event_id) AND (is_org_admin(e.org_id) OR user_has_org_role(e.org_id, ARRAY['admin'::text, 'organizer'::text, 'organizer_owner'::text, 'organizer_admin'::text, 'organizer_staff'::text, 'scanner'::text, 'pos'::text]) OR is_super_admin(( SELECT auth.uid() AS uid))))))));
DROP POLICY IF EXISTS "event_live_stats_public_read" ON public.event_live_stats;
CREATE POLICY "event_live_stats_public_read" ON public.event_live_stats AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_live_stats.event_id) AND ((e.status)::text = 'published'::text) AND (e.visibility = 'public'::text) AND ((e.publish_at IS NULL) OR (e.publish_at <= now())) AND ((e.unpublish_at IS NULL) OR (e.unpublish_at > now()))))));
DROP POLICY IF EXISTS "Insert: owner set" ON public.event_metrics_daily;
CREATE POLICY "Insert: owner set" ON public.event_metrics_daily AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = org_id));
DROP POLICY IF EXISTS "Select: owner only" ON public.event_metrics_daily;
CREATE POLICY "Select: owner only" ON public.event_metrics_daily AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = org_id));
DROP POLICY IF EXISTS "event_series_org_admin_delete" ON public.event_series;
CREATE POLICY "event_series_org_admin_delete" ON public.event_series AS PERMISSIVE FOR DELETE TO authenticated USING (is_org_admin(org_id));
DROP POLICY IF EXISTS "event_series_org_admin_insert" ON public.event_series;
CREATE POLICY "event_series_org_admin_insert" ON public.event_series AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_org_admin(org_id));
DROP POLICY IF EXISTS "event_series_org_admin_update" ON public.event_series;
CREATE POLICY "event_series_org_admin_update" ON public.event_series AS PERMISSIVE FOR UPDATE TO authenticated USING (is_org_admin(org_id)) WITH CHECK (is_org_admin(org_id));
DROP POLICY IF EXISTS "event_series_public_select" ON public.event_series;
CREATE POLICY "event_series_public_select" ON public.event_series AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "event_staff_select_anon_merged" ON public.event_staff;
CREATE POLICY "event_staff_select_anon_merged" ON public.event_staff AS PERMISSIVE FOR SELECT TO anon USING (false);
DROP POLICY IF EXISTS "event_staff_select_authenticated_merged" ON public.event_staff;
CREATE POLICY "event_staff_select_authenticated_merged" ON public.event_staff AS PERMISSIVE FOR SELECT TO authenticated USING (false);
DROP POLICY IF EXISTS "event_staff_select_authenticator_merged" ON public.event_staff;
CREATE POLICY "event_staff_select_authenticator_merged" ON public.event_staff AS PERMISSIVE FOR SELECT TO authenticator USING (false);
DROP POLICY IF EXISTS "event_staff_select_dashboard_user_merged" ON public.event_staff;
CREATE POLICY "event_staff_select_dashboard_user_merged" ON public.event_staff AS PERMISSIVE FOR SELECT TO dashboard_user USING (false);
DROP POLICY IF EXISTS "event_staff_select_organiser_merged" ON public.event_staff;
CREATE POLICY "event_staff_select_organiser_merged" ON public.event_staff AS PERMISSIVE FOR SELECT TO organiser USING (false);
DROP POLICY IF EXISTS "events_delete_authenticated" ON public.events;
CREATE POLICY "events_delete_authenticated" ON public.events AS PERMISSIVE FOR DELETE TO authenticated USING ((app.can_delete_event(id) OR (can_manage_event(id, ( SELECT auth.uid() AS uid)) AND (status = 'draft'::event_status))));
DROP POLICY IF EXISTS "events_delete_consolidated" ON public.events;
CREATE POLICY "events_delete_consolidated" ON public.events AS PERMISSIVE FOR DELETE TO anon USING (((org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE ((org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (org_members.role = 'organizer_owner'::app_role)))) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE ((org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (org_members.role = ANY (ARRAY['organizer_admin'::app_role]))))) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE ((org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (org_members.role = ANY (ARRAY['organizer_staff'::app_role]))))) OR ((org_id IN ( SELECT get_user_orgs.org_id
   FROM get_user_orgs() get_user_orgs(org_id))) OR app.is_org_member(org_id, ARRAY['organizer_admin'::app_role, 'organizer_owner'::app_role]) OR fn_is_org_member(org_id))));
DROP POLICY IF EXISTS "events_insert_authenticated" ON public.events;
CREATE POLICY "events_insert_authenticated" ON public.events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT auth.uid() AS uid)))) OR (can_manage_org(org_id, ( SELECT auth.uid() AS uid)) AND (created_by = ( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "events_select_anon" ON public.events;
CREATE POLICY "events_select_anon" ON public.events AS PERMISSIVE FOR SELECT TO anon USING ((visibility = 'public'::text));
DROP POLICY IF EXISTS "events_select_authenticated" ON public.events;
CREATE POLICY "events_select_authenticated" ON public.events AS PERMISSIVE FOR SELECT TO authenticated USING ((((visibility = 'public'::text) AND ((status = 'published'::event_status) OR (publish_at <= now()))) OR is_global_admin(( SELECT auth.uid() AS uid)) OR is_org_member(org_id, ( SELECT auth.uid() AS uid)) OR (org_id IN ( SELECT current_user_org_ids() AS current_user_org_ids)) OR app.is_event_public_now(id) OR app.role_in_membership(org_id, app.current_user_id(), NULL::text[]) OR app.role_in_event_staff(id, app.current_user_id(), NULL::text[]) OR ((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['organizer'::text, 'admin'::text])) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM event_staff es
  WHERE ((es.event_id = events.id) AND (es.user_id = ( SELECT auth.uid() AS uid)))))));
DROP POLICY IF EXISTS "events_update_authenticated" ON public.events;
CREATE POLICY "events_update_authenticated" ON public.events AS PERMISSIVE FOR UPDATE TO authenticated USING (((org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE ((org_members.user_id = ( SELECT auth.uid() AS uid)) AND (org_members.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role]))))) OR can_manage_event(id, ( SELECT auth.uid() AS uid)))) WITH CHECK (((org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE ((org_members.user_id = ( SELECT auth.uid() AS uid)) AND (org_members.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role]))))) OR can_manage_event(id, ( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "events_update_guardrail" ON public.events;
CREATE POLICY "events_update_guardrail" ON public.events AS RESTRICTIVE FOR UPDATE TO authenticated USING ((status <> 'archived'::event_status)) WITH CHECK ((status <> 'archived'::event_status));
DROP POLICY IF EXISTS "feature_flags_delete" ON public.feature_flags;
CREATE POLICY "feature_flags_delete" ON public.feature_flags AS PERMISSIVE FOR DELETE TO authenticated USING (((org_id IS NULL) AND is_super_admin(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "feature_flags_insert" ON public.feature_flags;
CREATE POLICY "feature_flags_insert" ON public.feature_flags AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((org_id IS NULL) AND is_super_admin(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "feature_flags_select" ON public.feature_flags;
CREATE POLICY "feature_flags_select" ON public.feature_flags AS PERMISSIVE FOR SELECT TO authenticated USING ((((org_id IS NULL) AND is_super_admin(( SELECT auth.uid() AS uid))) OR is_org_admin(org_id) OR (EXISTS ( SELECT 1
   FROM org_members m
  WHERE ((m.org_id = feature_flags.org_id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));
DROP POLICY IF EXISTS "feature_flags_update" ON public.feature_flags;
CREATE POLICY "feature_flags_update" ON public.feature_flags AS PERMISSIVE FOR UPDATE TO authenticated USING (((org_id IS NULL) AND is_super_admin(( SELECT auth.uid() AS uid)))) WITH CHECK (((org_id IS NULL) AND is_super_admin(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "guestlist_entries_delete_restrict" ON public.guestlist_entries;
CREATE POLICY "guestlist_entries_delete_restrict" ON public.guestlist_entries AS PERMISSIVE FOR DELETE TO authenticated USING ((app.can_manage_guestlist_entry(event_id) OR (created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM org_members m
  WHERE ((m.org_id = ( SELECT e.org_id
           FROM events e
          WHERE (e.id = guestlist_entries.event_id))) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['organizer_admin'::app_role, 'organizer_owner'::app_role])))))));
DROP POLICY IF EXISTS "guestlist_entries_select_restrict" ON public.guestlist_entries;
CREATE POLICY "guestlist_entries_select_restrict" ON public.guestlist_entries AS PERMISSIVE FOR SELECT TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM event_staff es
  WHERE ((es.event_id = guestlist_entries.event_id) AND (es.user_id = ( SELECT auth.uid() AS uid)) AND (es.active IS DISTINCT FROM false))))));
DROP POLICY IF EXISTS "guestlist_entries_update" ON public.guestlist_entries;
CREATE POLICY "guestlist_entries_update" ON public.guestlist_entries AS PERMISSIVE FOR UPDATE TO authenticated USING (app.can_update_guestlist_entry(( SELECT auth.uid() AS uid), event_id, created_by)) WITH CHECK (app.can_update_guestlist_entry(( SELECT auth.uid() AS uid), event_id, created_by));
DROP POLICY IF EXISTS "guestlist_fulfill_delete_public_consolidated" ON public.guestlist_fulfillments;
CREATE POLICY "guestlist_fulfill_delete_public_consolidated" ON public.guestlist_fulfillments AS PERMISSIVE FOR DELETE TO public USING (((EXISTS ( SELECT 1
   FROM (orders o
     JOIN ticket_types tt ON ((tt.event_id IN ( SELECT tt.event_id
           FROM events
          WHERE (events.id = tt.event_id)))))
  WHERE (o.id = guestlist_fulfillments.order_id))) OR true OR (EXISTS ( SELECT 1
   FROM (orders o
     JOIN ticket_types tt ON ((tt.event_id = ( SELECT tt.event_id
           FROM events e
          WHERE (e.id = tt.event_id)))))
  WHERE (o.id = guestlist_fulfillments.order_id)))));
DROP POLICY IF EXISTS "guestlist_fulfillments_select_consolidated" ON public.guestlist_fulfillments;
CREATE POLICY "guestlist_fulfillments_select_consolidated" ON public.guestlist_fulfillments AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM guestlist_entries ge
  WHERE ((ge.id = guestlist_fulfillments.guestlist_entry_id) AND ((ge.created_by = ( SELECT auth.uid() AS uid)) OR app.is_event_staff(ge.event_id, ARRAY['organizer_admin'::text, 'organizer_staff'::text]) OR (EXISTS ( SELECT 1
           FROM event_staff es
          WHERE ((es.event_id = ge.event_id) AND (es.user_id = ( SELECT auth.uid() AS uid)) AND (es.active = true)))))))));
DROP POLICY IF EXISTS "guestlist_fulfillments_staff_insert" ON public.guestlist_fulfillments;
CREATE POLICY "guestlist_fulfillments_staff_insert" ON public.guestlist_fulfillments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (guestlist_entries ge
     JOIN event_staff es ON ((es.event_id = ge.event_id)))
  WHERE ((ge.id = guestlist_fulfillments.guestlist_entry_id) AND (es.user_id = ( SELECT auth.uid() AS uid)) AND (es.active = true)))));
DROP POLICY IF EXISTS "jobs_org_read" ON public.jobs;
CREATE POLICY "jobs_org_read" ON public.jobs AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM org_members m
  WHERE (m.user_id = fn_current_user_id()))));
DROP POLICY IF EXISTS "ledger_org_read" ON public.ledger_entries;
CREATE POLICY "ledger_org_read" ON public.ledger_entries AS PERMISSIVE FOR SELECT TO public USING (fn_is_org_member(org_id));
DROP POLICY IF EXISTS "user_own_mutes" ON public.notification_mutes;
CREATE POLICY "user_own_mutes" ON public.notification_mutes AS PERMISSIVE FOR ALL TO public USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
DROP POLICY IF EXISTS "notifications_delete_per_user" ON public.notifications;
CREATE POLICY "notifications_delete_per_user" ON public.notifications AS PERMISSIVE FOR DELETE TO authenticated USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "notifications_insert_per_user" ON public.notifications;
CREATE POLICY "notifications_insert_per_user" ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "notifications_select_per_user" ON public.notifications;
CREATE POLICY "notifications_select_per_user" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "notifications_update_per_user" ON public.notifications;
CREATE POLICY "notifications_update_per_user" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)) WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "order_adjustments_read_org_member" ON public.order_adjustments;
CREATE POLICY "order_adjustments_read_org_member" ON public.order_adjustments AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (orders o
     JOIN org_members m ON ((m.org_id = o.org_id)))
  WHERE ((o.id = order_adjustments.order_id) AND (m.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));
DROP POLICY IF EXISTS "order_items_select_consolidated_anon" ON public.order_items;
CREATE POLICY "order_items_select_consolidated_anon" ON public.order_items AS PERMISSIVE FOR SELECT TO anon USING ((is_order_item_buyer(id) OR is_order_item_org_member(id)));
DROP POLICY IF EXISTS "order_items_select_consolidated_authenticated" ON public.order_items;
CREATE POLICY "order_items_select_consolidated_authenticated" ON public.order_items AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND app.is_org_member_roles(o.org_id, VARIADIC ARRAY['organizer_admin'::text, 'organizer_staff'::text])))) OR (EXISTS ( SELECT 1
   FROM (ticket_types tt
     JOIN events e ON ((e.id = tt.event_id)))
  WHERE ((tt.id = order_items.ticket_type_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role, 'scanner'::app_role])))) OR (app.role_in_event_staff(( SELECT ticket_types.event_id
   FROM ticket_types
  WHERE (ticket_types.id = order_items.ticket_type_id)), app.current_user_id(), NULL::text[]) OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND ((o.buyer_id = app.current_user_id()) OR app.role_in_membership(o.org_id, app.current_user_id(), NULL::text[])))))) OR (current_owner_id = ( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "order_items_update_status" ON public.order_items;
CREATE POLICY "order_items_update_status" ON public.order_items AS PERMISSIVE FOR UPDATE TO authenticated USING ((app.role_in_event_staff(( SELECT ticket_types.event_id
   FROM ticket_types
  WHERE (ticket_types.id = order_items.ticket_type_id)), app.current_user_id(), ARRAY['scanner'::text, 'manager'::text]) OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.buyer_id = app.current_user_id())))))) WITH CHECK ((app.role_in_event_staff(( SELECT ticket_types.event_id
   FROM ticket_types
  WHERE (ticket_types.id = order_items.ticket_type_id)), app.current_user_id(), ARRAY['scanner'::text, 'manager'::text]) OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.buyer_id = app.current_user_id()))))));
DROP POLICY IF EXISTS "buyer-insert-orders" ON public.orders;
CREATE POLICY "buyer-insert-orders" ON public.orders AS PERMISSIVE FOR INSERT TO anon WITH CHECK ((buyer_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));
DROP POLICY IF EXISTS "consolidated_orders_delete_authenticated_v2" ON public.orders;
CREATE POLICY "consolidated_orders_delete_authenticated_v2" ON public.orders AS PERMISSIVE FOR DELETE TO authenticated USING ((app.is_org_member(org_id) OR app.is_org_member_roles(org_id, VARIADIC ARRAY['organizer_admin'::text]) OR ((buyer_id = fn_current_user_id()) AND (status = 'pending'::order_status))));
DROP POLICY IF EXISTS "consolidated_orders_insert_authenticated_v2" ON public.orders;
CREATE POLICY "consolidated_orders_insert_authenticated_v2" ON public.orders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((app.is_org_member(org_id) OR app.is_org_member(org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]) OR (buyer_id = fn_current_user_id())));
DROP POLICY IF EXISTS "orders_select_authenticated_merged" ON public.orders;
CREATE POLICY "orders_select_authenticated_merged" ON public.orders AS PERMISSIVE FOR SELECT TO authenticated USING ((app.is_org_member(org_id) OR app.is_org_member(org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]) OR (buyer_id = fn_current_user_id()) OR app.is_org_member_roles(org_id, VARIADIC ARRAY['organizer_admin'::text, 'organizer_staff'::text]) OR (buyer_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));
DROP POLICY IF EXISTS "orders_update_authenticated_merged" ON public.orders;
CREATE POLICY "orders_update_authenticated_merged" ON public.orders AS PERMISSIVE FOR UPDATE TO authenticated USING ((app.is_org_member(org_id) OR app.is_org_member(org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]) OR (buyer_id = fn_current_user_id()) OR app.is_org_member_roles(org_id, VARIADIC ARRAY['organizer_admin'::text, 'organizer_staff'::text]))) WITH CHECK ((app.is_org_member(org_id) OR app.is_org_member(org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]) OR (buyer_id = fn_current_user_id()) OR app.is_org_member_roles(org_id, VARIADIC ARRAY['organizer_admin'::text, 'organizer_staff'::text])));
DROP POLICY IF EXISTS "org_members_authenticated_all_merged" ON public.org_members;
CREATE POLICY "org_members_authenticated_all_merged" ON public.org_members AS PERMISSIVE FOR ALL TO authenticated USING (app.role_in_membership(org_id, app.current_user_id(), NULL::text[])) WITH CHECK (app.role_in_membership(org_id, app.current_user_id(), NULL::text[]));
DROP POLICY IF EXISTS "org_insert" ON public.org_metrics_daily;
CREATE POLICY "org_insert" ON public.org_metrics_daily AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((((( SELECT auth.jwt() AS jwt) ->> 'org_id'::text))::uuid = org_id));
DROP POLICY IF EXISTS "org_metrics_delete_authenticated" ON public.org_metrics_daily;
CREATE POLICY "org_metrics_delete_authenticated" ON public.org_metrics_daily AS PERMISSIVE FOR DELETE TO authenticated USING ((((( SELECT auth.jwt() AS jwt) ->> 'org_id'::text))::uuid = org_id));
DROP POLICY IF EXISTS "org_read" ON public.org_metrics_daily;
CREATE POLICY "org_read" ON public.org_metrics_daily AS PERMISSIVE FOR SELECT TO authenticated USING ((((( SELECT auth.jwt() AS jwt) ->> 'org_id'::text))::uuid = org_id));
DROP POLICY IF EXISTS "org_update" ON public.org_metrics_daily;
CREATE POLICY "org_update" ON public.org_metrics_daily AS PERMISSIVE FOR UPDATE TO authenticated USING ((((( SELECT auth.jwt() AS jwt) ->> 'org_id'::text))::uuid = org_id)) WITH CHECK ((((( SELECT auth.jwt() AS jwt) ->> 'org_id'::text))::uuid = org_id));
DROP POLICY IF EXISTS "organizations_anon_public_event_read" ON public.organizations;
CREATE POLICY "organizations_anon_public_event_read" ON public.organizations AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.org_id = organizations.id) AND (e.status = 'published'::event_status) AND (e.visibility = 'public'::text) AND ((e.publish_at IS NULL) OR (e.publish_at <= now())) AND ((e.unpublish_at IS NULL) OR (e.unpublish_at > now()))))));
DROP POLICY IF EXISTS "orgs_member_update" ON public.organizations;
CREATE POLICY "orgs_member_update" ON public.organizations AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM org_members m
  WHERE ((m.org_id = organizations.id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM org_members m
  WHERE ((m.org_id = organizations.id) AND (m.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (m.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role]))))));
DROP POLICY IF EXISTS "orgs_select_consolidated_authenticated" ON public.organizations;
CREATE POLICY "orgs_select_consolidated_authenticated" ON public.organizations AS PERMISSIVE FOR SELECT TO authenticated USING ((app.is_org_member(id, ARRAY['organizer_admin'::app_role]) OR app.is_org_member(id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]) OR (EXISTS ( SELECT 1
   FROM org_members m
  WHERE ((m.org_id = organizations.id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));
DROP POLICY IF EXISTS "deny_delete_to_authenticated" ON public.payment_attempts;
CREATE POLICY "deny_delete_to_authenticated" ON public.payment_attempts AS PERMISSIVE FOR DELETE TO authenticated USING (false);
DROP POLICY IF EXISTS "deny_update_to_authenticated" ON public.payment_attempts;
CREATE POLICY "deny_update_to_authenticated" ON public.payment_attempts AS PERMISSIVE FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "insert_by_buyer" ON public.payment_attempts;
CREATE POLICY "insert_by_buyer" ON public.payment_attempts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = payment_attempts.order_id) AND (o.buyer_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));
DROP POLICY IF EXISTS "select_authenticated" ON public.payment_attempts;
CREATE POLICY "select_authenticated" ON public.payment_attempts AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = payment_attempts.order_id) AND (o.buyer_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (orders o
     JOIN org_members m ON ((m.org_id = o.org_id)))
  WHERE ((o.id = payment_attempts.order_id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));
DROP POLICY IF EXISTS "own_payment_methods_delete" ON public.payment_methods;
CREATE POLICY "own_payment_methods_delete" ON public.payment_methods AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "own_payment_methods_insert" ON public.payment_methods;
CREATE POLICY "own_payment_methods_insert" ON public.payment_methods AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "own_payment_methods_select" ON public.payment_methods;
CREATE POLICY "own_payment_methods_select" ON public.payment_methods AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "own_payment_methods_update" ON public.payment_methods;
CREATE POLICY "own_payment_methods_update" ON public.payment_methods AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "payment_provider_settings_no_client_access" ON public.payment_provider_settings;
CREATE POLICY "payment_provider_settings_no_client_access" ON public.payment_provider_settings AS PERMISSIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "payment_routing_rules_delete" ON public.payment_routing_rules;
CREATE POLICY "payment_routing_rules_delete" ON public.payment_routing_rules AS PERMISSIVE FOR DELETE TO authenticated USING (is_super_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "payment_routing_rules_insert" ON public.payment_routing_rules;
CREATE POLICY "payment_routing_rules_insert" ON public.payment_routing_rules AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_super_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "payment_routing_rules_select" ON public.payment_routing_rules;
CREATE POLICY "payment_routing_rules_select" ON public.payment_routing_rules AS PERMISSIVE FOR SELECT TO authenticated USING (is_super_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "payment_routing_rules_update" ON public.payment_routing_rules;
CREATE POLICY "payment_routing_rules_update" ON public.payment_routing_rules AS PERMISSIVE FOR UPDATE TO authenticated USING (is_super_admin(( SELECT auth.uid() AS uid))) WITH CHECK (is_super_admin(( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "payments_select_authenticated_merged" ON public.payments;
CREATE POLICY "payments_select_authenticated_merged" ON public.payments AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = payments.order_id) AND (o.buyer_id = app.current_user_id())))));
DROP POLICY IF EXISTS "payout_accounts_org_delete" ON public.payout_accounts;
CREATE POLICY "payout_accounts_org_delete" ON public.payout_accounts AS PERMISSIVE FOR DELETE TO authenticated USING (((org_id = ((( SELECT auth.jwt() AS jwt) ->> 'org_id'::text))::uuid) OR (EXISTS ( SELECT 1
   FROM org_members
  WHERE ((org_members.org_id = payout_accounts.org_id) AND (org_members.user_id = ( SELECT auth.uid() AS uid)) AND (org_members.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role])))))));
DROP POLICY IF EXISTS "payout_accounts_org_rw_insert" ON public.payout_accounts;
CREATE POLICY "payout_accounts_org_rw_insert" ON public.payout_accounts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((org_id = ((( SELECT auth.jwt() AS jwt) ->> 'org_id'::text))::uuid));
DROP POLICY IF EXISTS "payout_accounts_org_rw_select" ON public.payout_accounts;
CREATE POLICY "payout_accounts_org_rw_select" ON public.payout_accounts AS PERMISSIVE FOR SELECT TO authenticated USING ((org_id = ((( SELECT auth.jwt() AS jwt) ->> 'org_id'::text))::uuid));
DROP POLICY IF EXISTS "payout_accounts_org_rw_update" ON public.payout_accounts;
CREATE POLICY "payout_accounts_org_rw_update" ON public.payout_accounts AS PERMISSIVE FOR UPDATE TO authenticated USING ((org_id = ((( SELECT auth.jwt() AS jwt) ->> 'org_id'::text))::uuid)) WITH CHECK ((org_id = ((( SELECT auth.jwt() AS jwt) ->> 'org_id'::text))::uuid));
DROP POLICY IF EXISTS "payouts_delete_authenticated" ON public.payouts;
CREATE POLICY "payouts_delete_authenticated" ON public.payouts AS PERMISSIVE FOR DELETE TO authenticated USING (fn_is_org_member(org_id));
DROP POLICY IF EXISTS "staff_read_redemptions" ON public.price_rule_redemptions;
CREATE POLICY "staff_read_redemptions" ON public.price_rule_redemptions AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM price_rules pr
  WHERE ((pr.id = price_rule_redemptions.price_rule_id) AND app.is_org_member(pr.org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role])))));
DROP POLICY IF EXISTS "price_rules_delete_consolidated" ON public.price_rules;
CREATE POLICY "price_rules_delete_consolidated" ON public.price_rules AS PERMISSIVE FOR DELETE TO authenticated USING ((app.role_in_event_staff(COALESCE(event_id, ( SELECT ticket_types.event_id
   FROM ticket_types
  WHERE (ticket_types.id = price_rules.ticket_type_id))), app.current_user_id(), ARRAY['manager'::text, 'owner'::text]) OR app.role_in_membership(COALESCE(( SELECT events.org_id
   FROM events
  WHERE (events.id = price_rules.event_id)), ( SELECT events.org_id
   FROM events
  WHERE (events.id = ( SELECT ticket_types.event_id
           FROM ticket_types
          WHERE (ticket_types.id = price_rules.ticket_type_id))))), app.current_user_id(), ARRAY['owner'::text, 'admin'::text]) OR app.is_org_member(org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = price_rules.event_id) AND fn_is_org_member(e.org_id))))));
DROP POLICY IF EXISTS "staff_read_price_rules" ON public.price_rules;
CREATE POLICY "staff_read_price_rules" ON public.price_rules AS PERMISSIVE FOR SELECT TO authenticated USING (app.is_org_member(org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]));
DROP POLICY IF EXISTS "pricing_plans_delete_org" ON public.pricing_plans;
CREATE POLICY "pricing_plans_delete_org" ON public.pricing_plans AS PERMISSIVE FOR DELETE TO authenticated USING (((org_id = ((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'org_id'::text))::uuid) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));
DROP POLICY IF EXISTS "pricing_plans_insert_org" ON public.pricing_plans;
CREATE POLICY "pricing_plans_insert_org" ON public.pricing_plans AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((org_id = ((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'org_id'::text))::uuid) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));
DROP POLICY IF EXISTS "pricing_plans_select_org" ON public.pricing_plans;
CREATE POLICY "pricing_plans_select_org" ON public.pricing_plans AS PERMISSIVE FOR SELECT TO authenticated USING (((COALESCE(((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'org_id'::text))::uuid, ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))
 LIMIT 1)) IS NOT NULL) AND (org_id = COALESCE(((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'org_id'::text))::uuid, ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))
 LIMIT 1)))));
DROP POLICY IF EXISTS "pricing_plans_update_org" ON public.pricing_plans;
CREATE POLICY "pricing_plans_update_org" ON public.pricing_plans AS PERMISSIVE FOR UPDATE TO authenticated USING (((org_id = ((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'org_id'::text))::uuid) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))) WITH CHECK (((org_id = ((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'org_id'::text))::uuid) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));
DROP POLICY IF EXISTS "profiles_anon_select" ON public.profiles;
CREATE POLICY "profiles_anon_select" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (fn_profile_can_read(user_id));
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "refund_items_owner_delete" ON public.refund_items;
CREATE POLICY "refund_items_owner_delete" ON public.refund_items AS PERMISSIVE FOR DELETE TO authenticated USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "refund_items_owner_insert" ON public.refund_items;
CREATE POLICY "refund_items_owner_insert" ON public.refund_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "refund_items_owner_select" ON public.refund_items;
CREATE POLICY "refund_items_owner_select" ON public.refund_items AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "refund_items_owner_update" ON public.refund_items;
CREATE POLICY "refund_items_owner_update" ON public.refund_items AS PERMISSIVE FOR UPDATE TO authenticated USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)) WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "refunds_delete_staff_or_admin" ON public.refunds;
CREATE POLICY "refunds_delete_staff_or_admin" ON public.refunds AS PERMISSIVE FOR DELETE TO authenticated USING ((is_org_admin(( SELECT o.org_id
   FROM orders o
  WHERE (o.id = ( SELECT p.order_id
           FROM payments p
          WHERE (p.id = refunds.payment_id))))) OR (EXISTS ( SELECT 1
   FROM (payments p
     JOIN orders o ON ((o.id = p.order_id)))
  WHERE ((p.id = refunds.payment_id) AND app.is_org_member(o.org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))));
DROP POLICY IF EXISTS "refunds_insert_initiator" ON public.refunds;
CREATE POLICY "refunds_insert_initiator" ON public.refunds AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((initiated_by IS NULL) OR (initiated_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));
DROP POLICY IF EXISTS "refunds_select_authenticated_merged" ON public.refunds;
CREATE POLICY "refunds_select_authenticated_merged" ON public.refunds AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((payments py
     JOIN orders o ON ((o.id = py.order_id)))
     JOIN org_members m ON ((m.org_id = o.org_id)))
  WHERE ((py.id = refunds.payment_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY IF EXISTS "Authenticated delete by seller_or_org" ON public.resale_listings;
CREATE POLICY "Authenticated delete by seller_or_org" ON public.resale_listings AS PERMISSIVE FOR DELETE TO authenticated USING (((( SELECT ( SELECT auth.uid() AS uid) AS uid) = seller_id) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));
DROP POLICY IF EXISTS "Authenticated insert by seller_or_org" ON public.resale_listings;
CREATE POLICY "Authenticated insert by seller_or_org" ON public.resale_listings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((( SELECT ( SELECT auth.uid() AS uid) AS uid) = seller_id) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));
DROP POLICY IF EXISTS "Authenticated update by seller_or_org" ON public.resale_listings;
CREATE POLICY "Authenticated update by seller_or_org" ON public.resale_listings AS PERMISSIVE FOR UPDATE TO authenticated USING (((( SELECT ( SELECT auth.uid() AS uid) AS uid) = seller_id) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))) WITH CHECK (((( SELECT ( SELECT auth.uid() AS uid) AS uid) = seller_id) OR (org_id IN ( SELECT org_members.org_id
   FROM org_members
  WHERE (org_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));
DROP POLICY IF EXISTS "Public select active" ON public.resale_listings;
CREATE POLICY "Public select active" ON public.resale_listings AS PERMISSIVE FOR SELECT TO public USING ((status = 'active'::text));
DROP POLICY IF EXISTS "scans_insert_consolidated_authenticated" ON public.scans;
CREATE POLICY "scans_insert_consolidated_authenticated" ON public.scans AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((app.role_in_event_staff(event_id, app.current_user_id(), ARRAY['scanner'::text]) OR app.role_in_membership(( SELECT events.org_id
   FROM events
  WHERE (events.id = scans.event_id)), app.current_user_id(), ARRAY['owner'::text, 'admin'::text]) OR app.is_event_staff_roles(event_id, VARIADIC ARRAY['scanner'::text, 'organizer_staff'::text, 'organizer_admin'::text]) OR app.is_event_staff(event_id, ARRAY['organizer_admin'::text, 'organizer_staff'::text, 'scanner'::text])));
DROP POLICY IF EXISTS "scans_select_consolidated" ON public.scans;
CREATE POLICY "scans_select_consolidated" ON public.scans AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (om.org_id = ( SELECT e.org_id
           FROM events e
          WHERE (e.id = scans.event_id))) AND (om.role = ANY (ARRAY['organizer_owner'::app_role, 'organizer_admin'::app_role, 'organizer'::app_role, 'admin'::app_role, 'finance'::app_role]))))) OR (EXISTS ( SELECT 1
   FROM event_staff es
  WHERE ((es.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (es.event_id = scans.event_id) AND (es.active IS DISTINCT FROM false) AND (es.role = ANY (ARRAY['scanner'::app_role, 'organizer_staff'::app_role, 'organizer_admin'::app_role, 'organizer_scanner'::app_role])))))));
DROP POLICY IF EXISTS "seat_holds_delete_public_merged" ON public.seat_holds;
CREATE POLICY "seat_holds_delete_public_merged" ON public.seat_holds AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = seat_holds.event_id) AND fn_is_org_member(e.org_id)))));
DROP POLICY IF EXISTS "seat_maps_select_consolidated_authenticated" ON public.seat_maps;
CREATE POLICY "seat_maps_select_consolidated_authenticated" ON public.seat_maps AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = seat_maps.event_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role])))) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = seat_maps.event_id) AND fn_is_org_member(e.org_id))))));
DROP POLICY IF EXISTS "seat_maps_update_authenticated" ON public.seat_maps;
CREATE POLICY "seat_maps_update_authenticated" ON public.seat_maps AS PERMISSIVE FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = seat_maps.event_id) AND fn_is_org_member(e.org_id)))) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = seat_maps.event_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role])))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = seat_maps.event_id) AND fn_is_org_member(e.org_id)))) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = seat_maps.event_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))));
DROP POLICY IF EXISTS "seat_reservations_delete" ON public.seat_reservations;
CREATE POLICY "seat_reservations_delete" ON public.seat_reservations AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "seat_reservations_rw_public_merged_insert" ON public.seat_reservations;
CREATE POLICY "seat_reservations_rw_public_merged_insert" ON public.seat_reservations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = fn_current_user_id()));
DROP POLICY IF EXISTS "seat_reservations_select_authenticated" ON public.seat_reservations;
CREATE POLICY "seat_reservations_select_authenticated" ON public.seat_reservations AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = fn_current_user_id()) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = seat_reservations.event_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))));
DROP POLICY IF EXISTS "seat_reservations_select_public" ON public.seat_reservations;
CREATE POLICY "seat_reservations_select_public" ON public.seat_reservations AS PERMISSIVE FOR SELECT TO anon USING (((user_id = fn_current_user_id()) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = seat_reservations.event_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))));
DROP POLICY IF EXISTS "seat_reservations_update" ON public.seat_reservations;
CREATE POLICY "seat_reservations_update" ON public.seat_reservations AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = fn_current_user_id())) WITH CHECK ((user_id = fn_current_user_id()));
DROP POLICY IF EXISTS "seats_read_authenticated_merged" ON public.seats;
CREATE POLICY "seats_read_authenticated_merged" ON public.seats AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM (seat_maps sm
     JOIN events e ON ((e.id = sm.event_id)))
  WHERE ((sm.id = seats.seat_map_id) AND fn_is_org_member(e.org_id)))) OR (EXISTS ( SELECT 1
   FROM (seat_maps sm
     JOIN events e ON ((e.id = sm.event_id)))
  WHERE ((sm.id = seats.seat_map_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))));
DROP POLICY IF EXISTS "seats_update_authenticated" ON public.seats;
CREATE POLICY "seats_update_authenticated" ON public.seats AS PERMISSIVE FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM (seat_maps sm
     JOIN events e ON ((e.id = sm.event_id)))
  WHERE ((sm.id = seats.seat_map_id) AND fn_is_org_member(e.org_id)))) OR (EXISTS ( SELECT 1
   FROM (seat_maps sm
     JOIN events e ON ((e.id = sm.event_id)))
  WHERE ((sm.id = seats.seat_map_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role])))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM (seat_maps sm
     JOIN events e ON ((e.id = sm.event_id)))
  WHERE ((sm.id = seats.seat_map_id) AND fn_is_org_member(e.org_id)))) OR (EXISTS ( SELECT 1
   FROM (seat_maps sm
     JOIN events e ON ((e.id = sm.event_id)))
  WHERE ((sm.id = seats.seat_map_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))));
DROP POLICY IF EXISTS "Users can delete their own series follows" ON public.series_follows;
CREATE POLICY "Users can delete their own series follows" ON public.series_follows AS PERMISSIVE FOR DELETE TO public USING ((( SELECT auth.uid() AS uid) = user_id));
DROP POLICY IF EXISTS "Users can insert their own series follows" ON public.series_follows;
CREATE POLICY "Users can insert their own series follows" ON public.series_follows AS PERMISSIVE FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
DROP POLICY IF EXISTS "Users can view their own series follows" ON public.series_follows;
CREATE POLICY "Users can view their own series follows" ON public.series_follows AS PERMISSIVE FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) = user_id));
DROP POLICY IF EXISTS "Event delete" ON public.ticket_type_channels;
CREATE POLICY "Event delete" ON public.ticket_type_channels AS PERMISSIVE FOR DELETE TO authenticated USING ((get_ticket_type_event(ticket_type_id) = ((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'event_id'::text))::uuid));
DROP POLICY IF EXISTS "Event insert" ON public.ticket_type_channels;
CREATE POLICY "Event insert" ON public.ticket_type_channels AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((get_ticket_type_event(ticket_type_id) = ((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'event_id'::text))::uuid));
DROP POLICY IF EXISTS "Event select" ON public.ticket_type_channels;
CREATE POLICY "Event select" ON public.ticket_type_channels AS PERMISSIVE FOR SELECT TO authenticated USING ((get_ticket_type_event(ticket_type_id) = ((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'event_id'::text))::uuid));
DROP POLICY IF EXISTS "Event update" ON public.ticket_type_channels;
CREATE POLICY "Event update" ON public.ticket_type_channels AS PERMISSIVE FOR UPDATE TO authenticated USING ((get_ticket_type_event(ticket_type_id) = ((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'event_id'::text))::uuid)) WITH CHECK ((get_ticket_type_event(ticket_type_id) = ((( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) ->> 'event_id'::text))::uuid));
DROP POLICY IF EXISTS "dashboard_user_update_ticket_types" ON public.ticket_types;
CREATE POLICY "dashboard_user_update_ticket_types" ON public.ticket_types AS PERMISSIVE FOR UPDATE TO dashboard_user USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = ticket_types.event_id) AND (app.is_org_member(e.org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]) OR (e.org_id IN ( SELECT current_user_org_ids.current_user_org_ids
           FROM current_user_org_ids() current_user_org_ids(current_user_org_ids))) OR fn_is_org_member(e.org_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = ticket_types.event_id) AND (app.is_org_member(e.org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]) OR (e.org_id IN ( SELECT current_user_org_ids.current_user_org_ids
           FROM current_user_org_ids() current_user_org_ids(current_user_org_ids))) OR fn_is_org_member(e.org_id))))));
DROP POLICY IF EXISTS "ticket_types_anon_select" ON public.ticket_types;
CREATE POLICY "ticket_types_anon_select" ON public.ticket_types AS PERMISSIVE FOR SELECT TO anon USING ((app.is_event_public_now(event_id) AND (sales_status = ANY (ARRAY['on_sale'::ticket_type_sales_status, 'paused'::ticket_type_sales_status, 'sold_out'::ticket_type_sales_status]))));
DROP POLICY IF EXISTS "ticket_types_dashboard_user_select" ON public.ticket_types;
CREATE POLICY "ticket_types_dashboard_user_select" ON public.ticket_types AS PERMISSIVE FOR SELECT TO dashboard_user USING (((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = ticket_types.event_id) AND (e.status = 'published'::event_status) AND (e.visibility = 'public'::text) AND ((e.publish_at IS NULL) OR (e.publish_at <= now())) AND ((e.unpublish_at IS NULL) OR (e.unpublish_at >= now()))))) OR app.is_published(( SELECT e.*::events AS e
   FROM events e
  WHERE (e.id = ticket_types.event_id))) OR fn_event_is_public_now(event_id) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = ticket_types.event_id) AND (e.org_id IN ( SELECT current_user_org_ids.current_user_org_ids
           FROM current_user_org_ids() current_user_org_ids(current_user_org_ids))))))));
DROP POLICY IF EXISTS "ticket_types_read_consolidated" ON public.ticket_types;
CREATE POLICY "ticket_types_read_consolidated" ON public.ticket_types AS PERMISSIVE FOR SELECT TO authenticated USING ((app.role_in_event_staff(event_id, app.current_user_id(), NULL::text[]) OR app.is_event_public_now(event_id) OR (app.role_in_event_staff(event_id, app.current_user_id(), NULL::text[]) OR app.is_event_public_now(event_id) OR app.role_in_event_staff(event_id, app.current_user_id(), ARRAY['manager'::text, 'owner'::text]) OR app.role_in_membership(( SELECT events.org_id
   FROM events
  WHERE (events.id = ticket_types.event_id)), app.current_user_id(), ARRAY['owner'::text, 'admin'::text]) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = ticket_types.event_id) AND fn_is_org_member(e.org_id)))) OR app.is_event_staff(event_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))));
DROP POLICY IF EXISTS "ticket_types_update_consolidated" ON public.ticket_types;
CREATE POLICY "ticket_types_update_consolidated" ON public.ticket_types AS PERMISSIVE FOR UPDATE TO authenticated USING (can_update_ticket_types_by_user(( SELECT ( SELECT auth.uid() AS uid) AS uid), event_id));
DROP POLICY IF EXISTS "transfers_delete_admin" ON public.transfers;
CREATE POLICY "transfers_delete_admin" ON public.transfers AS PERMISSIVE FOR DELETE TO authenticated USING (is_org_admin(( SELECT o.org_id
   FROM (order_items oi
     JOIN orders o ON ((oi.order_id = o.id)))
  WHERE (oi.id = transfers.order_item_id))));
DROP POLICY IF EXISTS "transfers_insert_authenticated" ON public.transfers;
CREATE POLICY "transfers_insert_authenticated" ON public.transfers AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((from_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));
DROP POLICY IF EXISTS "transfers_select_consolidated_authenticated" ON public.transfers;
CREATE POLICY "transfers_select_consolidated_authenticated" ON public.transfers AS PERMISSIVE FOR SELECT TO authenticated USING (((from_user_id = ( SELECT auth.uid() AS uid)) OR (to_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (order_items oi
     JOIN orders o ON ((oi.order_id = o.id)))
  WHERE ((oi.id = transfers.order_item_id) AND is_org_admin(o.org_id)))) OR (EXISTS ( SELECT 1
   FROM ((order_items oi
     JOIN ticket_types tt ON ((tt.id = oi.ticket_type_id)))
     JOIN events e ON ((e.id = tt.event_id)))
  WHERE ((oi.id = transfers.order_item_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))));
DROP POLICY IF EXISTS "transfers_update_authenticated" ON public.transfers;
CREATE POLICY "transfers_update_authenticated" ON public.transfers AS PERMISSIVE FOR UPDATE TO authenticated USING (((from_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (to_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR ((( SELECT auth.jwt() AS jwt) ->> 'user_role'::text) = 'admin'::text))) WITH CHECK (((from_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (to_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR ((( SELECT auth.jwt() AS jwt) ->> 'user_role'::text) = 'admin'::text)));
DROP POLICY IF EXISTS "user_connections_delete_own" ON public.user_connections;
CREATE POLICY "user_connections_delete_own" ON public.user_connections AS PERMISSIVE FOR DELETE TO authenticated USING (((requester_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "user_connections_insert_self" ON public.user_connections;
CREATE POLICY "user_connections_insert_self" ON public.user_connections AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((requester_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::connection_status)));
DROP POLICY IF EXISTS "user_connections_select_own" ON public.user_connections;
CREATE POLICY "user_connections_select_own" ON public.user_connections AS PERMISSIVE FOR SELECT TO authenticated USING (((requester_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "user_connections_update_authenticated" ON public.user_connections;
CREATE POLICY "user_connections_update_authenticated" ON public.user_connections AS PERMISSIVE FOR UPDATE TO authenticated USING (((((requester_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))) AND (status = 'accepted'::connection_status)) OR ((recipient_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::connection_status)))) WITH CHECK (((((requester_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))) AND (status = 'blocked'::connection_status)) OR ((recipient_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['accepted'::connection_status, 'declined'::connection_status, 'blocked'::connection_status])))));
DROP POLICY IF EXISTS "user_handles_delete_self" ON public.user_handles;
CREATE POLICY "user_handles_delete_self" ON public.user_handles AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "user_handles_insert_self" ON public.user_handles;
CREATE POLICY "user_handles_insert_self" ON public.user_handles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "user_handles_select_all" ON public.user_handles;
CREATE POLICY "user_handles_select_all" ON public.user_handles AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "user_handles_update_self" ON public.user_handles;
CREATE POLICY "user_handles_update_self" ON public.user_handles AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "user_notification_prefs_delete" ON public.user_notification_preferences;
CREATE POLICY "user_notification_prefs_delete" ON public.user_notification_preferences AS PERMISSIVE FOR DELETE TO authenticated USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "user_notification_prefs_insert" ON public.user_notification_preferences;
CREATE POLICY "user_notification_prefs_insert" ON public.user_notification_preferences AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "user_notification_prefs_select" ON public.user_notification_preferences;
CREATE POLICY "user_notification_prefs_select" ON public.user_notification_preferences AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "user_notification_prefs_update" ON public.user_notification_preferences;
CREATE POLICY "user_notification_prefs_update" ON public.user_notification_preferences AS PERMISSIVE FOR UPDATE TO authenticated USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)) WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));
DROP POLICY IF EXISTS "venues_anon_public_event_read" ON public.venues;
CREATE POLICY "venues_anon_public_event_read" ON public.venues AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.venue_id = venues.id) AND (e.status = 'published'::event_status) AND (e.visibility = 'public'::text) AND ((e.publish_at IS NULL) OR (e.publish_at <= now())) AND ((e.unpublish_at IS NULL) OR (e.unpublish_at > now()))))));
DROP POLICY IF EXISTS "venues_dashboard_user_select" ON public.venues;
CREATE POLICY "venues_dashboard_user_select" ON public.venues AS PERMISSIVE FOR SELECT TO dashboard_user USING ((fn_is_org_member(org_id) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.venue_id = venues.id) AND fn_event_is_public_now(e.id))))));
DROP POLICY IF EXISTS "venues_read_authenticated_merged" ON public.venues;
CREATE POLICY "venues_read_authenticated_merged" ON public.venues AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.venue_id = venues.id) AND fn_event_is_public_now(e.id)))) OR fn_is_org_member(org_id) OR app.is_org_member(org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role])));
DROP POLICY IF EXISTS "venues_update_authenticated_merged" ON public.venues;
CREATE POLICY "venues_update_authenticated_merged" ON public.venues AS PERMISSIVE FOR UPDATE TO authenticated USING ((fn_is_org_member(org_id) OR app.is_org_member(org_id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role])));
DROP POLICY IF EXISTS "waitlists_delete" ON public.waitlists;
CREATE POLICY "waitlists_delete" ON public.waitlists AS PERMISSIVE FOR DELETE TO authenticated USING (((user_id = ( SELECT app.current_user_id() AS current_user_id)) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = waitlists.event_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))));
DROP POLICY IF EXISTS "waitlists_insert" ON public.waitlists;
CREATE POLICY "waitlists_insert" ON public.waitlists AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (((status = 'active'::text) OR ((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((user_id = ( SELECT app.current_user_id() AS current_user_id)) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = waitlists.event_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))))));
DROP POLICY IF EXISTS "waitlists_select" ON public.waitlists;
CREATE POLICY "waitlists_select" ON public.waitlists AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = ( SELECT app.current_user_id() AS current_user_id)) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = waitlists.event_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))));
DROP POLICY IF EXISTS "waitlists_update" ON public.waitlists;
CREATE POLICY "waitlists_update" ON public.waitlists AS PERMISSIVE FOR UPDATE TO authenticated USING (((user_id = ( SELECT app.current_user_id() AS current_user_id)) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = waitlists.event_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role])))))) WITH CHECK (((user_id = ( SELECT app.current_user_id() AS current_user_id)) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = waitlists.event_id) AND app.is_event_staff(e.id, ARRAY['organizer_admin'::app_role, 'organizer_staff'::app_role]))))));
DROP POLICY IF EXISTS "webhook_deliveries_select" ON public.webhook_deliveries;
CREATE POLICY "webhook_deliveries_select" ON public.webhook_deliveries AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM webhook_endpoints e
  WHERE ((e.id = webhook_deliveries.endpoint_id) AND (is_super_admin(( SELECT auth.uid() AS uid)) OR ((e.org_id IS NOT NULL) AND is_org_admin(e.org_id)))))));
DROP POLICY IF EXISTS "webhook_endpoints_delete" ON public.webhook_endpoints;
CREATE POLICY "webhook_endpoints_delete" ON public.webhook_endpoints AS PERMISSIVE FOR DELETE TO authenticated USING ((is_super_admin(( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND is_org_admin(org_id))));
DROP POLICY IF EXISTS "webhook_endpoints_insert" ON public.webhook_endpoints;
CREATE POLICY "webhook_endpoints_insert" ON public.webhook_endpoints AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_super_admin(( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND is_org_admin(org_id))));
DROP POLICY IF EXISTS "webhook_endpoints_select" ON public.webhook_endpoints;
CREATE POLICY "webhook_endpoints_select" ON public.webhook_endpoints AS PERMISSIVE FOR SELECT TO authenticated USING ((is_super_admin(( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND is_org_admin(org_id))));
DROP POLICY IF EXISTS "webhook_endpoints_update" ON public.webhook_endpoints;
CREATE POLICY "webhook_endpoints_update" ON public.webhook_endpoints AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_super_admin(( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND is_org_admin(org_id)))) WITH CHECK ((is_super_admin(( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND is_org_admin(org_id))));
DROP POLICY IF EXISTS "webhooks_org_read" ON public.webhooks;
CREATE POLICY "webhooks_org_read" ON public.webhooks AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM org_members m
  WHERE (m.user_id = fn_current_user_id()))));

-- =====================================================================
-- END extended baseline (views + mat views + functions + triggers + RLS)
-- Captured 2026-06-23 from live DB project radsfmlsjznqvcpogluo
-- =====================================================================

-- ============================================================
-- Layer A: multi-day event support
-- ============================================================

CREATE TYPE public.event_format AS ENUM ('single_day', 'multi_day');

ALTER TABLE public.events
  ADD COLUMN event_format public.event_format NOT NULL DEFAULT 'single_day';

ALTER TABLE public.events
  ADD CONSTRAINT events_multi_day_requires_dates CHECK (
    event_format = 'single_day'
    OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at > starts_at)
  );

COMMENT ON COLUMN public.events.event_format IS
  'single_day = one occurrence (default). multi_day = spans multiple days (festival). Day passes are modeled as ticket_tiers on the same row, not as child events.';

-- ============================================================
-- Layer B: series infrastructure (org-owned)
-- ============================================================

CREATE TYPE public.series_type AS ENUM ('tour', 'recurring', 'season');

CREATE TABLE public.event_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  series_type public.series_type NOT NULL,
  cover_image_url text,
  recurrence_pattern jsonb,
  starts_on date,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_series_slug_format CHECK (
    slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) BETWEEN 2 AND 80
  ),
  CONSTRAINT event_series_date_order CHECK (
    starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on
  ),
  CONSTRAINT event_series_recurrence_only_for_recurring CHECK (
    series_type = 'recurring' OR recurrence_pattern IS NULL
  )
);

CREATE INDEX event_series_org_idx ON public.event_series (org_id);

COMMENT ON TABLE public.event_series IS
  'Parent grouping for tour/recurring/season events. Owned by an org. Events with series_id IS NOT NULL belong to a series; series_id IS NULL means standalone.';

-- updated_at trigger (SECURITY INVOKER + empty search_path per fix_function_search_paths convention)

CREATE OR REPLACE FUNCTION public.event_series_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER tr_event_series_set_updated_at
  BEFORE UPDATE ON public.event_series
  FOR EACH ROW
  EXECUTE FUNCTION public.event_series_set_updated_at();

-- ============================================================
-- Link events to series
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN series_id uuid REFERENCES public.event_series(id) ON DELETE SET NULL;

CREATE INDEX events_series_id_idx ON public.events (series_id) WHERE series_id IS NOT NULL;

COMMENT ON COLUMN public.events.series_id IS
  'Nullable FK to event_series. NULL means standalone event. Set on tour stops, recurring occurrences, or season events.';

-- ============================================================
-- RLS for event_series
-- ============================================================

ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_series_public_select ON public.event_series
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY event_series_org_admin_all ON public.event_series
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));
;

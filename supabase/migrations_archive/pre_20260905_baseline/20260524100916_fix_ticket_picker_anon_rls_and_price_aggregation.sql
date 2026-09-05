
-- Part 1: anon SELECT policy on ticket_types
-- Visibility scoped to purchasable tickets for events that are
-- published, public, and within publish window.
CREATE POLICY ticket_types_anon_select
  ON public.ticket_types
  FOR SELECT
  TO anon
  USING (
    app.is_event_public_now(event_id)
    AND sales_status IN ('on_sale', 'paused', 'sold_out')
  );

-- Part 2: Exclude non-on_sale tickets from price aggregation in v_events_public
-- so hidden comps no longer drag min_price_cents to zero.
CREATE OR REPLACE VIEW public.v_events_public AS
SELECT
  e.id, e.title, e.slug, e.category,
  COALESCE(e.city, v.city) AS city,
  e.country_code AS country,
  e.cover_image_url AS poster_url,
  e.starts_at,
  e.venue_id,
  v.name AS venue_name,
  v.address AS venue_address,
  v.tz AS venue_tz,
  tp.min_price_cents,
  tp.max_price_cents,
  tp.currency,
  e.org_id AS organizer_id,
  o.name AS organizer_name,
  o.logo AS organizer_logo_url,
  e.featured_priority
FROM events e
LEFT JOIN venues v ON v.id = e.venue_id
LEFT JOIN organizations o ON o.id = e.org_id
LEFT JOIN LATERAL (
  SELECT
    min(t.price_cents) AS min_price_cents,
    max(t.price_cents) AS max_price_cents,
    (SELECT t2.currency
     FROM ticket_types t2
     WHERE t2.event_id = e.id
       AND t2.sales_status = 'on_sale'
     ORDER BY t2.price_cents
     LIMIT 1) AS currency
  FROM ticket_types t
  WHERE t.event_id = e.id
    AND t.sales_status = 'on_sale'
) tp ON true
WHERE e.status = 'published'::event_status
  AND e.visibility = 'public'::text;
;

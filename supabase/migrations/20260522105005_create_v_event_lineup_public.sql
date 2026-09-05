
CREATE OR REPLACE VIEW public.v_event_lineup_public AS
SELECT
  ea.event_id,
  a.id            AS artist_id,
  a.name          AS artist_name,
  a.slug          AS artist_slug,
  a.image_url     AS artist_image_url,
  ea.role         AS role
FROM public.event_artists ea
JOIN public.artists a ON a.id = ea.artist_id
JOIN public.events e ON e.id = ea.event_id
WHERE e.visibility = 'public'
ORDER BY ea.event_id, a.name;

COMMENT ON VIEW public.v_event_lineup_public IS 'Public lineup join: event_artists + artists, filtered to events with visibility=public. Front-end /events/[id] reads from here for the Lineup section.';

GRANT SELECT ON public.v_event_lineup_public TO anon, authenticated;
;

-- 5/6: Slugs on organizations/venues/artists. (events.slug already exists.)

ALTER TABLE public.organizations ADD COLUMN slug text;
ALTER TABLE public.venues        ADD COLUMN slug text;
ALTER TABLE public.artists       ADD COLUMN slug text;

-- Backfill: slugify name; suffix with id prefix for guaranteed uniqueness on existing dev data
UPDATE public.organizations
   SET slug = trim(both '-' from
              COALESCE(NULLIF(regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'), ''), 'org')
              || '-' || substr(id::text, 1, 8));

UPDATE public.venues
   SET slug = trim(both '-' from
              COALESCE(NULLIF(regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'), ''), 'venue')
              || '-' || substr(id::text, 1, 8));

UPDATE public.artists
   SET slug = trim(both '-' from
              COALESCE(NULLIF(regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'), ''), 'artist')
              || '-' || substr(id::text, 1, 8));

-- Format constraints
ALTER TABLE public.organizations ADD CONSTRAINT organizations_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) BETWEEN 2 AND 80);
ALTER TABLE public.venues ADD CONSTRAINT venues_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) BETWEEN 2 AND 80);
ALTER TABLE public.artists ADD CONSTRAINT artists_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) BETWEEN 2 AND 80);

-- Unique indexes
CREATE UNIQUE INDEX organizations_slug_unique ON public.organizations (slug);
CREATE UNIQUE INDEX venues_slug_unique        ON public.venues (slug);
CREATE UNIQUE INDEX artists_slug_unique       ON public.artists (slug);

-- NOT NULL after backfill
ALTER TABLE public.organizations ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.venues        ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.artists       ALTER COLUMN slug SET NOT NULL;

COMMENT ON COLUMN public.organizations.slug IS 'URL-safe handle for the organization. Format: lower(a-z0-9 with single hyphens), 2-80 chars.';
COMMENT ON COLUMN public.venues.slug        IS 'URL-safe handle for the venue. Format: lower(a-z0-9 with single hyphens), 2-80 chars.';
COMMENT ON COLUMN public.artists.slug       IS 'URL-safe handle for the artist. Format: lower(a-z0-9 with single hyphens), 2-80 chars.';;

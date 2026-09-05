
-- 1. events: add description
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. artists: add image_url
ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. organizations: add bio and logo
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT;

-- 4. event_favourites table
CREATE TABLE IF NOT EXISTS event_favourites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- RLS
ALTER TABLE event_favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favourites"
  ON event_favourites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favourites"
  ON event_favourites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favourites"
  ON event_favourites FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_favourites_user_id ON event_favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_event_favourites_event_id ON event_favourites(event_id);
;

-- Add fetched_at to sources for Twitch (and future) sync cache TTL
ALTER TABLE sources ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ;

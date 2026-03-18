-- Run in Railway Postgres (Data / Query tab). Soft-archive: archived items are excluded from default lists.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

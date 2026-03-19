-- 1) Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  display_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2) Add nullable owner_user_id columns first
ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_clients_owner_user_id ON clients(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_sources_owner_user_id ON sources(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_owner_user_id ON deliverables(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_owner_user_id ON invoices(owner_user_id);

-- 3) Backfill strategy for existing single-user data:
--    Replace the email/password hash placeholders below before running in production.
--    Password hash can be set later via app flow; keep NULL if using OAuth-only.
INSERT INTO users (email, password_hash, display_name)
SELECT 'owner@edittrack.local', NULL, 'Owner'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'owner@edittrack.local');

UPDATE clients
SET owner_user_id = (SELECT id FROM users WHERE email = 'owner@edittrack.local')
WHERE owner_user_id IS NULL;

UPDATE sources s
SET owner_user_id = c.owner_user_id
FROM clients c
WHERE s.client_id = c.id
  AND s.owner_user_id IS NULL;

UPDATE deliverables d
SET owner_user_id = c.owner_user_id
FROM clients c
WHERE d.client_id = c.id
  AND d.owner_user_id IS NULL;

UPDATE invoices i
SET owner_user_id = c.owner_user_id
FROM clients c
WHERE i.client_id = c.id
  AND i.owner_user_id IS NULL;

-- 4) Optional hardening (run only after verifying backfill worked):
-- ALTER TABLE clients ALTER COLUMN owner_user_id SET NOT NULL;
-- ALTER TABLE sources ALTER COLUMN owner_user_id SET NOT NULL;
-- ALTER TABLE deliverables ALTER COLUMN owner_user_id SET NOT NULL;
-- ALTER TABLE invoices ALTER COLUMN owner_user_id SET NOT NULL;

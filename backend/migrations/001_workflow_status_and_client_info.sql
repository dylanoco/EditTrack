-- Migrate deliverable status: incomplete -> todo, complete -> delivered
UPDATE deliverables SET status = 'todo' WHERE status = 'incomplete';
UPDATE deliverables SET status = 'delivered' WHERE status = 'complete';

-- Drop old constraint, add new one allowing todo|doing|delivered
ALTER TABLE deliverables DROP CONSTRAINT IF EXISTS chk_deliv_status;
ALTER TABLE deliverables ADD CONSTRAINT chk_deliv_status CHECK (status IN ('todo','doing','delivered'));

-- Add info_sections JSONB column to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS info_sections JSONB;

-- Backfill: move existing notes into info_sections as a single "Notes" section
UPDATE clients
SET info_sections = jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'title', 'Notes', 'body', notes)
)
WHERE notes IS NOT NULL AND notes != '' AND (info_sections IS NULL);

--migrate:up
ALTER TABLE threads ADD COLUMN IF NOT EXISTS attrs JSONB NOT NULL DEFAULT '{}';
CREATE INDEX idx_threads_attrs ON threads USING GIN(attrs);

--migrate:down
DROP INDEX IF EXISTS idx_threads_attrs;
ALTER TABLE threads DROP COLUMN IF EXISTS attrs;

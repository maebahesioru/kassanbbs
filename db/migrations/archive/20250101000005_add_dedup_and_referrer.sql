--migrate:up
ALTER TABLE config ADD COLUMN IF NOT EXISTS referrer_cushion TEXT NOT NULL DEFAULT '';
ALTER TABLE responses ADD COLUMN IF NOT EXISTS content_hash TEXT DEFAULT '';

--migrate:down
ALTER TABLE config DROP COLUMN IF EXISTS referrer_cushion;
ALTER TABLE responses DROP COLUMN IF EXISTS content_hash;
